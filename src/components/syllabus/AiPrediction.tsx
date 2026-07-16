import React, { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { syllabusApi, aiSyllabusApi, type SyllabusPredictionResult, type CatchupPlanResult } from "../../api/syllabus";
import { classesApi } from "../../api/classes";
import { sectionsApi } from "../../api/sections";
import { subjectsApi } from "../../api/subjects";
import type { SyllabusRow, ClassRow, SectionRow, SubjectRow } from "../../types/database";
import { Card, RiskPill, Select } from "./ui";

export default function AiPrediction() {
  const [syllabi, setSyllabi] = useState<SyllabusRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<SyllabusPredictionResult | null>(null);
  const [catchup, setCatchup] = useState<CatchupPlanResult | null>(null);
  const [remainingDays, setRemainingDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [catchupLoading, setCatchupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, cl, sec, sub] = await Promise.all([syllabusApi.list(), classesApi.list(), sectionsApi.listAll(), subjectsApi.list()]);
        setSyllabi(s);
        setClasses(cl);
        setSections(sec);
        setSubjects(sub);
      } catch (e: any) {
        setError(e.message ?? String(e));
      }
    })();
  }, []);

  function label(s: SyllabusRow) {
    const cls = classes.find((c) => c.id === s.class_id)?.name ?? "?";
    const sec = sections.find((x) => x.id === s.section_id)?.name ?? "?";
    const sub = subjects.find((x) => x.id === s.subject_id)?.name ?? "?";
    return `${cls}-${sec} · ${sub}`;
  }

  async function runPrediction() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await aiSyllabusApi.predict(selected);
      setResult(r);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runCatchup() {
    setCatchupLoading(true);
    setError(null);
    setCatchup(null);
    try {
      // A lightweight remaining-topics stand-in: staff can refine this later by
      // wiring it to the actual pending-topic names for the selected syllabus.
      const r = await aiSyllabusApi.catchupPlan(["Remaining chapters per current syllabus progress"], remainingDays);
      setCatchup(r);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setCatchupLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="AI Syllabus Prediction">
        <p className="text-xs text-[#5b6b7a] mb-4">
          Uses the shared <code>ai-generate</code> edge function to estimate whether a syllabus will finish before the
          academic session ends, based on current topic completion.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Syllabus</label>
            <Select
              value={selected}
              onChange={setSelected}
              options={syllabi.map((s) => ({ value: s.id, label: label(s) }))}
              placeholder="Select a syllabus"
            />
          </div>
          <button
            onClick={runPrediction}
            disabled={!selected || loading}
            className="flex items-center gap-1.5 bg-[#16324F] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#16324F]/90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Predict
          </button>
        </div>

        {error && <p className="text-sm text-[#B5533C] mt-3">{error}</p>}

        {result && (
          <div className="mt-4 border border-[#16324F]/8 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3">
              <RiskPill risk={result.riskLevel} />
              <span className="text-sm font-semibold text-[#16324F]">{result.onTrack ? "On track" : "Behind schedule"}</span>
            </div>
            <p className="text-sm text-[#16324F]">Projected completion: {result.projectedCompletionDate}</p>
            <p className="text-sm text-[#5b6b7a]">{result.recommendation}</p>
          </div>
        )}
      </Card>

      <Card title="Catch-up plan generator">
        <p className="text-xs text-[#5b6b7a] mb-4">For syllabi flagged medium/high risk above, generate a realistic weekly catch-up plan.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Remaining working days</label>
            <input
              type="number"
              min={1}
              value={remainingDays}
              onChange={(e) => setRemainingDays(Number(e.target.value))}
              className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm outline-none focus:border-[#2C6E9B] w-32"
            />
          </div>
          <button
            onClick={runCatchup}
            disabled={catchupLoading}
            className="flex items-center gap-1.5 bg-[#16324F]/8 text-[#16324F] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#16324F]/15 disabled:opacity-50"
          >
            {catchupLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate plan
          </button>
        </div>

        {catchup && (
          <div className="mt-4 space-y-3">
            {catchup.weeklyPlan.map((w) => (
              <div key={w.week} className="border border-[#16324F]/8 rounded-xl p-3">
                <p className="text-sm font-semibold text-[#16324F] mb-1">Week {w.week}</p>
                <ul className="list-disc list-inside text-sm text-[#5b6b7a]">
                  {w.topics.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-sm text-[#5b6b7a] italic">{catchup.note}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
