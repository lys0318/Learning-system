"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANG_MAP: Record<string, string> = {
  python: "python",
  java: "java",
  c: "c",
};

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export default function CodeEditor({ language, value, onChange, height = "400px" }: CodeEditorProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50">
      <MonacoEditor
        height={height}
        language={LANG_MAP[language] ?? "plaintext"}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 4,
          automaticLayout: true,
          lineNumbers: "on",
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
}
