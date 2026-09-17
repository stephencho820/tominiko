import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type OrderItemInput = {
  product?: { id?: unknown };
  weight?: unknown;
  grind?: unknown;
  quantity?: unknown;
};

type OrderInput = {
  customerName?: unknown;
  email?: unknown;
  phone?: unknown;
  fulfillmentType?: unknown;
  postalCode?: unknown;
  address?: unknown;
  addressDetail?: unknown;
  deliveryMessage?: unknown;
  items?: unknown;
};

const validWeights = new Set(["150g", "300g"]);
const validGrinds = new Set(["Whole Bean", "Filter", "Espresso"]);
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  let body: OrderInput;
  try {
    body = await request.json() as OrderInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items as OrderItemInput[] : [];
  const fulfillmentType = text(body.fulfillmentType);
  const email = text(body.email);
  const invalidItem = items.some((item) =>
    !text(item.product?.id) ||
    !validWeights.has(text(item.weight)) ||
    !validGrinds.has(text(item.grind)) ||
    !Number.isInteger(item.quantity) ||
    Number(item.quantity) < 1 ||
    Number(item.quantity) > 20
  );

  if (!text(body.customerName) || !email.includes("@") || !text(body.phone) ||
      !["delivery", "pickup"].includes(fulfillmentType) || !items.length || invalidItem) {
    return NextResponse.json({ error: "Invalid order details" }, { status: 400 });
  }
  if (fulfillmentType === "delivery" && (!text(body.postalCode) || !text(body.address))) {
    return NextResponse.json({ error: "A delivery address is required" }, { status: 400 });
  }

  if (!hasSupabaseEnv) return NextResponse.json({ orderNumber: "PREVIEW-001" });

  const supabase = await createClient();
  const productIds = [...new Set(items.map((item) => text(item.product?.id)))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,name,price_150g,price_300g,stock_quantity,active")
    .in("id", productIds)
    .eq("active", true);

  if (productError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const orderItems = items.map((item) => {
    const product = productById.get(text(item.product?.id))!;
    const quantity = Number(item.quantity);
    const weight = text(item.weight);
    const unitPrice = weight === "150g" ? product.price_150g : product.price_300g;
    return {
      product_id: product.id,
      product_name: product.name,
      weight,
      grind: text(item.grind),
      quantity,
      unit_price: unitPrice,
      subtotal: unitPrice * quantity,
    };
  });

  const requestedByProduct = new Map<string, number>();
  orderItems.forEach((item) => requestedByProduct.set(item.product_id, (requestedByProduct.get(item.product_id) ?? 0) + item.quantity));
  if (products.some((product) => (requestedByProduct.get(product.id) ?? 0) > product.stock_quantity)) {
    return NextResponse.json({ error: "The requested quantity is no longer available" }, { status: 409 });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const { data: { user } } = await supabase.auth.getUser();
  const orderNumber = `CDS-${Date.now().toString(36).toUpperCase()}`;
  const { data: order, error } = await supabase.from("orders").insert({
    order_number: orderNumber,
    user_id: user?.id ?? null,
    customer_name: text(body.customerName),
    email,
    phone: text(body.phone),
    fulfillment_type: fulfillmentType,
    postal_code: text(body.postalCode) || null,
    address: text(body.address) || null,
    address_detail: text(body.addressDetail) || null,
    delivery_message: text(body.deliveryMessage) || null,
    subtotal,
    total: subtotal,
    payment_status: "pending",
    order_status: "new",
  }).select().single();

  if (error || !order) return NextResponse.json({ error: error?.message ?? "Could not create order" }, { status: 400 });

  const { error: itemError } = await supabase.from("order_items").insert(orderItems.map((item) => ({ ...item, order_id: order.id })));
  if (itemError) {
    return NextResponse.json({ error: "Could not save order items" }, { status: 400 });
  }

  return NextResponse.json({ orderNumber });
}
