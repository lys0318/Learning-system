"use client";

import { useState } from "react";

interface TeacherData {
  teacherId: string;
  teacherName: string;
  courseCount: number;
  publishedCount: number;
  studentCount: number;
  completionRate: number;
  avgRating: number | null;
  ratingCount: number;
  qualityScore: number;
}

interface Recommendation {
  teacherId: string;
  teacherName: string;
  qualityScore: number;
  completionRate: number;
  avgRating: number | null;
  studentCount: number;
  reason: string;
  suggestedMessage: string;
}

interface Props {
  teachers: TeacherData[];
}

export default function TeacherCareAdvisorClient({ teachers }: Props) {
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
      const res = await fetch("/api/teacher-care-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teachers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "분석 중 오류가 발생했습니다.");
        return;
      }
      setRecommendations(data.recommendations ?? []);
      setAnalyzed(true);

      const initial: Record<string, string> = {};
      for (const r of data.recommendations ?? []) {
        initial[r.teacherId] = r.suggestedMessage;
      }
      setEditedMessages(initial);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(rec: Recommendation) {
    const content = editedMessages[rec.teacherId] ?? rec.suggestedMessage;
    if (!content.trim()) return;

    setSendingMap((prev) => ({ ...prev, [rec.teacherId]: true }));
    try {
      const res = await fetch("/api/admin-teacher-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: rec.teacherId, content: content.trim() }),
      });
      if (res.ok) {
        setSentMap((prev) => ({ ...prev, [rec.teacherId]: true }));
      }
    } finally {
      setSendingMap((prev) => ({ ...prev, [rec.teacherId]: false }));
    }
  }

  const atRiskCount = teachers.filter((t) => t.qualityScore < 70).length;

  return (
    <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg shrink-0">
            🤖
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI 강사 케어 어시스턴트</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              강사 품질 데이터를 분석하여 관리가 필요한 강사에게 보낼 메시지를 추천합니다
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {atRiskCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-400/15 border border-red-400/30 text-red-500 dark:text-red-400 font-medium">
              관리 필요 {atRiskCount}명
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={loading || teachers.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
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
            <p className="text-sm mt-1">품질 점수가 낮은 강사를 찾아 맞춤 관리 메시지를 추천해드립니다.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-8 text-gray-400">
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-sm">강사 성과 데이터를 분석하고 있습니다…</span>
          </div>
        )}

        {analyzed && !loading && recommendations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🏆</p>
            <p className="text-sm font-medium text-green-400">모든 강사가 우수한 품질을 유지하고 있습니다!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">품질 점수 70점 이상으로 관리가 필요한 강사가 없습니다.</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((rec) => {
              const sent = sentMap[rec.teacherId];
              const sending = sendingMap[rec.teacherId];
              return (
                <div
                  key={rec.teacherId}
                  className={`rounded-xl border p-4 transition-colors ${
                    sent
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-purple-500/20 bg-purple-500/5"
                  }`}
                >
                  {/* 강사 정보 */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-900/60 flex items-center justify-center text-xs font-medium text-purple-300 shrink-0">
                        {rec.teacherName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{rec.teacherName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">수강생 {rec.studentCount}명</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        rec.qualityScore < 40
                          ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                      }`}>
                        품질 {rec.qualityScore}점
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        rec.completionRate < 40
                          ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      }`}>
                        수료 {rec.completionRate}%
                      </span>
                      {rec.avgRating !== null && (
                        <span className={`px-2 py-0.5 rounded-full ${
                          rec.avgRating < 3.5
                            ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                        }`}>
                          ★ {rec.avgRating}
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
                      value={editedMessages[rec.teacherId] ?? rec.suggestedMessage}
                      onChange={(e) =>
                        setEditedMessages((prev) => ({ ...prev, [rec.teacherId]: e.target.value }))
                      }
                      disabled={sent}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* 전송 버튼 */}
                  <div className="flex justify-end">
                    {sent ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-400 font-medium">
                        <span>✓</span> 메시지 전송 완료 (강사 알림 발송됨)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSend(rec)}
                        disabled={sending || !(editedMessages[rec.teacherId] ?? rec.suggestedMessage).trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
                      >
                        {sending ? "전송 중…" : "📨 강사에게 메시지 보내기"}
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
