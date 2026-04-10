"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialUploader({ courseId, weekNumber = 1 }: { courseId: string; weekNumber?: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError("파일 크기는 50MB 이하여야 합니다.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("지원하지 않는 파일 형식입니다.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(`${file.name} (${formatBytes(file.size)}) 업로드 중...`);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "";
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
    const filePath = `${courseId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setError(`업로드 실패: ${uploadError.message}`);
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const result = await saveMaterialMeta(
      courseId,
      file.name,
      filePath,
      file.type || `application/${ext}`,
      file.size,
      weekNumber
    );

    if (result?.error) {
      setError(result.error);
      await supabase.storage.from("course-materials").remove([filePath]);
    } else {
      router.refresh();
    }

    setUploading(false);
    setProgress("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  }, [uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploading, courseId]);

  return (
    <div className="space-y-3">
      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2
          border-2 border-dashed rounded-xl px-6 py-8 text-center
          transition-all duration-150 select-none
          ${uploading
            ? "border-gray-600 bg-[#0f172a] cursor-not-allowed opacity-70"
            : isDragging
              ? "border-blue-400 bg-blue-500/10 cursor-copy scale-[1.01]"
              : "border-gray-600 bg-[#0f172a] hover:border-gray-400 hover:bg-gray-800/30 cursor-pointer"
          }
        `}
      >
        {uploading ? (
          <>
            <span className="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-gray-300">{progress}</p>
          </>
        ) : isDragging ? (
          <>
            <span className="text-3xl">📂</span>
            <p className="text-sm font-medium text-blue-300">여기에 놓으세요!</p>
          </>
        ) : (
          <>
            <span className="text-3xl text-gray-500">📁</span>
            <div>
              <p className="text-sm font-medium text-gray-300">
                파일을 드래그하거나{" "}
                <span className="text-blue-400 underline underline-offset-2">클릭해서 선택</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, PPT/PPTX, 이미지(JPG·PNG·WebP), 텍스트, 영상(MP4) · 최대 50MB
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        disabled={uploading}
        className="hidden"
      />

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
