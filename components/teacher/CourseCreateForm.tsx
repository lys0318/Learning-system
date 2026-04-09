"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createCourseAndReturn } from "@/app/(teacher)/teacher/actions";
import { saveMaterialMeta } from "@/app/(teacher)/teacher/courses/[id]/materials/actions";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];
const ACCEPT = ALLOWED_TYPES.join(",");

const FILE_ICON: Record<string, string> = {
  pdf: "📄", ppt: "📊", image: "🖼️", video: "🎬", text: "📝", other: "📎",
};

function getFileCategory(type: string) {
  if (type === "application/pdf") return "pdf";
  if (type.includes("presentationml") || type.includes("powerpoint")) return "ppt";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("text/")) return "text";
  return "other";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "초안", desc: "아직 공개되지 않은 강의" },
  { value: "published", label: "공개", desc: "수강생에게 공개된 강의" },
  { value: "archived", label: "보관", desc: "더 이상 수강 신청 불가" },
];

export default function CourseCreateForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const newFiles: File[] = [];
    for (const file of Array.from(incoming)) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`"${file.name}" 파일이 50MB를 초과합니다.`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" 지원하지 않는 형식입니다.`);
        continue;
      }
      // 중복 제거
      if (!queuedFiles.find((f) => f.name === file.name && f.size === file.size)) {
        newFiles.push(file);
      }
    }
    if (newFiles.length > 0) {
      setError(null);
      setQueuedFiles((prev) => [...prev, ...newFiles]);
    }
  }

  function removeFile(idx: number) {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedFiles]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // 1. 강의 생성
    const result = await createCourseAndReturn(formData);
    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const courseId = result.courseId;

    // 2. 파일 업로드
    if (queuedFiles.length > 0) {
      const supabase = createClient();
      for (let i = 0; i < queuedFiles.length; i++) {
        const file = queuedFiles[i];
        setUploadProgress(`파일 업로드 중 (${i + 1}/${queuedFiles.length}): ${file.name}`);

        const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
        const filePath = `${courseId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          setError(`"${file.name}" 업로드 실패: ${uploadError.message}`);
          setSubmitting(false);
          setUploadProgress("");
          return;
        }

        await saveMaterialMeta(courseId, file.name, filePath, file.type || "application/octet-stream", file.size);
      }
    }

    router.push("/teacher");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 강의명 */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5" htmlFor="title">
          강의명 <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="예: 파이썬 기초"
          className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* 강의 설명 */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5" htmlFor="description">
          강의 설명
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="강의 내용을 간략히 설명해주세요."
          className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {/* 공개 상태 */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">공개 상태</label>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex flex-col gap-1 p-3 rounded-lg border border-gray-600 cursor-pointer hover:border-blue-500 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  defaultChecked={opt.value === "draft"}
                  className="accent-blue-500"
                />
                <span className="text-white text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-gray-400 text-xs pl-5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 수업 자료 첨부 */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">
          수업 자료 첨부 <span className="text-gray-500 font-normal">(선택)</span>
        </label>

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2
            border-2 border-dashed rounded-xl px-6 py-6 text-center
            transition-all duration-150 select-none cursor-pointer
            ${isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.01]"
              : "border-gray-600 bg-[#0f172a] hover:border-gray-400 hover:bg-gray-800/30"
            }
          `}
        >
          {isDragging ? (
            <>
              <span className="text-3xl">📂</span>
              <p className="text-sm font-medium text-blue-300">여기에 놓으세요!</p>
            </>
          ) : (
            <>
              <span className="text-2xl text-gray-500">📁</span>
              <div>
                <p className="text-sm font-medium text-gray-300">
                  파일을 드래그하거나{" "}
                  <span className="text-blue-400 underline underline-offset-2">클릭해서 선택</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  PDF, PPT/PPTX, 이미지, 텍스트, 영상(MP4) · 최대 50MB · 여러 파일 선택 가능
                </p>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />

        {/* 대기 중인 파일 목록 */}
        {queuedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {queuedFiles.map((file, idx) => {
              const cat = getFileCategory(file.type);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-[#0f172a] border border-gray-700/50 rounded-lg px-4 py-2.5"
                >
                  <span className="text-lg shrink-0">{FILE_ICON[cat]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/teacher")}
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          {submitting
            ? uploadProgress
              ? uploadProgress
              : "강의 생성 중..."
            : `강의 생성${queuedFiles.length > 0 ? ` + 자료 ${queuedFiles.length}개 업로드` : ""}`}
        </button>
      </div>
    </form>
  );
}
