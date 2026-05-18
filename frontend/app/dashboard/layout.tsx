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
  FileText,
  Repeat,
  Layers,
  PiggyBank,
  PieChart,
  Clock,
  BarChart2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { Providers } from '../providers';
import { BackgroundBlobs } from '../../components/BackgroundBlobs';
import { NotificationsDrawer } from '../../components/NotificationsDrawer';
import { useFinancialStore } from '../../stores/financial-store';
import { useAuth } from '../../hooks/useAuth';

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Contas', href: '/dashboard/contas', icon: Home },
      { label: 'Cartões', href: '/dashboard/cartoes', icon: CreditCard },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { label: 'Transações', href: '/dashboard/transacoes', icon: ArrowUpDown },
      { label: 'Títulos', href: '/dashboard/titulos', icon: FileText },
      { label: 'Recorrências', href: '/dashboard/recorrencias', icon: Repeat },
      { label: 'Orçamentos', href: '/dashboard/orcamento', icon: Clock },
    ],
  },
  {
    label: 'PLANEJAMENTO',
    items: [
      { label: 'Metas', href: '/dashboard/metas', icon: Target },
      { label: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart2 },
      { label: 'Categorias', href: '/dashboard/categorias', icon: Tags },
      { label: 'Perfil', href: '/dashboard/perfil', icon: UserCircle2 },
    ],
  },
];

function getInitials(name?: string) {
  if (!name) return 'MO';

  const parts = name
    .trim()
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'MO';
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const { user, loading: loadingUser, refreshUser, logout } = useAuth();
  const { alertsSummary, loadAll } = useFinancialStore();

  useEffect(() => {
    // Carrega dados iniciais do store para pegar os alertas
    void loadAll();
    
    // Carrega usuário se ainda não inicializado
    void refreshUser();
  }, [loadAll, refreshUser]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const currentPage = useMemo(() => {
    for (const group of navigationGroups) {
      const current = group.items.find((item) => isRouteActive(pathname, item.href));
      if (current) return current.label;
    }
    return 'Dashboard';
  }, [pathname]);

  function handleLogout() {
    logout();
  }

  if (loadingUser && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent backdrop-blur-xl">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3498DB] border-t-transparent shadow-lg shadow-[#3498DB]/20" />
      </div>
    );
  }

  return (
    <Providers>
      <div className="app">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu lateral"
            />
          )}
        </AnimatePresence>

        <aside className={`sidebar transition-transform duration-300 ${sidebarOpen ? 'translate-x-0 absolute h-full shadow-2xl' : '-translate-x-full absolute h-full lg:static lg:translate-x-0'}`}>
          <div className="sidebar-logo">
            <div className="logo-mark">M</div>
            <div>
              <div className="logo-text">Monity</div>
              <div className="logo-badge">Premium</div>
            </div>
            {/* Close button for mobile */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto text-slate-500 hover:text-white lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Foto" className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{getFirstName(user?.name)}</div>
              <div className="user-role">Painel principal</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationGroups.map((group) => (
              <div key={group.label} className="mb-4 last:mb-0">
                <div className="nav-label">{group.label}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item ${active ? 'active' : ''}`}
                    >
                      <Icon className="nav-icon" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button type="button" onClick={handleLogout} className="btn-logout">
              <LogOut size={16} />
              <span>Sair da conta</span>
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-slate-500 hover:text-white lg:hidden mr-4"
            >
              <Menu size={22} />
            </button>

            <div className="topbar-breadcrumb">
              <span className="breadcrumb-sup">Visão geral</span>
              <span className="breadcrumb-title">{currentPage}</span>
            </div>

            <div className="topbar-actions">
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="notif-btn"
              >
                <Bell size={18} />
                {alertsSummary && alertsSummary.total > 0 && (
                  <span className="notif-dot"></span>
                )}
              </button>

              <div className="topbar-user hidden sm:flex">
                <div className="topbar-user-info">
                  <div className="topbar-username">{user?.name || 'Usuário'}</div>
                  <div className="topbar-tag">Admin</div>
                </div>
                <div className="topbar-avatar">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Foto" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="content">
            <div className="mx-auto max-w-[1600px] h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </Providers>
  );
}