import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "danger" | "ghost" | "outline" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}
export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-heading font-medium tracking-tight transition-all duration-200 outline-none border focus-visible:ring-2 focus-visible:ring-blue/50";
  const sizeClasses = {
    sm: "h-9 px-4 text-[13px]",
    md: "h-11 px-6 text-[14px]",
    lg: "h-12 px-8 text-[15px]",
  };
  const variants = {
    primary:
      "bg-slate border-slate text-white hover:bg-slate/90 dark:bg-[var(--bg-card)] dark:border-white dark:text-slate-900 dark:hover:bg-[var(--bg-card)] shadow-sm active:scale-[0.98]",
    success:
      "bg-green border-green text-white hover:bg-green-d shadow-sm active:scale-[0.98]",
    danger:
      "bg-error border-error text-white hover:bg-error/90 shadow-sm active:scale-[0.98]",
    outline:
      "bg-transparent border-[var(--border)]/60 dark:border-white/10 text-slate-900 dark:text-white hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-card)]/5 active:scale-[0.98]",
    ghost:
      "bg-transparent border-transparent text-muted hover:text-slate-900 dark:hover:text-white hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-card)]/5 active:scale-[0.98]",
  };
  const disabledClasses =
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none";
  const widthClasses = fullWidth ? "w-full" : "w-auto w-max";
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variants[variant]} ${disabledClasses} ${widthClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {" "}
      {loading ? (
        <div className="flex items-center gap-2">
          {" "}
          <Spinner /> <span className="opacity-90">{children}</span>{" "}
        </div>
      ) : (
        <>
          {" "}
          {leftIcon && (
            <span className="flex items-center">{leftIcon}</span>
          )}{" "}
          {children}{" "}
          {rightIcon && (
            <span className="flex items-center">{rightIcon}</span>
          )}{" "}
        </>
      )}{" "}
    </button>
  );
}
