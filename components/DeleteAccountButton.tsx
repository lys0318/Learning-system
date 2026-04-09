"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";

export default function DeleteAccountButton() {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="px-4 py-2 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 hover:border-red-500/50 text-sm transition-colors"
      >
        회원 탈퇴
      </button>
    );
  }

  return (
    <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4 space-y-3">
      <p className="text-sm text-red-300 font-medium">정말로 탈퇴하시겠습니까?</p>
      <p className="text-xs text-gray-400">탈퇴 시 모든 학습 데이터가 삭제되며 복구할 수 없습니다.</p>
      <div className="flex gap-2">
        <button
          onClick={() => startTransition(() => deleteAccount())}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {isPending ? "처리 중..." : "탈퇴 확인"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 text-sm transition-colors disabled:opacity-60"
        >
          취소
        </button>
      </div>
    </div>
  );
}
