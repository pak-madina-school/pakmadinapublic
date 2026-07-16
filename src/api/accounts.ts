import { supabase } from "../lib/supabaseClient";

type AccountAction = "create" | "update" | "disable" | "enable" | "reset_password" | "delete";

async function callAccountFn(body: Record<string, unknown> & { action: AccountAction }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("admin-manage-account", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  return data;
}

export const accountsApi = {
  createTeacher: (email: string, password: string, full_name: string, phone?: string) =>
    callAccountFn({ action: "create", role: "teacher", email, password, full_name, phone }),

  createAdmin: (email: string, password: string, full_name: string) =>
    callAccountFn({ action: "create", role: "admin", email, password, full_name }),

  createParent: (email: string, password: string, full_name: string, phone?: string) =>
    callAccountFn({ action: "create", role: "parent", email, password, full_name, phone }),

  update: (target_user_id: string, full_name: string) =>
    callAccountFn({ action: "update", target_user_id, full_name }),

  disable: (target_user_id: string) => callAccountFn({ action: "disable", target_user_id }),
  enable: (target_user_id: string) => callAccountFn({ action: "enable", target_user_id }),

  resetPassword: (target_user_id: string, password: string) =>
    callAccountFn({ action: "reset_password", target_user_id, password }),

  delete: (target_user_id: string) => callAccountFn({ action: "delete", target_user_id }),
};
