"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  TrendingDown,
  TrendingUp,
  Landmark,
  CreditCard as CreditCardIcon,
  Repeat,
  Split,
  Loader2,
  Calendar,
} from "lucide-react";
import { type Category } from "@/services/categories";
import { type Account } from "@/services/accounts";
import { type CreditCard } from "@/services/creditCards";
interface TransactionFormState {
  type: "income" | "expense";
  description: string;
  amount: string;
  category: string;
  account: string;
  creditCard: string;
  paymentMethod: "pix" | "debit" | "credit" | "cash" | "transfer" | string;
  date: string;
  isRecurring: boolean;
  recurrenceFrequency: string;
  isInstallment: boolean;
  installments: string;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  form: TransactionFormState;
  setForm: React.Dispatch<React.SetStateAction<TransactionFormState>>;
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCard[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}
export function TransactionModal({
  isOpen,
  onClose,
  form,
  setForm,
  categories,
  accounts,
  creditCards,
  isSubmitting,
  onSubmit,
}: Props) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      {" "}
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {" "}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60"
        />{" "}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-[var(--border)]/60 dark:border-white/5 dark:border-white/10 bg-[var(--bg-card)] dark:bg-slate-900/90 shadow-2xl -2xl"
        >
          {" "}
          {/* Header */}{" "}
          <div className="flex items-center justify-between border-b border-[var(--border)] dark:border-white/5 px-8 py-6">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${form.type === "income" ? "bg-[#2ECC71]/10 text-[#2ECC71]" : "bg-[#FF3366]/10 text-[#FF3366]"}`}
              >
                {" "}
                <Plus size={20} />{" "}
              </div>{" "}
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {" "}
                Nova Transação{" "}
              </h2>{" "}
            </div>{" "}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5 transition-colors"
            >
              {" "}
              <X size={20} />{" "}
            </button>{" "}
          </div>{" "}
          <form onSubmit={onSubmit} className="p-8">
            {" "}
            <div className="space-y-6">
              {" "}
              {/* Tipo */}{" "}
              <div className="flex gap-2 rounded-2xl bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 p-1.5 shadow-inner">
                {" "}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "expense" })}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all ${form.type === "expense" ? "bg-[#FF3366] text-white shadow-lg shadow-[#FF3366]/20" : "text-slate-400"}`}
                >
                  {" "}
                  <TrendingDown size={18} /> Despesa{" "}
                </button>{" "}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "income" })}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition-all ${form.type === "income" ? "bg-[#2ECC71] text-white shadow-lg shadow-[#2ECC71]/20" : "text-slate-400"}`}
                >
                  {" "}
                  <TrendingUp size={18} /> Receita{" "}
                </button>{" "}
              </div>{" "}
              {/* Valor e Descrição */}{" "}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {" "}
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Descrição
                  </label>{" "}
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Ex: Aluguel, Supermercado..."
                    className="w-full rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                  />{" "}
                </div>{" "}
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Valor (R$)
                  </label>{" "}
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="0,00"
                    className="w-full rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                  />{" "}
                </div>{" "}
              </div>{" "}
              {/* Categoria e Data */}{" "}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {" "}
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Categoria
                  </label>{" "}
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full appearance-none rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                  >
                    {" "}
                    <option value="">Selecione...</option>{" "}
                    {(() => {
                      const relevant = categories.filter(
                        (c) => c.type === form.type,
                      );
                      const parents = relevant.filter((c) => !c.parent);
                      const children = relevant.filter((c) => !!c.parent);
                      const childrenByParent = new Map<
                        string,
                        typeof children
                      >();
                      children.forEach((c) => {
                        const pid = typeof c.parent === 'object' ? c.parent?._id : c.parent;
                        if (pid) {
                          if (!childrenByParent.has(pid))
                            childrenByParent.set(pid, []);
                          childrenByParent.get(pid)!.push(c);
                        }
                      });
                      return parents.map((parent) => {
                        const kids = childrenByParent.get(parent._id) || [];
                        if (kids.length === 0) {
                          return (
                            <option key={parent._id} value={parent._id}>
                              {" "}
                              {parent.icon || ""} {parent.name}{" "}
                            </option>
                          );
                        }
                        return (
                          <optgroup
                            key={parent._id}
                            label={`${parent.icon || ""} ${parent.name}`}
                          >
                            {" "}
                            <option value={parent._id}>
                              {parent.icon || ""} {parent.name} (geral)
                            </option>{" "}
                            {kids.map((k) => (
                              <option key={k._id} value={k._id}>
                                {" "}
                                {" ↳ "}
                                {k.icon || ""} {k.name}{" "}
                              </option>
                            ))}{" "}
                          </optgroup>
                        );
                      });
                    })()}{" "}
                  </select>{" "}
                </div>{" "}
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Data
                  </label>{" "}
                  <div className="relative">
                    {" "}
                    <Calendar
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />{" "}
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      className="w-full rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                    />{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {/* Método de Pagamento */}{" "}
              <div className="space-y-2">
                {" "}
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Método de Pagamento
                </label>{" "}
                <div className="grid grid-cols-3 gap-2">
                  {" "}
                  {["pix", "debit", "credit"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, paymentMethod: method })
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 transition-all ${form.paymentMethod === method ? "border-[#3498DB] bg-[#3498DB]/10 text-[#3498DB]" : "border-[var(--border)] dark:border-white/5 text-slate-400"}`}
                    >
                      {" "}
                      {method === "pix" && <TrendingUp size={16} />}{" "}
                      {method === "debit" && <Landmark size={16} />}{" "}
                      {method === "credit" && <CreditCardIcon size={16} />}{" "}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {method}
                      </span>{" "}
                    </button>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
              {/* Condicionais: Conta ou Cartão */}{" "}
              {form.paymentMethod === "credit" ? (
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Cartão de Crédito
                  </label>{" "}
                  <select
                    value={form.creditCard}
                    onChange={(e) =>
                      setForm({ ...form, creditCard: e.target.value })
                    }
                    className="w-full appearance-none rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                  >
                    {" "}
                    <option value="">Selecione...</option>{" "}
                    {creditCards.map((card) => (
                      <option key={card._id} value={card._id}>
                        {card.name}
                      </option>
                    ))}{" "}
                  </select>{" "}
                </div>
              ) : (
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Conta Bancária
                  </label>{" "}
                  <select
                    value={form.account}
                    onChange={(e) =>
                      setForm({ ...form, account: e.target.value })
                    }
                    className="w-full appearance-none rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                  >
                    {" "}
                    <option value="">Selecione...</option>{" "}
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name}
                      </option>
                    ))}{" "}
                  </select>{" "}
                </div>
              )}{" "}
              {/* Parcelamento e Recorrência */}{" "}
              <div className="flex gap-4">
                {" "}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      isRecurring: !form.isRecurring,
                      isInstallment: false,
                    })
                  }
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 text-xs font-black uppercase tracking-widest transition-all ${form.isRecurring ? "border-[#3498DB] bg-[#3498DB]/10 text-[#3498DB]" : "border-[var(--border)] dark:border-white/5 text-slate-400"}`}
                >
                  {" "}
                  <Repeat size={14} /> Fixo{" "}
                </button>{" "}
                {form.type === "expense" && form.paymentMethod === "credit" && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        isInstallment: !form.isInstallment,
                        isRecurring: false,
                      })
                    }
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 text-xs font-black uppercase tracking-widest transition-all ${form.isInstallment ? "border-[#3498DB] bg-[#3498DB]/10 text-[#3498DB]" : "border-[var(--border)] dark:border-white/5 text-slate-400"}`}
                  >
                    {" "}
                    <Split size={14} /> Parcelado{" "}
                  </button>
                )}{" "}
              </div>{" "}
              {/* Frequência — aparece para qualquer tipo de lançamento fixo */}{" "}
              {form.isRecurring && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                  {" "}
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Frequência
                  </label>{" "}
                  <select
                    value={form.recurrenceFrequency || "monthly"}
                    onChange={(e) =>
                      setForm({ ...form, recurrenceFrequency: e.target.value })
                    }
                    className="w-full appearance-none rounded-2xl border-2 border-[var(--border)] dark:border-white/5 bg-[#3498DB]/5 dark:bg-[var(--bg-card)]/5 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#3498DB] transition-all"
                  >
                    {" "}
                    <option value="daily">Diária</option>{" "}
                    <option value="weekly">Semanal</option>{" "}
                    <option value="biweekly">Quinzenal</option>{" "}
                    <option value="monthly">Mensal</option>{" "}
                    <option value="quarterly">Trimestral</option>{" "}
                    <option value="yearly">Anual</option>{" "}
                  </select>{" "}
                </div>
              )}{" "}
            </div>{" "}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34495E] py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-[#34495E]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
            >
              {" "}
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Salvar Transação"
              )}{" "}
            </button>{" "}
          </form>{" "}
        </motion.div>{" "}
      </div>{" "}
    </AnimatePresence>
  );
}
