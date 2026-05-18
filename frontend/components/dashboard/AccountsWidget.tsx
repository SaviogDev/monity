"use client";
import { motion } from "framer-motion";
import { Wallet, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
interface Account {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
  bankCode?: string;
  color: string;
}
interface Props {
  accounts: Account[];
  onNewAccount: () => void;
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};
export function AccountsWidget({ accounts, onNewAccount }: Props) {
  return (
    <motion.div variants={itemVariants} className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {" "}
            <Wallet size={24} />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Minhas Contas
            </h2>{" "}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Suas instituições financeiras
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          <button
            onClick={onNewAccount}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-110 active:scale-95"
          >
            {" "}
            <Plus size={20} />{" "}
          </button>{" "}
          <Link
            href="/dashboard/contas"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-[var(--bg-card)]/5 text-slate-400 transition-all hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500"
          >
            {" "}
            <ChevronRight size={20} />{" "}
          </Link>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {" "}
        {accounts.length === 0 ? (
          <button
            onClick={onNewAccount}
            className="flex min-w-[200px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[var(--border)] dark:border-white/10 p-6 text-slate-400 transition-all hover:border-blue-500/40 hover:text-blue-500 dark:hover:border-blue-400/40 dark:hover:text-blue-400 lg:min-w-[240px]"
          >
            {" "}
            <Plus size={24} />{" "}
            <span className="text-xs font-black uppercase tracking-widest">
              Nova Conta
            </span>{" "}
          </button>
        ) : (
          accounts.map((account) => (
            <Link
              key={account._id}
              href={`/dashboard/contas`}
              className="group relative flex min-w-[200px] flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border)]/60 dark:border-white/5 bg-[var(--bg-card)] dark:bg-[#101216] p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg lg:min-w-[240px]"
            >
              {" "}
              <div
                className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl"
                style={{ backgroundColor: account.color }}
              />{" "}
              <div className="flex items-center gap-3">
                {" "}
                <div
                  className="h-10 w-10 rounded-xl border border-[var(--border)] dark:border-white/5 shadow-inner flex items-center justify-center text-white"
                  style={{ backgroundColor: account.color }}
                >
                  {" "}
                  <Wallet size={18} />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="max-w-[120px] truncate text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {" "}
                    {account.name}{" "}
                  </p>{" "}
                  <p className="text-[10px] font-bold text-slate-400">
                    {" "}
                    {account.type === "checking"
                      ? "Corrente"
                      : account.type === "savings"
                        ? "Poupança"
                        : "Investimento"}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="mt-8">
                {" "}
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
                  Saldo Atual
                </p>{" "}
                <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {" "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(account.currentBalance)}{" "}
                </p>{" "}
              </div>{" "}
            </Link>
          ))
        )}{" "}
      </div>{" "}
    </motion.div>
  );
}
