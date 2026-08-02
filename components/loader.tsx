export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          <svg
            className="h-16 w-16 animate-spin"
            style={{ animationDuration: "1.2s" }}
            viewBox="0 0 50 50"
          >
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="#e8f0f6"
              strokeWidth="4"
            />
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="url(#loaderGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="80, 126"
            />
            <defs>
              <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0a4a68" />
                <stop offset="100%" stopColor="#f4ad27" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <p className="text-sm font-semibold text-[#0a4a68] tracking-wide">
            جاري التحميل...
          </p>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-[#e8f0f6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0a4a68] to-[#f4ad27]"
              style={{
                animation: "loading-bar 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-right: 0;
          }
          50% {
            width: 70%;
            margin-right: 0;
          }
          100% {
            width: 0%;
            margin-right: 100%;
          }
        }
      `}</style>
    </div>
  );
}
