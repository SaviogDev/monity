import React, { useState } from "react";
export function PasswordField({
  value,
  onChange,
  disabled,
  id = "password",
  label = "Senha",
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative group">
      {" "}
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`w-full bg-slate-100/60 dark:bg-slate-800/40 border-2 border-transparent outline-none rounded-2xl px-4 pr-12 pt-6 pb-2 text-[15px] font-semibold text-slate-900 dark:text-white font-sans transition-all duration-200 focus:border-green/40 focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_4px_rgba(46,204,113,0.08)] dark:focus:bg-slate-900 dark:focus:border-green/30 dark:focus:shadow-[0_0_0_4px_rgba(46,204,113,0.10)] disabled:opacity-55 disabled:cursor-not-allowed`}
      />{" "}
      <label
        htmlFor={id}
        className={`absolute left-4 transition-all duration-200 transform-origin-left pointer-events-none ${lifted ? "top-1.5 text-[11px] font-bold text-green-d tracking-wide" : "top-3.5 text-[15px] font-medium text-muted"} `}
      >
        {" "}
        {label}{" "}
      </label>{" "}
      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        className="absolute right-4 top-[17px] bg-transparent border-none cursor-pointer text-muted p-0.5 flex items-center transition-colors duration-200 hover:text-slate-900 dark:hover:text-white"
        tabIndex={-1}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {" "}
        {show ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {" "}
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />{" "}
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />{" "}
            <line x1="1" y1="1" x2="23" y2="23" />{" "}
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {" "}
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />{" "}
            <circle cx="12" cy="12" r="3" />{" "}
          </svg>
        )}{" "}
      </button>{" "}
    </div>
  );
}
