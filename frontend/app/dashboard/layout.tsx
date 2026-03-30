'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  ArrowUpDown,
  Layers3,
  Receipt,
  Tags,
  UserCircle2,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';

import { clearToken, fetchMe } from '../../services/auth';
import { Providers } from '../providers';

type CurrentUser = {
  id?: string;
  name?: string;
  email?: string;
};

const navigation = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Contas',
    href: '/dashboard/contas',
    icon: Wallet,
  },
  {
    label: 'Cartões',
    href: '/dashboard/cartoes',
    icon: CreditCard,
  },
  {
    label: 'Transações',
    href: '/dashboard/transacoes',
    icon: ArrowUpDown,
  },
  {
    label: 'Parcelamentos',
    href: '/dashboard/parcelamentos',
    icon: Layers3,
  },
  {
    label: 'Faturas',
    href: '/dashboard/faturas',
    icon: Receipt,
  },
  {
    label: 'Categorias',
    href: '/dashboard/categorias',
    icon: Tags,
  },
  {
    label: 'Perfil',
    href: '/dashboard/perfil',
    icon: UserCircle2,
  },
];

function getInitials(name?: string) {
  if (!name) return 'M';

  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isRouteActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

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

    const loadUser = async () => {
      try {
        const me = await fetchMe();
        if (!mounted) return;
        setUser(me || null);
      } catch (error) {
        console.error('Erro ao carregar usuário do dashboard:', error);

        if (mounted) {
          clearToken();
          router.replace('/login');
        }
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    };

    loadUser();

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

  return (
    <Providers>
      <div className="min-h-screen bg-slate-50">
        {sidebarOpen && (
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Monity
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">Painel financeiro</h1>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 lg:hidden"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] text-sm font-bold text-white shadow-sm">
                  {loadingUser ? '...' : getInitials(user?.name)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {loadingUser ? 'Carregando...' : user?.name || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {loadingUser ? 'Buscando perfil' : user?.email || 'sem e-mail'}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                        active
                          ? 'bg-gradient-to-r from-[#3498DB] to-[#2980B9] text-white shadow-md'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            active
                              ? 'bg-white/15 text-white'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-white'
                          }`}
                        >
                          <Icon size={18} />
                        </div>

                        <span className="text-sm font-medium">{item.label}</span>
                      </div>

                      <ChevronRight
                        size={16}
                        className={active ? 'text-white/80' : 'text-slate-400'}
                      />
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-slate-200 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <LogOut size={18} />
                  </div>
                  <span>Sair</span>
                </div>

                <ChevronRight size={16} className="text-slate-400" />
              </button>
            </div>
          </div>
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
                >
                  <Menu size={18} />
                </button>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Área logada
                  </p>
                  <h2 className="text-lg font-bold text-slate-900">{currentPage}</h2>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2ECC71] to-[#27AE60] text-xs font-bold text-white">
                  {loadingUser ? '...' : getInitials(user?.name)}
                </div>
                <div className="max-w-[180px]">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {loadingUser ? 'Carregando...' : user?.name || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {loadingUser ? 'Buscando perfil' : user?.email || 'sem e-mail'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </Providers>
  );
}