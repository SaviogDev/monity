'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  clearToken,
  fetchMe,
  updateMe,
  updatePassword,
  type AuthUser,
} from '../../../services/auth';
import {
  ArrowRight,
  ArrowUpDown,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Tags,
  User,
  Wallet,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [profileName, setProfileName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message.trim()) {
      return err.message;
    }

    return fallback;
  };

  const shouldLogout = (message: string) => {
    const normalized = message.toLowerCase();

    return (
      normalized.includes('token') ||
      normalized.includes('sessão') ||
      normalized.includes('session') ||
      normalized.includes('unauthorized') ||
      normalized.includes('não autenticado') ||
      normalized.includes('nao autenticado') ||
      normalized.includes('401')
    );
  };

  const handleAuthError = (err: unknown, fallbackMessage: string) => {
    const message = getErrorMessage(err, fallbackMessage);

    if (shouldLogout(message)) {
      clearToken();
      router.replace('/login');
      return true;
    }

    return false;
  };

  const loadProfile = async () => {
    try {
      setPageError(null);

      const me = await fetchMe();
      setUser(me);
      setProfileName(me.name);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);

      const redirected = handleAuthError(err, 'Não foi possível carregar o perfil.');
      if (!redirected) {
        setPageError('Não foi possível carregar os dados do perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const me = await fetchMe();

        if (!isMounted) return;

        setUser(me);
        setProfileName(me.name);
        setPageError(null);
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);

        const message = getErrorMessage(err, 'Não foi possível carregar o perfil.');

        if (shouldLogout(message)) {
          clearToken();
          router.replace('/login');
          return;
        }

        if (isMounted) {
          setPageError('Não foi possível carregar os dados do perfil.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const initials = useMemo(() => {
    if (!user?.name) return 'U';

    return user.name
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [user]);

  const firstName = useMemo(() => {
    return user?.name?.split(' ')[0] || 'Usuário';
  }, [user]);

  const hasProfileChanges = useMemo(() => {
    return !!user && profileName.trim() !== user.name.trim();
  }, [profileName, user]);

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setProfileSuccess(null);
    setProfileError(null);

    const trimmedName = profileName.trim();

    if (!trimmedName) {
      setProfileError('Informe seu nome.');
      return;
    }

    if (!user) {
      setProfileError('Usuário não carregado.');
      return;
    }

    if (trimmedName === user.name.trim()) {
      setProfileSuccess('Nenhuma alteração foi feita no nome.');
      return;
    }

    try {
      setProfileLoading(true);

      const updatedUser = await updateMe({ name: trimmedName });

      setUser(updatedUser);
      setProfileName(updatedUser.name);
      setProfileSuccess('Nome atualizado com sucesso.');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);

      const redirected = handleAuthError(err, 'Não foi possível atualizar o perfil.');
      if (!redirected) {
        setProfileError(getErrorMessage(err, 'Não foi possível atualizar o perfil.'));
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos de senha.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('A nova senha precisa ser diferente da senha atual.');
      return;
    }

    try {
      setPasswordLoading(true);

      await updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Senha atualizada com sucesso.');
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);

      const redirected = handleAuthError(err, 'Não foi possível atualizar a senha.');
      if (!redirected) {
        setPasswordError(getErrorMessage(err, 'Não foi possível atualizar a senha.'));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#2ECC71] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Carregando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (pageError || !user) {
    return (
      <div className="p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar</h3>
          <p className="text-slate-500 mb-6">{pageError || 'Perfil não encontrado.'}</p>

          <button
            onClick={() => {
              setLoading(true);
              loadProfile();
            }}
            className="h-11 px-5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#2ECC71] via-[#3498DB] to-[#34495E] p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-bold border border-white/20">
                {initials}
              </div>

              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Conta Monity</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{user.name}</h1>
                <p className="text-white/85 text-sm mt-1">
                  Olá, {firstName}. Sua conta está ativa.
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="h-12 px-5 rounded-2xl bg-white text-slate-800 font-semibold shadow-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Encerrar sessão
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] flex items-center justify-center mb-4">
              <User className="text-white" size={22} />
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">Nome completo</p>
            <p className="text-slate-800 font-bold text-lg">{user.name}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2ECC71] to-[#27AE60] flex items-center justify-center mb-4">
              <Mail className="text-white" size={22} />
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">E-mail</p>
            <p className="text-slate-800 font-bold text-lg break-all">{user.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#34495E] to-[#2C3E50] flex items-center justify-center mb-4">
              <Shield className="text-white" size={22} />
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">Status da conta</p>
            <p className="text-[#2ECC71] font-bold text-lg">Sessão autenticada</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] flex items-center justify-center">
                <User className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Editar perfil</h2>
                <p className="text-sm text-slate-500">Atualize seu nome de exibição</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-slate-500 cursor-not-allowed"
                />
              </div>

              {profileSuccess && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-green-700 font-medium">{profileSuccess}</p>
                </div>
              )}

              {profileError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700 font-medium">{profileError}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading || !hasProfileChanges}
                  className="h-12 px-5 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar nome'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#34495E] to-[#2C3E50] flex items-center justify-center">
                <Lock className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Alterar senha</h2>
                <p className="text-sm text-slate-500">Troque sua senha com segurança</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Senha atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full h-12 rounded-2xl border border-slate-300 px-4 text-slate-800 outline-none focus:border-[#3498DB] focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {passwordSuccess && (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-green-700 font-medium">{passwordSuccess}</p>
                </div>
              )}

              {passwordError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700 font-medium">{passwordError}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="h-12 px-5 rounded-2xl bg-[#2ECC71] text-white font-semibold hover:bg-[#27AE60] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Atualizar senha'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-5">Resumo da conta</h2>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Identificador do usuário</p>
                  <p className="text-slate-800 font-semibold break-all mt-1">{user.id}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-slate-600" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Nome de exibição</p>
                  <p className="text-slate-800 font-semibold mt-1">{firstName}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <User size={18} className="text-slate-600" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Segurança</p>
                  <p className="text-slate-800 font-semibold mt-1">
                    Sua conta está autenticada e protegida por token de sessão.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-5">Ações rápidas</h2>

            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="group rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3498DB] to-[#2980B9] flex items-center justify-center">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Ver dashboard</p>
                    <p className="text-sm text-slate-500">Resumo financeiro</p>
                  </div>
                </div>
                <ArrowRight className="text-slate-400 group-hover:text-slate-700" size={18} />
              </Link>

              <Link
                href="/dashboard/transacoes"
                className="group rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2ECC71] to-[#27AE60] flex items-center justify-center">
                    <ArrowUpDown className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Gerenciar transações</p>
                    <p className="text-sm text-slate-500">Criar, editar e excluir</p>
                  </div>
                </div>
                <ArrowRight className="text-slate-400 group-hover:text-slate-700" size={18} />
              </Link>

              <Link
                href="/dashboard/categorias"
                className="group rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#34495E] to-[#2C3E50] flex items-center justify-center">
                    <Tags className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Organizar categorias</p>
                    <p className="text-sm text-slate-500">Personalize sua estrutura</p>
                  </div>
                </div>
                <ArrowRight className="text-slate-400 group-hover:text-slate-700" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}