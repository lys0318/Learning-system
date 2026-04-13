"use client";

import { useState } from "react";

interface StudentData {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  progress: number;
  avgQuizScore: number | null;
  assignmentDone: number;
  assignmentTotal: number;
}

interface Recommendation {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  progress: number;
  avgQuizScore: number | null;
  assignmentDone: number;
  assignmentTotal: number;
  reason: string;
  suggestedMessage: string;
}

interface Props {
  students: StudentData[];
}

export default function StudentCareAdvisorClient({ students }: Props) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState("");
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setRecommendations([]);
    setEditedMessages({});
    setSentMap({});

    try {
      const res = await fetch("/api/student-care-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "분석 중 오류가 발생했습니다.");
        return;
      }
      setRecommendations(data.recommendations ?? []);
      setAnalyzed(true);

      // 메시지 초기값 세팅
      const initial: Record<string, string> = {};
      for (const r of data.recommendations ?? []) {
        initial[`${r.studentId}__${r.courseId}`] = r.suggestedMessage;
      }
      setEditedMessages(initial);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(rec: Recommendation) {
    const key = `${rec.studentId}__${rec.courseId}`;
    const content = editedMessages[key] ?? rec.suggestedMessage;
    if (!content.trim()) return;

    setSendingMap((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: rec.courseId,
          studentId: rec.studentId,
          content: content.trim(),
        }),
      });
      if (res.ok) {
        setSentMap((prev) => ({ ...prev, [key]: true }));
      }
    } finally {
      setSendingMap((prev) => ({ ...prev, [key]: false }));
    }
  }

  const atRiskCount = students.filter(
    (s) => s.progress < 60 || (s.avgQuizScore !== null && s.avgQuizScore < 60) || (s.assignmentTotal > 0 && s.assignmentDone === 0)
  ).length;

  return (
    <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
            🤖
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI 수강생 케어 어시스턴트</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              학습 데이터를 분석하여 관심이 필요한 학생을 찾고 격려 메시지를 추천합니다
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {atRiskCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-500 dark:text-amber-400 font-medium">
              관심 필요 {atRiskCount}명
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={loading || students.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
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
              <>{analyzed ? "다시 분석" : "AI 분석 시작"}</>
            )}
          </button>
        </div>
      </div>

      {/* 결과 영역 */}
      <div className="p-5">
        {error && (
          <p className="text-sm text-red-400 text-center py-4">{error}</p>
        )}

        {!analyzed && !loading && !error && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">AI 분석 시작 버튼을 누르면</p>
            <p className="text-sm mt-1">학습이 저조한 학생을 자동으로 찾아 맞춤 메시지를 추천해드립니다.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8 text-gray-400">
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-sm">수강생 학습 데이터를 분석하고 있습니다…</span>
          </div>
        )}

        {analyzed && !loading && recommendations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-medium text-green-400">모든 학생이 양호한 학습 상태입니다!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">진도율 60% 이상, 퀴즈 점수 60점 이상으로 관심이 필요한 학생이 없습니다.</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((rec) => {
              const key = `${rec.studentId}__${rec.courseId}`;
              const sent = sentMap[key];
              const sending = sendingMap[key];
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 transition-colors ${
                    sent
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5"
                  }`}
                >
                  {/* 학생 정보 */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0">
                        {rec.studentName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{rec.studentName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{rec.courseName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        진도 {rec.progress}%
                      </span>
                      {rec.avgQuizScore !== null && (
                        <span className={`px-2 py-0.5 rounded-full ${rec.avgQuizScore < 60 ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
                          퀴즈 {rec.avgQuizScore}점
                        </span>
                      )}
                      {rec.assignmentTotal > 0 && (
                        <span className={`px-2 py-0.5 rounded-full ${rec.assignmentDone === 0 ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
                          과제 {rec.assignmentDone}/{rec.assignmentTotal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI 분석 이유 */}
                  <div className="mb-3 px-3 py-2 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 font-medium">AI 분석</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{rec.reason}</p>
                  </div>

                  {/* 추천 메시지 (편집 가능) */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      추천 메시지 <span className="text-gray-400">(직접 수정 가능)</span>
                    </label>
                    <textarea
                      value={editedMessages[key] ?? rec.suggestedMessage}
                      onChange={(e) =>
                        setEditedMessages((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      disabled={sent}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* 전송 버튼 */}
                  <div className="flex justify-end">
                    {sent ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-400 font-medium">
                        <span>✓</span> 메시지 전송 완료
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSend(rec)}
                        disabled={sending || !(editedMessages[key] ?? rec.suggestedMessage).trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
                      >
                        {sending ? "전송 중…" : "💬 메시지 보내기"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
