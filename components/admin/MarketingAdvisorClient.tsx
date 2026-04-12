"use client";

import { useRef, useState } from "react";

interface Course {
  id: string;
  title: string;
  enrollCount: number;
  completionRate: number;
  avgProgress: number;
  avgQuizScore: number | null;
  avgRating: number | null;
  chatCount: number;
}

interface PlatformStats {
  totalCourses: number;
  totalEnroll: number;
  overallCompletionRate: number;
  overallAvgScore: number | null;
  totalChatCount: number;
}

interface Props {
  courses: Course[];
  platformStats: PlatformStats;
}

export default function MarketingAdvisorClient({ courses, platformStats }: Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    setResult("");

    try {
      const res = await fetch("/api/marketing-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId === "all" ? undefined : selectedCourseId,
          context: context.trim(),
        }),
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
          <h2 key={i} className="text-base font-bold text-white mt-6 mb-2 first:mt-0 flex items-center gap-1.5">
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
      {/* 플랫폼 요약 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "공개 강의", value: `${platformStats.totalCourses}개` },
          { label: "전체 수강 등록", value: `${platformStats.totalEnroll}건` },
          {
            label: "전체 수료율",
            value: `${platformStats.overallCompletionRate}%`,
            colored: platformStats.overallCompletionRate >= 60 ? "text-green-400" : "text-yellow-400",
          },
          {
            label: "퀴즈 평균 점수",
            value: platformStats.overallAvgScore !== null ? `${platformStats.overallAvgScore}점` : "-",
          },
          { label: "AI 튜터 질문", value: `${platformStats.totalChatCount}회` },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.colored ?? ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* 좌측: 강의 목록 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">강의 선택</h2>
          <div className="space-y-2">
            {/* 전체 플랫폼 */}
            <button
              onClick={() => setSelectedCourseId("all")}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                selectedCourseId === "all"
                  ? "bg-pink-600/15 border-pink-500/40 text-white"
                  : "bg-white dark:bg-[#16213e] border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <p className="font-semibold flex items-center gap-2">
                <span>🏢</span> 전체 플랫폼
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">모든 강의를 종합 분석</p>
            </button>

            {/* 강의별 */}
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  selectedCourseId === c.id
                    ? "bg-pink-600/15 border-pink-500/40 text-white"
                    : "bg-white dark:bg-[#16213e] border-gray-200 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <p className="font-medium truncate">{c.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{c.enrollCount}명 수강</span>
                  <span className={`text-xs font-medium ${c.completionRate >= 60 ? "text-green-400" : "text-yellow-400"}`}>
                    수료 {c.completionRate}%
                  </span>
                  {c.avgRating !== null && (
                    <span className="text-xs text-amber-400">★ {c.avgRating}</span>
                  )}
                </div>
                {/* 미니 진도 바 */}
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full"
                    style={{ width: `${c.completionRate}%` }}
                  />
                </div>
              </button>
            ))}

            {courses.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">공개된 강의가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 우측: 분석 패널 */}
        <div className="lg:col-span-3 space-y-4">
          {/* 선택된 강의 데이터 미리보기 */}
          {selectedCourseId !== "all" && selectedCourse && (
            <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">선택된 강의 데이터</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "수강생", value: `${selectedCourse.enrollCount}명` },
                  { label: "수료율", value: `${selectedCourse.completionRate}%`, colored: selectedCourse.completionRate >= 60 ? "text-green-400" : "text-yellow-400" },
                  { label: "평균 진도", value: `${selectedCourse.avgProgress}%` },
                  { label: "퀴즈 평균", value: selectedCourse.avgQuizScore !== null ? `${selectedCourse.avgQuizScore}점` : "-" },
                  { label: "AI 질문", value: `${selectedCourse.chatCount}회` },
                  { label: "강사 평점", value: selectedCourse.avgRating !== null ? `★${selectedCourse.avgRating}` : "-", colored: "text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
                    <p className={`text-sm font-bold ${s.colored ?? ""}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 추가 컨텍스트 + 생성 버튼 */}
          <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-lg shrink-0">
                📣
              </div>
              <div>
                <h2 className="font-semibold text-sm">AI 마케팅 조언</h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                  {selectedCourseId === "all" ? "전체 플랫폼" : `"${selectedCourse?.title}"`} 마케팅 전략을 분석합니다
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                추가 정보 / 홍보 목표 (선택)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="예: 직장인 대상 SNS 광고를 준비 중입니다 / 다음 달 수강생 2배 늘리고 싶습니다..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || (courses.length === 0 && selectedCourseId === "all")}
              className="w-full py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
                <>🤖 AI 마케팅 전략 생성</>
              )}
            </button>
          </div>

          {/* 스트리밍 결과 */}
          {(result || loading) && (
            <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700/40 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-sm shrink-0">
                  📣
                </div>
                <p className="text-sm font-semibold">마케팅 전략 리포트</p>
                {!done && result && (
                  <span className="ml-auto flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                    <span className="text-xs text-gray-500">생성 중…</span>
                  </span>
                )}
              </div>

              <div
                ref={containerRef}
                className="px-5 py-4 text-sm max-h-[70vh] overflow-y-auto"
              >
                {loading && !result && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    학습 데이터를 분석하고 마케팅 전략을 수립하고 있습니다…
                  </div>
                )}
                {result && <div>{renderMarkdown(result)}</div>}

                {done && (
                  <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700/40 flex items-center justify-between">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span>🤖</span>
                      Claude AI가 학습 데이터를 기반으로 생성한 마케팅 전략입니다.
                    </p>
                    <button
                      onClick={handleGenerate}
                      className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
                    >
                      다시 생성
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
