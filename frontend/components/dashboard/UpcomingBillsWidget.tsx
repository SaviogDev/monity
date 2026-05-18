"use client";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Calculator } from "lucide-react";
import Link from "next/link";
interface Bill {
  _id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
}
interface Props {
  bills: Bill[];
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};
export function UpcomingBillsWidget({ bills }: Props) {
  const topBills = bills.slice(0, 4);
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col rounded-[2.5rem] border border-[var(--border)]/60 dark:border-white/5 bg-[var(--bg-card)] dark:bg-[#101216] p-8 shadow-sm"
    >
      {" "}
      <div className="flex items-center justify-between mb-8">
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {" "}
            <Bell size={24} />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Contas Próximas
            </h2>{" "}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Compromissos agendados
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <Link
          href="/dashboard/agenda"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 text-slate-400 transition-all hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500"
        >
          {" "}
          <ChevronRight size={20} />{" "}
        </Link>{" "}
      </div>{" "}
      <div className="space-y-4">
        {" "}
        {topBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
            {" "}
            <Calculator size={40} className="mb-3 opacity-20" />{" "}
            <p className="text-sm font-bold">
              Sem contas para os próximos dias
            </p>{" "}
          </div>
        ) : (
          topBills.map((bill) => (
            <div
              key={bill._id}
              className="flex items-center justify-between rounded-2xl bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 p-4 shadow-sm border border-transparent hover:border-rose-500/20 transition-all"
            >
              {" "}
              <div className="flex items-center gap-4">
                {" "}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] dark:bg-slate-800 text-slate-400">
                  {" "}
                  <span className="text-xs font-black">
                    {new Date(bill.dueDate).getDate()}
                  </span>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                    {bill.description}
                  </p>{" "}
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Vence em{" "}
                    {new Date(bill.dueDate).toLocaleDateString("pt-BR")}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="text-right">
                {" "}
                <p className="text-sm font-black text-rose-500">
                  {" "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(bill.amount)}{" "}
                </p>{" "}
              </div>{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
    </motion.div>
  );
}
