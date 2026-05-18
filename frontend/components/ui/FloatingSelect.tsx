import React, { useState } from "react";
export interface SelectOption {
  value: string;
  label: string;
}
export function FloatingSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  options,
  placeholder = "Selecione...",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value !== "";
  return (
    <div className="relative group">
      {" "}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className={`w-full appearance-none bg-slate-100/60 dark:bg-slate-800/40 border-2 border-transparent outline-none rounded-2xl px-4 pt-6 pb-2 text-[15px] font-semibold text-slate-900 dark:text-white font-sans transition-all duration-200 focus:border-green/40 focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_4px_rgba(46,204,113,0.08)] dark:focus:bg-slate-900 dark:focus:border-green/30 dark:focus:shadow-[0_0_0_4px_rgba(46,204,113,0.10)] disabled:opacity-55 disabled:cursor-not-allowed`}
      >
        {" "}
        <option value="" disabled hidden>
          {" "}
          {focused ? placeholder : ""}{" "}
        </option>{" "}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-slate-900 font-semibold bg-[var(--bg-card)]"
          >
            {" "}
            {option.label}{" "}
          </option>
        ))}{" "}
      </select>{" "}
      {/* Ícone customizado de chevron, pois o nativo foi removido com 'appearance-none' */}{" "}
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
        {" "}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted group-hover:text-slate-900 transition-colors duration-200"
        >
          {" "}
          <polyline points="6 9 12 15 18 9"></polyline>{" "}
        </svg>{" "}
      </div>{" "}
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
