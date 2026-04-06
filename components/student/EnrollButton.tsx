"use client";

import { useState, useTransition } from "react";
import { enrollCourse } from "@/app/(student)/student/actions";

interface Props {
  courseId: string;
  enrolled: boolean;
}

export default function EnrollButton({ courseId, enrolled }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(enrolled);

  function handleEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await enrollCourse(courseId);
      if (result?.error) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <span className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
        수강 중
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleEnroll}
        disabled={isPending}
        className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
      >
        {isPending ? "신청 중..." : "수강 신청"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
