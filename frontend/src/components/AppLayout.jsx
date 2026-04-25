import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import logoUrl from '../../../univault-logo.svg';

const menuByRole = {
  administrator: [
    { to: '/admin', label: 'Acasa' },
    { to: '/student', label: 'Cursuri' },
    { to: '/stats', label: 'Statistici' }
  ],
  profesor: [{ to: '/professor', label: 'Acasa' }],
  student: [{ to: '/student', label: 'Acasa' }],
  audit: [{ to: '/audit', label: 'Acasa' }]
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-moss/20 bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <img alt="UniVault" className="h-10 w-auto md:h-12" src={logoUrl} />
          <nav className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end md:gap-3">
            {(menuByRole[user.role] || []).map((item) => (
              <Link key={item.to} className="btn-outline text-sm" to={item.to}>
                {item.label}
              </Link>
            ))}
            <span className="w-full rounded-xl bg-moss/10 px-3 py-2 text-sm md:w-auto md:py-1">
              {user.email} ({user.role})
            </span>
            <button className="btn-secondary text-sm" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}
