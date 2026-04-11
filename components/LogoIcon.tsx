export default function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* 배경 */}
      <rect width="32" height="32" rx="7" fill="url(#logoBg)" />

      {/* 졸업모자 다이아몬드 상단 */}
      <polygon points="16,5 28,10.5 16,16 4,10.5" fill="white" />

      {/* 졸업모자 통 */}
      <rect x="12.5" y="16" width="7" height="6" rx="1.5" fill="white" opacity="0.85" />

      {/* 술 줄 */}
      <line x1="28" y1="10.5" x2="28" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      {/* 술 끝 */}
      <circle cx="28" cy="20.5" r="2" fill="#818cf8" />

      {/* AI 회로 노드 */}
      <circle cx="6"  cy="24" r="1.8" fill="#60a5fa" opacity="0.9" />
      <circle cx="11" cy="27" r="1.3" fill="#60a5fa" opacity="0.7" />
      <circle cx="11" cy="21" r="1.3" fill="#60a5fa" opacity="0.7" />
      <line x1="6" y1="24" x2="11" y2="27" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
      <line x1="6" y1="24" x2="11" y2="21" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
