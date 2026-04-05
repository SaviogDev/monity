'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AtSign,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Fingerprint,
  Lock,
  LogOut,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  User,
  WalletCards,
  Eye,
  FileBarChart2,
  BadgeCheck,
} from 'lucide-react';

import { clearToken, fetchMe } from '@/services/auth';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
};

type ProfileUser = {
  id: string;
  name: string;
  email: string;
};

type PreferencesState = {
  notifications: boolean;
  weeklyReport: boolean;
  hideBalances: boolean;
};

type PreferenceItem = {
  id: keyof PreferencesState;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  desc: string;
  active: boolean;
};

type QuickAction = {
  id: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
};

function getInitials(name?: string) {
  if (!name) return 'MO';

  const parts = name
    .trim()
    .split(' ')
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Switch({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-14 items-center rounded-full px-1 transition-all ${
        checked
          ? 'bg-blue-600 shadow-inner shadow-blue-900/20'
          : 'bg-slate-200'
      }`}
    >
      <div
        className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<ProfileUser | null>(null);

  const [preferences, setPreferences] = useState<PreferencesState>({
    notifications: true,
    weeklyReport: true,
    hideBalances: false,
  });

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);

        const data = await fetchMe();

        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
        });
      } catch (error) {
        clearToken();
        toast.error('Sessão expirada. Faça login novamente.');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, [router]);

  const memberSinceLabel = useMemo(() => {
    return new Date().getFullYear().toString();
  }, []);

  const userFirstName = useMemo(() => {
    if (!user?.name) return 'usuário';
    return user.name.trim().split(' ')[0];
  }, [user?.name]);

  function handleTogglePreference(key: keyof PreferencesState) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));

    toast.success('Preferência atualizada.');
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      clearToken();
      toast.success('Sessão encerrada com segurança.');
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  const preferenceItems: PreferenceItem[] = [
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notificações inteligentes',
      desc: 'Alertas importantes de vencimentos, movimentações e eventos da conta.',
      active: preferences.notifications,
    },
    {
      id: 'weeklyReport',
      icon: FileBarChart2,
      title: 'Resumo semanal',
      desc: 'Receber um panorama resumido do seu comportamento financeiro.',
      active: preferences.weeklyReport,
    },
    {
      id: 'hideBalances',
      icon: Eye,
      title: 'Ocultar saldos',
      desc: 'Esconder valores da dashboard por padrão para mais privacidade.',
      active: preferences.hideBalances,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'edit-profile',
      icon: User,
      title: 'Editar perfil',
      subtitle: 'Atualizar seus dados cadastrais',
      onClick: () => toast('Fluxo de edição entra na próxima etapa do Monity.'),
    },
    {
      id: 'change-password',
      icon: Lock,
      title: 'Alterar senha',
      subtitle: 'Reforçar a segurança da conta',
      onClick: () => toast('Fluxo de alteração de senha entra na próxima etapa.'),
    },
    {
      id: 'devices',
      icon: Smartphone,
      title: 'Dispositivos',
      subtitle: 'Gerenciar acessos conectados',
      onClick: () => toast('Gestão de dispositivos entra na próxima etapa.'),
    },
    {
      id: 'subscription',
      icon: WalletCards,
      title: 'Assinatura',
      subtitle: 'Visualizar plano e benefícios',
      onClick: () => toast('Gestão de assinatura entra na próxima etapa.'),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-lg shadow-blue-200" />
        <p className="animate-pulse text-sm font-black uppercase tracking-widest text-slate-400">
          Sincronizando perfil
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl space-y-8 pb-24"
    >
      {/* HERO */}
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-[3rem] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8 xl:p-10"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-1.5 shadow-2xl shadow-blue-500/30 sm:h-32 sm:w-32">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-3xl font-black text-slate-900 sm:text-4xl">
                  {getInitials(user?.name)}
                </div>
              </div>

              <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-emerald-500 shadow-lg">
                <BadgeCheck size={18} className="text-white" strokeWidth={2.8} />
              </div>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                <Sparkles size={12} />
                Perfil premium
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 sm:text-5xl">
                  Olá, {userFirstName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
                  Aqui você gerencia sua identidade, segurança e preferências do ecossistema Monity.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-sm font-bold text-slate-500 sm:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                  <AtSign size={16} className="text-blue-600" />
                  {user?.email}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                  <Calendar size={16} className="text-blue-600" />
                  Membro desde {memberSinceLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[460px]">
            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Status
              </p>
              <p className="mt-2 text-base font-black tracking-tight text-emerald-600">
                Ativo
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Plano
              </p>
              <p className="mt-2 text-base font-black tracking-tight text-slate-900">
                Premium
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Segurança
              </p>
              <p className="mt-2 text-base font-black tracking-tight text-blue-600">
                Estável
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Conta
              </p>
              <p className="mt-2 text-base font-black tracking-tight text-slate-900">
                Validada
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.35fr_0.95fr]">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-8">
          {/* QUICK ACTIONS */}
          <motion.section
            variants={itemVariants}
            className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  Ações rápidas
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  Ajustes frequentes para sua conta.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className="group flex items-center justify-between rounded-[2rem] border border-slate-200 bg-slate-50/80 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition-all group-hover:scale-105 group-hover:text-blue-600">
                      <action.icon size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-slate-900">
                        {action.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {action.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-slate-300 transition-transform group-hover:translate-x-1"
                  />
                </button>
              ))}
            </div>
          </motion.section>

          {/* ACCOUNT DATA */}
          <motion.section
            variants={itemVariants}
            className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    Dados da conta
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Informações principais do usuário autenticado.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast('Fluxo de edição entra na próxima etapa do Monity.')}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition-all hover:bg-blue-600 hover:text-white active:scale-95"
              >
                Editar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-8">
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Fingerprint size={14} className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Identificador
                  </p>
                </div>
                <p className="truncate font-mono text-xs font-bold text-slate-700">
                  {user?.id || 'id_not_found_sync'}
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  E-mail
                </p>
                <p className="text-base font-black tracking-tight text-slate-900">
                  {user?.email}
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Nome
                </p>
                <p className="text-base font-black tracking-tight text-slate-900">
                  {user?.name}
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Tipo de perfil
                </p>
                <p className="text-base font-black tracking-tight text-blue-600">
                  Administrador titular
                </p>
              </div>
            </div>
          </motion.section>

          {/* PREFERENCES */}
          <motion.section
            variants={itemVariants}
            className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    Preferências
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Ajuste o comportamento da sua experiência no app.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              {preferenceItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-slate-50/60 p-5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                      <item.icon size={22} strokeWidth={2.2} />
                    </div>

                    <div>
                      <p className="text-base font-black tracking-tight text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="sm:pl-6">
                    <Switch
                      checked={item.active}
                      onClick={() => handleTogglePreference(item.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-8">
          {/* SECURITY */}
          <motion.section
            variants={itemVariants}
            className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                  <Shield size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    Segurança
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Proteção da sua conta e dos seus acessos.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              <button
                type="button"
                onClick={() => toast('Fluxo de alteração de senha entra na próxima etapa.')}
                className="group flex w-full items-center justify-between rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition-colors group-hover:text-blue-600">
                    <Lock size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black tracking-tight text-slate-900">
                      Alterar senha
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Atualize sua credencial de acesso.
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-300 transition-transform group-hover:translate-x-1"
                />
              </button>

              <button
                type="button"
                onClick={() => toast('Gestão de dispositivos entra na próxima etapa.')}
                className="group flex w-full items-center justify-between rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition-colors group-hover:text-blue-600">
                    <Smartphone size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black tracking-tight text-slate-900">
                      Dispositivos conectados
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Visualize onde sua conta está ativa.
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-300 transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          </motion.section>

          {/* PLAN CARD */}
          <motion.section
            variants={itemVariants}
            className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm"
          >
            <div className="p-6 sm:p-8">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 p-7 text-white shadow-2xl shadow-blue-500/25">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

                <div className="relative z-10">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                    <Crown className="text-amber-400" size={32} strokeWidth={2.5} />
                  </div>

                  <p className="text-3xl font-black tracking-tighter">Monity Pro</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-100/80">
                    Membro vitalício
                  </p>

                  <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/60">
                        Próximo débito
                      </p>
                      <p className="mt-2 text-xl font-black">Isento</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/60">
                        Status
                      </p>
                      <div className="mt-2 inline-flex rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                        Ativo
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast('Gestão de assinatura entra na próxima etapa.')}
                className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 transition-all hover:border-blue-200 hover:bg-white hover:text-blue-600"
              >
                Gerenciar assinatura
              </button>
            </div>
          </motion.section>

          {/* LOGOUT */}
          <motion.section variants={itemVariants}>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="group flex w-full items-center justify-center gap-4 rounded-[2.5rem] border border-rose-100 bg-rose-50 p-6 text-lg font-black text-rose-600 shadow-sm shadow-rose-200/20 transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-60"
            >
              <LogOut
                size={24}
                strokeWidth={3}
                className="transition-transform group-hover:-translate-x-1"
              />
              {loggingOut ? 'Saindo...' : 'Encerrar sessão'}
            </button>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}