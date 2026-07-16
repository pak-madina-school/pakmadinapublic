import { supabase } from "../lib/supabaseClient";

export const libraryApi = {
  async listBooks(search?: string) {
    let query = supabase.from("library_books").select("*").order("title");
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async addBook(title: string, author: string, isbn: string, copies: number) {
    const { data, error } = await supabase
      .from("library_books")
      .insert({ title, author, isbn, total_copies: copies, available_copies: copies })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async issue(bookId: string, dueDate: string, studentId?: string, teacherId?: string) {
    const { data: book, error: bookErr } = await supabase.from("library_books").select("available_copies").eq("id", bookId).single();
    if (bookErr) throw bookErr;
    if (!book || book.available_copies < 1) throw new Error("No copies available");

    const { data, error } = await supabase
      .from("book_issues")
      .insert({ book_id: bookId, student_id: studentId, teacher_id: teacherId, due_date: dueDate })
      .select()
      .single();
    if (error) throw error;

    await supabase.from("library_books").update({ available_copies: book.available_copies - 1 }).eq("id", bookId);
    return data;
  },

  async returnBook(issueId: string, fineAmount = 0) {
    const { data: issue, error: issueErr } = await supabase.from("book_issues").select("book_id").eq("id", issueId).single();
    if (issueErr) throw issueErr;

    const { data, error } = await supabase
      .from("book_issues")
      .update({ return_date: new Date().toISOString().slice(0, 10), status: "available", fine_amount: fineAmount })
      .eq("id", issueId)
      .select()
      .single();
    if (error) throw error;

    const { data: book } = await supabase.from("library_books").select("available_copies").eq("id", issue.book_id).single();
    if (book) await supabase.from("library_books").update({ available_copies: book.available_copies + 1 }).eq("id", issue.book_id);
    return data;
  },

  async activeIssuesFor(studentId?: string, teacherId?: string) {
    let query = supabase.from("book_issues").select("*, library_books(title)").is("return_date", null);
    if (studentId) query = query.eq("student_id", studentId);
    if (teacherId) query = query.eq("teacher_id", teacherId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};
