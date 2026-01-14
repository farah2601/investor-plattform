"use client";

export function TourButton() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 px-0 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
      onClick={() => {
        if (typeof window !== "undefined" && (window as any).openValyxoTour) {
          (window as any).openValyxoTour();
        }
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4 opacity-80"
      >
        <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
      </svg>
      <span>See how it works</span>
    </button>
  );
}
