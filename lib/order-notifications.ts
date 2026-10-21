import tls from "node:tls";
import { createServiceClient } from "@/lib/supabase/service";

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

/** Non-blocking notification failure: never reject a valid customer order. */
export async function notifyAdminsOfNewOrder(order: {
  number: string; name: string; amount: number; method: string;
}) {
  if (!process.env.GMAIL_SMTP_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Admin order email disabled: configure Gmail SMTP environment variables.");
    return;
  }
  try {
    const supabase = createServiceClient();
    const { data: admins, error } = await supabase.from("profiles").select("id").eq("role", "admin");
    if (error) throw error;
    const recipients = [...new Set((await Promise.all((admins ?? []).map(async (admin) => {
      const { data } = await supabase.auth.admin.getUserById(admin.id);
      return data.user?.email?.trim().toLowerCase();
    }))).filter((email): email is string => Boolean(email)))];
    if (!recipients.length) { console.warn("No admin email recipients configured"); return; }
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tominiko-tominiko.vercel.app";
    await sendGmail(recipients, "[CASA] 새 주문 접수 · " + order.number, [
      "CASA DI STEFANO 새 주문이 접수되었습니다.",
      "주문번호: " + order.number,
      "주문자: " + order.name,
      "주문금액: ₩" + order.amount.toLocaleString("ko-KR"),
      "수령방법: " + order.method,
      "결제상태: 입금 대기 (결제 완료 아님)",
      "관리자 확인: " + site + "/admin/orders",
    ].join("\n"));
  } catch (error) {
    console.error("Admin Gmail notification failed:", error);
  }
}
