"use client";

import { useState, useTransition } from "react";
import { submitRating } from "@/app/(student)/student/actions";

interface Props {
  courseId: string;
  teacherId: string;
  teacherName: string;
  courseTitle: string;
  existingRating?: { rating: number; comment: string | null };
  onClose: () => void;
}

export default function RatingModal({
  courseId,
  teacherId,
  teacherName,
  courseTitle,
  existingRating,
  onClose,
}: Props) {
  const [rating, setRating] = useState(existingRating?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingRating?.comment ?? "");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (rating === 0) {
      setError("별점을 선택해주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await submitRating({ courseId, teacherId, rating, comment });
      if (res?.error) {
        setError(res.error);
      } else {
        setDone(true);
      }
    });
  }

  const starLabel = ["", "별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요"];
  const displayed = hovered || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#16213e] border border-gray-700/60 rounded-2xl w-full max-w-sm shadow-2xl">
        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <p className="font-semibold">평가 완료!</p>
            <p className="text-gray-400 text-sm">소중한 평가 감사합니다.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* 헤더 */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">강의 완강 평가</p>
                <h2 className="font-bold text-base leading-snug">{courseTitle}</h2>
                <p className="text-gray-400 text-sm mt-0.5">{teacherName} 선생님</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
              >
                ✕
              </button>
            </div>

            {/* 별점 */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-300">선생님은 어떠셨나요?</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={isPending}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="text-3xl transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <span className={displayed >= star ? "text-yellow-400" : "text-gray-600"}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <p className={`text-xs font-medium h-4 transition-colors ${displayed > 0 ? "text-yellow-400" : "text-transparent"}`}>
                {starLabel[displayed]}
              </p>
            </div>

            {/* 한줄 평가 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                한줄 평가 <span className="text-gray-500 font-normal">(선택 사항)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isPending}
                placeholder="수업에 대한 솔직한 의견을 남겨주세요."
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-gray-600 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
              />
              <p className="text-right text-xs text-gray-500 mt-0.5">{comment.length}/200</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 hover:border-gray-400 text-sm text-gray-300 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || rating === 0}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 text-sm font-medium transition-colors"
              >
                {isPending ? "저장 중..." : existingRating ? "수정하기" : "평가하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
