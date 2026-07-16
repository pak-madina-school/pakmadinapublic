import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { progressApi } from "../../api/syllabus";
import type { ClassProgressView, SectionProgressView, SubjectProgressView, TeacherProgressView } from "../../types/database";
import { Card, ProgressBar } from "./ui";

function ProgressTable({ rows }: { rows: { label: string; total: number; completed: number; pct: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-[#5b6b7a]">No data yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="text-sm text-[#16324F] w-32 truncate">{r.label}</span>
          <div className="flex-1">
            <ProgressBar pct={r.pct} />
          </div>
          <span className="text-xs text-[#5b6b7a] w-24 text-right">
            {r.completed}/{r.total} · {r.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProgressDashboard() {
  const [overall, setOverall] = useState({ total_topics: 0, completed_topics: 0, completion_pct: 0 });
  const [byClass, setByClass] = useState<ClassProgressView[]>([]);
  const [bySection, setBySection] = useState<SectionProgressView[]>([]);
  const [bySubject, setBySubject] = useState<SubjectProgressView[]>([]);
  const [byTeacher, setByTeacher] = useState<TeacherProgressView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [o, c, s, sub, t] = await Promise.all([
          progressApi.overall(),
          progressApi.byClass(),
          progressApi.bySection(),
          progressApi.bySubject(),
          progressApi.byTeacher(),
        ]);
        setOverall(o);
        setByClass(c);
        setBySection(s);
        setBySubject(sub);
        setByTeacher(t);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-[#5b6b7a]">Loading progress…</p>;
  if (error) return <p className="text-sm text-[#B5533C]">{error}</p>;

  const chartData = byClass.map((c) => ({ name: c.class_name, pct: c.completion_pct }));

  return (
    <div className="space-y-5">
      <Card title="Overall syllabus completion">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar pct={overall.completion_pct} height={12} />
          </div>
          <span className="text-2xl font-bold text-[#16324F] w-20 text-right">{overall.completion_pct}%</span>
        </div>
        <p className="text-xs text-[#5b6b7a] mt-2">
          {overall.completed_topics} of {overall.total_topics} topics completed across the whole school.
        </p>
      </Card>

      <Card title="Class-wise progress">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16324F10" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5b6b7a" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#5b6b7a" }} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Completion"]} />
              <Bar dataKey="pct" fill="#2C6E9B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Section-wise progress">
          <ProgressTable rows={bySection.map((s) => ({ label: s.section_name, total: s.total_topics, completed: s.completed_topics, pct: s.completion_pct }))} />
        </Card>
        <Card title="Subject-wise progress">
          <ProgressTable rows={bySubject.map((s) => ({ label: s.subject_name, total: s.total_topics, completed: s.completed_topics, pct: s.completion_pct }))} />
        </Card>
      </div>

      <Card title="Teacher-wise progress">
        <ProgressTable rows={byTeacher.map((t) => ({ label: t.teacher_name, total: t.total_topics, completed: t.completed_topics, pct: t.completion_pct }))} />
      </Card>
    </div>
  );
}
