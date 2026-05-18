"use client";
import { motion } from "framer-motion";
import { CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
interface CreditCardData {
  _id: string;
  name: string;
  limit: number;
  usedLimit: number;
  availableLimit: number;
  color: string;
  bankCode?: string;
}
interface Props {
  cards: CreditCardData[];
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};
export function CardsOverviewWidget({ cards }: Props) {
  const activeCards = cards.slice(0, 3);
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            {" "}
            <CreditCard size={24} />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Resumo dos Cartões
            </h2>{" "}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Limites e faturas
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <Link
          href="/dashboard/cartoes"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 text-slate-400 transition-all hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500"
        >
          {" "}
          <ChevronRight size={20} />{" "}
        </Link>{" "}
      </div>{" "}
      <div className="space-y-6">
        {" "}
        {activeCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {" "}
            <CreditCard size={40} className="mb-3 text-slate-200" />{" "}
            <p className="text-sm font-bold text-slate-400">
              Nenhum cartão ativo
            </p>{" "}
            <Link
              href="/dashboard/cartoes"
              className="mt-2 text-xs font-black uppercase tracking-widest text-orange-500"
            >
              {" "}
              Adicionar cartão{" "}
            </Link>{" "}
          </div>
        ) : (
          activeCards.map((card) => {
            const usagePercent =
              card.limit > 0
                ? Math.min(100, (card.usedLimit / card.limit) * 100)
                : 0;
            return (
              <div key={card._id} className="space-y-3">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <div
                      className="h-8 w-12 rounded-lg border border-[var(--border)] dark:border-white/5 shadow-sm"
                      style={{ backgroundColor: card.color }}
                    />{" "}
                    <span className="text-sm font-black text-slate-900 dark:text-white dark:text-slate-200">
                      {card.name}
                    </span>{" "}
                  </div>{" "}
                  <span className="text-[13px] font-black text-slate-400">
                    {" "}
                    {usagePercent.toFixed(0)}%{" "}
                  </span>{" "}
                </div>{" "}
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[var(--bg-card)]/5">
                  {" "}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-orange-500" : "bg-emerald-500"}`}
                  />{" "}
                </div>{" "}
                <div className="flex justify-between text-[11px] font-bold">
                  {" "}
                  <span className="text-slate-400">
                    {" "}
                    Disponível:{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(card.availableLimit)}{" "}
                  </span>{" "}
                  <span className="text-slate-500 dark:text-slate-300">
                    {" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(card.limit)}{" "}
                  </span>{" "}
                </div>{" "}
              </div>
            );
          })
        )}{" "}
      </div>{" "}
    </motion.div>
  );
}
