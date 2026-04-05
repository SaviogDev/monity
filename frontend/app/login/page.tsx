'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface FormState {
  email: string;
  password: string;
}

interface LoginResponse {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
    };
  };
  token?: string;
}

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Erro ao conectar com o servidor.';
}

function FloatingLabel({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="input-wrap">
      <label htmlFor={id} className={`float-label ${lifted ? 'lifted' : ''}`}>
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`float-input ${lifted ? 'lifted' : ''}`}
      />

      <span className={`input-line ${focused ? 'active' : ''}`} />
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="input-wrap">
      <label htmlFor="password" className={`float-label ${lifted ? 'lifted' : ''}`}>
        Senha
      </label>

      <input
        id="password"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="current-password"
        disabled={disabled}
        className={`float-input pr-eye ${lifted ? 'lifted' : ''}`}
      />

      <span className={`input-line ${focused ? 'active' : ''}`} />

      <button
        type="button"
        onClick={() => setShow((current) => !current)}
        className="eye-btn"
        tabIndex={-1}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {show ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BackgroundBlobs() {
  return (
    <div className="blobs" aria-hidden>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="grid-overlay" />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return form.email.trim().length > 0 && form.password.trim().length > 0 && !loading && !success;
  }, [form.email, form.password, loading, success]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onMove = (event: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      card.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateZ(0)`;
    };

    const onLeave = () => {
      card.style.transform = 'perspective(900px) rotateY(0) rotateX(0)';
    };

    document.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);

    return () => {
      document.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('monity_token') : null;

    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data: LoginResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Credenciais inválidas.');
      }

      const token = data?.data?.token || data?.token;

      if (!token) {
        throw new Error('Token de autenticação não recebido.');
      }

      localStorage.setItem('monity_token', token);
      setSuccess(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 700);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --green: #2ECC71;
          --green-d: #27AE60;
          --slate: #34495E;
          --blue: #3498DB;
          --white: #FFFFFF;
          --bg: #f4f8fb;
          --border: #dde6ee;
          --muted: #8fa3b1;
          --error: #e74c3c;
          --radius: 18px;
        }

        html, body {
          height: 100%;
          font-family: 'Poppins', sans-serif;
        }

        .page {
          min-height: 100vh;
          background: radial-gradient(circle at top, #ffffff 0%, #f4f8fb 48%, #edf3f9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .blobs {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .blob {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          opacity: .18;
          animation: drift 18s ease-in-out infinite alternate;
        }

        .blob-1 {
          width: 520px;
          height: 520px;
          background: var(--green);
          top: -160px;
          left: -140px;
          animation-duration: 22s;
        }

        .blob-2 {
          width: 420px;
          height: 420px;
          background: var(--blue);
          bottom: -120px;
          right: -100px;
          animation-duration: 18s;
          animation-delay: -4s;
        }

        .blob-3 {
          width: 280px;
          height: 280px;
          background: #a8e6cf;
          top: 48%;
          left: 56%;
          animation-duration: 26s;
          animation-delay: -9s;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: .28;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%);
        }

        @keyframes drift {
          from { transform: translate(0,0) scale(1); }
          to { transform: translate(40px, 30px) scale(1.08); }
        }

        .card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          background: rgba(255,255,255,.82);
          backdrop-filter: blur(24px);
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.85);
          box-shadow:
            0 8px 24px rgba(15, 23, 42, .05),
            0 28px 80px rgba(52,73,94,.12),
            inset 0 1px 0 rgba(255,255,255,.95);
          padding: 48px 42px 40px;
          transition: transform .15s ease, box-shadow .15s ease;
          animation: cardIn .6s cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 34px;
          animation: fadeUp .5s .1s cubic-bezier(.22,1,.36,1) both;
        }

        .brand-icon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--green), #1abc9c);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(46,204,113,.28);
        }

        .brand-name {
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--slate), #223140);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -.6px;
        }

        .brand-badge {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--green-d);
          background: rgba(46,204,113,.1);
          border: 1px solid rgba(46,204,113,.2);
          border-radius: 999px;
          padding: 5px 10px;
        }

        .heading {
          margin-bottom: 32px;
          animation: fadeUp .5s .18s cubic-bezier(.22,1,.36,1) both;
        }

        .heading h1 {
          font-size: 28px;
          line-height: 1.15;
          font-weight: 800;
          color: var(--slate);
          letter-spacing: -.7px;
        }

        .heading p {
          margin-top: 8px;
          font-size: 14px;
          color: var(--muted);
          font-weight: 500;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fadeUp .5s .26s cubic-bezier(.22,1,.36,1) both;
        }

        .input-wrap {
          position: relative;
        }

        .float-label {
          position: absolute;
          left: 0;
          top: 16px;
          font-size: 14px;
          font-weight: 500;
          color: var(--muted);
          pointer-events: none;
          transition: all .22s cubic-bezier(.22,1,.36,1);
          transform-origin: left;
        }

        .float-label.lifted {
          top: -2px;
          font-size: 11px;
          font-weight: 700;
          color: var(--green-d);
          letter-spacing: .04em;
        }

        .float-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          border-bottom: 2px solid var(--border);
          padding: 16px 0 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--slate);
          font-family: 'Poppins', sans-serif;
          transition: border-color .2s ease;
        }

        .float-input.pr-eye {
          padding-right: 38px;
        }

        .float-input:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .input-line {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--green), var(--blue));
          border-radius: 999px;
          transition: width .3s cubic-bezier(.22,1,.36,1);
        }

        .input-line.active {
          width: 100%;
        }

        .eye-btn {
          position: absolute;
          right: 0;
          bottom: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color .2s ease;
        }

        .eye-btn:hover {
          color: var(--slate);
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(231,76,60,.06);
          border: 1px solid rgba(231,76,60,.16);
          color: var(--error);
          font-size: 13px;
          font-weight: 600;
          animation: shake .4s cubic-bezier(.36,.07,.19,.97);
        }

        @keyframes shake {
          10%,90% { transform: translateX(-2px); }
          20%,80% { transform: translateX(4px); }
          30%,50%,70% { transform: translateX(-4px); }
          40%,60% { transform: translateX(4px); }
        }

        .submit-btn {
          margin-top: 6px;
          width: 100%;
          height: 54px;
          background: linear-gradient(135deg, var(--green) 0%, #1abc9c 100%);
          color: white;
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .01em;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 12px 30px rgba(46,204,113,.28);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
          position: relative;
          overflow: hidden;
          animation: fadeUp .5s .34s cubic-bezier(.22,1,.36,1) both;
        }

        .submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.16), transparent);
          opacity: 0;
          transition: opacity .2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(46,204,113,.36);
        }

        .submit-btn:hover:not(:disabled)::after {
          opacity: 1;
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: .72;
          cursor: not-allowed;
        }

        .submit-btn.success {
          background: linear-gradient(135deg, #27AE60, #16A085);
          box-shadow: 0 12px 30px rgba(39,174,96,.34);
        }

        .spin {
          animation: rotate .8s linear infinite;
        }

        @keyframes rotate {
          to { transform: rotate(360deg); }
        }

        .checkmark {
          animation: pop .3s cubic-bezier(.22,1,.36,1);
        }

        @keyframes pop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 0;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
          animation: fadeUp .5s .38s cubic-bezier(.22,1,.36,1) both;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .card-footer {
          margin-top: 26px;
          text-align: center;
          font-size: 13px;
          color: var(--muted);
          animation: fadeUp .5s .42s cubic-bezier(.22,1,.36,1) both;
        }

        .card-footer a {
          color: var(--green-d);
          font-weight: 700;
          text-decoration: none;
          transition: color .2s ease;
        }

        .card-footer a:hover {
          color: var(--blue);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .card {
            padding: 36px 24px 32px;
            border-radius: 24px;
          }

          .heading h1 {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="page">
        <BackgroundBlobs />

        <div className="card" ref={cardRef}>
          <div className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity=".9" />
                <path
                  d="M2 17l10 5 10-5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  opacity=".7"
                />
                <path
                  d="M2 12l10 5 10-5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>

            <span className="brand-name">Monity</span>
            <span className="brand-badge">Beta</span>
          </div>

          <div className="heading">
            <h1>Bem-vindo de volta 👋</h1>
            <p>Acesse sua conta para continuar no seu controle financeiro.</p>
          </div>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <FloatingLabel
              id="email"
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              autoComplete="email"
              disabled={loading || success}
            />

            <PasswordField
              value={form.password}
              onChange={(value) => setForm((current) => ({ ...current, password: value }))}
              disabled={loading || success}
            />

            {error && (
              <div className="error-box" role="alert">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ flexShrink: 0, marginTop: 1 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`submit-btn ${success ? 'success' : ''}`}
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Spinner />
                  Verificando...
                </>
              ) : success ? (
                <>
                  <svg
                    className="checkmark"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Acesso liberado!
                </>
              ) : (
                <>
                  Entrar
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="divider">ou</div>

          <div className="card-footer">
            Não tem uma conta? <Link href="/register">Criar conta grátis</Link>
          </div>
        </div>
      </div>
    </>
  );
}