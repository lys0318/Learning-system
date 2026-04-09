"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  courseId: string;
  studentId: string;
  currentUserId: string;
  courseName: string;
  otherName: string; // 상대방 이름
  initialMessages: Message[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MessageThread({
  courseId,
  studentId,
  currentUserId,
  courseName,
  otherName,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?courseId=${courseId}&studentId=${studentId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }, [courseId, studentId]);

  // 5초마다 폴링
  useEffect(() => {
    const timer = setInterval(fetchMessages, 5000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentId, content: text }),
      });
      await fetchMessages();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="px-5 py-3 border-b border-gray-700/50 shrink-0">
        <p className="text-sm font-semibold">{otherName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{courseName} 관련 질문</p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <p className="font-medium text-white">아직 메시지가 없습니다</p>
              <p className="text-sm mt-1">
                {courseName} 강의에 대해 궁금한 점을 질문해보세요.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isMine ? "bg-blue-600 text-white" : "bg-indigo-800 text-indigo-300"
                  }`}
                >
                  {isMine ? "나" : otherName.slice(0, 2)}
                </div>
                <div className={`max-w-[70%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      isMine
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-[#1e2a45] text-gray-100 rounded-tl-sm border border-gray-700/50"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-600 px-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t border-gray-700/50 px-5 py-3 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="메시지를 입력하세요… (Enter 전송, Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 resize-none bg-[#1e2a45] border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
