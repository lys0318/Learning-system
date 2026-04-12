"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface CalendarEvent {
  id: string;
  type: "assignment" | "quiz" | "material";
  title: string;
  courseTitle: string;
  courseId: string;
  date: string; // ISO string
  deadline?: string; // 마감일 (assignment only)
  href: string;
  extra?: string; // 언어, 난이도 등 부가 정보
}

interface Props {
  events: CalendarEvent[];
}

const TYPE_STYLE = {
  assignment: {
    dot: "bg-orange-400",
    badge: "bg-orange-500/15 border-orange-500/30 text-orange-400",
    icon: "💻",
    label: "과제",
  },
  quiz: {
    dot: "bg-blue-400",
    badge: "bg-blue-500/15 border-blue-500/30 text-blue-400",
    icon: "📝",
    label: "퀴즈",
  },
  material: {
    dot: "bg-green-400",
    badge: "bg-green-500/15 border-green-500/30 text-green-400",
    icon: "📄",
    label: "자료",
  },
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toLocalDateStr(iso: string) {
  // YYYY-MM-DD 형태 반환 (로컬 기준)
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarClient({ events }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateStr(today.toISOString()));

  // 이벤트를 날짜별로 그룹핑
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      // assignment는 deadline 기준, 나머지는 date 기준
      const dateKey = ev.type === "assignment" && ev.deadline
        ? toLocalDateStr(ev.deadline)
        : toLocalDateStr(ev.date);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    }
    return map;
  }, [events]);

  // 달력 날짜 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    // 6주 채우기
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(toLocalDateStr(today.toISOString()));
  }

  function makeDateKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const todayKey = toLocalDateStr(today.toISOString());
  const selectedEvents = eventsByDate[selectedDate] ?? [];

  // 이번 달 전체 이벤트 수
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEventCount = Object.entries(eventsByDate)
    .filter(([k]) => k.startsWith(monthPrefix))
    .reduce((s, [, v]) => s + v.length, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      {/* 캘린더 영역 */}
      <div className="flex-1 min-w-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">
              {year}년 {month + 1}월
            </h2>
            {monthEventCount > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                일정 {monthEventCount}개
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={goToday}
              className="px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-300 transition-colors"
            >
              오늘
            </button>
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-300 transition-colors text-sm"
            >
              ‹
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600/60 text-gray-600 dark:text-gray-300 transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-center text-xs font-medium py-2 ${
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700/40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/40">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="bg-gray-50 dark:bg-[#0d1224]/60 min-h-[72px]"
                />
              );
            }
            const dateKey = makeDateKey(day);
            const dayEvents = eventsByDate[dateKey] ?? [];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const colIndex = idx % 7;
            const isSun = colIndex === 0;
            const isSat = colIndex === 6;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`relative text-left bg-white dark:bg-[#16213e] min-h-[72px] p-2 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10 ${
                  isSelected ? "ring-2 ring-inset ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                {/* 날짜 숫자 */}
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1 ${
                    isToday
                      ? "bg-blue-600 text-white"
                      : isSun
                      ? "text-red-400"
                      : isSat
                      ? "text-blue-400"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {day}
                </span>

                {/* 이벤트 점 */}
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {/* 타입별 dot (최대 3개) */}
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_STYLE[ev.type].dot}`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-gray-400 dark:text-gray-500 text-[9px] leading-none self-end">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* 이벤트 제목 (공간 있을 때) */}
                {dayEvents.slice(0, 2).map((ev, i) => (
                  <p
                    key={i}
                    className={`text-[10px] leading-tight truncate mt-0.5 ${
                      ev.type === "assignment" && ev.deadline && new Date(ev.deadline) < today
                        ? "text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {ev.title}
                  </p>
                ))}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 mt-3 px-1">
          {(Object.entries(TYPE_STYLE) as [keyof typeof TYPE_STYLE, typeof TYPE_STYLE[keyof typeof TYPE_STYLE]][]).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-gray-400 dark:text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 사이드 패널 — 선택된 날짜 이벤트 */}
      <div className="lg:w-72 shrink-0">
        <div className="bg-white dark:bg-[#16213e] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden h-full">
          {/* 패널 헤더 */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/40">
            <p className="text-sm font-semibold">
              {selectedDate === todayKey ? "오늘 " : ""}
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {selectedEvents.length > 0 ? `일정 ${selectedEvents.length}개` : "일정 없음"}
            </p>
          </div>

          {/* 이벤트 목록 */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700/30 overflow-y-auto max-h-[480px]">
            {selectedEvents.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                이 날에는 일정이 없습니다.
              </div>
            ) : (
              selectedEvents.map((ev) => {
                const s = TYPE_STYLE[ev.type];
                const isPast = ev.type === "assignment" && ev.deadline && new Date(ev.deadline) < today;
                return (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 border ${s.badge}`}
                    >
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate group-hover:text-blue-500 transition-colors">
                          {ev.title}
                        </p>
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${s.badge}`}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        {ev.courseTitle}
                      </p>
                      {ev.extra && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ev.extra}</p>
                      )}
                      {ev.type === "assignment" && ev.deadline && (
                        <p className={`text-xs mt-0.5 ${isPast ? "text-red-400" : "text-orange-400"}`}>
                          {isPast ? "마감됨" : "마감"}: {new Date(ev.deadline).toLocaleDateString("ko-KR")}
                        </p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 group-hover:text-blue-400 transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
