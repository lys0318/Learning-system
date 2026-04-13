"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  teacherId: string;
  teacherUserId: string;
  initialMessages: Message[];
}

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TeacherAdminMessageThread({ teacherId, teacherUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin-teacher-message?teacherId=${teacherId}`);
      if (res.ok) setMessages(await res.json());
    } catch {
      // 무시
    }
  }, [teacherId]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/teacher-admin-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) await fetchMessages();
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  let lastDate = "";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 메시지 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            아직 대화가 없습니다. 운영자의 메시지를 기다려보세요.
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === teacherUserId;
          const date = dateLabel(msg.created_at);
          const showDate = date !== lastDate;
          lastDate = date;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/50" />
                  <span className="text-xs text-gray-400">{date}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/50" />
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-purple-900/60 flex items-center justify-center text-xs font-medium text-purple-300 shrink-0 mb-1">
                    운영
                  </div>
                )}
                <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="text-[11px] text-gray-400 ml-1">교육 운영자</span>
                  )}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400">{timeStr(msg.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0d1224]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="운영자에게 답변 보내기… (Enter 전송, Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
