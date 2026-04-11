"use client";

import { useActionState } from "react";
import Link from "next/link";

type ActionFn = (_: unknown, formData: FormData) => Promise<{ error?: string } | void>;

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category?: string | null;
}

interface Props {
  action: ActionFn;
  course?: Course; // 수정 시 전달
}

const STATUS_OPTIONS = [
  { value: "draft", label: "초안", desc: "아직 공개되지 않은 강의" },
  { value: "published", label: "공개", desc: "수강생에게 공개된 강의" },
  { value: "archived", label: "보관", desc: "더 이상 수강 신청 불가" },
];

const CATEGORY_OPTIONS = [
  "프로그래밍", "수학", "영어", "과학", "국어", "역사", "사회", "음악", "미술", "체육", "기타",
];

export default function CourseForm({ action, course }: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const isEdit = !!course;

  return (
    <form action={formAction} className="space-y-5">
      {/* 수정 시 id 전달 */}
      {isEdit && <input type="hidden" name="id" value={course.id} />}

      {state?.error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {state.error}
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
          defaultValue={course?.title ?? ""}
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
          defaultValue={course?.description ?? ""}
          placeholder="강의 내용을 간략히 설명해주세요."
          className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {/* 카테고리 */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5" htmlFor="category">
          카테고리 <span className="text-gray-500 font-normal">(선택)</span>
        </label>
        <select
          id="category"
          name="category"
          defaultValue={course?.category ?? ""}
          className="w-full px-4 py-2.5 rounded-lg bg-[#0f3460] border border-gray-600 text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">카테고리 없음</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
                  defaultChecked={(course?.status ?? "draft") === opt.value}
                  className="accent-blue-500"
                />
                <span className="text-white text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-gray-400 text-xs pl-5">{opt.desc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/teacher"
          className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 text-center text-sm hover:bg-gray-700 transition-colors"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          {isPending ? "저장 중..." : isEdit ? "강의 수정" : "강의 생성"}
        </button>
      </div>
    </form>
  );
}
