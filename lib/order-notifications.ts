import tls from "node:tls";
import { createServiceClient } from "@/lib/supabase/service";
import { formatAdminOrderEmail, type OrderEmailData, type OrderEmailItem } from "@/lib/order-email-content";

type Reply = { code: number; message: string };
type Connection = {
  socket: tls.TLSSocket;
  read: () => Promise<Reply>;
  send: (command: string) => Promise<Reply>;
  close: () => void;
};

function connectGmail(): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com", rejectUnauthorized: true });
    socket.setTimeout(12000, () => socket.destroy(new Error("SMTP timeout")));
    let buffer = "";
    let pending: { resolve: (reply: Reply) => void; reject: (error: Error) => void } | null = null;
    let multiline = "";
    const queued: Reply[] = [];
    let fatal: Error | null = null;
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      let end: number;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        multiline += line + "\n";
        if (!/^\d{3} /.test(line)) continue;
        const reply = { code: Number(line.slice(0, 3)), message: multiline };
        multiline = "";
        if (pending) { const waiter = pending; pending = null; waiter.resolve(reply); }
        else queued.push(reply);
      }
    });
    socket.on("error", (error) => { fatal = error; if (pending) { const waiter = pending; pending = null; waiter.reject(error); } else reject(error); });
    socket.on("close", () => { if (pending) { const waiter = pending; pending = null; waiter.reject(fatal ?? new Error("SMTP connection closed")); } });
    socket.once("secureConnect", () => {
      const read = () => new Promise<Reply>((ok, fail) => {
        if (queued.length) return ok(queued.shift()!);
        if (fatal || socket.destroyed) return fail(fatal ?? new Error("SMTP connection unavailable"));
        if (pending) return fail(new Error("Concurrent SMTP read"));
        pending = { resolve: ok, reject: fail };
      });
      const send = (command: string) => {
        const reply = read();
        socket.write(command + "\r\n");
        return reply;
      };
      resolve({ socket, read, send, close: () => socket.end() });
    });
  });
}

async function expect(reply: Promise<Reply>, code: number) {
  const response = await reply;
  if (response.code !== code) throw new Error(`SMTP expected ${code}, got ${response.code}: ${response.message.slice(0, 250)}`);
}

async function sendGmail(to: string[], subject: string, body: string) {
  const username = process.env.GMAIL_SMTP_USER?.trim();
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!username || !password) {
    console.warn("Gmail order notifications not configured (GMAIL_SMTP_USER / GMAIL_APP_PASSWORD)");
    return;
  }
  const conn = await connectGmail();
  try {
    await expect(conn.read(), 220);
    await expect(conn.send("EHLO casa-di-stefano.com"), 250);
    await expect(conn.send("AUTH PLAIN " + Buffer.from("\0" + username + "\0" + password).toString("base64")), 235);
    await expect(conn.send("MAIL FROM:<" + username + ">"), 250);
    for (const address of to) await expect(conn.send("RCPT TO:<" + address + ">"), 250);
    await expect(conn.send("DATA"), 354);
    const safeBody = body.replace(/\r?\n/g, "\r\n").replace(/(^|\r\n)\./g, "$1..");
    const message = [
      "From: CASA DI STEFANO <" + username + ">",
      "To: " + to.join(", "),
      "Subject: =?UTF-8?B?" + Buffer.from(subject, "utf8").toString("base64") + "?=",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(safeBody, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd(),
    ].join("\r\n");
    await expect(conn.send(message + "\r\n."), 250);
    await conn.send("QUIT");
  } finally { conn.close(); }
}

/**
 * Sends a full order receipt to admin-role users only.
 * Reads the committed order and order_items with the server-side service client,
 * avoiding customer-controlled prices or an untrusted checkout payload.
 *
 * Best effort: notification failures must not undo a valid order.
 */
export async function notifyAdminsOfNewOrder(order: { id: string }) {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Admin order email disabled: configure Gmail SMTP environment variables.");
    return;
  }
  try {
    const supabase = createServiceClient();
    const [{ data: savedOrder, error: orderError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from("orders").select(
        "id,order_number,created_at,order_source,table_label,customer_name,email,phone," +
        "recipient_name,recipient_phone,delivery_method,shipping_zonecode,shipping_road_address," +
        "shipping_jibun_address,shipping_detail_address,shipping_building_name," +
        "shipping_memo_type,shipping_memo_text,postal_code,address,address_detail,delivery_message," +
        "product_subtotal,subtotal,discount_amount,shipping_fee,final_amount,total," +
        "payment_status,payment_method,order_status"
      ).eq("id", order.id).single(),
      supabase.from("order_items").select(
        "product_name,weight,grind,selected_option,item_kind,quantity,unit_price,subtotal"
      ).eq("order_id", order.id),
    ]);
    // Never send a misleading order notification with a missing product list.
    if (orderError || itemsError || !savedOrder || !items?.length) {
      throw new Error("Could not load complete order details for admin email");
    }

    const { data: admins, error } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (error) throw new Error("Could not load admin email recipients");
    const recipients = [...new Set((await Promise.all((admins ?? []).map(async (admin) => {
      const { data } = await supabase.auth.admin.getUserById(admin.id);
      return data.user?.email?.trim().toLowerCase();
    }))).filter((email): email is string => Boolean(email)))];
    if (!recipients.length) { console.warn("No admin email recipients configured"); return; }

    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tominiko-tominiko.vercel.app";
    const mail = formatAdminOrderEmail(
      savedOrder as unknown as OrderEmailData,
      items as unknown as OrderEmailItem[],
      site + "/admin/orders/" + encodeURIComponent(order.id),
    );
    await sendGmail(recipients, mail.subject, mail.text);
  } catch (error) {
    // Avoid logging order contents or customer PII from a failed notification.
    console.error("Admin Gmail notification failed:", error instanceof Error ? error.message : "Unknown error");
  }
}
