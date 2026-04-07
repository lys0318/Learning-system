"use client";

import { useTransition } from "react";

interface Props {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
}

export default function DeleteButton({
  action,
  confirmMessage = "삭제하시겠습니까?",
  label = "삭제",
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    startTransition(async () => {
      await action();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 text-sm text-red-400 transition-colors"
    >
      {isPending ? "삭제 중..." : label}
    </button>
  );
}
