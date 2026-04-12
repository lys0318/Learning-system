"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  materialId: string;
  courseId: string;
  materialName: string;
  onClose: () => void;
}

export default function SummaryModal({ materialId, courseId, materialName, onClose }: Props) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setLoading(true);
      setError(null);
      setSummary("");

      try {
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId, courseId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "요약 중 오류가 발생했습니다.");
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

        setLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          setSummary((prev) => prev + chunk);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
          setLoading(false);
        }
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [materialId, courseId]);

  // 배경 클릭 닫기
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 스트리밍 중 자동 스크롤
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [summary]);

  // 마크다운 굵게(**text**) 간단 렌더링
  function renderSummary(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className={`${line.startsWith("##") || line.match(/^\d+\./) ? "mt-3" : "mt-1"} leading-relaxed`}>
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="text-white font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      );
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-2xl bg-[#16213e] rounded-2xl border border-gray-700/50 shadow-2xl flex flex-col max-h-[80vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-base shrink-0">
              ✨
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">AI 자료 요약</p>
              <p className="text-xs text-gray-400 truncate">{materialName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700/60 text-gray-400 hover:text-white transition-colors shrink-0 ml-3"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-300"
        >
          {loading && (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>자료를 분석하고 있습니다…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <span className="text-lg shrink-0">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {summary && (
            <div className="space-y-0.5">
              {renderSummary(summary)}
              {loading === false && (
                <div className="mt-4 pt-4 border-t border-gray-700/40 flex items-center gap-2 text-xs text-gray-500">
                  <span>✨</span>
                  <span>Claude AI가 생성한 요약입니다.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-gray-700/40 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
