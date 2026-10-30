import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, Download, Search } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Card } from "../syllabus/ui";

type FeeRow = {
  id: string; student_id: string; month: number; year: number; fee_amount: number;
  discount_amount: number; previous_balance: number; paid_amount: number;
  total_due: number | null; remaining_amount: number | null; status: string | null;
  due_date: string | null;
  students?: { name: string; student_id: string | null; class_id: string } | null;
};
type ClassRow = { id: string; name: string };
const money = (v: number) => `Rs ${Math.round(v || 0).toLocaleString("en-PK")}`;
const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString("en", { month: "short" });
const balanceOf = (r: FeeRow) => Number(r.remaining_amount ?? Math.max(0, Number(r.total_due ?? (r.fee_amount-r.discount_amount+r.previous_balance))-r.paid_amount));

export default function FeesDashboard() {
  const [rows,setRows]=useState<FeeRow[]>([]); const [classes,setClasses]=useState<ClassRow[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const [search,setSearch]=useState(""); const [classFilter,setClassFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("outstanding"); const [monthFilter,setMonthFilter]=useState("all");
  const [yearFilter,setYearFilter]=useState(String(new Date().getFullYear()));
  const [selected,setSelected]=useState<FeeRow|null>(null); const [amount,setAmount]=useState("");
  const [method,setMethod]=useState("cash"); const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [classRes,first]=await Promise.all([
        supabase.from("classes").select("id,name").order("sort_order"),
        supabase.from("fee_records").select("id,student_id,month,year,fee_amount,discount_amount,previous_balance,paid_amount,total_due,remaining_amount,status,due_date,students!inner(name,student_id,class_id)").order("year",{ascending:false}).order("month",{ascending:false}).range(0,999)
      ]);
      if(classRes.error) throw classRes.error; if(first.error) throw first.error;
      let all=(first.data??[]) as unknown as FeeRow[];
      if(all.length===1000) {
        const second=await supabase.from("fee_records").select("id,student_id,month,year,fee_amount,discount_amount,previous_balance,paid_amount,total_due,remaining_amount,status,due_date,students!inner(name,student_id,class_id)").order("year",{ascending:false}).order("month",{ascending:false}).range(1000,1999);
        if(second.error) throw second.error; all=all.concat((second.data??[]) as unknown as FeeRow[]);
        if((second.data??[]).length===1000) {
          const third=await supabase.from("fee_records").select("id,student_id,month,year,fee_amount,discount_amount,previous_balance,paid_amount,total_due,remaining_amount,status,due_date,students!inner(name,student_id,class_id)").order("year",{ascending:false}).order("month",{ascending:false}).range(2000,2999);
          if(third.error) throw third.error; all=all.concat((third.data??[]) as unknown as FeeRow[]);
        }
      }
      setClasses((classRes.data??[]) as ClassRow[]); setRows(all);
    } catch(e:any) { setError(e.message??"Unable to load fee records."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[]);
  const classNames=useMemo(()=>new Map(classes.map(c=>[c.id,c.name])),[classes]);
  const filtered=useMemo(()=>rows.filter(r=>{
    const q=`${r.students?.name??""} ${r.students?.student_id??""}`.toLowerCase();
    return q.includes(search.toLowerCase()) &&
      (classFilter==="all"||r.students?.class_id===classFilter) &&
      (statusFilter==="all"||(statusFilter==="outstanding"?balanceOf(r)>0:balanceOf(r)<=0)) &&
      (monthFilter==="all"||r.month===Number(monthFilter)) &&
      (yearFilter==="all"||r.year===Number(yearFilter));
  }),[rows,search,classFilter,statusFilter,monthFilter,yearFilter]);
  const stats=useMemo(()=>{
    const due=rows.filter(r=>balanceOf(r)>0);
    return {records:rows.length,outstanding:due.length,balance:due.reduce((s,r)=>s+balanceOf(r),0),paid:rows.reduce((s,r)=>s+Number(r.paid_amount||0),0)};
  },[rows]);
  async function recordPayment(e:React.FormEvent) {
    e.preventDefault(); if(!selected)return;
    const value=Number(amount), balance=balanceOf(selected);
    if(!Number.isFinite(value)||value<=0||value>balance){setNotice(`Enter an amount from Rs 1 to ${money(balance)}.`);return;}
    setSaving(true);setNotice("");
    try {
      const {error:rpcError}=await (supabase as any).rpc("record_school_fee_payment",{p_fee_record_id:selected.id,p_amount:value,p_method:method,p_notes:notes||null});
      if(rpcError)throw rpcError;
      setNotice("Payment saved. Fee balance and receipt ledger updated.");setSelected(null);setAmount("");setNotes("");await load();
    } catch(e:any) {setNotice(e.message??"Payment was not saved. No balance was changed.");}
    finally{setSaving(false);}
  }
  function exportCsv() {
    const header=["Student","Student ID","Class","Month","Year","Fee","Discount","Previous Balance","Paid","Remaining","Status"];
    const lines=filtered.map(r=>[r.students?.name??"",r.students?.student_id??"",classNames.get(r.students?.class_id??"")??"",monthName(r.month),r.year,r.fee_amount,r.discount_amount,r.previous_balance,r.paid_amount,balanceOf(r),r.status??""]);
    const csv=[header,...lines].map(line=>line.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="pak-madina-fee-report.csv";a.click();URL.revokeObjectURL(url);
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#16324F]">Smart Fee Management</h2><p className="text-sm text-[#5b6b7a]">Fee ledger, outstanding balances and secure payment entry</p></div><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm font-semibold text-[#16324F]"><Download size={16}/>Export CSV</button></div>
    {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}{notice&&<div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{notice}</div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><p className="text-xs text-slate-500">Fee records</p><p className="text-2xl font-bold text-[#16324F]">{stats.records.toLocaleString()}</p></Card>
      <Card><p className="text-xs text-slate-500">Outstanding records</p><p className="text-2xl font-bold text-[#B5533C]">{stats.outstanding.toLocaleString()}</p></Card>
      <Card><p className="text-xs text-slate-500">Outstanding balance</p><p className="text-2xl font-bold text-[#16324F]">{money(stats.balance)}</p></Card>
      <Card><p className="text-xs text-slate-500">Recorded paid amount</p><p className="text-2xl font-bold text-[#2E7D5B]">{money(stats.paid)}</p></Card>
    </div>
    <Card><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Student name / ID" className="w-full rounded-xl border border-[#16324F]/15 py-2 pl-9 pr-3 text-sm"/></div>
      <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm"><option value="all">All classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm"><option value="outstanding">Outstanding only</option><option value="paid">Fully paid</option><option value="all">All statuses</option></select>
      <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)} className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm"><option value="all">All months</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{monthName(i+1)}</option>)}</select>
      <select value={yearFilter} onChange={e=>setYearFilter(e.target.value)} className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm"><option value="all">All years</option>{Array.from(new Set(rows.map(r=>r.year))).sort((a,b)=>b-a).map(y=><option key={y} value={y}>{y}</option>)}</select>
    </div></Card>
    <Card title={`Fee ledger · ${filtered.length.toLocaleString()} records`}>
      {loading?<p className="text-sm text-slate-500">Loading fee records…</p>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-3 pr-3">Student</th><th className="pr-3">Class</th><th className="pr-3">Period</th><th className="pr-3">Fee</th><th className="pr-3">Paid</th><th className="pr-3">Remaining</th><th className="pr-3">Status</th><th></th></tr></thead><tbody>
      {filtered.slice(0,250).map(r=>{const balance=balanceOf(r);return <tr key={r.id} className="border-b border-slate-100"><td className="py-3 pr-3"><div className="font-semibold text-[#16324F]">{r.students?.name??"Unknown student"}</div><div className="text-xs text-slate-500">{r.students?.student_id??"No ID"}</div></td><td className="pr-3">{classNames.get(r.students?.class_id??"")??"—"}</td><td className="pr-3">{monthName(r.month)} {r.year}</td><td className="pr-3">{money(r.fee_amount)}</td><td className="pr-3">{money(r.paid_amount)}</td><td className="pr-3 font-semibold">{money(balance)}</td><td className="pr-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${balance<=0?"bg-green-50 text-green-700":"bg-amber-50 text-amber-800"}`}>{balance<=0?"Paid":"Due"}</span></td><td>{balance>0&&<button onClick={()=>{setSelected(r);setAmount(String(balance));setNotice("");}} className="rounded-lg bg-[#16324F] px-3 py-1.5 text-xs font-semibold text-white"><CreditCard size={13} className="mr-1 inline"/>Receive</button>}</td></tr>})}
      </tbody></table>{filtered.length>250&&<p className="pt-3 text-xs text-slate-500">Showing the first 250 rows. Narrow the filters or export the full filtered report.</p>}{!filtered.length&&<p className="py-8 text-center text-sm text-slate-500">No fee records match these filters.</p>}</div>}
    </Card>
    {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-[#16324F]">Receive fee payment</h3><button onClick={()=>setSelected(null)} className="text-slate-500">✕</button></div>
      <p className="text-sm font-semibold">{selected.students?.name} · {monthName(selected.month)} {selected.year}</p><p className="mb-4 text-sm text-slate-500">Remaining: {money(balanceOf(selected))}</p>
      <form onSubmit={recordPayment} className="space-y-3">
        <label className="block text-xs font-semibold text-slate-600">Amount received (PKR)<input required type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"/></label>
        <label className="block text-xs font-semibold text-slate-600">Payment method<select value={method} onChange={e=>setMethod(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="easypaisa">EasyPaisa</option><option value="jazzcash">JazzCash</option><option value="other">Other</option></select></label>
        <label className="block text-xs font-semibold text-slate-600">Note (optional)<input value={notes} onChange={e=>setNotes(e.target.value)} maxLength={300} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Receipt note"/></label>
        <button disabled={saving} className="w-full rounded-xl bg-[#16324F] py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving…":"Confirm payment"}</button>
      </form>
    </div></div>}
  </div>;
}
