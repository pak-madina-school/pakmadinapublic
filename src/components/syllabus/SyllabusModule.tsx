import React, { useState } from "react";
import { ListChecks, BarChart3, CalendarRange, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { SyllabusRow } from "../../types/database";
import SyllabusManagement from "./SyllabusManagement";
import ChapterTopicManager from "./ChapterTopicManager";
import ProgressDashboard from "./ProgressDashboard";
import MonthlyWeeklyProgress from "./MonthlyWeeklyProgress";
import AiPrediction from "./AiPrediction";

type Tab = "manage" | "progress" | "trend" | "predict";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "manage", label: "Syllabus & Chapters", icon: ListChecks },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "trend", label: "Monthly & Weekly", icon: CalendarRange },
  { id: "predict", label: "AI Prediction", icon: Sparkles },
];

export default function SyllabusModule() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "superadmin" || profile?.role === "admin";
  const [tab, setTab] = useState<Tab>("manage");
  const [openSyllabus, setOpenSyllabus] = useState<SyllabusRow | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F7FA]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-white border-b border-[#16324F]/8 px-6 py-4">
        <h1 className="text-lg font-bold text-[#16324F]" style={{ fontFamily: "'Source Serif 4', serif" }}>
          Syllabus Tracking
        </h1>
        <p className="text-xs text-[#5b6b7a]">Chapters, topics, completion tracking, and progress across the school.</p>
      </header>

      <nav className="bg-white border-b border-[#16324F]/8 px-6 flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              if (id !== "manage") setOpenSyllabus(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === id ? "border-[#16324F] text-[#16324F]" : "border-transparent text-[#5b6b7a] hover:text-[#16324F]"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <main className="p-6 max-w-5xl mx-auto">
        {tab === "manage" &&
          (openSyllabus ? (
            <ChapterTopicManager syllabus={openSyllabus} onBack={() => setOpenSyllabus(null)} />
          ) : (
            <SyllabusManagement onOpenSyllabus={setOpenSyllabus} isStaff={isStaff} />
          ))}
        {tab === "progress" && <ProgressDashboard />}
        {tab === "trend" && <MonthlyWeeklyProgress />}
        {tab === "predict" && <AiPrediction />}
      </main>
    </div>
  );
}
