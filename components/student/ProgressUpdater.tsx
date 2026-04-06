"use client";

import { useState, useTransition } from "react";
import { updateProgress } from "@/app/(student)/student/actions";

interface Props {
  enrollmentId: string;
  initialProgress: number;
}

const STEPS = [25, 50, 75, 100];

export default function ProgressUpdater({ enrollmentId, initialProgress }: Props) {
  const [progress, setProgress] = useState(initialProgress);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(next: number) {
    startTransition(async () => {
      const result = await updateProgress(enrollmentId, next);
      if (!result?.error) setProgress(next);
    });
  }

  const isCompleted = progress === 100;

  return (
    <div className="space-y-2">
      {/* 프로그레스 바 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: isCompleted
                ? "linear-gradient(90deg, #10b981, #34d399)"
                : "linear-gradient(90deg, #3b82f6, #60a5fa)",
            }}
          />
        </div>
        <span className={`text-sm font-medium w-10 text-right ${isCompleted ? "text-green-400" : "text-white"}`}>
          {progress}%
        </span>
      </div>

      {/* 진도 버튼 */}
      {!isCompleted && (
        <div className="flex gap-1.5 flex-wrap">
          {STEPS.filter((s) => s > progress).map((step) => (
            <button
              key={step}
              onClick={() => handleUpdate(step)}
              disabled={isPending}
              className="px-2.5 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 transition-colors"
            >
              {step}%
            </button>
          ))}
        </div>
      )}

      {isCompleted && (
        <p className="text-green-400 text-xs font-medium">완강</p>
      )}
    </div>
  );
}
