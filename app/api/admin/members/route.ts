import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  const db = createServiceClient();
  const { data: { users }, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ error: "회원 정보를 불러오지 못했습니다." }, { status: 503 });
  const ids = users.map(u => u.id);
  const { data: profiles, error: profileError } = ids.length ? await db.from("profiles").select("id,role").in("id", ids) : { data: [], error: null };
  if (profileError) return NextResponse.json({ error: "회원 권한을 불러오지 못했습니다." }, { status: 503 });
  const roles = new Map((profiles ?? []).map(p => [p.id, p.role]));
  return NextResponse.json({ members: users.map(u => ({
    id: u.id, email: u.email ?? "", createdAt: u.created_at, confirmed: Boolean(u.email_confirmed_at),
    lastSignIn: u.last_sign_in_at ?? null, role: roles.get(u.id) === "admin" ? "admin" : "customer",
  })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const admin = await authorized();
  if (!admin) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const role = body?.role;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["admin", "customer"].includes(role))
    return NextResponse.json({ error: "요청을 확인해 주세요." }, { status: 400 });
  if (id === admin.id && role !== "admin") return NextResponse.json({ error: "자신의 관리자 권한은 해제할 수 없습니다." }, { status: 400 });
  const db = createServiceClient();
  const { data: { user }, error: lookupError } = await db.auth.admin.getUserById(id);
  if (lookupError || !user) return NextResponse.json({ error: "회원을 찾지 못했습니다." }, { status: 404 });
  const { error } = await db.from("profiles").upsert({ id, role }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "권한 변경에 실패했습니다." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
