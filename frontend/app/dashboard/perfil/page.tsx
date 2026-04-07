'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  AtSign,
  Bell,
  Calendar,
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
  Camera,
  Loader2,
} from 'lucide-react';

import { clearToken, fetchMe } from '@/services/auth';

// IMPORTAÇÕES DO FIREBASE
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
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
  avatarUrl?: string;
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
      className={`flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-all ${
        checked
          ? 'bg-gradient-to-r from-[#2ECC71] to-[#27AE60] shadow-inner'
          : 'bg-slate-200 shadow-inner'
      }`}
      aria-label="Alternar preferência"
    >
      <div
        className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f4f8fb] pointer-events-none">
      <div className="absolute -left-[15%] -top-[10%] h-[600px] w-[600px] rounded-full bg-[#2ECC71]/10 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#3498DB]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-[#9B59B6]/10 blur-[100px]" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
          avatarUrl: data?.avatarUrl,
        });
      } catch {
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

  // --- UPLOAD COM FIREBASE + BACKEND MONGODB ---
  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);

      // 1. Firebase Storage: Envia a imagem e pega a URL pública
      const fileRef = ref(storage, `avatars/${user.id}-${Date.now()}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      // 2. Backend: Salva a URL no MongoDB do usuário
      const token = localStorage.getItem('token') || localStorage.getItem('monity_token') || '';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatarUrl: downloadUrl })
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar a imagem no banco de dados');
      }

      // 3. Frontend: Atualiza a tela com a nova foto
      setUser((prev) => (prev ? { ...prev, avatarUrl: downloadUrl } : prev));
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar a imagem. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#3498DB] border-t-transparent shadow-lg shadow-[#3498DB]/20" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Sincronizando perfil
        </p>
      </div>
    );
  }

  return (
    <>
      <BackgroundBlobs />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-7xl space-y-6 px-4 pb-32 pt-6 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8"
      >
        {/* HERO */}
        <motion.section
          variants={itemVariants}
          className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8 xl:p-10"
        >
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#2ECC71]/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              
              {/* --- AVATAR E UPLOAD --- */}
              <div className="relative mx-auto sm:mx-0">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-full bg-gradient-to-br from-[#3498DB] to-[#2980b9] p-1.5 shadow-xl shadow-[#3498DB]/30 transition-transform hover:scale-105 sm:h-32 sm:w-32"
                >
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-3xl font-black text-[#34495E] sm:text-4xl">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(user?.name)
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center bg-[#34495E]/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      {uploadingAvatar ? (
                        <Loader2 className="animate-spin text-white" size={28} />
                      ) : (
                        <Camera className="text-white" size={28} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-1 -right-1 z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#2ECC71] shadow-lg">
                  <BadgeCheck size={18} className="text-white" strokeWidth={2.8} />
                </div>
              </div>

              <div className="space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#3498DB]/20 bg-[#3498DB]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#3498DB]">
                  <Sparkles size={12} />
                  Perfil premium
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tighter text-[#34495E] sm:text-4xl lg:text-5xl">
                    Olá, {userFirstName}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm font-bold text-slate-500 sm:text-base">
                    Aqui você gerencia sua identidade, segurança e preferências do ecossistema Monity.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-sm font-bold text-slate-500 sm:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 shadow-sm">
                    <AtSign size={16} className="text-[#3498DB]" />
                    {user?.email}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 shadow-sm">
                    <Calendar size={16} className="text-[#3498DB]" />
                    Membro desde {memberSinceLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[460px]">
              <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Status</p>
                <p className="mt-2 text-base font-black tracking-tight text-[#2ECC71]">Ativo</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Plano</p>
                <p className="mt-2 text-base font-black tracking-tight text-[#34495E]">Premium</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Segurança</p>
                <p className="mt-2 text-base font-black tracking-tight text-[#3498DB]">Estável</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-4 shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Conta</p>
                <p className="mt-2 text-base font-black tracking-tight text-[#34495E]">Validada</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr] xl:gap-8">
          
          {/* COLUNA ESQUERDA */}
          <div className="space-y-6 xl:space-y-8">
            
            {/* Ações Rápidas */}
            <motion.section variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
              <div className="border-b border-slate-100/50 bg-white/40 px-6 py-6 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3498DB]/10 text-[#3498DB] shadow-inner">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#34495E]">Ações rápidas</h2>
                    <p className="mt-1 text-sm font-bold text-slate-400">Ajustes frequentes para sua conta.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 sm:p-8">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className="group flex items-center justify-between rounded-[1.5rem] border border-white/60 bg-white/50 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition-all group-hover:scale-105 group-hover:text-[#3498DB]">
                        <action.icon size={22} strokeWidth={2.2} />
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight text-[#34495E]">{action.title}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-400">{action.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Dados da Conta */}
            <motion.section variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
              <div className="flex items-center justify-between border-b border-slate-100/50 bg-white/40 px-6 py-6 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9B59B6]/10 text-[#9B59B6] shadow-inner">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#34495E]">Dados da conta</h2>
                    <p className="mt-1 text-sm font-bold text-slate-400">Informações principais do usuário.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Fluxo de edição entra na próxima etapa do Monity.')}
                  className="rounded-xl bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition-all hover:bg-[#3498DB] hover:text-white active:scale-95"
                >
                  Editar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-8">
                <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Fingerprint size={14} className="text-slate-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Identificador</p>
                  </div>
                  <p className="truncate font-mono text-xs font-black text-slate-500">{user?.id || 'id_not_found_sync'}</p>
                </div>

                <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">E-mail</p>
                  <p className="text-base font-black tracking-tight text-[#34495E]">{user?.email}</p>
                </div>

                <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Nome</p>
                  <p className="text-base font-black tracking-tight text-[#34495E]">{user?.name}</p>
                </div>

                <div className="rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Tipo de perfil</p>
                  <p className="text-base font-black tracking-tight text-[#3498DB]">Administrador titular</p>
                </div>
              </div>
            </motion.section>

            {/* Preferências */}
            <motion.section variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
              <div className="border-b border-slate-100/50 bg-white/40 px-6 py-6 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1C40F]/10 text-[#F1C40F] shadow-inner">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#34495E]">Preferências</h2>
                    <p className="mt-1 text-sm font-bold text-slate-400">Ajuste o comportamento da sua experiência.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 sm:p-8">
                {preferenceItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm transition-all hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                        <item.icon size={22} strokeWidth={2.2} />
                      </div>
                      <div>
                        <p className="text-base font-black tracking-tight text-[#34495E]">{item.title}</p>
                        <p className="mt-1 text-sm font-bold leading-relaxed text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    <div className="sm:pl-6">
                      <Switch checked={item.active} onClick={() => handleTogglePreference(item.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>

          {/* COLUNA DIREITA */}
          <div className="space-y-6 xl:space-y-8">
            
            {/* Segurança */}
            <motion.section variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
              <div className="border-b border-slate-100/50 bg-white/40 px-6 py-6 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 shadow-inner">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#34495E]">Segurança</h2>
                    <p className="mt-1 text-sm font-bold text-slate-400">Proteção da sua conta e acessos.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 sm:p-8">
                <button
                  type="button"
                  onClick={() => toast('Fluxo de alteração de senha entra na próxima etapa.')}
                  className="group flex w-full items-center justify-between rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition-colors group-hover:text-[#3498DB]">
                      <Lock size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black tracking-tight text-[#34495E]">Alterar senha</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-400">Atualize sua credencial de acesso.</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => toast('Gestão de dispositivos entra na próxima etapa.')}
                  className="group flex w-full items-center justify-between rounded-[1.5rem] border border-white/60 bg-white/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition-colors group-hover:text-[#3498DB]">
                      <Smartphone size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black tracking-tight text-[#34495E]">Dispositivos conectados</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-400">Visualize onde sua conta está ativa.</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.section>

            {/* Assinatura */}
            <motion.section variants={itemVariants} className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-[2.5rem]">
              <div className="p-6 sm:p-8">
                <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#34495E] to-[#2C3E50] p-7 text-white shadow-xl shadow-[#34495E]/30">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative z-10">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                      <Crown className="text-amber-400" size={32} strokeWidth={2.5} />
                    </div>
                    <p className="text-3xl font-black tracking-tighter text-white">Monity Pro</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-white/60">Membro vitalício</p>

                    <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Próximo débito</p>
                        <p className="mt-2 text-xl font-black text-white">Isento</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Status</p>
                        <div className="mt-2 inline-flex rounded-lg bg-[#2ECC71]/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#2ECC71]">
                          Ativo
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toast('Gestão de assinatura entra na próxima etapa.')}
                  className="mt-5 w-full rounded-[1.25rem] border-2 border-slate-100 bg-white px-5 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-[#34495E] transition-all hover:bg-slate-50"
                >
                  Gerenciar assinatura
                </button>
              </div>
            </motion.section>

            {/* Logout */}
            <motion.section variants={itemVariants}>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="group flex w-full items-center justify-center gap-3 rounded-[2rem] border border-rose-100 bg-white/80 p-6 text-base font-black text-[#FF3366] shadow-sm backdrop-blur-xl transition-all hover:bg-rose-50 active:scale-[0.98] disabled:opacity-60 sm:rounded-[2.5rem]"
              >
                <LogOut size={22} strokeWidth={3} className="transition-transform group-hover:-translate-x-1" />
                {loggingOut ? 'Saindo...' : 'Encerrar sessão'}
              </button>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </>
  );
}