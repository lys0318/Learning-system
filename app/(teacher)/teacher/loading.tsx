export default function Loading() {
  return (
    <div className="px-8 py-8 space-y-6 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-gray-700/60 rounded-lg" />
          <div className="h-4 w-24 bg-gray-700/40 rounded" />
        </div>
        <div className="h-9 w-28 bg-gray-700/60 rounded-lg" />
      </div>

      {/* 리스트 스켈레톤 */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#16213e] rounded-xl border border-gray-700/50 p-5 flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 bg-gray-700/60 rounded" />
              <div className="h-4 w-1/2 bg-gray-700/40 rounded" />
              <div className="h-3 w-1/4 bg-gray-700/30 rounded mt-2" />
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="h-8 w-14 bg-gray-700/50 rounded-lg" />
              <div className="h-8 w-14 bg-gray-700/50 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
