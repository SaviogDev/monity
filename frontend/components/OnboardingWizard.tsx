"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Tags,
  ArrowUpDown,
  Target,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { seedDemoData } from "@/services/demo";
interface Props {
  onComplete: () => void;
}
export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);
  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      await seedDemoData();
      toast.success("Dados de demonstração carregados com sucesso!");
      localStorage.setItem("monity_onboarding_done", "true");
      onComplete();
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar dados.",
      );
    } finally {
      setIsSeeding(false);
    }
  };
  const handleFinish = () => {
    localStorage.setItem("monity_onboarding_done", "true");
    onComplete();
    setIsOpen(false);
  };
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      {" "}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {" "}
        {/* Backdrop */}{" "}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60"
        />{" "}
        {/* Modal */}{" "}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-[var(--border)]/60 dark:border-white/5 dark:border-white/10 bg-[var(--bg-card)] dark:bg-slate-900/90 shadow-2xl -2xl"
        >
          {" "}
          {/* Header */}{" "}
          <div className="flex items-center justify-between border-b border-[var(--border)] dark:border-white/5 px-8 py-6">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34495E] text-white">
                {" "}
                <Sparkles size={20} />{" "}
              </div>{" "}
              <div>
                {" "}
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Seja bem-vindo ao Monity
                </h2>{" "}
                <p className="text-xs font-bold text-slate-400">
                  Vamos configurar sua conta em segundos
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <button
              onClick={handleFinish}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5 transition-colors"
            >
              {" "}
              <X size={20} />{" "}
            </button>{" "}
          </div>{" "}
          {/* Content */}{" "}
          <div className="p-8">
            {" "}
            <AnimatePresence mode="wait">
              {" "}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {" "}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue/10 text-blue">
                    {" "}
                    <Wallet size={32} />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Crie sua primeira conta
                    </h3>{" "}
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                      {" "}
                      O Monity precisa saber de onde vem seu dinheiro. Adicione
                      sua conta corrente, poupança ou investimentos para começar
                      a rastrear seu saldo.{" "}
                    </p>{" "}
                  </div>{" "}
                </motion.div>
              )}{" "}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {" "}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange/10 text-orange">
                    {" "}
                    <Tags size={32} />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Organize por categorias
                    </h3>{" "}
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                      {" "}
                      Categorias como &quot;Alimentação&quot;, &quot;Lazer&quot; ou &quot;Saúde&quot; ajudam você
                      a entender para onde seu dinheiro está indo. Nós já
                      criamos algumas padrões para você!{" "}
                    </p>{" "}
                  </div>{" "}
                </motion.div>
              )}{" "}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {" "}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green/10 text-green">
                    {" "}
                    <ArrowUpDown size={32} />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Registre sua primeira transação
                    </h3>{" "}
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                      {" "}
                      Seja uma despesa rápida no café ou seu salário mensal,
                      registrar tudo é o segredo para a saúde financeira. Você
                      também pode importar arquivos OFX/CSV!{" "}
                    </p>{" "}
                  </div>{" "}
                </motion.div>
              )}{" "}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {" "}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple/10 text-purple">
                    {" "}
                    <Target size={32} />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Defina suas metas
                    </h3>{" "}
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                      {" "}
                      Uma reserva de emergência ou aquela viagem dos sonhos?
                      Crie metas para se manter motivado a economizar todos os
                      meses.{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="rounded-2xl bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 p-6 border border-[var(--border)] dark:border-white/5">
                    {" "}
                    <p className="text-sm font-bold text-slate-900 dark:text-white dark:text-slate-300">
                      Dica Pro:
                    </p>{" "}
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {" "}
                      Se você quer apenas testar a plataforma sem digitar nada,
                      clique no botão abaixo para carregar dados de
                      demonstração.{" "}
                    </p>{" "}
                    <button
                      onClick={handleSeedDemo}
                      disabled={isSeeding}
                      className="mt-4 flex items-center gap-2 rounded-xl bg-[#3498DB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#3498DB]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                      {" "}
                      {isSeeding ? (
                        <>
                          {" "}
                          <Loader2 size={18} className="animate-spin" />{" "}
                          Carregando...{" "}
                        </>
                      ) : (
                        <>
                          {" "}
                          <Sparkles size={18} /> Carregar dados de exemplo{" "}
                        </>
                      )}{" "}
                    </button>{" "}
                  </div>{" "}
                </motion.div>
              )}{" "}
            </AnimatePresence>{" "}
          </div>{" "}
          {/* Footer */}{" "}
          <div className="flex items-center justify-between border-t border-[var(--border)] dark:border-white/5 bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 px-8 py-6">
            {" "}
            <div className="flex gap-2">
              {" "}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${step === i ? "w-8 bg-[#34495E]" : "w-2 bg-slate-200 dark:bg-[var(--bg-card)]/10"}`}
                />
              ))}{" "}
            </div>{" "}
            <div className="flex gap-3">
              {" "}
              {step > 1 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 rounded-2xl border-2 border-[var(--border)] dark:border-white/10 px-6 py-2.5 text-sm font-black text-slate-500 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5"
                >
                  {" "}
                  <ChevronLeft size={18} /> Voltar{" "}
                </button>
              )}{" "}
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-2xl bg-[#34495E] px-8 py-3 text-sm font-black text-white shadow-lg shadow-[#34495E]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {" "}
                  Continuar <ChevronRight size={18} />{" "}
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-2 rounded-2xl bg-[#2ECC71] px-8 py-3 text-sm font-black text-white shadow-lg shadow-[#2ECC71]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {" "}
                  Começar a usar <CheckCircle2 size={18} />{" "}
                </button>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </motion.div>{" "}
      </div>{" "}
    </AnimatePresence>
  );
}
