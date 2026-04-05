'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  ArrowUpDown,
  Tags,
  UserCircle2,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Target,
  Home,
  Bell,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { clearToken, fetchMe } from '../../services/auth';
import { Providers } from '../providers';

type CurrentUser = {
  id?: string;
  name?: string;
  email?: string;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Contas', href: '/dashboard/contas', icon: Wallet },
  { label: 'Cartões', href: '/dashboard/cartoes', icon: CreditCard },
  { label: 'Metas', href: '/dashboard/metas', icon: Target },
  { label: 'Transações', href: '/dashboard/transacoes', icon: ArrowUpDown },
  { label: 'Financiamentos', href: '/dashboard/financiamentos', icon: Home },
  { label: 'Categorias', href: '/dashboard/categorias', icon: Tags },
  { label: 'Perfil', href: '/dashboard/perfil', icon: UserCircle2 },
];

function getInitials(name?: string) {
  if (!name) return 'M';

  const parts = name
    .trim()
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getFirstName(name?: string) {
  return name?.trim().split(' ').filter(Boolean)[0] || 'Usuário';
}

function isRouteActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const me = await fetchMe();

        if (!mounted) return;

        setUser(me || null);
      } catch {
        if (!mounted) return;

        clearToken();
        router.replace('/login');
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const currentPage = useMemo(() => {
    const current = navigation.find((item) => isRouteActive(pathname, item.href));
    return current?.label || 'Dashboard';
  }, [pathname]);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  if (loadingUser && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2ECC71] border-t-transparent shadow-lg shadow-[#2ECC71]/20" />
      </div>
    );
  }

  return (
    <Providers>
      <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu lateral"
            />
          )}
        </AnimatePresence>

        <aside
          className={`fixed inset-y-0 left-0 z-[70] w-72 transform border-r border-slate-200/60 bg-white transition-all duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 shadow-2xl shadow-slate-900/10' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-8 py-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3498DB] shadow-lg shadow-[#3498DB]/25">
                  <div className="h-4 w-4 rounded-full border-[2.5px] border-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tighter text-[#34495E]">Monity</h1>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Finance premium
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-full bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
                aria-label="Fechar menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-2">
              <div className="rounded-[1.8rem] border border-slate-100 bg-slate-50 p-3 shadow-sm shadow-slate-200/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-slate-200 bg-white text-xs font-black text-[#34495E] shadow-sm">
                    {getInitials(user?.name)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#34495E]">
                      {getFirstName(user?.name)}
                    </p>
                    <div className="mt-1 inline-flex rounded-md bg-[#3498DB]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#3498DB]">
                      Painel principal
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
              <div className="space-y-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-[1.35rem] px-4 py-3.5 transition-all duration-200 ${
                        active
                          ? 'bg-[#34495E] text-white shadow-xl shadow-[#34495E]/15'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-[#34495E]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            active ? 'bg-white/10' : 'bg-slate-100 text-slate-500 group-hover:bg-white'
                          }`}
                        >
                          <Icon size={18} strokeWidth={active ? 2.5 : 2.2} />
                        </div>
                        <span className="text-sm font-black">{item.label}</span>
                      </div>

                      {active && (
                        <motion.div layoutId="nav-indicator">
                          <ChevronRight size={14} className="opacity-70" strokeWidth={3} />
                        </motion.div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-[1.35rem] bg-rose-50 px-5 py-3.5 text-sm font-black text-rose-600 shadow-sm shadow-rose-100 transition-all hover:bg-rose-100 active:scale-[0.99]"
              >
                <LogOut size={18} />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="transition-all duration-300 lg:pl-72">
          <header className="sticky top-0 z-[50] border-b border-slate-200/50 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4 lg:px-10">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu size={20} />
                </button>

                <div>
                  <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Visão geral
                  </p>
                  <h2 className="text-xl font-black tracking-tighter text-[#34495E]">{currentPage}</h2>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:text-[#34495E] hover:shadow-sm sm:flex"
                  aria-label="Notificações"
                >
                  <Bell size={18} strokeWidth={2.5} />
                </button>

                <div className="mx-1 hidden h-10 w-px bg-slate-200 sm:block" />

                <div className="flex items-center gap-3">
                  <div className="hidden text-right md:block">
                    <p className="text-xs font-black text-[#34495E]">{user?.name || 'Usuário'}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Ambiente administrativo
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#34495E] text-[11px] font-black text-white shadow-lg shadow-[#34495E]/20">
                    {getInitials(user?.name)}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1600px] p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </Providers>
  );
}