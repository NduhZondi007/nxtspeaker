"use client";

export function BrandMentionCard() {
  return (
    <>
      <style>{`
        @keyframes brand-slide-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .brand-mention-card {
          animation: brand-slide-up 0.18s ease-out forwards;
        }
      `}</style>
      <div
        className="brand-mention-card absolute bottom-full left-0 right-0 mb-2 mx-4 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[12px] border"
          style={{
            background: "linear-gradient(135deg, #031E57 0%, #042570 100%)",
            borderColor: "#629DAB44",
          }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-[8px] flex items-center justify-center"
            style={{ background: "rgba(98,157,171,0.15)", border: "1px solid rgba(98,157,171,0.3)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="12" y="4" width="8" height="14" rx="4" fill="#ECD4F5" />
              <path
                d="M9 15a7 7 0 0 0 14 0"
                stroke="#ECD4F5"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <line x1="16" y1="22" x2="16" y2="26" stroke="#ECD4F5" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="12" y1="26" x2="20" y2="26" stroke="#ECD4F5" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <div className="min-w-0">
            <p
              className="font-archivo font-black uppercase tracking-tight leading-tight"
              style={{ color: "#ECD4F5", fontSize: "14px" }}
            >
              NxtSpeaker
            </p>
            <p className="text-xs leading-tight" style={{ color: "rgba(236,212,245,0.6)" }}>
              Africa&apos;s Premier Speaker Platform
            </p>
          </div>

          <div
            className="flex-shrink-0 ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: "#629DAB" }}
          />
        </div>
      </div>
    </>
  );
}
