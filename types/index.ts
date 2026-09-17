export type Product = {
  id: string; name: string; slug: string; origin: string; region: string | null; producer: string | null;
  variety: string | null; process: string | null; roast_level: string | null; tasting_notes: string | null;
  description: string | null; roasted_date: string | null; price_150g: number; price_150g_original?: number | null; price_300g: number;
  stock_quantity: number; active: boolean; featured: boolean; todays_roast: boolean; display_order: number; image_url: string | null;
};
export type CartItem = { product: Product; weight: "150g" | "300g"; grind: "Whole Bean" | "Filter" | "Espresso"; quantity: number; unitPrice: number };
export type OrderItem = { id: string; order_id: string; product_name: string; weight: string; grind: string; quantity: number; unit_price: number; subtotal: number };
export type Order = { id: string; order_number: string; customer_name: string; email: string; phone?: string; fulfillment_type: "delivery" | "pickup"; total: number; payment_status: string; order_status: string; created_at: string; order_items?: OrderItem[] };
