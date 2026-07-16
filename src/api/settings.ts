import { supabase } from "../lib/supabaseClient";

export const settingsApi = {
  async get() {
    const { data, error } = await supabase.from("school_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
  async update(updates: Record<string, unknown>) {
    const { data, error } = await supabase.from("school_settings").update(updates).eq("id", 1).select().single();
    if (error) throw error;
    return data;
  },
};

export const academicSessionsApi = {
  async list() {
    const { data, error } = await supabase.from("academic_sessions").select("*").order("start_date", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(label: string, start_date: string, end_date: string) {
    const { data, error } = await supabase.from("academic_sessions").insert({ label, start_date, end_date }).select().single();
    if (error) throw error;
    return data;
  },
  async setCurrent(id: string) {
    // Only one session should be current at a time.
    const { error: clearErr } = await supabase.from("academic_sessions").update({ is_current: false }).neq("id", id);
    if (clearErr) throw clearErr;
    const { data, error } = await supabase.from("academic_sessions").update({ is_current: true }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
};

export const holidaysApi = {
  async list() {
    const { data, error } = await supabase.from("holidays").select("*").order("date");
    if (error) throw error;
    return data;
  },
  async create(name: string, date: string) {
    const { data, error } = await supabase.from("holidays").insert({ name, date }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string) {
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) throw error;
  },
};
