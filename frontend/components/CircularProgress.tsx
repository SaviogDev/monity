"use client";
import { motion } from "framer-motion";
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}
export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 10,
  color = "#2ECC71",
  className = "",
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {" "}
      <svg width={size} height={size} className="transform -rotate-90">
        {" "}
        {/* Background circle */}{" "}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-100 dark:text-slate-100"
        />{" "}
        {/* Progress circle */}{" "}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
        />{" "}
      </svg>{" "}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {" "}
          {children}{" "}
        </div>
      )}{" "}
    </div>
  );
}
