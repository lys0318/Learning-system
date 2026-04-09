export default function Loading() {
  return (
    <div className="px-8 py-8 space-y-6 animate-pulse">
      {/* 섹션 제목 스켈레톤 */}
      <div className="h-6 w-32 bg-gray-700/60 rounded-lg" />

      {/* 카드 스켈레톤 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 space-y-3">
            <div className="h-5 w-3/4 bg-gray-700/60 rounded" />
            <div className="h-4 w-1/3 bg-gray-700/40 rounded" />
            <div className="h-4 w-full bg-gray-700/40 rounded" />
            <div className="h-2 w-full bg-gray-700/40 rounded-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
