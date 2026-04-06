'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { verifyEmailCode } from '@/services/auth';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!emailParam) {
      toast.error('E-mail não encontrado. Tente fazer login.');
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      await verifyEmailCode(emailParam, code);
      toast.success('E-mail verificado com sucesso! Pode entrar.');
      router.push('/login');
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : 'Código inválido ou expirado.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-blue-900/5">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Mail size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm font-medium text-blue-100">
            Enviamos um código de 6 dígitos para o endereço <br />
            <strong className="text-white">{emailParam || 'seu e-mail'}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="p-8">
          <div className="mb-6">
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
              Código de Verificação
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <KeyRound size={20} />
              </div>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-center text-2xl font-black tracking-[0.5em] text-slate-900 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Validar e Entrar
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}>
      <VerifyContent />
    </Suspense>
  );
}