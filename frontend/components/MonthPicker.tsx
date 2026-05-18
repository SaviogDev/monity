"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
interface MonthPickerProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}
export function MonthPicker({ selectedDate, onChange }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const months = Array.from(
    { length: 12 },
    (_, i) => new Date(selectedDate.getFullYear(), i, 1),
  );
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(subMonths(selectedDate, 1));
  };
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(addMonths(selectedDate, 1));
  };
  return (
    <div className="relative">
      {" "}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 cursor-pointer rounded-2xl border border-[var(--border)] dark:border-white/5 dark:border-white/10 bg-[var(--bg-card)] dark:bg-slate-800/40 px-4 py-2.5 transition-all hover:bg-[var(--bg-card)] dark:hover:bg-slate-800/60 shadow-sm"
      >
        {" "}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/10 text-green">
          {" "}
          <Calendar size={18} />{" "}
        </div>{" "}
        <div className="flex items-center gap-4">
          {" "}
          <button
            onClick={handlePrevMonth}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {" "}
            <ChevronLeft size={16} />{" "}
          </button>{" "}
          <span className="min-w-[120px] text-center text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {" "}
            {format(selectedDate, "MMMM yyyy", { locale: ptBR })}{" "}
          </span>{" "}
          <button
            onClick={handleNextMonth}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {" "}
            <ChevronRight size={16} />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <AnimatePresence>
        {" "}
        {isOpen && (
          <>
            {" "}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[90] bg-transparent"
            />{" "}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 z-[100] w-64 overflow-hidden rounded-[1.5rem] border border-[var(--border)]/60 dark:border-white/5 dark:border-white/10 bg-[var(--bg-card)] dark:bg-slate-900/90 p-4 shadow-2xl"
            >
              {" "}
              <div className="mb-4 flex items-center justify-between px-2">
                {" "}
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Selecionar Mês
                </span>{" "}
                <span className="text-xs font-black text-green">
                  {selectedDate.getFullYear()}
                </span>{" "}
              </div>{" "}
              <div className="grid grid-cols-3 gap-2">
                {" "}
                {months.map((month) => {
                  const isSelected = isSameMonth(month, selectedDate);
                  return (
                    <button
                      key={month.getMonth()}
                      onClick={() => {
                        onChange(month);
                        setIsOpen(false);
                      }}
                      className={`rounded-xl py-2.5 text-xs font-bold transition-all ${isSelected ? "bg-green text-white shadow-lg shadow-green/20" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                    >
                      {" "}
                      {format(month, "MMM", { locale: ptBR })}{" "}
                    </button>
                  );
                })}{" "}
              </div>{" "}
              <div className="mt-4 flex gap-2 border-t border-[var(--border)] dark:border-white/5 pt-4">
                {" "}
                <button
                  onClick={() => onChange(subMonths(selectedDate, 12))}
                  className="flex-1 rounded-lg bg-[var(--bg-surface)] dark:bg-slate-800 py-2 text-[10px] font-black uppercase text-slate-500 transition-colors hover:bg-slate-100"
                >
                  {" "}
                  Ano Anterior{" "}
                </button>{" "}
                <button
                  onClick={() => onChange(addMonths(selectedDate, 12))}
                  className="flex-1 rounded-lg bg-[var(--bg-surface)] dark:bg-slate-800 py-2 text-[10px] font-black uppercase text-slate-500 transition-colors hover:bg-slate-100"
                >
                  {" "}
                  Próximo Ano{" "}
                </button>{" "}
              </div>{" "}
            </motion.div>{" "}
          </>
        )}{" "}
      </AnimatePresence>{" "}
    </div>
  );
}
