import React, { useState } from "react";
import { Loader2, GraduationCap, Users, BookOpen, LogOut, Wallet, ClipboardCheck } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import SyllabusModule from "./components/syllabus/SyllabusModule";
import TeacherAccounts from "./components/admin/TeacherAccounts";
import FeesDashboard from "./components/fees/FeesDashboard";
import AttendanceDashboard from "./components/attendance/AttendanceDashboard";

function Gate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]"><Loader2 className="animate-spin text-[#16324F]" size={28} /></div>;
  if (!session || !profile) return <LoginPage />;
  return <>{children}</>;
}
type Tab = "syllabus" | "teachers" | "fees" | "attendance";
function Shell() {
  const { profile, logout } = useAuth();
  const isStaff = profile?.role === "superadmin" || profile?.role === "admin";
  const [tab, setTab] = useState<Tab>("fees");
  const nav: {id:Tab;label:string;icon:React.ElementType}[] = [
    {id:"fees",label:"Smart Fees",icon:Wallet},{id:"attendance",label:"Attendance",icon:ClipboardCheck},
    {id:"syllabus",label:"Syllabus",icon:BookOpen},{id:"teachers",label:"Teachers",icon:Users},
  ];
  return <div className="min-h-screen bg-[#F5F7FA]" style={{fontFamily:"'Inter', sans-serif"}}>
    <header className="sticky top-0 z-30 bg-[#16324F] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C9A24B]"><GraduationCap size={18} className="text-[#16324F}"/></div><span className="truncate font-bold tracking-tight" style={{fontFamily:"'Source Serif 4', serif"}}>Pak Madina Public School</span></div>
        <div className="flex shrink-0 items-center gap-3"><span className="hidden text-xs text-white/70 md:inline">{profile?.full_name}</span><button onClick={logout} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C6E9B] hover:bg-[#2C6E9B]/80" title="Sign out"><LogOut size={14}/></button></div>
      </div>
      {isStaff&&<nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2">{nav.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setTab(id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${tab===id?"bg-white text-[#16324F]":"bg-white/10 text-white/80 hover:text-white"}`}><Icon size={14}/>{label}</button>)}</nav>}
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">{!isStaff?<SyllabusModule/>:tab==="fees"?<FeesDashboard/>:tab==="attendance"?<AttendanceDashboard/>:tab==="teachers"?<TeacherAccounts/>:<SyllabusModule/>}</main>
  </div>;
}
export default function AppRoot(){return <AuthProvider><Gate><Shell/></Gate></AuthProvider>;}
