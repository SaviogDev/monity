"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  Loader2,
  Settings,
  ShieldCheck,
  Bell,
  Palette,
  CreditCard,
  LogOut,
  ChevronRight,
  Sparkles,
  Smartphone,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile, updatePassword, uploadAvatar } from "@/services/auth";

// --- ANIMATION VARIANTS (Standardized) ---
const containerV: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemV: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

// --- DESIGN DECORATIONS (Standardized) ---
function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--monity-green)] opacity-[0.03] blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] rounded-full bg-blue-500 opacity-[0.02] blur-[100px]" />
    </div>
  );
}

// --- MAIN PAGE ---
export default function PerfilPage() {
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, email });
      toast.success("Perfil atualizado com sucesso!");
      refreshUser();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword || !newPassword) return toast.error("Preencha as senhas.");
    setSaving(true);
    try {
      await updatePassword(oldPassword, newPassword);
      toast.success("Senha alterada com sucesso!");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar senha.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success("Foto de perfil atualizada!");
      refreshUser();
    } catch (err: any) {
      toast.error(err?.message || "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  if (authLoading) return null;

  return (
    <>
      <BackgroundDecorations />

      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-[1200px] space-y-8 px-4 pb-32 pt-6 sm:px-6 lg:px-10"
      >
        {/* Header Section */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl backdrop-blur-3xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-[var(--monity-green)]/10 text-[var(--monity-green)] shadow-inner">
              <User size={32} strokeWidth={2.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--monity-green)]">Central do Usuário</p>
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Perfil</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Gerencie sua conta, segurança e preferências.</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:bg-red-500/10 active:scale-95"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Sidebar / Avatar */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div
              variants={itemV}
              className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl text-center"
            >
              <div className="relative mx-auto mb-8 h-40 w-40">
                <div className="h-full w-full overflow-hidden rounded-[3rem] border-4 border-white/[0.05] bg-white/[0.02] shadow-2xl">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-700">
                      <User size={64} strokeWidth={1} />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-2 right-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-[var(--monity-green)] text-[var(--bg-base)] shadow-xl shadow-[var(--monity-green)]/30 transition-all hover:scale-110 active:scale-90">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} strokeWidth={2.5} />}
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                </label>
              </div>
              
              <h2 className="text-2xl font-black tracking-tight text-white">{user?.name}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">{user?.email}</p>
              
              <div className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[var(--monity-green)]/5 py-3 border border-[var(--monity-green)]/10">
                <ShieldCheck size={14} className="text-[var(--monity-green)]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--monity-green)]">Membro Premium</span>
              </div>
            </motion.div>

            <motion.div
              variants={itemV}
              className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl"
            >
              <nav className="space-y-2">
                {[
                  { icon: Settings, label: 'Geral', active: true },
                  { icon: Bell, label: 'Notificações', active: false },
                  { icon: Palette, label: 'Aparência', active: false },
                  { icon: CreditCard, label: 'Assinatura', active: false },
                  { icon: Smartphone, label: 'Dispositivos', active: false },
                  { icon: Globe, label: 'Idioma', active: false },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`flex w-full items-center justify-between rounded-2xl px-6 py-4 transition-all ${item.active ? 'bg-[var(--monity-green)]/10 text-[var(--monity-green)]' : 'text-slate-500 hover:bg-white/[0.02] hover:text-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </div>
                    <ChevronRight size={14} className={item.active ? 'opacity-100' : 'opacity-20'} />
                  </button>
                ))}
              </nav>
            </motion.div>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-8 space-y-8">
            <motion.div
              variants={itemV}
              className="rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl backdrop-blur-3xl"
            >
              <div className="mb-10 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Dados Básicos</p>
                  <h3 className="text-xl font-black text-white">Informações Pessoais</h3>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nome Completo</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-[var(--monity-green)] transition-colors" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] py-4 pl-14 pr-6 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">E-mail</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-[var(--monity-green)] transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] py-4 pl-14 pr-6 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-3 rounded-2xl bg-[var(--monity-green)] px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-base)] shadow-xl shadow-[var(--monity-green)]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} strokeWidth={3} />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>

            <motion.div
              variants={itemV}
              className="rounded-[3rem] border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl backdrop-blur-3xl"
            >
              <div className="mb-10 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                  <Lock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">Segurança</p>
                  <h3 className="text-xl font-black text-white">Alterar Senha</h3>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Senha Atual</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-[var(--monity-green)] transition-colors" />
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] py-4 pl-14 pr-6 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nova Senha</label>
                    <div className="relative group">
                      <Sparkles size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-[var(--monity-green)] transition-colors" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border-2 border-white/[0.05] bg-white/[0.02] py-4 pl-14 pr-6 text-sm font-bold text-white outline-none transition-all focus:border-[var(--monity-green)]/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/[0.08] active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={18} />}
                    Atualizar Senha
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  );
}