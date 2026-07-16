import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { syllabusApi } from "../../api/syllabus";
import { classesApi } from "../../api/classes";
import { sectionsApi } from "../../api/sections";
import { subjectsApi } from "../../api/subjects";
import { teachersApi } from "../../api/teachers";
import type { SyllabusRow, ClassRow, SectionRow, SubjectRow } from "../../types/database";
import { Card, Select } from "./ui";

type TeacherOption = { id: string; full_name: string };

export default function SyllabusManagement({
  onOpenSyllabus,
  isStaff,
}: {
  onOpenSyllabus: (syllabus: SyllabusRow) => void;
  isStaff: boolean;
}) {
  const [syllabi, setSyllabi] = useState<SyllabusRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ class_id: "", section_id: "", subject_id: "", teacher_id: "", academic_session: String(new Date().getFullYear()) });
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, cl, sec, sub, tch] = await Promise.all([
        syllabusApi.list(),
        classesApi.list(),
        sectionsApi.listAll(),
        subjectsApi.list(),
        teachersApi.list(),
      ]);
      setSyllabi(s);
      setClasses(cl);
      setSections(sec);
      setSubjects(sub);
      setTeachers((tch as any[]).map((t) => ({ id: t.id, full_name: t.profiles?.full_name ?? "—" })));
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const sectionsForClass = useMemo(() => sections.filter((s) => s.class_id === form.class_id), [sections, form.class_id]);

  function nameFor(list: { id: string; name: string }[], id: string) {
    return list.find((x) => x.id === id)?.name ?? "—";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.class_id || !form.section_id || !form.subject_id) return;
    setCreating(true);
    setError(null);
    try {
      await syllabusApi.create({
        class_id: form.class_id,
        section_id: form.section_id,
        subject_id: form.subject_id,
        teacher_id: form.teacher_id || null,
        academic_session: form.academic_session,
      });
      setForm((f) => ({ ...f, subject_id: "", teacher_id: "" }));
      await loadAll();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this syllabus and all its chapters/topics?")) return;
    try {
      await syllabusApi.remove(id);
      await loadAll();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  return (
    <div className="space-y-5">
      {isStaff && (
        <Card title="Add syllabus">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Class</label>
              <Select
                value={form.class_id}
                onChange={(v) => setForm((f) => ({ ...f, class_id: v, section_id: "" }))}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select class"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Section</label>
              <Select
                value={form.section_id}
                onChange={(v) => setForm((f) => ({ ...f, section_id: v }))}
                options={sectionsForClass.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select section"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Subject</label>
              <Select
                value={form.subject_id}
                onChange={(v) => setForm((f) => ({ ...f, subject_id: v }))}
                options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select subject"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Teacher</label>
              <Select
                value={form.teacher_id}
                onChange={(v) => setForm((f) => ({ ...f, teacher_id: v }))}
                options={teachers.map((t) => ({ value: t.id, label: t.full_name }))}
                placeholder="Unassigned"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Session</label>
              <input
                value={form.academic_session}
                onChange={(e) => setForm((f) => ({ ...f, academic_session: e.target.value }))}
                className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm outline-none focus:border-[#2C6E9B] w-24"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !form.class_id || !form.section_id || !form.subject_id}
              className="flex items-center gap-1.5 bg-[#16324F] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#16324F]/90 disabled:opacity-50"
            >
              <Plus size={16} /> Add
            </button>
          </form>
        </Card>
      )}

      {error && <p className="text-sm text-[#B5533C]">{error}</p>}

      <Card title={`Syllabus records (${syllabi.length})`}>
        {loading ? (
          <p className="text-sm text-[#5b6b7a]">Loading…</p>
        ) : syllabi.length === 0 ? (
          <p className="text-sm text-[#5b6b7a]">No syllabus records yet. Add one above to start tracking chapters and topics.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-[#5b6b7a] border-b border-[#16324F]/8">
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Teacher</th>
                  <th className="py-2 pr-4">Session</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {syllabi.map((s) => (
                  <tr key={s.id} className="border-b border-[#16324F]/5 last:border-0">
                    <td className="py-2.5 pr-4 text-[#16324F]">{nameFor(classes, s.class_id)}</td>
                    <td className="py-2.5 pr-4 text-[#16324F]">{nameFor(sections, s.section_id)}</td>
                    <td className="py-2.5 pr-4 text-[#16324F]">{nameFor(subjects, s.subject_id)}</td>
                    <td className="py-2.5 pr-4 text-[#5b6b7a]">{teachers.find((t) => t.id === s.teacher_id)?.full_name ?? "Unassigned"}</td>
                    <td className="py-2.5 pr-4 text-[#5b6b7a]">{s.academic_session}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onOpenSyllabus(s)}
                          className="flex items-center gap-1 text-[#2C6E9B] font-semibold hover:underline"
                        >
                          <BookOpen size={14} /> Chapters
                        </button>
                        {isStaff && (
                          <button onClick={() => handleDelete(s.id)} className="text-[#B5533C] hover:opacity-70">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
