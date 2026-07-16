import { supabase } from "../lib/supabaseClient";

export interface NotificationRow {
  id: string;
  recipient_id: string;
  title: string;
  body: string | null;
  channel: "in-app" | "sms" | "email";
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  async send(recipientIds: string[], title: string, body: string, channel: NotificationRow["channel"] = "in-app") {
    const rows = recipientIds.map((recipient_id) => ({ recipient_id, title, body, channel }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) throw error;
  },

  /** Announcement = notification broadcast to every active profile matching a role filter. */
  async announce(title: string, body: string, roles: ("superadmin" | "admin" | "teacher" | "parent")[]) {
    const { data: recipients, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .in("role", roles)
      .eq("status", "active");
    if (profErr) throw profErr;
    if (recipients?.length) await this.send(recipients.map((r) => r.id), title, body);
  },

  async forUser(userId: string): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as NotificationRow[];
  },

  async markRead(id: string) {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },

  async unreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  },
};
