"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  name: string;
}

interface CourseWithStudents {
  courseId: string;
  courseTitle: string;
  students: Student[];
}

interface Props {
  courses: CourseWithStudents[];
}

export default function NewChatModal({ courses }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [search, setSearch] = useState("");

  const allStudents = courses.length > 0
    ? selectedCourseId
      ? (courses.find((c) => c.courseId === selectedCourseId)?.students ?? [])
      : courses.flatMap((c) => c.students.map((s) => ({ ...s, courseId: c.courseId, courseTitle: c.courseTitle })))
    : [];

  // 강의별로 담은 경우 courseId 주입
  const studentsWithCourse = selectedCourseId
    ? (courses.find((c) => c.courseId === selectedCourseId)?.students ?? []).map((s) => ({
        ...s,
        courseId: selectedCourseId,
        courseTitle: courses.find((c) => c.courseId === selectedCourseId)?.courseTitle ?? "",
      }))
    : courses.flatMap((c) =>
        c.students.map((s) => ({ ...s, courseId: c.courseId, courseTitle: c.courseTitle }))
      );

  // 중복 학생 제거 (같은 학생이 여러 강의에 있을 수 있음 — 전체 선택 시 강의별로 표시)
  const filtered = studentsWithCourse.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(courseId: string, studentId: string) {
    setOpen(false);
    setSearch("");
    setSelectedCourseId("");
    router.push(`/teacher/messages/${courseId}/${studentId}`);
  }

  if (courses.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold transition-colors"
      >
        ✏️ 새 채팅 시작
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/50 w-full max-w-md mx-4 overflow-hidden shadow-2xl">
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold">채팅할 학생 선택</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* 강의 필터 */}
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">전체 강의</option>
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>{c.courseTitle}</option>
                ))}
              </select>

              {/* 검색 */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="학생 이름 검색..."
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />

              {/* 학생 목록 */}
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filtered.length === 0 ? (
                  <p className="text-center py-6 text-sm text-gray-400">
                    {search ? "검색 결과가 없습니다." : "수강생이 없습니다."}
                  </p>
                ) : (
                  filtered.map((s, i) => (
                    <button
                      key={`${s.courseId}:${s.id}:${i}`}
                      onClick={() => handleSelect(s.courseId, s.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-900/60 flex items-center justify-center text-xs font-medium text-indigo-300 shrink-0">
                        {s.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.courseTitle}</p>
                      </div>
                      <span className="text-xs text-indigo-400 shrink-0">채팅 →</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
