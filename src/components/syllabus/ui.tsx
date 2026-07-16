import React from "react";

export function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#16324F]/8 p-5">
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-[#16324F]">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function ProgressBar({ pct, height = 8 }: { pct: number; height?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 75 ? "#2E7D5B" : clamped >= 40 ? "#C9A24B" : "#B5533C";
  return (
    <div className="w-full rounded-full bg-[#16324F]/8" style={{ height }}>
      <div className="rounded-full transition-all" style={{ width: `${clamped}%`, height, backgroundColor: color }} />
    </div>
  );
}

export function StatusPill({ status }: { status: "pending" | "in-progress" | "completed" }) {
  const styles: Record<string, string> = {
    pending: "bg-[#16324F]/8 text-[#5b6b7a]",
    "in-progress": "bg-[#C9A24B]/15 text-[#8a6a1f]",
    completed: "bg-[#2E7D5B]/12 text-[#2E7D5B]",
  };
  const labels: Record<string, string> = { pending: "Pending", "in-progress": "In progress", completed: "Completed" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>{labels[status]}</span>;
}

export function RiskPill({ risk }: { risk: "low" | "medium" | "high" }) {
  const styles: Record<string, string> = {
    low: "bg-[#2E7D5B]/12 text-[#2E7D5B]",
    medium: "bg-[#C9A24B]/15 text-[#8a6a1f]",
    high: "bg-[#B5533C]/12 text-[#B5533C]",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[risk]}`}>{risk.toUpperCase()} RISK</span>;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-[#16324F]/15 px-3 py-2 text-sm outline-none focus:border-[#2C6E9B] bg-white text-[#16324F]"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
