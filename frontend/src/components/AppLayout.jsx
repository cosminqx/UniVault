import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const menuByRole = {
  administrator: [
    { to: '/admin', label: 'Admin' },
    { to: '/stats', label: 'Statistici' }
  ],
  profesor: [{ to: '/professor', label: 'Profesor' }],
  student: [{ to: '/student', label: 'Student' }],
  audit: [{ to: '/audit', label: 'Audit' }]
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="font-heading text-xl font-bold">UniVault</h1>
          <nav className="flex items-center gap-3">
            {(menuByRole[user.role] || []).map((item) => (
              <Link key={item.to} className="btn-outline text-sm" to={item.to}>
                {item.label}
              </Link>
            ))}
            <span className="rounded-xl bg-moss/10 px-3 py-1 text-sm">
              {user.email} ({user.role})
            </span>
            <button className="btn-secondary text-sm" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
