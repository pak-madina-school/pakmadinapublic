import React, { useState } from "react";
import { Loader2, GraduationCap, Users, BookOpen, LogOut } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import SyllabusModule from "./components/syllabus/SyllabusModule";
import TeacherAccounts from "./components/admin/TeacherAccounts";

function Gate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <Loader2 className="animate-spin text-[#16324F]" size={28} />
      </div>
    );
  }

  if (!session || !profile) return <LoginPage />;

  return <>{children}</>;
}

type Tab = "syllabus" | "teachers";

function Shell() {
  const { profile, logout } = useAuth();
  const isStaff = profile?.role === "superadmin" || profile?.role === "admin";
  const [tab, setTab] = useState<Tab>("syllabus");

  return (
    <div className="min-h-screen bg-[#F5F7FA]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-[#16324F] text-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#C9A24B] flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-[#16324F]" />
            </div>
            <span className="font-bold tracking-tight truncate" style={{ fontFamily: "'Source Serif 4', serif" }}>
              Pak Madina Public School
            </span>
          </div>

          {isStaff && (
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full p-1 shrink-0">
              <button
                onClick={() => setTab("syllabus")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  tab === "syllabus" ? "bg-white text-[#16324F]" : "text-white/80 hover:text-white"
                }`}
              >
                <BookOpen size={14} /> Syllabus Tracking
              </button>
              <button
                onClick={() => setTab("teachers")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  tab === "teachers" ? "bg-white text-[#16324F]" : "text-white/80 hover:text-white"
                }`}
              >
                <Users size={14} /> Teacher Accounts
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-white/70 hidden md:inline">{profile?.full_name}</span>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full bg-[#2C6E9B] flex items-center justify-center hover:bg-[#2C6E9B]/80"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {isStaff && (
          <div className="sm:hidden flex gap-1 px-3 pb-2">
            {(["syllabus", "teachers"] as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  tab === k ? "bg-white text-[#16324F]" : "bg-white/10 text-white/80"
                }`}
              >
                {k === "syllabus" ? "Syllabus Tracking" : "Teacher Accounts"}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {!isStaff && <SyllabusModule />}
        {isStaff && tab === "syllabus" && <SyllabusModule />}
        {isStaff && tab === "teachers" && <TeacherAccounts />}
      </main>
    </div>
  );
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <Gate>
        <Shell />
      </Gate>
    </AuthProvider>
  );
}
