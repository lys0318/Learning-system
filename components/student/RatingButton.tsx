"use client";

import { useState } from "react";
import RatingModal from "./RatingModal";

interface Props {
  courseId: string;
  teacherId: string;
  teacherName: string;
  courseTitle: string;
  existingRating?: { rating: number; comment: string | null };
}

export default function RatingButton({
  courseId,
  teacherId,
  teacherName,
  courseTitle,
  existingRating,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          existingRating
            ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
            : "bg-gray-700/40 border-gray-600 text-gray-300 hover:bg-gray-700/70"
        }`}
      >
        {existingRating ? (
          <>
            {"★".repeat(existingRating.rating)}{"☆".repeat(5 - existingRating.rating)}
          </>
        ) : (
          "⭐ 평가하기"
        )}
      </button>

      {open && (
        <RatingModal
          courseId={courseId}
          teacherId={teacherId}
          teacherName={teacherName}
          courseTitle={courseTitle}
          existingRating={existingRating}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
