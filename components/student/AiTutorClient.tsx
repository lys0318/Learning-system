"use client";

import { useEffect, useRef, useState } from "react";

interface Course {
  id: string;
  title: string;
  progress: number;
  materialCount: number;
  teacherName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_TOPICS = [
  "기본 개념 설명해줘",
  "예제 코드 보여줘",
  "핵심 요약해줘",
  "연습 문제 내줘",
  "어떻게 활용하나요?",
];

interface Props {
  courses: Course[];
  todayCount: number;
}

export default function AiTutorClient({ courses, todayCount }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showCourseList, setShowCourseList] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const course = courses[selectedIdx] ?? null;

  // 강의 변경 시 히스토리 로드
  useEffect(() => {
    if (!course) return;
    setMessages([]);
    setHistoryLoaded(false);
    setSessionCount(0);

    fetch(`/api/chat/history?courseId=${course.id}`)
      .then((r) => r.json())
      .then((data: Message[]) => {
        setMessages(data);
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [selectedIdx]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming || !course) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, message: msg }),
      });
      if (!res.ok || !res.body) throw new Error("오류");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
      setSessionCount((c) => c + 1);
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "오류가 발생했습니다. 다시 시도해주세요.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        수강 중인 강의가 없습니다.
      </div>
    );
  }

  const totalQuestions = todayCount + sessionCount;
  const studyMinutes = Math.max(0, totalQuestions * 3);

  return (
    <div className="flex h-full min-h-0">
      {/* ── 채팅 영역 ── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-gray-700/50">
        {/* 채팅 헤더 */}
        <div className="px-5 py-3 border-b border-gray-700/50 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold">AI 튜터</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
              Claude 기반
            </span>
          </div>
          {course && (
            <span className="text-xs text-gray-400 truncate max-w-xs">
              {course.title} 강의 기반으로 답변합니다
            </span>
          )}
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {!historyLoaded ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500 text-sm">불러오는 중…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <p className="font-medium text-white">
                  {course?.title} AI 튜터입니다
                </p>
                <p className="text-sm mt-1">
                  강의 내용에 대해 궁금한 점을 자유롭게 물어보세요.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {msg.role === "user" ? "나" : "AI"}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-[#1e2a45] text-gray-100 rounded-tl-sm border border-gray-700/50"
                  }`}
                >
                  {msg.content}
                  {streaming &&
                    i === messages.length - 1 &&
                    msg.role === "assistant" && (
                      <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse rounded-sm" />
                    )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="border-t border-gray-700/50 px-5 py-3 shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming || !historyLoaded}
              placeholder="강의 내용에 대해 질문해보세요… (Enter 전송)"
              rows={1}
              className="flex-1 resize-none bg-[#1e2a45] border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim() || !historyLoaded}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              전송
            </button>
          </div>
        </div>
      </div>

      {/* ── 우측 패널 ── */}
      <div className="w-64 shrink-0 flex flex-col gap-5 px-4 py-5 overflow-y-auto">
        {/* 현재 강의 */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">현재 강의</p>
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{course?.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {course?.teacherName} 선생님
                </p>
              </div>
              <button
                onClick={() => setShowCourseList((v) => !v)}
                className="text-xs text-blue-400 hover:text-blue-300 shrink-0 mt-0.5"
              >
                변경
              </button>
            </div>

            {/* 진도 바 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{course?.progress}% 완료</span>
                {course && course.materialCount > 0 && (
                  <span className="text-gray-500">
                    {Math.round((course.progress / 100) * course.materialCount)}/{course.materialCount}강
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${course?.progress ?? 0}%` }}
                />
              </div>
            </div>

            {/* 강의 변경 목록 */}
            {showCourseList && (
              <div className="border-t border-gray-700/40 pt-2 space-y-1">
                {courses.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedIdx(idx);
                      setShowCourseList(false);
                    }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors truncate ${
                      idx === selectedIdx
                        ? "bg-blue-600/20 text-blue-300"
                        : "text-gray-400 hover:bg-gray-700/40 hover:text-white"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 자주 묻는 주제 */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">자주 묻는 주제</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => sendMessage(topic)}
                disabled={streaming}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-700/50 hover:bg-blue-600/20 hover:text-blue-300 text-gray-400 border border-gray-600/50 hover:border-blue-500/40 transition-colors disabled:opacity-50"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* 오늘의 학습 통계 */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">오늘의 학습 통계</p>
          <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 text-xs">질문 횟수</span>
              <span className="font-semibold text-xs">{totalQuestions}회</span>
            </div>
            <div className="border-t border-gray-700/40" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 text-xs">추정 학습 시간</span>
              <span className="font-semibold text-xs">{studyMinutes}분</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
