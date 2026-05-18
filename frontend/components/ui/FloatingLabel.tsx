import React, { useState } from "react";
export function FloatingLabel({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative group">
      {" "}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`w-full bg-slate-100/60 dark:bg-slate-800/40 border-2 border-transparent outline-none rounded-2xl px-4 pt-6 pb-2 text-[15px] font-semibold text-slate-900 dark:text-white font-sans transition-all duration-200 focus:border-green/40 focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_4px_rgba(46,204,113,0.08)] dark:focus:bg-slate-900 dark:focus:border-green/30 dark:focus:shadow-[0_0_0_4px_rgba(46,204,113,0.10)] disabled:opacity-55 disabled:cursor-not-allowed`}
      />{" "}
      <label
        htmlFor={id}
        className={`absolute left-4 transition-all duration-200 transform-origin-left pointer-events-none ${lifted ? "top-1.5 text-[11px] font-bold text-green-d tracking-wide" : "top-3.5 text-[15px] font-medium text-muted"} `}
      >
        {" "}
        {label}{" "}
      </label>{" "}
    </div>
  );
}
