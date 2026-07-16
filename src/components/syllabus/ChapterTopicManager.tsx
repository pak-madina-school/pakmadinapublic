import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { chaptersApi, topicsApi } from "../../api/syllabus";
import type { SyllabusRow, ChapterRow, TopicRow, TopicStatus } from "../../types/database";
import { Card, ProgressBar, StatusPill } from "./ui";

export default function ChapterTopicManager({ syllabus, onBack }: { syllabus: SyllabusRow; onBack: () => void }) {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [topicsByChapter, setTopicsByChapter] = useState<Record<string, TopicRow[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newChapterName, setNewChapterName] = useState("");
  const [newTopicName, setNewTopicName] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadChapters() {
    setLoading(true);
    setError(null);
    try {
      const ch = await chaptersApi.listBySyllabus(syllabus.id);
      setChapters(ch);
      const entries = await Promise.all(ch.map(async (c) => [c.id, await topicsApi.listByChapter(c.id)] as const));
      setTopicsByChapter(Object.fromEntries(entries));
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllabus.id]);

  const totalTopics = Object.values(topicsByChapter).flat().length;
  const completedTopics = Object.values(topicsByChapter)
    .flat()
    .filter((t) => t.status === "completed").length;
  const pct = totalTopics === 0 ? 0 : Math.round((100 * completedTopics) / totalTopics);

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    try {
      await chaptersApi.create({ syllabus_id: syllabus.id, name: newChapterName.trim(), sort_order: chapters.length });
      setNewChapterName("");
      await loadChapters();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function removeChapter(id: string) {
    if (!confirm("Delete this chapter and all its topics?")) return;
    try {
      await chaptersApi.remove(id);
      await loadChapters();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function addTopic(chapterId: string) {
    const name = (newTopicName[chapterId] ?? "").trim();
    if (!name) return;
    try {
      await topicsApi.create({ chapter_id: chapterId, name, sort_order: (topicsByChapter[chapterId] ?? []).length });
      setNewTopicName((s) => ({ ...s, [chapterId]: "" }));
      await loadChapters();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function cycleStatus(topic: TopicRow) {
    const next: Record<TopicStatus, TopicStatus> = {
      pending: "in-progress",
      "in-progress": "completed",
      completed: "pending",
    };
    try {
      await topicsApi.setStatus(topic.id, next[topic.status]);
      await loadChapters();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function removeTopic(id: string) {
    try {
      await topicsApi.remove(id);
      await loadChapters();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  const statusIcon = (status: TopicStatus) => {
    if (status === "completed") return <CheckCircle2 size={18} className="text-[#2E7D5B]" />;
    if (status === "in-progress") return <CircleDot size={18} className="text-[#C9A24B]" />;
    return <Circle size={18} className="text-[#16324F]/30" />;
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#2C6E9B] hover:underline">
        <ArrowLeft size={16} /> Back to syllabus list
      </button>

      <Card title="Progress for this syllabus">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar pct={pct} height={10} />
          </div>
          <span className="text-sm font-semibold text-[#16324F] w-24 text-right">
            {completedTopics}/{totalTopics} ({pct}%)
          </span>
        </div>
      </Card>

      {error && <p className="text-sm text-[#B5533C]">{error}</p>}

      <Card
        title="Chapters"
        action={
          <form onSubmit={addChapter} className="flex items-center gap-2">
            <input
              value={newChapterName}
              onChange={(e) => setNewChapterName(e.target.value)}
              placeholder="New chapter name"
              className="rounded-xl border border-[#16324F]/15 px-3 py-1.5 text-sm outline-none focus:border-[#2C6E9B]"
            />
            <button type="submit" className="flex items-center gap-1 bg-[#16324F] text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#16324F]/90">
              <Plus size={14} /> Add chapter
            </button>
          </form>
        }
      >
        {loading ? (
          <p className="text-sm text-[#5b6b7a]">Loading…</p>
        ) : chapters.length === 0 ? (
          <p className="text-sm text-[#5b6b7a]">No chapters yet. Add the first one above.</p>
        ) : (
          <div className="space-y-3">
            {chapters.map((chapter) => {
              const topics = topicsByChapter[chapter.id] ?? [];
              const done = topics.filter((t) => t.status === "completed").length;
              const isOpen = expanded[chapter.id] ?? true;
              return (
                <div key={chapter.id} className="border border-[#16324F]/8 rounded-xl">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      className="flex items-center gap-2 text-left"
                      onClick={() => setExpanded((s) => ({ ...s, [chapter.id]: !isOpen }))}
                    >
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="font-semibold text-sm text-[#16324F]">{chapter.name}</span>
                      <span className="text-xs text-[#5b6b7a]">
                        {done}/{topics.length} topics
                      </span>
                    </button>
                    <button onClick={() => removeChapter(chapter.id)} className="text-[#B5533C] hover:opacity-70">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2">
                      {topics.map((topic) => (
                        <div key={topic.id} className="flex items-center justify-between bg-[#F5F7FA] rounded-lg px-3 py-2">
                          <button onClick={() => cycleStatus(topic)} className="flex items-center gap-2 text-left flex-1">
                            {statusIcon(topic.status)}
                            <span className="text-sm text-[#16324F]">{topic.name}</span>
                          </button>
                          <div className="flex items-center gap-3">
                            <StatusPill status={topic.status} />
                            <button onClick={() => removeTopic(topic.id)} className="text-[#B5533C] hover:opacity-70">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={newTopicName[chapter.id] ?? ""}
                          onChange={(e) => setNewTopicName((s) => ({ ...s, [chapter.id]: e.target.value }))}
                          placeholder="New topic name"
                          className="flex-1 rounded-xl border border-[#16324F]/15 px-3 py-1.5 text-sm outline-none focus:border-[#2C6E9B]"
                        />
                        <button
                          onClick={() => addTopic(chapter.id)}
                          className="flex items-center gap-1 bg-[#16324F]/8 text-[#16324F] text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#16324F]/15"
                        >
                          <Plus size={14} /> Add topic
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
