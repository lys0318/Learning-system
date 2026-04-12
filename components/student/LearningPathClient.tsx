"use client";

import { useRef, useState } from "react";

interface Stats {
  courseCount: number;
  completedCount: number;
  avgProgress: number;
  avgQuizScore: number | null;
  quizCount: number;
  assignmentTotal: number;
  assignmentDone: number;
}

interface Props {
  stats: Stats;
}

export default function LearningPathClient({ stats }: Props) {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    setResult("");

    try {
      const res = await fetch("/api/learning-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setResult(data.error ?? "오류가 발생했습니다.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setLoading(false);

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        const chunk = decoder.decode(value, { stream: true });
        setResult((prev) => prev + chunk);
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }
    } catch {
      setResult("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }

    setDone(true);
  }

  function renderMarkdown(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-base font-bold text-white mt-5 mb-2 first:mt-0">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-sm font-semibold text-gray-200 mt-3 mb-1">
            {line.slice(4)}
          </h3>
        );
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      );
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 mt-1 leading-relaxed text-gray-300 list-disc">
            {rendered}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={i} className="ml-4 mt-1 leading-relaxed text-gray-300 list-decimal">
            {rendered}
          </li>
        );
      }
      if (!line.trim()) return <div key={i} className="h-1" />;
      return (
        <p key={i} className="mt-1 leading-relaxed text-gray-300">
          {rendered}
        </p>
      );
    });
  }

  return (
    <div className="space-y-5">
      {/* 현재 학습 현황 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">수강 중</p>
          <p className="text-2xl font-bold">{stats.courseCount}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">완강 {stats.completedCount}개</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">평균 진도</p>
          <p className="text-2xl font-bold">{stats.avgProgress}%</p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.avgProgress}%` }} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">퀴즈 평균</p>
          <p className={`text-2xl font-bold ${stats.avgQuizScore !== null && stats.avgQuizScore >= 70 ? "text-green-400" : "text-yellow-400"}`}>
            {stats.avgQuizScore !== null ? `${stats.avgQuizScore}점` : "-"}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{stats.quizCount}회 응시</p>
        </div>
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">과제 제출</p>
          <p className="text-2xl font-bold">{stats.assignmentDone}/{stats.assignmentTotal}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
            {stats.assignmentTotal > 0
              ? `${Math.round((stats.assignmentDone / stats.assignmentTotal) * 100)}% 완료`
              : "과제 없음"}
          </p>
        </div>
      </div>

      {/* 목표 입력 + 추천 버튼 */}
      <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">
            🗺️
          </div>
          <div>
            <h2 className="font-semibold text-sm">AI 학습 경로 추천</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              현재 학습 데이터를 분석하여 맞춤형 로드맵을 제시합니다
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            학습 목표 (선택)
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="예: 백엔드 개발자가 되고 싶습니다 / 데이터 분석을 공부하고 있습니다..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              분석 중…
            </>
          ) : (
            <>🤖 AI 학습 경로 추천 받기</>
          )}
        </button>
      </div>

      {/* 추천 결과 */}
      {(result || loading) && (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700/40 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <p className="text-sm font-semibold">맞춤형 학습 로드맵</p>
            {!done && !loading && (
              <span className="ml-auto flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </span>
            )}
          </div>

          <div
            ref={containerRef}
            className="px-5 py-4 text-sm max-h-[60vh] overflow-y-auto"
          >
            {loading && !result && (
              <div className="flex items-center gap-3 text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                학습 데이터를 분석하고 있습니다…
              </div>
            )}
            {result && <div>{renderMarkdown(result)}</div>}

            {done && (
              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700/40 flex items-center justify-between">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span>🤖</span>
                  Claude AI가 생성한 분석입니다.
                </p>
                <button
                  onClick={handleGenerate}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  다시 생성
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
