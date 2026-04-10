"use client";

import { useState } from "react";
import MaterialUploader from "./MaterialUploader";
import DeleteButton from "@/components/DeleteButton";

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

interface Material {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  week_number: number;
  created_at: string;
}

interface Props {
  courseId: string;
  totalWeeks: number;
  materials: Material[];
  deleteAction: (materialId: string, filePath: string) => Promise<void>;
}

export default function WeeklyMaterials({ courseId, totalWeeks, materials, deleteAction }: Props) {
  const [activeWeek, setActiveWeek] = useState(1);

  const weekMaterials = materials.filter((m) => (m.week_number ?? 1) === activeWeek);

  return (
    <div className="space-y-4">
      {/* 주차 탭 */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
          const count = materials.filter((m) => (m.week_number ?? 1) === w).length;
          return (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                activeWeek === w
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#16213e] border-gray-700 text-gray-300 hover:border-gray-500"
              }`}
            >
              {w}주차
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${activeWeek === w ? "text-blue-200" : "text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 주차 내용 */}
      <div className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-200">{activeWeek}주차 강의 자료</h2>
          <span className="text-xs text-gray-500">{weekMaterials.length}개 파일</span>
        </div>

        {/* 업로더 */}
        <MaterialUploader courseId={courseId} weekNumber={activeWeek} />

        {/* 자료 목록 */}
        {weekMaterials.length > 0 ? (
          <div className="space-y-2 pt-1">
            {weekMaterials.map((m) => {
              const cat = getFileCategory(m.file_type);
              const icon = FILE_ICON[cat];
              const canUseForQuiz = cat === "pdf" || cat === "image" || cat === "text" || cat === "ppt";
              return (
                <div
                  key={m.id}
                  className="bg-[#0f172a] rounded-lg border border-gray-700/40 px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-xl shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{m.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatBytes(m.file_size)} · {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      {canUseForQuiz && (
                        <span className="ml-2 text-blue-400">· AI 퀴즈 소스 사용 가능</span>
                      )}
                    </p>
                  </div>
                  <DeleteButton
                    action={() => deleteAction(m.id, m.file_path)}
                    confirmMessage={`"${m.name}" 파일을 삭제하시겠습니까?`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            {activeWeek}주차에 업로드된 자료가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
