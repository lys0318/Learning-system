"use client";

import { useActionState, useState } from "react";
import { generateQuiz, type GenerateQuizState } from "@/app/(teacher)/teacher/quizzes/actions";

interface Course {
  id: string;
  title: string;
  total_weeks: number;
}

interface Material {
  id: string;
  name: string;
  file_type: string;
}

interface Props {
  courses: Course[];
  coursesMaterials: Record<string, Material[]>;
}

function materialIcon(fileType: string) {
  if (fileType === "application/pdf") return "📄";
  if (
    fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileType === "application/vnd.ms-powerpoint"
  ) return "📊";
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.startsWith("text/")) return "📝";
  return "📎";
}

export default function QuizGenerateForm({ courses, coursesMaterials }: Props) {
  const [state, action, isPending] = useActionState<GenerateQuizState, FormData>(
    generateQuiz,
    null
  );

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "normal" | "hard">("normal");

  const courseMats = coursesMaterials[selectedCourseId] ?? [];
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const totalWeeks = selectedCourse?.total_weeks ?? 1;

  function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCourseId(e.target.value);
    setSelectedMaterialId("");
    setSelectedWeek(1);
  }

  return (
    <form action={action} className="space-y-5">
      {/* 강의 선택 */}
      <div>
        <label htmlFor="course_id" className="block text-sm font-medium text-gray-300 mb-1.5">
          강의 선택 <span className="text-red-400">*</span>
        </label>
        <select
          id="course_id"
          name="course_id"
          required
          disabled={isPending}
          value={selectedCourseId}
          onChange={handleCourseChange}
          className="w-full px-4 py-2.5 bg-[#0f172a] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* 주차 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          주차 선택 <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              type="button"
              disabled={isPending}
              onClick={() => setSelectedWeek(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                selectedWeek === w
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#0f172a] border-gray-700 text-gray-300 hover:border-gray-500"
              }`}
            >
              {w}주차
            </button>
          ))}
        </div>
        <input type="hidden" name="week_number" value={selectedWeek} />
      </div>

      {/* 난이도 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          난이도 <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          {([
            { value: "easy",   label: "쉬움",   color: "bg-green-600 border-green-500",   idle: "border-gray-700 text-gray-300 hover:border-green-600/60" },
            { value: "normal", label: "보통",   color: "bg-blue-600 border-blue-500",    idle: "border-gray-700 text-gray-300 hover:border-blue-600/60" },
            { value: "hard",   label: "어려움", color: "bg-red-600 border-red-500",      idle: "border-gray-700 text-gray-300 hover:border-red-600/60" },
          ] as const).map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={isPending}
              onClick={() => setSelectedDifficulty(d.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                selectedDifficulty === d.value ? `${d.color} text-white` : d.idle
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="difficulty" value={selectedDifficulty} />
      </div>

      {/* 학습 자료 선택 (선택 사항) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          학습 자료 기반 생성{" "}
          <span className="text-gray-500 font-normal">(선택 사항)</span>
        </label>

        {courseMats.length > 0 ? (
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10">
              <input
                type="radio"
                name="material_id"
                value=""
                checked={selectedMaterialId === ""}
                onChange={() => setSelectedMaterialId("")}
                disabled={isPending}
                className="accent-blue-500"
              />
              <span className="text-sm text-gray-400">자료 없이 주제만으로 생성</span>
            </label>
            {courseMats.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
              >
                <input
                  type="radio"
                  name="material_id"
                  value={m.id}
                  checked={selectedMaterialId === m.id}
                  onChange={() => setSelectedMaterialId(m.id)}
                  disabled={isPending}
                  className="accent-blue-500"
                />
                <span className="text-base">{materialIcon(m.file_type)}</span>
                <span className="text-sm text-white truncate">{m.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3">
            이 강의에 업로드된 자료가 없습니다.{" "}
            <a
              href={`/teacher/courses/${selectedCourseId}/materials`}
              className="text-blue-400 hover:underline"
            >
              자료 업로드하기 →
            </a>
          </p>
        )}
      </div>

      {/* 주제 */}
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1.5">
          퀴즈 주제 <span className="text-red-400">*</span>
        </label>
        <input
          id="topic"
          name="topic"
          type="text"
          required
          disabled={isPending}
          placeholder="예: 변수와 자료형, 객체지향 프로그래밍 기초"
          className="w-full px-4 py-2.5 bg-[#0f172a] border border-gray-600 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        {selectedMaterialId && (
          <p className="text-blue-400 text-xs mt-1">
            선택한 자료의 내용을 Claude가 직접 분석하여 퀴즈를 생성합니다.
          </p>
        )}
      </div>

      {/* 문항 수 */}
      <div>
        <label htmlFor="num_questions" className="block text-sm font-medium text-gray-300 mb-1.5">
          문항 수 <span className="text-gray-500 font-normal">(3~10개)</span>
        </label>
        <input
          id="num_questions"
          name="num_questions"
          type="number"
          min={3}
          max={10}
          defaultValue={5}
          disabled={isPending}
          className="w-32 px-4 py-2.5 bg-[#0f172a] border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Claude AI 퀴즈 생성 중...
          </>
        ) : (
          "AI 퀴즈 자동 생성"
        )}
      </button>
    </form>
  );
}
