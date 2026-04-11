"use client";

import { useState } from "react";
import CodeEditor from "@/components/CodeEditor";

const DEFAULT_CODE: Record<string, string> = {
  python: `# 여기에 코드를 작성하세요

`,
  java: `public class Main {
    public static void main(String[] args) {
        // 여기에 코드를 작성하세요

    }
}
`,
  c: `#include <stdio.h>

int main() {
    // 여기에 코드를 작성하세요

    return 0;
}
`,
};

interface Props {
  assignmentId: string;
  language: string;
  description: string;
  starterCode: string;
}

interface SubmitResult {
  stdout: string;
  stderr: string;
  status: "success" | "error";
  aiFeedback: string;
  attempt: number;
}

export default function AssignmentClient({ assignmentId, language, description, starterCode }: Props) {
  const [code, setCode] = useState(starterCode || DEFAULT_CODE[language] || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [activeTab, setActiveTab] = useState<"output" | "feedback">("output");

  async function handleSubmit() {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, description, assignmentId }),
      });
      const data = await res.json();
      setResult(data);
      setActiveTab("output");
    } catch {
      setResult({
        stdout: "",
        stderr: "제출 중 오류가 발생했습니다. 다시 시도해주세요.",
        status: "error",
        aiFeedback: "",
        attempt: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 코드 에디터 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">코드 에디터</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
            {language === "java" ? "Java (Main.java)" : language === "c" ? "C (main.c)" : "Python (main.py)"}
          </span>
        </div>
        <CodeEditor
          language={language}
          value={code}
          onChange={setCode}
          height="420px"
        />
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              실행 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              제출 및 실행
            </>
          )}
        </button>
      </div>

      {/* 결과 영역 */}
      {loading && (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="font-medium text-sm">코드 실행 중...</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">AI 피드백도 함께 생성됩니다</p>
            </div>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          {/* 탭 헤더 */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700/50">
            <div className="flex-1 flex">
              <button
                onClick={() => setActiveTab("output")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "output"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                실행 결과
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "feedback"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                AI 피드백
              </button>
            </div>
            <div className="flex items-center gap-2 px-4">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                result.status === "success"
                  ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10 border-green-200 dark:border-green-400/30"
                  : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/30"
              }`}>
                {result.status === "success" ? "실행 성공" : "실행 오류"}
              </span>
              {result.attempt > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{result.attempt}번째 제출</span>
              )}
            </div>
          </div>

          <div className="p-4">
            {activeTab === "output" && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">출력 (stdout)</p>
                  <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono min-h-[80px] overflow-x-auto leading-relaxed">
                    {result.stdout || "(출력 없음)"}
                  </pre>
                </div>
                {result.stderr && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">오류 (stderr)</p>
                    <pre className="bg-gray-900 text-red-400 rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed">
                      {result.stderr}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.aiFeedback || "AI 피드백을 불러오는 중입니다..."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
