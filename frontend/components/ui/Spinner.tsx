import React from "react";
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-[spin_0.8s_linear_infinite] ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      {" "}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="3"
      />{" "}
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />{" "}
    </svg>
  );
}
