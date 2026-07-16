import React, { useEffect, useState } from "react";
import { UserPlus, KeyRound, Ban, CheckCircle2, Trash2, X, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { accountsApi } from "../../api/accounts";
import { teachersApi, teacherAssignmentsApi } from "../../api/teachers";
import { classesApi } from "../../api/classes";
import { sectionsApi } from "../../api/sections";
import { subjectsApi } from "../../api/subjects";
import type { ClassRow, SectionRow, SubjectRow, TeacherAssignmentRow } from "../../types/database";
import { Card } from "../syllabus/ui";

type TeacherListRow = {
  id: string;
  phone: string | null;
  status: string;
  completion_pct: number;
  profiles: { full_name: string; email: string; status: string };
};

const inputCls =
  "w-full rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm outline-none focus:border-[#2C6E9B] bg-white";
const btnPrimary =
  "inline-flex items-center gap-1.5 bg-[#16324F] text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-[#16324F]/90 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-[#16324F] border border-[#16324F]/20 px-3 py-1.5 rounded-lg hover:bg-[#16324F]/5";

export default function TeacherAccounts() {
  const [teachers, setTeachers] = useState<TeacherListRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [t, cl, sec, sub, asg] = await Promise.all([
        teachersApi.list(),
        classesApi.list(),
        sectionsApi.listAll(),
        subjectsApi.list(),
        teacherAssignmentsApi.listAll(),
      ]);
      setTeachers(t as unknown as TeacherListRow[]);
      setClasses(cl);
      setSections(sec);
      setSubjects(sub);
      setAssignments(asg);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleDisable(id: string, currentlyActive: boolean) {
    try {
      if (currentlyActive) await accountsApi.disable(id);
      else await accountsApi.enable(id);
      flash(currentlyActive ? "Account disabled." : "Account re-enabled.");
      loadAll();
    } catch (e: any) {
      flash(e.message ?? "Couldn't update the account.");
    }
  }

  async function handleResetPassword(id: string, name: string) {
    const newPassword = window.prompt(`New password for ${name} (min 6 characters):`);
    if (!newPassword) return;
    try {
      await accountsApi.resetPassword(id, newPassword);
      flash(`Password reset for ${name}.`);
    } catch (e: any) {
      flash(e.message ?? "Couldn't reset the password.");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete ${name}'s account permanently? This can't be undone.`)) return;
    try {
      await accountsApi.delete(id);
      flash(`${name}'s account removed.`);
      loadAll();
    } catch (e: any) {
      flash(e.message ?? "Couldn't delete the account.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#16324F]" style={{ fontFamily: "'Source Serif 4', serif" }}>
            Teacher Accounts
          </h2>
          <p className="text-xs text-[#5b6b7a]">
            {teachers.length} of your teachers have a login. Each one only sees the classes, sections and subjects
            you assign them below.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> Add teacher
        </button>
      </div>

      {error && <p className="text-sm text-[#B5533C]">{error}</p>}
      {loading ? (
        <p className="text-sm text-[#5b6b7a] flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading teacher accounts…
        </p>
      ) : (
        <div className="space-y-3">
          {teachers.map((t) => {
            const active = t.profiles.status === "active";
            const myAssignments = assignments.filter((a) => a.teacher_id === t.id);
            const isOpen = expanded === t.id;
            return (
              <Card key={t.id}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#16324F] truncate">{t.profiles.full_name}</p>
                    <p className="text-xs text-[#5b6b7a] truncate">{t.profiles.email}</p>
                    <p className="text-xs text-[#5b6b7a] mt-0.5">
                      {myAssignments.length === 0
                        ? "No classes assigned yet"
                        : myAssignments
                            .map((a) => {
                              const cn = classes.find((c) => c.id === a.class_id)?.name;
                              const sn = sections.find((s) => s.id === a.section_id)?.name;
                              const su = subjects.find((s) => s.id === a.subject_id)?.name;
                              return `${su} · ${cn}-${sn}`;
                            })
                            .join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        active ? "bg-[#2E7D5B]/12 text-[#2E7D5B]" : "bg-[#B5533C]/12 text-[#B5533C]"
                      }`}
                    >
                      {active ? "Active" : "Disabled"}
                    </span>
                    <button className={btnGhost} onClick={() => setExpanded(isOpen ? null : t.id)}>
                      Assignments {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      className={btnGhost}
                      title="Reset password"
                      onClick={() => handleResetPassword(t.id, t.profiles.full_name)}
                    >
                      <KeyRound size={14} />
                    </button>
                    <button className={btnGhost} title={active ? "Disable" : "Enable"} onClick={() => handleDisable(t.id, active)}>
                      {active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </button>
                    <button
                      className={btnGhost + " text-[#B5533C] border-[#B5533C]/30"}
                      title="Delete"
                      onClick={() => handleDelete(t.id, t.profiles.full_name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <AssignmentEditor
                    teacherId={t.id}
                    classes={classes}
                    sections={sections}
                    subjects={subjects}
                    myAssignments={myAssignments}
                    onChanged={loadAll}
                    flash={flash}
                  />
                )}
              </Card>
            );
          })}
          {teachers.length === 0 && (
            <p className="text-sm text-[#5b6b7a] text-center py-8">
              No teacher accounts yet — add your first one above.
            </p>
          )}
        </div>
      )}

      {showCreate && <CreateTeacherModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadAll(); flash("Teacher account created."); }} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#16324F] text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function CreateTeacherModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await accountsApi.createTeacher(email.trim(), password, fullName.trim(), phone.trim() || undefined);
      onCreated();
    } catch (e: any) {
      setError(e.message ?? "Couldn't create the account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-[#16324F]" style={{ fontFamily: "'Source Serif 4', serif" }}>
            Add teacher
          </p>
          <button onClick={onClose} className="text-[#5b6b7a] hover:text-[#16324F]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Full name</label>
            <input className={inputCls} required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Email (their login)</label>
            <input type="email" className={inputCls} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@pakmadinaschool.pk" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Temporary password</label>
            <input className={inputCls} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 characters" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Phone (optional)</label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <p className="text-sm text-[#B5533C]">{error}</p>}
          <p className="text-xs text-[#5b6b7a]">
            After creating the account, expand "Assignments" on their row to give them classes, sections and subjects.
          </p>
          <button type="submit" disabled={submitting} className={btnPrimary + " w-full justify-center"}>
            {submitting && <Loader2 size={16} className="animate-spin" />} Create account
          </button>
        </form>
      </div>
    </div>
  );
}

function AssignmentEditor({
  teacherId,
  classes,
  sections,
  subjects,
  myAssignments,
  onChanged,
  flash,
}: {
  teacherId: string;
  classes: ClassRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
  myAssignments: TeacherAssignmentRow[];
  onChanged: () => void;
  flash: (m: string) => void;
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const sectionsForClass = sections.filter((s) => s.class_id === classId);

  useEffect(() => {
    if (sectionsForClass.length > 0 && !sectionsForClass.some((s) => s.id === sectionId)) {
      setSectionId(sectionsForClass[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, sections]);

  async function addAssignment() {
    if (!classId || !sectionId || !subjectId) return;
    setSaving(true);
    try {
      await teacherAssignmentsApi.assign(teacherId, classId, sectionId, subjectId);
      onChanged();
    } catch (e: any) {
      flash(e.message?.includes("duplicate") ? "That class-section-subject already has a teacher." : e.message ?? "Couldn't add the assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(id: string) {
    try {
      await teacherAssignmentsApi.remove(id);
      onChanged();
    } catch (e: any) {
      flash(e.message ?? "Couldn't remove the assignment.");
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#16324F]/8 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <select className={inputCls} value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={inputCls} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {sectionsForClass.map((s) => (
            <option key={s.id} value={s.id}>
              Section {s.name}
            </option>
          ))}
        </select>
        <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <button className={btnGhost} onClick={addAssignment} disabled={saving}>
        <Plus size={14} /> Add assignment
      </button>
      <div className="space-y-1.5">
        {myAssignments.map((a) => {
          const cn = classes.find((c) => c.id === a.class_id)?.name;
          const sn = sections.find((s) => s.id === a.section_id)?.name;
          const su = subjects.find((s) => s.id === a.subject_id)?.name;
          return (
            <div key={a.id} className="flex items-center justify-between bg-[#F5F7FA] rounded-lg px-3 py-2 text-sm">
              <span className="text-[#16324F] font-medium">
                {su} · {cn}-{sn}
              </span>
              <button onClick={() => removeAssignment(a.id)} className="text-[#B5533C]">
                <X size={14} />
              </button>
            </div>
          );
        })}
        {myAssignments.length === 0 && <p className="text-xs text-[#5b6b7a]">No assignments yet.</p>}
      </div>
    </div>
  );
}
