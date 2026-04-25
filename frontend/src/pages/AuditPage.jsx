import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const actionOptions = [
  '',
  'register',
  'login',
  'logout',
  'email_verified',
  'email_verification_resent',
  'password_reset_requested',
  'password_reset_completed',
  'course_created',
  'course_material_uploaded',
  'course_enrolled',
  'assignment_uploaded',
  'token_consumed',
  'vps_validated',
  'extra_resources_requested',
  'student_resource_request_approved_professor',
  'student_resource_request_rejected_professor',
  'student_resource_request_forwarded_admin',
  'student_resource_request_admin_resolved',
  'user_role_updated',
  'user_role_revoked',
  'activity_created',
  'activity_updated',
  'activity_deleted',
  'university_resources_updated',
  'resource_distribution_confirmed',
  'professor_supplement_requested',
  'professor_supplement_resolved',
  'vps_credentials_distributed'
];

export default function AuditPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ from: '', to: '', role: '', action: '' });
  const [err, setErr] = useState('');

  async function load(currentPage = page) {
    const params = new URLSearchParams({ page: String(currentPage), pageSize: '20' });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.role) params.set('role', filters.role);
    if (filters.action) params.set('action', filters.action);

    try {
      const resp = await api(`/audit/logs?${params.toString()}`, { token });
      setLogs(resp.logs);
      setTotal(resp.total);
      setPage(currentPage);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">Jurnalizare Audit</h2>
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Filtre</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <input className="input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <input className="input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <select className="input" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">Toate rolurile</option>
            <option value="administrator">administrator</option>
            <option value="profesor">profesor</option>
            <option value="student">student</option>
            <option value="audit">audit</option>
          </select>
          <select className="input" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">Toate actiunile</option>
            {actionOptions
              .filter(Boolean)
              .map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
          </select>
          <button className="btn-primary" onClick={() => load(1)}>Aplica filtre</button>
        </div>
      </section>

      <section className="card">
        <div className="space-y-3 lg:hidden">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-moss/20 bg-white/80 p-4 text-sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{log.action_type}</p>
                    <p className="text-xs text-ink/65">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">{log.user_role}</span>
                </div>
                <p><span className="font-medium">User:</span> {log.user_email}</p>
                <p><span className="font-medium">Detalii:</span> {log.action_details}</p>
                <p><span className="font-medium">IP:</span> {log.ip_address}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-auto lg:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-moss/20 text-left">
              <th className="p-2">Timestamp</th>
              <th className="p-2">User</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Actiune</th>
              <th className="p-2">Detalii</th>
              <th className="p-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-moss/10">
                <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-2">{log.user_email}</td>
                <td className="p-2">{log.user_role}</td>
                <td className="p-2">{log.action_type}</td>
                <td className="p-2">{log.action_details}</td>
                <td className="p-2">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-outline" onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1}>Anterior</button>
          <span>Pagina {page}</span>
          <button
            className="btn-outline"
            onClick={() => load(page + 1)}
            disabled={page * 20 >= total}
          >
            Urmator
          </button>
        </div>
      </section>
    </div>
  );
}
