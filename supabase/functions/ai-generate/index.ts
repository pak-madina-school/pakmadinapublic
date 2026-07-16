// Supabase Edge Function: ai-generate
// Single entry point for all AI generation (lesson plans, question papers,
// homework suggestions, syllabus/catch-up predictions). Keeps the Anthropic
// key server-side only.
//
// Deploy: supabase functions deploy ai-generate
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("\n");
}

function parseJsonLoose(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });

  // Only staff and teachers generate content; parents/students never call this directly.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from("profiles").select("role, status").eq("id", userData.user.id).single();
  if (!profile || profile.status !== "active" || !["superadmin", "admin", "teacher"].includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const body = await req.json();

  try {
    switch (body.kind) {
      case "lesson_plan": {
        const prompt = `Write a detailed, classroom-ready lesson plan for a Pakistani school.
Subject: ${body.subject}
Class: ${body.className}
Topic: ${body.topic}
Duration: ${body.durationMinutes ?? 40} minutes
Include: learning objectives, required materials, a warm-up activity, step-by-step teaching sequence with approximate timings, a short in-class assessment, and homework. Plain text, no markdown headers.`;
        const content = await callClaude(prompt);
        return new Response(JSON.stringify({ content }), { status: 200 });
      }

      case "homework": {
        const prompt = `Suggest a homework assignment for a Pakistani school.
Subject: ${body.subject}
Class: ${body.className}
Topic: ${body.topic}
Give a short title (max 8 words) and a clear instructions paragraph (3-5 sentences) appropriate to the class level.
Respond ONLY as JSON: {"title": "...", "description": "..."}`;
        const raw = await callClaude(prompt, 500);
        return new Response(JSON.stringify(parseJsonLoose(raw)), { status: 200 });
      }

      case "question_paper": {
        const sections = body.sections ?? ["mcq", "fill_blank", "true_false", "short", "long"];
        const prompt = `Create an exam question paper for a Pakistani school.
Subject: ${body.subject}
Class: ${body.className}
Chapters covered: ${(body.chapters ?? []).join(", ")}
Difficulty: ${body.difficulty ?? "mixed"}
Include only these sections: ${sections.join(", ")}.
Respond ONLY as JSON matching this shape (omit keys for sections not requested):
{
  "mcqs": [{"question": "...", "options": ["...","...","...","..."], "answer": "..."}],
  "fillBlanks": [{"question": "..."}],
  "trueFalse": [{"statement": "...", "answer": true}],
  "matching": [{"left": "...", "right": "..."}],
  "shortQuestions": ["..."],
  "longQuestions": ["..."],
  "practicalQuestions": ["..."]
}`;
        const raw = await callClaude(prompt, 2500);
        return new Response(JSON.stringify({ paper: parseJsonLoose(raw) }), { status: 200 });
      }

      case "syllabus_prediction": {
        const prompt = `Given this syllabus completion data for a teacher: ${JSON.stringify(body.progress)},
and that the academic session ends on ${body.sessionEndDate}, predict whether they will finish on time.
Respond ONLY as JSON: {"onTrack": true|false, "projectedCompletionDate": "YYYY-MM-DD", "riskLevel": "low"|"medium"|"high", "recommendation": "one sentence"}`;
        const raw = await callClaude(prompt, 400);
        return new Response(JSON.stringify(parseJsonLoose(raw)), { status: 200 });
      }

      case "catchup_suggestions": {
        const prompt = `A teacher is behind schedule on this syllabus: ${JSON.stringify(body.remainingTopics)}.
Remaining working days: ${body.remainingDays}. Suggest a realistic catch-up plan.
Respond ONLY as JSON: {"weeklyPlan": [{"week": 1, "topics": ["..."]}], "note": "one sentence of practical advice"}`;
        const raw = await callClaude(prompt, 800);
        return new Response(JSON.stringify(parseJsonLoose(raw)), { status: 200 });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown kind" }), { status: 400 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
