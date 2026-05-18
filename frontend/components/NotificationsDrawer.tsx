"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  RefreshCw,
} from "lucide-react";
import {
  fetchAlerts,
  type FinancialAlert,
  type AlertsSummary,
} from "@/services/alerts";
interface Props {
  open: boolean;
  onClose: () => void;
}
function severityConfig(severity: FinancialAlert["severity"]) {
  if (severity === "high") {
    return {
      icon: AlertTriangle,
      iconClass: "text-red-500",
      pill: "bg-red-500/10 text-red-500",
      border: "border-red-500/20",
      label: "Alta",
    };
  }
  if (severity === "medium") {
    return {
      icon: AlertCircle,
      iconClass: "text-amber-500",
      pill: "bg-amber-500/10 text-amber-500",
      border: "border-amber-500/20",
      label: "Média",
    };
  }
  return {
    icon: Info,
    iconClass: "text-blue",
    pill: "bg-blue/10 text-blue",
    border: "border-blue/20",
    label: "Baixa",
  };
}
export function NotificationsDrawer({ open, onClose }: Props) {
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts);
      setSummary(data.summary);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (open) void load();
  }, [open]);
  return (
    <AnimatePresence>
      {" "}
      {open && (
        <>
          {" "}
          {/* Backdrop */}{" "}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-900/40"
            onClick={onClose}
          />{" "}
          {/* Drawer */}{" "}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring" as const,
              stiffness: 300,
              damping: 30,
            }}
            className="fixed inset-y-0 right-0 z-[90] w-full max-w-sm border-l border-[var(--border)]/50 dark:border-white/5 bg-[var(--bg-card)] dark:bg-[#0d0f12]/95 shadow-2xl flex flex-col"
          >
            {" "}
            {/* Header */}{" "}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]/50 dark:border-white/5">
              {" "}
              <div className="flex items-center gap-3">
                {" "}
                <Bell size={18} className="text-muted" />{" "}
                <div>
                  {" "}
                  <h2 className="text-[15px] font-heading font-semibold text-slate-900 dark:text-white">
                    {" "}
                    Notificações{" "}
                  </h2>{" "}
                  {summary && summary.total > 0 && (
                    <p className="text-[11px] text-muted mt-0.5">
                      {" "}
                      {summary.high > 0 && (
                        <span className="text-red-500 font-medium">
                          {summary.high} crítico{summary.high > 1 ? "s" : ""}{" "}
                          ·{" "}
                        </span>
                      )}{" "}
                      {summary.medium > 0 && (
                        <span className="text-amber-500 font-medium">
                          {summary.medium} atenção ·{" "}
                        </span>
                      )}{" "}
                      {summary.total} no total{" "}
                    </p>
                  )}{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-center gap-2">
                {" "}
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5 transition-colors disabled:opacity-40"
                  aria-label="Atualizar alertas"
                >
                  {" "}
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />{" "}
                </button>{" "}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5 transition-colors"
                  aria-label="Fechar notificações"
                >
                  {" "}
                  <X size={16} />{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
            {/* Content */}{" "}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {" "}
              {loading && alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  {" "}
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />{" "}
                  <p className="text-[13px] text-muted">
                    Verificando alertas...
                  </p>{" "}
                </div>
              )}{" "}
              {!loading && alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  {" "}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green/10">
                    {" "}
                    <Bell size={24} className="text-green" />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                      Tudo certo!
                    </p>{" "}
                    <p className="text-[13px] text-muted mt-1">
                      {" "}
                      Nenhum alerta financeiro no momento.{" "}
                    </p>{" "}
                  </div>{" "}
                </div>
              )}{" "}
              {alerts.map((alert, i) => {
                const cfg = severityConfig(alert.severity);
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={`${alert.type}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border p-4 bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/[0.03] ${cfg.border}`}
                  >
                    {" "}
                    <div className="flex items-start gap-3">
                      {" "}
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 ${cfg.iconClass}`}
                      >
                        {" "}
                        <Icon size={16} />{" "}
                      </div>{" "}
                      <div className="flex-1 min-w-0">
                        {" "}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {" "}
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug">
                            {" "}
                            {alert.title}{" "}
                          </p>{" "}
                          <span
                            className={`text-[9px] font-display font-medium uppercase tracking-widest px-1.5 py-0.5 rounded ${cfg.pill}`}
                          >
                            {" "}
                            {cfg.label}{" "}
                          </span>{" "}
                        </div>{" "}
                        <p className="text-[12px] text-muted leading-relaxed">
                          {alert.message}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </motion.div>
                );
              })}{" "}
            </div>{" "}
            {/* Footer */}{" "}
            {summary && summary.total > 0 && (
              <div className="border-t border-[var(--border)]/50 dark:border-white/5 px-6 py-4">
                {" "}
                <p className="text-[11px] text-muted text-center">
                  {" "}
                  Alertas calculados em tempo real com base nas suas
                  transações.{" "}
                </p>{" "}
              </div>
            )}{" "}
          </motion.aside>{" "}
        </>
      )}{" "}
    </AnimatePresence>
  );
}
