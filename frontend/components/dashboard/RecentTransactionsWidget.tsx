"use client";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
interface Transaction {
  _id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: { name: string; icon: string; color: string };
  transactionDate: string;
}
interface Props {
  transactions: Transaction[];
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};
export function RecentTransactionsWidget({ transactions }: Props) {
  const latest = transactions.slice(0, 5);
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {" "}
            <ArrowUpDown size={24} />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Transações Recentes
            </h2>{" "}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Últimas movimentações
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <Link
          href="/dashboard/transacoes"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 text-slate-400 transition-all hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500"
        >
          {" "}
          <ChevronRight size={20} />{" "}
        </Link>{" "}
      </div>{" "}
      <div className="space-y-4">
        {" "}
        {latest.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {" "}
            <ArrowUpDown size={40} className="mb-3 text-slate-200" />{" "}
            <p className="text-sm font-bold text-slate-400">
              Nenhuma transação registrada
            </p>{" "}
          </div>
        ) : (
          latest.map((tx) => (
            <div
              key={tx._id}
              className="group flex items-center justify-between rounded-2xl border border-transparent p-2 transition-all hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-card)]/5"
            >
              {" "}
              <div className="flex items-center gap-4">
                {" "}
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] dark:border-white/5 text-white shadow-sm"
                  style={{ backgroundColor: tx.category?.color || "#3498DB" }}
                >
                  {" "}
                  <span className="text-lg">
                    {tx.category?.icon || "💰"}
                  </span>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="max-w-[140px] truncate text-sm font-black text-slate-900 dark:text-white sm:max-w-[200px]">
                    {" "}
                    {tx.description}{" "}
                  </p>{" "}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-colors group-hover:text-slate-500">
                    {" "}
                    {tx.category?.name}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="text-right">
                {" "}
                <p
                  className={`text-sm font-black ${tx.type === "income" ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {" "}
                  {tx.type === "income" ? "+" : "-"}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(tx.amount)}{" "}
                </p>{" "}
                <p className="text-[10px] font-bold text-slate-400 transition-colors group-hover:text-slate-500">
                  {" "}
                  {new Date(tx.transactionDate).toLocaleDateString(
                    "pt-BR",
                  )}{" "}
                </p>{" "}
              </div>{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
    </motion.div>
  );
}
