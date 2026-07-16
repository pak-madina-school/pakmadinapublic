import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { monthlyWeeklyProgressApi, type CompletionLogFilters } from "../../api/syllabus";
import type { TopicCompletionLogRow, ClassRow, SectionRow, SubjectRow } from "../../types/database";
import { classesApi } from "../../api/classes";
import { sectionsApi } from "../../api/sections";
import { subjectsApi } from "../../api/subjects";
import { Card, Select } from "./ui";

export default function MonthlyWeeklyProgress() {
  const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");
  const [filters, setFilters] = useState<CompletionLogFilters>({});
  const [log, setLog] = useState<TopicCompletionLogRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cl, sec, sub] = await Promise.all([classesApi.list(), sectionsApi.listAll(), subjectsApi.list()]);
        setClasses(cl);
        setSections(sec);
        setSubjects(sub);
      } catch (e: any) {
        setError(e.message ?? String(e));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await monthlyWeeklyProgressApi.fetchLog(filters);
        setLog(rows);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [filters]);

  const buckets = useMemo(
    () => (granularity === "weekly" ? monthlyWeeklyProgressApi.weekly(log) : monthlyWeeklyProgressApi.monthly(log)),
    [log, granularity]
  );

  return (
    <div className="space-y-5">
      <Card title="Filters">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Class</label>
            <Select
              value={filters.classId ?? ""}
              onChange={(v) => setFilters((f) => ({ ...f, classId: v || undefined }))}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="All classes"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Section</label>
            <Select
              value={filters.sectionId ?? ""}
              onChange={(v) => setFilters((f) => ({ ...f, sectionId: v || undefined }))}
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="All sections"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Subject</label>
            <Select
              value={filters.subjectId ?? ""}
              onChange={(v) => setFilters((f) => ({ ...f, subjectId: v || undefined }))}
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="All subjects"
            />
          </div>
          <div className="flex rounded-xl border border-[#16324F]/15 overflow-hidden ml-auto">
            <button
              onClick={() => setGranularity("weekly")}
              className={`px-3 py-2 text-sm font-semibold ${granularity === "weekly" ? "bg-[#16324F] text-white" : "text-[#16324F]"}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGranularity("monthly")}
              className={`px-3 py-2 text-sm font-semibold ${granularity === "monthly" ? "bg-[#16324F] text-white" : "text-[#16324F]"}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-[#B5533C]">{error}</p>}

      <Card title={`Topics completed per ${granularity === "weekly" ? "week" : "month"}`}>
        {loading ? (
          <p className="text-sm text-[#5b6b7a]">Loading…</p>
        ) : buckets.length === 0 ? (
          <p className="text-sm text-[#5b6b7a]">No completed topics in this range yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16324F10" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b6b7a" }} interval={granularity === "weekly" ? 1 : 0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5b6b7a" }} />
                <Tooltip />
                <Line type="monotone" dataKey="completedCount" name="Topics completed" stroke="#2C6E9B" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
