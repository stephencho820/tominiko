import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const value = (input: unknown, length = 300) => typeof input === "string" ? input.trim().slice(0, length) : "";
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const address = { user_id: user.id, label: value(body.label, 30) || "집", recipient_name: value(body.recipientName, 100), phone: value(body.phone, 30), zonecode: value(body.zonecode, 10), road_address: value(body.roadAddress), jibun_address: value(body.jibunAddress), detail_address: value(body.detailAddress), building_name: value(body.buildingName), is_default: Boolean(body.isDefault) };
  if (!address.recipient_name || !address.phone || !address.zonecode || !address.road_address || !address.detail_address) return NextResponse.json({ error: "배송지 정보를 확인해 주세요." }, { status: 400 });
  if (address.is_default) await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id);
  const { data, error } = await supabase.from("user_addresses").insert(address).select().single();
  return error ? NextResponse.json({ error: "배송지를 저장하지 못했습니다." }, { status: 400 }) : NextResponse.json({ address: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const id = new URL(request.url).searchParams.get("id");
  const { error } = await supabase.from("user_addresses").delete().eq("id", id ?? "");
  return error ? NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 400 }) : NextResponse.json({ ok: true });
}
