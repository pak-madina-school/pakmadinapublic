import { supabase } from "../lib/supabaseClient";

export const salaryApi = {
  async recordForMonth(teacher_id: string, month: string, base_amount: number, bonuses = 0, deductions = 0) {
    const { data, error } = await supabase
      .from("salary_records")
      .upsert({ teacher_id, month, base_amount, bonuses, deductions }, { onConflict: "teacher_id,month" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markPaid(id: string) {
    const { data, error } = await supabase
      .from("salary_records")
      .update({ status: "paid", paid_date: new Date().toISOString().slice(0, 10) })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Own salary history — RLS restricts this to the teacher themself or staff. */
  async historyFor(teacherId: string) {
    const { data, error } = await supabase
      .from("salary_records")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("month", { ascending: false });
    if (error) throw error;
    return data;
  },

  async forMonth(month: string) {
    const { data, error } = await supabase
      .from("salary_records")
      .select("*, teachers(profiles(full_name))")
      .eq("month", month);
    if (error) throw error;
    return data;
  },
};
