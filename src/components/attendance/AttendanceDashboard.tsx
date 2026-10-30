import React,{useEffect,useMemo,useState} from "react";
import {CheckCheck,RefreshCw} from "lucide-react";
import {useAuth} from "../../context/AuthContext";
import {classesApi} from "../../api/classes";
import {sectionsApi} from "../../api/sections";
import {studentsApi} from "../../api/students";
import {attendanceApi} from "../../api/attendance";
import type {ClassRow,SectionRow,StudentRow,AttendanceStatus} from "../../types/database";
import {Card} from "../syllabus/ui";
const statuses:AttendanceStatus[]=["present","absent","late","leave"];
const today=()=>{const n=new Date();return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10);};
export default function AttendanceDashboard(){
 const {profile}=useAuth();const [classes,setClasses]=useState<ClassRow[]>([]);const [sections,setSections]=useState<SectionRow[]>([]);const [students,setStudents]=useState<StudentRow[]>([]);
 const [classId,setClassId]=useState("");const [sectionId,setSectionId]=useState("");const [date,setDate]=useState(today());const [marks,setMarks]=useState<Record<string,AttendanceStatus>>({});
 const [loading,setLoading]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 useEffect(()=>{Promise.all([classesApi.list(),sectionsApi.listAll()]).then(([c,s])=>{setClasses(c);setSections(s);if(c[0])setClassId(c[0].id);}).catch(e=>setError(e.message??String(e)));},[]);
 const sectionOptions=useMemo(()=>sections.filter(s=>s.class_id===classId),[sections,classId]);
 useEffect(()=>{if(classId&&sectionOptions.length&&!sectionOptions.some(s=>s.id===sectionId))setSectionId(sectionOptions[0].id);},[classId,sectionOptions,sectionId]);
 async function loadRoster(){if(!classId||!sectionId||!date)return;setLoading(true);setError("");setMessage("");try{
  const [roster,existing]=await Promise.all([studentsApi.listByClassSection(classId,sectionId),attendanceApi.forSectionOnDate(classId,sectionId,date)]);
  setStudents((roster as any[]).filter(s=>s.status!=="inactive"&&s.status!=="left") as StudentRow[]);
  const next:Record<string,AttendanceStatus>={};existing.forEach(r=>{next[r.student_id]=r.status;});setMarks(next);
 }catch(e:any){setError(e.message??"Unable to load attendance register.");}finally{setLoading(false);}}
 useEffect(()=>{if(classId&&sectionId)void loadRoster();},[classId,sectionId,date]);
 const counts=useMemo(()=>statuses.reduce((a,s)=>{a[s]=Object.values(marks).filter(v=>v===s).length;return a;},{} as Record<AttendanceStatus,number>),[marks]);
 const markAll=(s:AttendanceStatus)=>setMarks(Object.fromEntries(students.map(st=>[st.id,s])));
 async function save(){if(!profile?.id){setError("Your login profile is missing. Sign in again.");return;}const entries=students.filter(s=>marks[s.id]).map(s=>({student_id:s.id,class_id:classId,section_id:sectionId,marked_by:profile.id,date,status:marks[s.id]}));if(!entries.length){setError("Select attendance for at least one student.");return;}setSaving(true);setError("");setMessage("");try{await attendanceApi.markBulk(entries);setMessage(`Saved attendance for ${entries.length} students.`);await loadRoster();}catch(e:any){setError(e.message??"Attendance could not be saved.");}finally{setSaving(false);}}
 return <div className="space-y-5">
  <div><h2 className="text-xl font-bold text-[#16324F]">Student Attendance</h2><p className="text-sm text-[#5b6b7a]">Choose a class, section and date, then save attendance.</p></div>
  {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}{message&&<div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</div>}
  <Card><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
   <label className="text-xs font-semibold text-slate-600">Class<select value={classId} onChange={e=>{setClassId(e.target.value);setSectionId("");}} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">Select class</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="text-xs font-semibold text-slate-600">Section<select value={sectionId} onChange={e=>setSectionId(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">Select section</option>{sectionOptions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label className="text-xs font-semibold text-slate-600">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label>
  </div></Card>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{statuses.map(s=><Card key={s}><p className="text-xs capitalize text-slate-500">{s}</p><p className="text-2xl font-bold text-[#16324F]">{counts[s]??0}</p></Card>)}</div>
  <Card title={`Class register · ${students.length} students`} action={<button onClick={()=>void loadRoster()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2C6E9B]"><RefreshCw size={14}/>Refresh</button>}>
   <div className="mb-4 flex flex-wrap gap-2"><button onClick={()=>markAll("present")} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">Mark all present</button><button onClick={()=>markAll("absent")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Mark all absent</button><button onClick={()=>setMarks({})} className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-600">Clear selections</button></div>
   {loading?<p className="py-6 text-sm text-slate-500">Loading class register…</p>:<div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-2 pr-3">#</th><th className="pr-3">Student</th><th className="pr-3">Student ID</th><th>Attendance</th></tr></thead><tbody>
    {students.map((s,i)=><tr key={s.id} className="border-b border-slate-100"><td className="py-2.5 pr-3 text-slate-400">{i+1}</td><td className="pr-3 font-medium text-[#16324F]">{s.name}</td><td className="pr-3 text-slate-500">{(s as any).student_id??s.roll_no??"—"}</td><td><select value={marks[s.id]??""} onChange={e=>setMarks(prev=>{const copy={...prev};if(e.target.value)copy[s.id]=e.target.value as AttendanceStatus;else delete copy[s.id];return copy;})} className="rounded-lg border px-2 py-1.5 text-xs"><option value="">Not marked</option>{statuses.map(st=><option key={st} value={st}>{st[0].toUpperCase()+st.slice(1)}</option>)}</select></td></tr>)}
   </tbody></table>{!students.length&&<p className="py-6 text-center text-sm text-slate-500">No active students in this section.</p>}</div>}
   <div className="mt-4 flex items-center justify-between border-t pt-4"><p className="text-xs text-slate-500">{Object.keys(marks).length} of {students.length} marked</p><button onClick={()=>void save()} disabled={saving||!students.length||!Object.keys(marks).length} className="inline-flex items-center gap-2 rounded-xl bg-[#16324F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCheck size={16}/>{saving?"Saving…":"Save attendance"}</button></div>
  </Card>
 </div>;
}