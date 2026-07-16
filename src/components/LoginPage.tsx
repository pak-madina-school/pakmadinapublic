import React, { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await login(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#16324F]/8 p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#C9A24B] flex items-center justify-center">
            <GraduationCap size={20} className="text-[#16324F]" />
          </div>
          <span className="font-bold text-[#16324F]" style={{ fontFamily: "'Source Serif 4', serif" }}>
            Pak Madina Public School
          </span>
        </div>
        <h1 className="text-lg font-semibold text-[#16324F] mb-1">Sign in</h1>
        <p className="text-sm text-[#5b6b7a] mb-6">Use the account provided by your school administrator.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#16324F]/15 px-3 py-2.5 text-sm outline-none focus:border-[#2C6E9B]"
              placeholder="you@pakmadinaschool.pk"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5b6b7a] mb-1 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#16324F]/15 px-3 py-2.5 text-sm outline-none focus:border-[#2C6E9B]"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-[#B5533C]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#16324F] text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-[#16324F]/90 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
