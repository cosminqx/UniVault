import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function AuthPage() {
  const location = useLocation();
  const resetTokenFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') || '';
  }, [location.search]);

  const [mode, setMode] = useState(resetTokenFromUrl ? 'reset' : 'login');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    token: resetTokenFromUrl,
    newPassword: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  function updateField(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function redirectByRole(role) {
    if (role === 'administrator') navigate('/admin');
    else if (role === 'profesor') navigate('/professor');
    else if (role === 'student') navigate('/student');
    else if (role === 'audit') navigate('/audit');
  }

  const isAuthMode = mode === 'login' || mode === 'register';
  const title =
    mode === 'register'
      ? 'Creeaza un cont nou'
      : mode === 'forgot'
        ? 'Recuperare parola'
        : mode === 'reset'
          ? 'Seteaza o parola noua'
          : 'Autentificare';

  const subtitle =
    mode === 'register'
      ? 'Completeaza datele de mai jos pentru a-ti crea contul.'
      : mode === 'forgot'
        ? 'Introdu adresa de email si iti trimitem un link pentru resetarea parolei.'
        : mode === 'reset'
          ? 'Introdu tokenul primit si alege o parola noua pentru contul tau.'
          : 'Intra in platforma pentru a accesa resursele universitare.';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        if (!form.email || !form.password) {
          throw new Error('Email si parola sunt obligatorii.');
        }
        const user = await login(form.email, form.password);
        redirectByRole(user.role);
      } else if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          throw new Error('Parolele nu coincid.');
        }
        const user = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword
        });
        redirectByRole(user.role);
      } else if (mode === 'forgot') {
        const data = await api('/auth/forgot-password', {
          method: 'POST',
          body: { email: form.email }
        });
        setMessage(data.developmentResetUrl ? `Reset URL: ${data.developmentResetUrl}` : data.message);
      } else if (mode === 'reset') {
        await api('/auth/reset-password', {
          method: 'POST',
          body: { token: form.token, newPassword: form.newPassword }
        });
        setMessage('Parola resetata cu succes. Te poti autentifica.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Actiune esuata.');
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-4xl place-items-center px-4 py-10">
      <div className="card w-full max-w-xl">
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-ink/80">{subtitle}</p>

        {isAuthMode && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button className={mode === 'login' ? 'btn-primary' : 'btn-outline'} onClick={() => setMode('login')} type="button">
              Login
            </button>
            <button className={mode === 'register' ? 'btn-primary' : 'btn-outline'} onClick={() => setMode('register')} type="button">
              Inregistrare
            </button>
          </div>
        )}

        {!isAuthMode && (
          <div className="mt-5">
            <button className="btn-link" onClick={() => setMode('login')} type="button">
              Inapoi la login
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div className="mt-3">
            <button className="btn-link text-sm" onClick={() => setMode('forgot')} type="button">
              Ai uitat parola?
            </button>
          </div>
        )}

        {mode === 'register' && (
          <div className="mt-3 text-sm text-ink/75">
            Ai deja cont?{' '}
            <button className="btn-link text-sm" onClick={() => setMode('login')} type="button">
              Mergi la login
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="mt-3 text-xs text-ink/70">
            Dupa ce primesti linkul de reset, vei ajunge automat pe ecranul pentru parola noua.
          </div>
        )}

        {mode === 'reset' && (
          <div className="mt-3 text-xs text-ink/70">
            Daca ai deschis linkul din email, tokenul ar trebui sa fie deja completat automat.
          </div>
        )}

        <form className="mt-5 space-y-3" onSubmit={submit}>
          {mode === 'register' && (
            <input className="input" name="name" placeholder="Nume" value={form.name} onChange={updateField} required />
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <input className="input" type="email" name="email" placeholder="Email" value={form.email} onChange={updateField} required />
          )}

          {(mode === 'login' || mode === 'register') && (
            <input className="input" type="password" name="password" placeholder="Parola" value={form.password} onChange={updateField} required minLength={8} />
          )}

          {mode === 'register' && (
            <input
              className="input"
              type="password"
              name="confirmPassword"
              placeholder="Confirmare parola"
              value={form.confirmPassword}
              onChange={updateField}
              required
              minLength={8}
            />
          )}

          {mode === 'reset' && (
            <>
              <input className="input" name="token" placeholder="Token reset" value={form.token} onChange={updateField} required />
              <input
                className="input"
                type="password"
                name="newPassword"
                placeholder="Parola noua"
                value={form.newPassword}
                onChange={updateField}
                required
                minLength={8}
              />
            </>
          )}

          {error && <p className="rounded-lg bg-red-100 p-2 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-lg bg-green-100 p-2 text-sm text-green-700">{message}</p>}

          <button className="btn-primary w-full" type="submit">
            {mode === 'login' && 'Autentificare'}
            {mode === 'register' && 'Creeaza cont'}
            {mode === 'forgot' && 'Trimite link reset'}
            {mode === 'reset' && 'Reseteaza parola'}
          </button>
        </form>
      </div>
    </div>
  );
}
