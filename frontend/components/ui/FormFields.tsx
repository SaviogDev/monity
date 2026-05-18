import React from "react"; // ─── Input Field ────────────────────────────────────────────────────────────
export function InputField({
  label,
  icon,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {" "}
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          {" "}
          {label}{" "}
        </span>
      )}{" "}
      <div className="relative">
        {" "}
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            {" "}
            {icon}{" "}
          </span>
        )}{" "}
        <input
          {...props}
          className={`w-full rounded-2xl border-2 border-transparent bg-slate-100/60 px-4 py-3.5 text-[15px] font-semibold text-slate-900 placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-green/40 focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_4px_rgba(46,204,113,0.08)] dark:bg-slate-800/40 dark:text-white dark:focus:bg-slate-900 dark:focus:border-green/30 disabled:opacity-55 disabled:cursor-not-allowed ${icon ? "pl-11" : ""} ${className}`}
        />{" "}
      </div>{" "}
    </label>
  );
} // ─── Select Field ────────────────────────────────────────────────────────────
export function SelectField({
  label,
  icon,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {" "}
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          {" "}
          {label}{" "}
        </span>
      )}{" "}
      <div className="relative">
        {" "}
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            {" "}
            {icon}{" "}
          </span>
        )}{" "}
        <select
          {...props}
          className={`w-full appearance-none rounded-2xl border-2 border-transparent bg-slate-100/60 px-4 py-3.5 text-[15px] font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-green/40 focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_4px_rgba(46,204,113,0.08)] dark:bg-slate-800/40 dark:text-white dark:focus:bg-slate-900 dark:focus:border-green/30 ${icon ? "pl-11" : ""} ${className}`}
        >
          {" "}
          {children}{" "}
        </select>{" "}
      </div>{" "}
    </label>
  );
} // ─── Toggle Chip Group ───────────────────────────────────────────────────────
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; activeClass?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 p-1.5">
      {" "}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all duration-200 ${value === opt.value ? `bg-[var(--bg-card)] dark:bg-slate-700 shadow-md ${opt.activeClass || "text-slate-900"}` : "text-muted hover:text-slate-900 dark:hover:text-slate-300"}`}
        >
          {" "}
          {opt.label}{" "}
        </button>
      ))}{" "}
    </div>
  );
} // ─── Section Card ────────────────────────────────────────────────────────────
export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-[var(--border)]/80 dark:border-white/10 bg-[var(--bg-card)] dark:bg-slate-900/50 p-5 ${className}`}
    >
      {" "}
      {children}{" "}
    </div>
  );
} // ─── Toggle Row ──────────────────────────────────────────────────────────────
export function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
  accentClass = "accent-green",
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentClass?: string;
}) {
  return (
    <div className="space-y-3">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
            {" "}
            {icon}{" "}
          </div>{" "}
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {label}
          </span>{" "}
        </div>{" "}
        <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
          {" "}
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />{" "}
          <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 peer-checked:bg-green peer-focus:outline-none" />{" "}
          <div className="absolute left-0.5 h-5 w-5 rounded-full bg-[var(--bg-card)] shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />{" "}
        </label>{" "}
      </div>{" "}
      {description && (
        <p className="pl-12 text-xs leading-relaxed text-muted">
          {description}
        </p>
      )}{" "}
    </div>
  );
}
