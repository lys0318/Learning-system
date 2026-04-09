"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full py-32 text-center px-8">
      <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-2xl mb-4">
        ⚠️
      </div>
      <h2 className="text-lg font-semibold mb-2">문제가 발생했습니다</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-sm">
        페이지를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
