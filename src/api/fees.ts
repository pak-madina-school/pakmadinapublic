import { supabase } from "../lib/supabaseClient";

export const feesApi = {
  async heads() {
    const { data, error } = await supabase.from("fee_heads").select("*").order("name");
    if (error) throw error;
    return data;
  },
  async structureFor(classId: string, session: string) {
    const { data, error } = await supabase
      .from("fee_structures")
      .select("*, fee_heads(name, frequency)")
      .eq("class_id", classId)
      .eq("academic_session", session);
    if (error) throw error;
    return data;
  },
  async setStructure(class_id: string, fee_head_id: string, amount: number, academic_session: string) {
    const { data, error } = await supabase
      .from("fee_structures")
      .upsert({ class_id, fee_head_id, amount, academic_session }, { onConflict: "class_id,fee_head_id,academic_session" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Generates a due fee_payments row per student in a class for a given fee head + due date. */
  async generateForClass(classId: string, feeHeadId: string, amount: number, dueDate: string) {
    const { data: students, error: sErr } = await supabase.from("students").select("id").eq("class_id", classId);
    if (sErr) throw sErr;
    if (!students?.length) return 0;
    const { data, error } = await supabase
      .from("fee_payments")
      .insert(students.map((s) => ({ student_id: s.id, fee_head_id: feeHeadId, amount_due: amount, due_date: dueDate })))
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },

  async recordPayment(id: string, amountPaid: number, recordedBy: string, receiptNo: string) {
    const { data, error } = await supabase
      .from("fee_payments")
      .update({
        amount_paid: amountPaid,
        status: "paid",
        paid_date: new Date().toISOString().slice(0, 10),
        recorded_by: recordedBy,
        receipt_no: receiptNo,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async outstandingForStudent(studentId: string) {
    const { data, error } = await supabase
      .from("fee_payments")
      .select("*, fee_heads(name)")
      .eq("student_id", studentId)
      .neq("status", "paid");
    if (error) throw error;
    return data;
  },

  async outstandingReport() {
    const { data, error } = await supabase
      .from("fee_payments")
      .select("*, students(name, class_id), fee_heads(name)")
      .neq("status", "paid");
    if (error) throw error;
    return data;
  },
};
