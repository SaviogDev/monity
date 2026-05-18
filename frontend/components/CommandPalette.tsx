"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  BarChart3,
  CreditCard,
  Hash,
  Home,
  LayoutDashboard,
  Loader2,
  PiggyBank,
  ReceiptText,
  Repeat,
  Search,
  Tags,
  Target,
  UserCircle2,
  Wallet,
  X,
} from "lucide-react"; /* ───────────────────────────────────────────── Types
───────────────────────────────────────────── */
interface NavItem {
  type: "nav";
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  keywords: string[];
}
interface TransactionResult {
  type: "transaction";
  id: string;
  label: string;
  subtitle: string;
  amount: number;
  transactionType: "income" | "expense";
}
type CommandItem =
  | NavItem
  | TransactionResult; /* ───────────────────────────────────────────── Static nav items
───────────────────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  {
    type: "nav",
    id: "nav-dashboard",
    label: "Dashboard",
    subtitle: "Ir para o início",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["inicio", "home", "painel", "dashboard"],
  },
  {
    type: "nav",
    id: "nav-transacoes",
    label: "Transações",
    subtitle: "Ver todas as movimentações",
    href: "/dashboard/transacoes",
    icon: ArrowUpDown,
    keywords: ["transação", "transacoes", "movimentacao", "lancamento"],
  },
  {
    type: "nav",
    id: "nav-contas",
    label: "Contas",
    subtitle: "Gerenciar contas bancárias",
    href: "/dashboard/contas",
    icon: Wallet,
    keywords: ["conta", "banco", "saldo", "corrente", "poupança"],
  },
  {
    type: "nav",
    id: "nav-cartoes",
    label: "Cartões",
    subtitle: "Gerenciar cartões de crédito",
    href: "/dashboard/cartoes",
    icon: CreditCard,
    keywords: ["cartao", "credito", "fatura", "limite"],
  },
  {
    type: "nav",
    id: "nav-metas",
    label: "Metas",
    subtitle: "Acompanhar objetivos financeiros",
    href: "/dashboard/metas",
    icon: Target,
    keywords: ["meta", "objetivo", "poupança", "reserva"],
  },
  {
    type: "nav",
    id: "nav-categorias",
    label: "Categorias",
    subtitle: "Organizar categorias de gastos",
    href: "/dashboard/categorias",
    icon: Tags,
    keywords: ["categoria", "tag", "grupo"],
  },
  {
    type: "nav",
    id: "nav-relatorios",
    label: "Relatórios",
    subtitle: "Ver análises e gráficos",
    href: "/dashboard/relatorios",
    icon: BarChart3,
    keywords: ["relatorio", "grafico", "analise", "resumo"],
  },
  {
    type: "nav",
    id: "nav-orcamento",
    label: "Orçamento",
    subtitle: "Planejamento mensal",
    href: "/dashboard/orcamento",
    icon: PiggyBank,
    keywords: ["orcamento", "planejamento", "limite", "budget"],
  },
  {
    type: "nav",
    id: "nav-financiamentos",
    label: "Financiamentos",
    subtitle: "Controle de financiamentos",
    href: "/dashboard/financiamentos",
    icon: Home,
    keywords: ["financiamento", "imovel", "carro", "emprestimo"],
  },
  {
    type: "nav",
    id: "nav-titulos",
    label: "Títulos",
    subtitle: "Contas a pagar e receber",
    href: "/dashboard/titulos",
    icon: ReceiptText,
    keywords: ["titulo", "boleto", "cobrança", "pagamento"],
  },
  {
    type: "nav",
    id: "nav-recorrencias",
    label: "Recorrências",
    subtitle: "Assinaturas e despesas fixas",
    href: "/dashboard/recorrencias",
    icon: Repeat,
    keywords: ["recorrencia", "assinatura", "fixo", "mensal"],
  },
  {
    type: "nav",
    id: "nav-perfil",
    label: "Perfil",
    subtitle: "Configurações do usuário",
    href: "/dashboard/perfil",
    icon: UserCircle2,
    keywords: ["perfil", "conta", "usuario", "configuracao"],
  },
]; /* ───────────────────────────────────────────── Helpers
───────────────────────────────────────────── */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
function normalizeStr(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function filterNavItems(items: NavItem[], query: string): NavItem[] {
  if (!query) return items;
  const q = normalizeStr(query);
  return items.filter(
    (item) =>
      normalizeStr(item.label).includes(q) ||
      normalizeStr(item.subtitle).includes(q) ||
      item.keywords.some((kw) => normalizeStr(kw).includes(q)),
  );
} /* ───────────────────────────────────────────── Main component
───────────────────────────────────────────── */
interface Props {
  open: boolean;
  onClose: () => void;
}
export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [txResults, setTxResults] = useState<TransactionResult[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Focus input when palette opens */ useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTxResults([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);
  /* Debounced backend search */ const searchTransactions = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) {
        setTxResults([]);
        return;
      }
      setTxLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? (window.localStorage.getItem("monity_token") ?? "")
            : "";
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
          "http://localhost:5000/api";
        const res = await fetch(
          `${apiBase}/transactions?search=${encodeURIComponent(q)}&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error();
        const json = await res.json();
        const rows = Array.isArray(json?.data?.transactions)
          ? json.data.transactions
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
              ? json
              : [];
        setTxResults(
          rows
            .slice(0, 5)
            .map((tx: Record<string, unknown>) => ({
              type: "transaction" as const,
              id: (tx._id as string) || String(Math.random()),
              label: (tx.description as string) || "Sem descrição",
              subtitle:
                tx.category &&
                typeof tx.category === "object" &&
                "name" in tx.category
                  ? String((tx.category as Record<string, unknown>).name)
                  : "Sem categoria",
              amount: Number(tx.amount) || 0,
              transactionType: (tx.type as "income" | "expense") || "expense",
            })),
        );
      } catch {
        setTxResults([]);
      } finally {
        setTxLoading(false);
      }
    },
    [],
  );
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchTransactions(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchTransactions]);
  /* Build combined result list */ const navFiltered = filterNavItems(
    NAV_ITEMS,
    query,
  );
  const allItems: CommandItem[] = [...navFiltered, ...txResults];
  /* Reset active index when results change */ useEffect(() => {
    setActiveIndex(0);
  }, [query, txResults.length]);
  /* Keyboard navigation */ const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(allItems.length, 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (i) =>
            (i - 1 + Math.max(allItems.length, 1)) %
            Math.max(allItems.length, 1),
        );
      }
      if (e.key === "Enter" && allItems[activeIndex]) {
        e.preventDefault();
        const item = allItems[activeIndex];
        if (item.type === "nav") {
          router.push(item.href);
          onClose();
        } else {
          router.push("/dashboard/transacoes");
          onClose();
        }
      }
    },
    [allItems, activeIndex, onClose, router],
  );
  /* Scroll active item into view */ useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
  /* ── JSX ── */ return (
    <AnimatePresence>
      {" "}
      {open && (
        <>
          {" "}
          {/* Backdrop */}{" "}
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-slate-900/50"
            onClick={onClose}
          />{" "}
          {/* Panel */}{" "}
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{
              type: "spring" as const,
              stiffness: 380,
              damping: 30,
            }}
            className="fixed left-1/2 top-[12vh] z-[201] w-full max-w-[580px] -translate-x-1/2"
            onKeyDown={handleKeyDown}
          >
            {" "}
            <div className="mx-4 overflow-hidden rounded-[2rem] border border-[var(--border)]/60 dark:border-white/5 dark:border-white/10 bg-[var(--bg-card)] dark:bg-[#0d0f12]/95 shadow-2xl shadow-slate-900/20 -2xl">
              {" "}
              {/* Search input */}{" "}
              <div className="flex items-center gap-3 border-b border-[var(--border)]/70 dark:border-white/5 px-5 py-4">
                {" "}
                <Search size={18} className="shrink-0 text-slate-400" />{" "}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar página, transação..."
                  className="flex-1 bg-transparent text-[15px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />{" "}
                {txLoading ? (
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin text-[#3498DB]"
                  />
                ) : query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-900 dark:text-white dark:hover:text-white transition-colors"
                    aria-label="Limpar busca"
                  >
                    {" "}
                    <X size={14} />{" "}
                  </button>
                ) : (
                  <kbd className="hidden shrink-0 rounded-md border border-[var(--border)] dark:border-white/10 bg-slate-100 dark:bg-[var(--bg-card)]/5 px-2 py-1 text-[10px] font-bold font-mono text-slate-400 sm:block">
                    {" "}
                    ESC{" "}
                  </kbd>
                )}{" "}
              </div>{" "}
              {/* Results */}{" "}
              <ul
                ref={listRef}
                className="max-h-[380px] overflow-y-auto py-2 scrollbar-hide"
                role="listbox"
              >
                {" "}
                {/* Navigation group */}{" "}
                {navFiltered.length > 0 && (
                  <>
                    {" "}
                    <li className="px-5 pb-1 pt-2">
                      {" "}
                      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {" "}
                        {query ? "Ir para..." : "Navegação"}{" "}
                      </span>{" "}
                    </li>{" "}
                    {navFiltered.map((item, i) => {
                      const Icon = item.icon;
                      const isActive = activeIndex === i;
                      return (
                        <li
                          key={item.id}
                          data-index={i}
                          role="option"
                          aria-selected={isActive}
                        >
                          {" "}
                          <button
                            type="button"
                            onClick={() => {
                              router.push(item.href);
                              onClose();
                            }}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 mx-1 rounded-xl transition-all ${isActive ? "bg-[#3498DB]/10 text-[#3498DB]" : "text-slate-900 dark:text-white dark:text-slate-300 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-card)]/5"}`}
                          >
                            {" "}
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? "bg-[#3498DB]/20 text-[#3498DB]" : "bg-slate-100 dark:bg-[var(--bg-card)]/5 text-slate-500 dark:text-slate-400"}`}
                            >
                              {" "}
                              <Icon size={15} strokeWidth={2.2} />{" "}
                            </div>{" "}
                            <div className="min-w-0 text-left">
                              {" "}
                              <p className="truncate text-[13px] font-bold">
                                {item.label}
                              </p>{" "}
                              <p className="truncate text-[11px] font-medium text-slate-400">
                                {item.subtitle}
                              </p>{" "}
                            </div>{" "}
                          </button>{" "}
                        </li>
                      );
                    })}{" "}
                  </>
                )}{" "}
                {/* Transactions group */}{" "}
                {txResults.length > 0 && (
                  <>
                    {" "}
                    <li className="px-5 pb-1 pt-3">
                      {" "}
                      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {" "}
                        Transações encontradas{" "}
                      </span>{" "}
                    </li>{" "}
                    {txResults.map((tx, i) => {
                      const globalIndex = navFiltered.length + i;
                      const isActive = activeIndex === globalIndex;
                      const isIncome = tx.transactionType === "income";
                      return (
                        <li
                          key={tx.id}
                          data-index={globalIndex}
                          role="option"
                          aria-selected={isActive}
                        >
                          {" "}
                          <button
                            type="button"
                            onClick={() => {
                              router.push("/dashboard/transacoes");
                              onClose();
                            }}
                            onMouseEnter={() => setActiveIndex(globalIndex)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 mx-1 rounded-xl transition-all ${isActive ? "bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5" : "text-slate-900 dark:text-white dark:text-slate-300 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-card)]/5"}`}
                          >
                            {" "}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-[var(--bg-card)]/5">
                              {" "}
                              <Hash size={14} className="text-slate-400" />{" "}
                            </div>{" "}
                            <div className="min-w-0 flex-1 text-left">
                              {" "}
                              <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                                {tx.label}
                              </p>{" "}
                              <p className="truncate text-[11px] font-medium text-slate-400">
                                {tx.subtitle}
                              </p>{" "}
                            </div>{" "}
                            <span
                              className={`shrink-0 text-[13px] font-black ${isIncome ? "text-[#2ECC71]" : "text-[#FF3366]"}`}
                            >
                              {" "}
                              {isIncome ? "+" : "-"}
                              {formatCurrency(Math.abs(tx.amount))}{" "}
                            </span>{" "}
                          </button>{" "}
                        </li>
                      );
                    })}{" "}
                  </>
                )}{" "}
                {/* Empty state */}{" "}
                {!txLoading && allItems.length === 0 && query && (
                  <li className="flex flex-col items-center justify-center py-12 text-center">
                    {" "}
                    <Search size={32} className="mb-3 text-slate-200" />{" "}
                    <p className="text-sm font-bold text-slate-400">
                      Nenhum resultado para
                    </p>{" "}
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      &ldquo;{query}&rdquo;
                    </p>{" "}
                  </li>
                )}{" "}
              </ul>{" "}
              {/* Footer hint */}{" "}
              <div className="flex items-center justify-between border-t border-[var(--border)]/70 dark:border-white/5 px-5 py-3">
                {" "}
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  {" "}
                  <span className="flex items-center gap-1">
                    {" "}
                    <kbd className="rounded border border-[var(--border)] dark:border-white/10 bg-slate-100 dark:bg-[var(--bg-card)]/5 px-1.5 py-0.5 font-mono text-[9px]">
                      ↑↓
                    </kbd>{" "}
                    navegar{" "}
                  </span>{" "}
                  <span className="flex items-center gap-1">
                    {" "}
                    <kbd className="rounded border border-[var(--border)] dark:border-white/10 bg-slate-100 dark:bg-[var(--bg-card)]/5 px-1.5 py-0.5 font-mono text-[9px]">
                      ↵
                    </kbd>{" "}
                    abrir{" "}
                  </span>{" "}
                  <span className="flex items-center gap-1">
                    {" "}
                    <kbd className="rounded border border-[var(--border)] dark:border-white/10 bg-slate-100 dark:bg-[var(--bg-card)]/5 px-1.5 py-0.5 font-mono text-[9px]">
                      ESC
                    </kbd>{" "}
                    fechar{" "}
                  </span>{" "}
                </div>{" "}
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 dark:text-white/20">
                  {" "}
                  Monity{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </motion.div>{" "}
        </>
      )}{" "}
    </AnimatePresence>
  );
}
