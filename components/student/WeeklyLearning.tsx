"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeMaterial, uncompleteMaterial } from "@/app/(student)/student/actions";
import SummaryModal from "@/components/student/SummaryModal";

const FILE_ICON: Record<string, string> = {
  pdf: "📄", ppt: "📊", image: "🖼️", video: "🎬", text: "📝", other: "📎",
};

function getFileCategory(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("presentationml") || mimeType.includes("powerpoint")) return "ppt";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";
  return "other";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DIFFICULTY_STYLE: Record<string, { label: string; cls: string }> = {
  easy:   { label: "쉬움",   cls: "bg-green-500/15 border-green-500/30 text-green-400" },
  normal: { label: "보통",   cls: "bg-blue-500/15 border-blue-500/30 text-blue-400" },
  hard:   { label: "어려움", cls: "bg-red-500/15 border-red-500/30 text-red-400" },
};

interface Material {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  week_number: number;
  downloadUrl: string | null;
}

interface Quiz {
  id: string;
  title: string;
  week_number: number;
  difficulty: string;
  questionCount: number;
}

interface Assignment {
  id: string;
  title: string;
  language: string;
  week_number: number;
  deadline: string | null;
  submitted: boolean;
  submitStatus: string | null;
}

interface Props {
  courseId: string;
  totalWeeks: number;
  materials: Material[];
  quizzes: Quiz[];
  assignments: Assignment[];
  initialCompletedIds: string[];
  initialCompletedQuizIds: string[];
  initialProgress: number;
}

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  java: "Java",
  c: "C",
};

export default function WeeklyLearning({
  courseId,
  totalWeeks,
  materials,
  quizzes,
  assignments,
  initialCompletedIds,
  initialCompletedQuizIds,
  initialProgress,
}: Props) {
  const [activeWeek, setActiveWeek] = useState(1);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds));
  const completedQuizIds = new Set(initialCompletedQuizIds);
  const submittedAssignmentIds = new Set(assignments.filter((a) => a.submitted).map((a) => a.id));
  const [progress, setProgress] = useState(initialProgress);
  const [isPending, startTransition] = useTransition();
  const [summaryTarget, setSummaryTarget] = useState<{ id: string; name: string } | null>(null);

  const SUMMARIZABLE = ["application/pdf", "text/plain", "text/markdown", "image/jpeg", "image/png", "image/gif", "image/webp"];

  const totalItems = materials.length + quizzes.length + assignments.length;
  const isCompleted = progress === 100;

  function recalcLocalProgress(newCompletedIds: Set<string>) {
    const done = newCompletedIds.size + completedQuizIds.size + submittedAssignmentIds.size;
    setProgress(totalItems > 0 ? Math.round((done / totalItems) * 100) : 0);
  }

  function toggleMaterial(materialId: string, isDone: boolean) {
    startTransition(async () => {
      if (isDone) {
        await uncompleteMaterial(materialId, courseId);
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(materialId);
          recalcLocalProgress(next);
          return next;
        });
      } else {
        await completeMaterial(materialId, courseId);
        setCompletedIds((prev) => {
          const next = new Set([...prev, materialId]);
          recalcLocalProgress(next);
          return next;
        });
      }
    });
  }

  const weekMaterials = materials.filter((m) => m.week_number === activeWeek);
  const weekQuizzes = quizzes.filter((q) => q.week_number === activeWeek);
  const weekAssignments = assignments.filter((a) => a.week_number === activeWeek);
  const weekItemCount = weekMaterials.length + weekQuizzes.length + weekAssignments.length;

  return (
    <div className="space-y-4">
      {/* 전체 진도 */}
      <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">전체 진도율</span>
          <span className={`text-sm font-bold ${isCompleted ? "text-green-400" : "text-white"}`}>
            {isCompleted ? "완강 ✓" : `${progress}%`}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          자료 {completedIds.size}/{materials.length}개 완료
          {quizzes.length > 0 && ` · 퀴즈 ${completedQuizIds.size}/${quizzes.length}개 제출`}
          {assignments.length > 0 && ` · 과제 ${submittedAssignmentIds.size}/${assignments.length}개 제출`}
        </p>
      </div>

      {/* 주차 탭 */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
          const wMats = materials.filter((m) => m.week_number === w);
          const wQuizzes = quizzes.filter((q) => q.week_number === w);
          const wAssignments = assignments.filter((a) => a.week_number === w);
          const wMatDone = wMats.filter((m) => completedIds.has(m.id)).length;
          const wQuizDone = wQuizzes.filter((q) => completedQuizIds.has(q.id)).length;
          const wAssignDone = wAssignments.filter((a) => submittedAssignmentIds.has(a.id)).length;
          const wTotal = wMats.length + wQuizzes.length + wAssignments.length;
          const wDone = wMatDone + wQuizDone + wAssignDone;
          const allDone = wTotal > 0 && wDone === wTotal;
          return (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                activeWeek === w
                  ? "bg-blue-600 border-blue-500 text-white"
                  : allDone
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-[#0f172a] border-gray-700 text-gray-300 hover:border-gray-500"
              }`}
            >
              {w}주차
              {allDone ? (
                <span className="ml-1">✓</span>
              ) : wTotal > 0 ? (
                <span className={`ml-1.5 text-xs ${activeWeek === w ? "text-blue-200" : "text-gray-500"}`}>
                  {wDone}/{wTotal}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 주차별 콘텐츠 */}
      <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 space-y-5">
        {/* 강의 자료 */}
        {weekMaterials.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-200 mb-3 flex items-center gap-2">
              <span>📂 강의 자료</span>
              <span className="text-xs text-gray-500 font-normal">
                {weekMaterials.filter((m) => completedIds.has(m.id)).length}/{weekMaterials.length}
              </span>
            </h3>
            <div className="space-y-2">
              {weekMaterials.map((m) => {
                const cat = getFileCategory(m.file_type);
                const isDone = completedIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                      isDone ? "bg-green-500/5 border-green-500/20" : "bg-[#0f172a] border-gray-700/40"
                    }`}
                  >
                    <span className="text-xl shrink-0">{FILE_ICON[cat]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate text-sm ${isDone ? "text-gray-400 line-through" : ""}`}>
                        {m.name}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{formatBytes(m.file_size)}</p>
                    </div>
                    {SUMMARIZABLE.includes(m.file_type) && (
                      <button
                        onClick={() => setSummaryTarget({ id: m.id, name: m.name })}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-400 text-xs font-medium transition-colors"
                      >
                        ✨ AI 요약
                      </button>
                    )}
                    {m.downloadUrl && (
                      <a
                        href={m.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors"
                      >
                        ⬇ 다운로드
                      </a>
                    )}
                    <button
                      onClick={() => toggleMaterial(m.id, isDone)}
                      disabled={isPending}
                      className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        isDone
                          ? "bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/10"
                          : "bg-gray-700 hover:bg-blue-600/30 border border-gray-600 text-gray-300"
                      }`}
                    >
                      {isDone ? "✓ 완료" : "학습 완료"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 구분선 */}
        {weekMaterials.length > 0 && weekQuizzes.length > 0 && (
          <div className="border-t border-gray-700/40" />
        )}

        {/* 퀴즈 */}
        {weekQuizzes.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-200 mb-3 flex items-center gap-2">
              <span>📝 퀴즈</span>
              <span className="text-xs text-gray-500 font-normal">
                {weekQuizzes.filter((q) => completedQuizIds.has(q.id)).length}/{weekQuizzes.length}
              </span>
            </h3>
            <div className="space-y-2">
              {weekQuizzes.map((q) => {
                const isDone = completedQuizIds.has(q.id);
                const diff = DIFFICULTY_STYLE[q.difficulty] ?? DIFFICULTY_STYLE.normal;
                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                      isDone ? "bg-green-500/5 border-green-500/20" : "bg-[#0f172a] border-gray-700/40"
                    }`}
                  >
                    <span className="text-xl shrink-0">🧩</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium text-sm truncate ${isDone ? "text-gray-400" : ""}`}>
                          {q.title}
                        </p>
                        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded border ${diff.cls}`}>
                          {diff.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{q.questionCount}문항</p>
                    </div>
                    <Link
                      href={`/student/quizzes/${q.id}`}
                      className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        isDone
                          ? "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                          : "bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/40"
                      }`}
                    >
                      {isDone ? "✓ 다시 풀기" : "퀴즈 풀기"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 구분선 */}
        {(weekMaterials.length > 0 || weekQuizzes.length > 0) && weekAssignments.length > 0 && (
          <div className="border-t border-gray-700/40" />
        )}

        {/* 코딩 과제 */}
        {weekAssignments.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-200 mb-3 flex items-center gap-2">
              <span>💻 코딩 과제</span>
              <span className="text-xs text-gray-500 font-normal">
                {weekAssignments.filter((a) => submittedAssignmentIds.has(a.id)).length}/{weekAssignments.length}
              </span>
            </h3>
            <div className="space-y-2">
              {weekAssignments.map((a) => {
                const isDone = submittedAssignmentIds.has(a.id);
                const isDeadlinePassed = a.deadline && new Date(a.deadline) < new Date();
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                      isDone ? "bg-green-500/5 border-green-500/20" : "bg-[#0f172a] border-gray-700/40"
                    }`}
                  >
                    <span className="text-xl shrink-0">💻</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium text-sm truncate ${isDone ? "text-gray-400" : ""}`}>
                          {a.title}
                        </p>
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded border bg-blue-500/15 border-blue-500/30 text-blue-400">
                          {LANG_LABEL[a.language] ?? a.language}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isDeadlinePassed ? "text-red-400" : "text-gray-500"}`}>
                        {a.deadline
                          ? `${isDeadlinePassed ? "마감됨" : "마감"}: ${new Date(a.deadline).toLocaleDateString("ko-KR")}`
                          : "마감일 없음"}
                      </p>
                    </div>
                    <Link
                      href={`/student/courses/${courseId}/assignments/${a.id}`}
                      className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        isDone
                          ? "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                          : "bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/40"
                      }`}
                    >
                      {isDone ? "✓ 다시 풀기" : "과제 풀기"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 해당 주차 콘텐츠 없음 */}
        {weekItemCount === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {activeWeek}주차에 등록된 자료, 퀴즈, 과제가 없습니다.
          </div>
        )}
      </div>

      {/* AI 요약 모달 */}
      {summaryTarget && (
        <SummaryModal
          materialId={summaryTarget.id}
          courseId={courseId}
          materialName={summaryTarget.name}
          onClose={() => setSummaryTarget(null)}
        />
      )}
    </div>
  );
}
