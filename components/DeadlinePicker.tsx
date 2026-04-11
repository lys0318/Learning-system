"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from "date-fns/locale";

export default function DeadlinePicker() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div>
      <DatePicker
        selected={date}
        onChange={(d: Date | null) => setDate(d)}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={30}
        dateFormat="yyyy년 MM월 dd일 HH:mm"
        locale={ko}
        minDate={new Date()}
        placeholderText="마감일 선택 (선택 사항)"
        isClearable
        className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        wrapperClassName="w-full"
        popperClassName="z-50"
        calendarClassName="!bg-white dark:!bg-[#16213e] !border !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-xl !font-sans"
      />
      {/* 서버 액션에 전달할 hidden input */}
      <input
        type="hidden"
        name="deadline"
        value={date ? date.toISOString() : ""}
      />
    </div>
  );
}
