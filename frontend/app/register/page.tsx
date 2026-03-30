'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ─── Hook: useRegister ────────────────────────────────────────────────────────

function useRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const register = async (form: FormState) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Erro ao criar conta');
      }

      const token = data.data?.token ?? data.token;
      if (token) localStorage.setItem('monity_token', token);

      setSuccess(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error, success };
}

// ─── FloatingLabel ────────────────────────────────────────────────────────────

function FloatingLabel({
  id, label, type = 'text', value, onChange, autoComplete, disabled,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="input-wrap">
      <label htmlFor={id} className={`float-label${lifted ? ' lifted' : ''}`}>{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`float-input${lifted ? ' lifted' : ''}`}
      />
      <span className={`input-line${focused ? ' active' : ''}`} />
    </div>
  );
}

// ─── PasswordField ────────────────────────────────────────────────────────────

function PasswordField({
  id = 'password', label = 'Senha', value, onChange, disabled, autoComplete = 'new-password',
}: {
  id?: string; label?: string; value: string;
  onChange: (v: string) => void; disabled?: boolean; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="input-wrap">
      <label htmlFor={id} className={`float-label${lifted ? ' lifted' : ''}`}>{label}</label>
      <input
        id={id} type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`float-input pr-eye${lifted ? ' lifted' : ''}`}
      />
      <span className={`input-line${focused ? ' active' : ''}`} />
      <button type="button" onClick={() => setShow((s) => !s)} className="eye-btn" tabIndex={-1}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── ConfirmPasswordField ─────────────────────────────────────────────────────

function ConfirmPasswordField({
  value, onChange, password, disabled,
}: {
  value: string; onChange: (v: string) => void; password: string; disabled?: boolean;
}) {
  const mismatch = value.length > 0 && value !== password;

  return (
    <div>
      <PasswordField
        id="confirmPassword"
        label="Confirmar senha"
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete="new-password"
      />
      {mismatch && (
        <p className="field-error">As senhas não coincidem</p>
      )}
      {!mismatch && value.length > 0 && value === password && (
        <p className="field-ok">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Senhas coincidem
        </p>
      )}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

// ─── BackgroundBlobs ──────────────────────────────────────────────────────────

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

// ─── PasswordStrength ─────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Muito fraca', 'Fraca', 'Boa', 'Forte'];
  const colors = ['#e74c3c', '#e67e22', '#3498DB', '#2ECC71'];

  return (
    <div className="strength-wrap">
      <div className="strength-bars">
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            className="strength-bar"
            style={{ background: i < score ? colors[score - 1] : 'var(--border)', transition: 'background .3s' }}
          />
        ))}
      </div>
      <span className="strength-label" style={{ color: colors[score - 1] || 'var(--muted)' }}>
        {labels[score - 1] || 'Muito fraca'}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', confirmPassword: '' });
  const { register, loading, error, success } = useRegister();
  const cardRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [field]: v }));

  // Subtle 3D tilt on mouse move
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
    };
    const onLeave = () => { card.style.transform = 'perspective(900px) rotateY(0) rotateX(0)'; };
    document.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    return () => { document.removeEventListener('mousemove', onMove); card.removeEventListener('mouseleave', onLeave); };
  }, []);

  const isValid =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 6 &&
    form.password === form.confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    register(form);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --green:   #2ECC71;
          --green-d: #27ae60;
          --slate:   #34495E;
          --blue:    #3498DB;
          --white:   #FFFFFF;
          --bg:      #f0f4f8;
          --border:  #dde3ea;
          --muted:   #8fa3b1;
          --error:   #e74c3c;
          --radius:  14px;
        }

        html, body { height: 100%; font-family: 'Poppins', sans-serif; }

        .page {
          min-height: 100vh;
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          position: relative; overflow: hidden;
        }

        /* ── Blobs ── */
        .blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .18; animation: drift 18s ease-in-out infinite alternate; }
        .blob-1 { width: 520px; height: 520px; background: var(--green); top: -160px; left: -140px; animation-duration: 22s; }
        .blob-2 { width: 400px; height: 400px; background: var(--blue); bottom: -120px; right: -100px; animation-duration: 18s; animation-delay: -4s; }
        .blob-3 { width: 280px; height: 280px; background: #a8e6cf; top: 50%; left: 55%; animation-duration: 26s; animation-delay: -9s; }
        .grid-overlay {
          position: absolute; inset: 0;
          background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px; opacity: .35;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%);
        }
        @keyframes drift { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,30px) scale(1.08); } }

        /* ── Card ── */
        .card {
          position: relative; z-index: 1;
          width: 100%; max-width: 460px;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 4px 6px rgba(0,0,0,.04), 0 20px 60px rgba(52,73,94,.10), 0 1px 2px rgba(255,255,255,.8) inset;
          padding: 44px 44px 40px;
          transition: transform .15s ease;
          animation: cardIn .6s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes cardIn { from { opacity:0; transform: translateY(28px) scale(.97); } to { opacity:1; transform: translateY(0) scale(1); } }

        /* ── Brand ── */
        .brand {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 28px;
          animation: fadeUp .5s .1s cubic-bezier(.22,1,.36,1) both;
        }
        .brand-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, var(--green), #1abc9c);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(46,204,113,.35);
        }
        .brand-name { font-size: 22px; font-weight: 700; background: linear-gradient(135deg, var(--slate), #2c3e50); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -.4px; }
        .brand-badge { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: .8px; text-transform: uppercase; color: var(--green-d); background: rgba(46,204,113,.1); border: 1px solid rgba(46,204,113,.25); border-radius: 20px; padding: 3px 10px; }

        /* ── Heading ── */
        .heading { animation: fadeUp .5s .18s cubic-bezier(.22,1,.36,1) both; margin-bottom: 28px; }
        .heading h1 { font-size: 24px; font-weight: 700; color: var(--slate); letter-spacing: -.5px; line-height: 1.2; }
        .heading p { margin-top: 6px; font-size: 14px; color: var(--muted); font-weight: 400; }

        /* ── Form ── */
        .form { display: flex; flex-direction: column; gap: 22px; animation: fadeUp .5s .26s cubic-bezier(.22,1,.36,1) both; }

        /* ── Inputs ── */
        .input-wrap { position: relative; }
        .float-label {
          position: absolute; left: 0; top: 16px;
          font-size: 14px; font-weight: 500; color: var(--muted);
          pointer-events: none; transition: all .22s cubic-bezier(.22,1,.36,1); transform-origin: left;
        }
        .float-label.lifted { top: -2px; font-size: 11px; font-weight: 600; color: var(--green-d); letter-spacing: .3px; }
        .float-input {
          width: 100%; border: none; outline: none;
          background: transparent; border-bottom: 2px solid var(--border);
          padding: 16px 0 10px;
          font-size: 15px; font-weight: 500; color: var(--slate);
          font-family: 'Poppins', sans-serif; transition: border-color .2s;
        }
        .float-input.pr-eye { padding-right: 36px; }
        .float-input:disabled { opacity: .5; cursor: not-allowed; }
        .input-line {
          position: absolute; bottom: 0; left: 0;
          width: 0; height: 2px;
          background: linear-gradient(90deg, var(--green), var(--blue));
          border-radius: 2px; transition: width .3s cubic-bezier(.22,1,.36,1);
        }
        .input-line.active { width: 100%; }
        .eye-btn {
          position: absolute; right: 0; bottom: 12px;
          background: none; border: none; cursor: pointer;
          color: var(--muted); padding: 2px; transition: color .2s;
          display: flex; align-items: center;
        }
        .eye-btn:hover { color: var(--slate); }

        /* ── Field hints ── */
        .field-error { font-size: 11.5px; font-weight: 500; color: var(--error); margin-top: 6px; padding-left: 2px; animation: fadeUp .2s ease; }
        .field-ok { font-size: 11.5px; font-weight: 500; color: var(--green-d); margin-top: 6px; padding-left: 2px; display: flex; align-items: center; gap: 4px; animation: fadeUp .2s ease; }

        /* ── Password strength ── */
        .strength-wrap { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .strength-bars { display: flex; gap: 4px; flex: 1; }
        .strength-bar { flex: 1; height: 3px; border-radius: 99px; }
        .strength-label { font-size: 11px; font-weight: 600; min-width: 68px; text-align: right; }

        /* ── Error box ── */
        .error-box {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
          background: rgba(231,76,60,.06); border: 1px solid rgba(231,76,60,.2);
          color: var(--error); font-size: 13px; font-weight: 500;
          animation: shake .4s cubic-bezier(.36,.07,.19,.97);
        }
        @keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(4px)} 30%,50%,70%{transform:translateX(-4px)} 40%,60%{transform:translateX(4px)} }

        /* ── Submit button ── */
        .submit-btn {
          margin-top: 4px; width: 100%; height: 52px;
          background: linear-gradient(135deg, var(--green) 0%, #1abc9c 100%);
          color: white; font-family: 'Poppins', sans-serif;
          font-size: 15px; font-weight: 600; letter-spacing: .2px;
          border: none; border-radius: var(--radius); cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 4px 20px rgba(46,204,113,.35);
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
          position: relative; overflow: hidden;
          animation: fadeUp .5s .34s cubic-bezier(.22,1,.36,1) both;
        }
        .submit-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.15), transparent); opacity: 0; transition: opacity .2s; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(46,204,113,.45); }
        .submit-btn:hover:not(:disabled)::after { opacity: 1; }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: .65; cursor: not-allowed; }
        .submit-btn.success { background: linear-gradient(135deg, #27ae60, #16a085); box-shadow: 0 4px 20px rgba(39,174,96,.4); }

        .spin { animation: rotate .8s linear infinite; }
        @keyframes rotate { to { transform: rotate(360deg); } }
        .checkmark { animation: pop .3s cubic-bezier(.22,1,.36,1); }
        @keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }

        /* ── Divider & Footer ── */
        .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0 0; color: var(--muted); font-size: 12px; animation: fadeUp .5s .38s cubic-bezier(.22,1,.36,1) both; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .card-footer { margin-top: 20px; text-align: center; font-size: 13px; color: var(--muted); animation: fadeUp .5s .42s cubic-bezier(.22,1,.36,1) both; }
        .card-footer a { color: var(--green-d); font-weight: 600; text-decoration: none; transition: color .2s; }
        .card-footer a:hover { color: var(--blue); }

        /* ── Progress steps indicator ── */
        .steps { display: flex; gap: 6px; margin-bottom: 28px; animation: fadeUp .5s .14s cubic-bezier(.22,1,.36,1) both; }
        .step { flex: 1; height: 3px; border-radius: 99px; background: var(--border); transition: background .4s; }
        .step.done { background: linear-gradient(90deg, var(--green), #1abc9c); }
        .step.active { background: linear-gradient(90deg, var(--green), var(--blue)); }

        /* ── Success overlay ── */
        .success-content { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px 0 16px; animation: fadeUp .5s cubic-bezier(.22,1,.36,1); }
        .success-circle { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--green), #1abc9c); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(46,204,113,.4); animation: pop .5s cubic-bezier(.22,1,.36,1); }
        .success-title { font-size: 20px; font-weight: 700; color: var(--slate); }
        .success-sub { font-size: 13px; color: var(--muted); text-align: center; line-height: 1.6; }

        @media (max-width: 480px) {
          .card { padding: 32px 24px 28px; border-radius: 20px; }
          .heading h1 { font-size: 21px; }
        }
        @keyframes fadeUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
      `}</style>

      <div className="page">
        <BackgroundBlobs />

        <div className="card" ref={cardRef}>
          {/* Brand */}
          <div className="brand">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity=".9"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".7"/>
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="brand-name">Monity</span>
            <span className="brand-badge">Beta</span>
          </div>

          {success ? (
            /* ── Success state ── */
            <div className="success-content">
              <div className="success-circle">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="success-title">Conta criada! 🎉</p>
              <p className="success-sub">Seu cadastro foi realizado com sucesso.<br/>Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              {/* Progress indicator */}
              <div className="steps">
                <div className={`step ${form.name ? 'done' : 'active'}`} />
                <div className={`step ${form.email ? 'done' : form.name ? 'active' : ''}`} />
                <div className={`step ${form.password.length >= 6 ? 'done' : form.email ? 'active' : ''}`} />
                <div className={`step ${isValid ? 'done' : form.password.length >= 6 ? 'active' : ''}`} />
              </div>

              {/* Heading */}
              <div className="heading">
                <h1>Criar sua conta ✨</h1>
                <p>Comece a controlar suas finanças hoje</p>
              </div>

              {/* Form */}
              <form className="form" onSubmit={handleSubmit} noValidate>
                <FloatingLabel
                  id="name" label="Nome completo" value={form.name}
                  onChange={set('name')} autoComplete="name" disabled={loading}
                />

                <FloatingLabel
                  id="email" label="E-mail" type="email" value={form.email}
                  onChange={set('email')} autoComplete="email" disabled={loading}
                />

                <div>
                  <PasswordField
                    value={form.password} onChange={set('password')} disabled={loading}
                  />
                  <PasswordStrength password={form.password} />
                </div>

                <ConfirmPasswordField
                  value={form.confirmPassword} onChange={set('confirmPassword')}
                  password={form.password} disabled={loading}
                />

                {error && (
                  <div className="error-box" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className={`submit-btn${success ? ' success' : ''}`}
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <><Spinner /> Criando conta...</>
                  ) : (
                    <>
                      Criar conta
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="divider">ou</div>
              <div className="card-footer">
                Já tem uma conta?{' '}
                <a href="/login">Entrar</a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}