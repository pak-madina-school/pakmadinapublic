// Supabase Edge Function: admin-manage-account
// Runs with the service-role key server-side. Never call this with the anon key
// exposed as auth — the function itself checks the caller's role via their JWT.
//
// Deploy: supabase functions deploy admin-manage-account
// Secrets needed (Settings > Edge Functions > Secrets, or `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (these two are auto-injected by Supabase)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Action = "create" | "update" | "disable" | "enable" | "reset_password" | "delete";

interface Payload {
  action: Action;
  target_user_id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: "admin" | "teacher" | "parent";
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Identify the caller and confirm they're superadmin/admin.
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", userData.user.id)
    .single();

  const isSuperadmin = callerProfile?.role === "superadmin";
  const isAdmin = callerProfile?.role === "admin";
  if (!callerProfile || callerProfile.status !== "active" || !(isSuperadmin || isAdmin)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const payload: Payload = await req.json();

  async function logActivity(action: string, entityId: string | null, metadata: Record<string, unknown>) {
    await admin.from("activity_logs").insert({
      actor_id: userData.user.id,
      action,
      entity_type: "account",
      entity_id: entityId,
      metadata,
    });
  }

  try {
    switch (payload.action) {
      case "create": {
        // Only superadmin can create admin/teacher/parent accounts.
        if (!isSuperadmin && payload.role === "admin") {
          return new Response(JSON.stringify({ error: "Only Super Admin can create Admin accounts" }), { status: 403 });
        }
        if (!payload.email || !payload.password || !payload.full_name || !payload.role) {
          return new Response(JSON.stringify({ error: "email, password, full_name, role are required" }), { status: 400 });
        }
        const { data: created, error } = await admin.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
          user_metadata: { full_name: payload.full_name, role: payload.role },
        });
        if (error) throw error;

        if (payload.phone) {
          const table = payload.role === "teacher" ? "teachers" : payload.role === "parent" ? "parents" : null;
          if (table) await admin.from(table).update({ phone: payload.phone }).eq("id", created.user!.id);
        }

        await logActivity("account.create", created.user!.id, { role: payload.role, email: payload.email });
        return new Response(JSON.stringify({ user_id: created.user!.id }), { status: 200 });
      }

      case "update": {
        if (!payload.target_user_id) return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400 });
        const updates: Record<string, unknown> = {};
        if (payload.full_name) updates.full_name = payload.full_name;
        if (Object.keys(updates).length) {
          await admin.from("profiles").update(updates).eq("id", payload.target_user_id);
        }
        await logActivity("account.update", payload.target_user_id, payload as Record<string, unknown>);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      case "disable":
      case "enable": {
        if (!payload.target_user_id) return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400 });
        const status = payload.action === "disable" ? "disabled" : "active";
        await admin.from("profiles").update({ status }).eq("id", payload.target_user_id);
        // Also revoke existing sessions immediately on disable.
        if (payload.action === "disable") {
          await admin.auth.admin.signOut(payload.target_user_id, "global").catch(() => {});
        }
        await logActivity(`account.${payload.action}`, payload.target_user_id, {});
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      case "reset_password": {
        if (!payload.target_user_id || !payload.password) {
          return new Response(JSON.stringify({ error: "target_user_id and password required" }), { status: 400 });
        }
        await admin.auth.admin.updateUserById(payload.target_user_id, { password: payload.password });
        await logActivity("account.reset_password", payload.target_user_id, {});
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      case "delete": {
        if (!isSuperadmin) return new Response(JSON.stringify({ error: "Only Super Admin can delete accounts" }), { status: 403 });
        if (!payload.target_user_id) return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400 });
        await admin.auth.admin.deleteUser(payload.target_user_id);
        await logActivity("account.delete", payload.target_user_id, {});
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
