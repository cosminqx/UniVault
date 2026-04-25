import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [totals, setTotals] = useState({ total_tokens: 0, total_vps: 0 });
  const [distribution, setDistribution] = useState([]);
  const [profSuppRequests, setProfSuppRequests] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [newActivity, setNewActivity] = useState({ name: '', tokenCost: 0 });
  const [vpsForm, setVpsForm] = useState({ courseId: '', ipAddress: '', username: '', password: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const [u, a, t, d, p, r] = await Promise.all([
        api('/admin/users', { token }),
        api('/admin/activities', { token }),
        api('/admin/resources/totals', { token }),
        api('/admin/resources/distribution/recommendations', { token }),
        api('/admin/supplements/professors', { token }),
        api('/admin/requests/pending-admin', { token })
      ]);
      setUsers(u.users);
      setActivities(a.activities);
      setTotals(t.totals);
      setDistribution(d.recommendations);
      setProfSuppRequests(p.requests);
      setAdminRequests(r.requests);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(userId, role) {
    try {
      const resp = await api(`/admin/users/${userId}/role`, { method: 'PATCH', token, body: { role } });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function revokeRole(userId, deactivate = false) {
    try {
      const resp = await api(`/admin/users/${userId}/revoke`, { method: 'PATCH', token, body: { deactivate } });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function createActivity() {
    try {
      const resp = await api('/admin/activities', { method: 'POST', token, body: newActivity });
      setMsg(resp.message);
      setNewActivity({ name: '', tokenCost: 0 });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function updateActivity(id, tokenCost) {
    try {
      const resp = await api(`/admin/activities/${id}`, { method: 'PATCH', token, body: { tokenCost } });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function deleteActivity(id) {
    try {
      const resp = await api(`/admin/activities/${id}`, { method: 'DELETE', token });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function saveTotals() {
    try {
      const resp = await api('/admin/resources/totals', {
        method: 'PUT',
        token,
        body: {
          totalTokens: Number(totals.total_tokens),
          totalVps: Number(totals.total_vps)
        }
      });
      setMsg(resp.message);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function confirmDistribution() {
    try {
      const payload = distribution.map((d) => ({
        courseId: d.courseId,
        allocatedTokens: d.recommendedTokens,
        allocatedVps: d.recommendedVps
      }));
      const resp = await api('/admin/resources/distribution/confirm', { method: 'POST', token, body: { allocations: payload } });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function resolveProfessorSupplement(requestId, approve) {
    try {
      const resp = await api(`/admin/supplements/professors/${requestId}/resolve`, {
        method: 'POST',
        token,
        body: { approve }
      });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function resolveAdminRequest(requestId, approve) {
    try {
      const resp = await api(`/admin/requests/${requestId}/resolve`, {
        method: 'POST',
        token,
        body: { approve }
      });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function sendVpsCreds() {
    try {
      const resp = await api(`/admin/courses/${vpsForm.courseId}/send-vps-credentials`, {
        method: 'POST',
        token,
        body: {
          ipAddress: vpsForm.ipAddress,
          username: vpsForm.username,
          password: vpsForm.password
        }
      });
      setMsg(`${resp.message} Recipients: ${resp.recipients.length}`);
    } catch (e) {
      setErr(e.message);
    }
  }

  const roles = useMemo(() => ['administrator', 'profesor', 'student', 'audit'], []);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">Panou Administrator</h2>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card overflow-auto">
        <h3 className="font-heading text-xl font-semibold">Gestionare roluri utilizatori</h3>
        <table className="mt-3 min-w-full text-sm">
          <thead>
            <tr className="border-b border-moss/20 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-moss/10">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.is_active ? 'Activ' : 'Dezactivat'}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <button key={role} className="btn-outline text-xs" onClick={() => setRole(u.id, role)}>
                        {role}
                      </button>
                    ))}
                    <button className="btn-secondary text-xs" onClick={() => revokeRole(u.id, false)}>Revoca la student</button>
                    <button className="btn-secondary text-xs" onClick={() => revokeRole(u.id, true)}>Revoca + dezactiveaza</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Gestionare activitati</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className="input" placeholder="Nume activitate" value={newActivity.name} onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })} />
          <input className="input" type="number" min={0} value={newActivity.tokenCost} onChange={(e) => setNewActivity({ ...newActivity, tokenCost: Number(e.target.value) })} />
          <button className="btn-primary" onClick={createActivity}>Adauga</button>
        </div>
        <div className="mt-3 space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-moss/20 p-2">
              <span>{a.name}</span>
              <div className="flex items-center gap-2">
                <input
                  className="input max-w-24"
                  type="number"
                  defaultValue={a.token_cost}
                  onBlur={(e) => updateActivity(a.id, Number(e.target.value))}
                />
                <button className="btn-secondary" onClick={() => deleteActivity(a.id)}>Sterge</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Alocare resurse universitate</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            className="input"
            type="number"
            min={0}
            value={totals.total_tokens}
            onChange={(e) => setTotals((p) => ({ ...p, total_tokens: Number(e.target.value) }))}
            placeholder="Total token-uri"
          />
          <input
            className="input"
            type="number"
            min={0}
            value={totals.total_vps}
            onChange={(e) => setTotals((p) => ({ ...p, total_vps: Number(e.target.value) }))}
            placeholder="Total VPS"
          />
          <button className="btn-primary md:col-span-2" onClick={saveTotals}>Salveaza totale</button>
        </div>

        <h4 className="mt-4 font-semibold">Distribuire recomandata per curs</h4>
        <div className="mt-2 space-y-2 text-sm">
          {distribution.map((d) => (
            <div key={d.courseId} className="rounded-lg border border-moss/20 p-2">
              {d.title}: studenti {d.students}, tokens recomandate {d.recommendedTokens}, VPS recomandate {d.recommendedVps}
            </div>
          ))}
        </div>
        <button className="btn-secondary mt-3" onClick={confirmDistribution}>Confirma distributia</button>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Aprobare supliment profesor (10%)</h3>
        <div className="mt-2 space-y-2 text-sm">
          {profSuppRequests.map((r) => (
            <div key={r.id} className="rounded-lg border border-moss/20 p-2">
              Curs: {r.course_title} | Profesor: {r.professor_email}
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={() => resolveProfessorSupplement(r.id, true)}>Aproba</button>
                <button className="btn-secondary" onClick={() => resolveProfessorSupplement(r.id, false)}>Respinge</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Cereri studenti escaladate la admin</h3>
        <div className="mt-2 space-y-2 text-sm">
          {adminRequests.map((r) => (
            <div key={r.id} className="rounded-lg border border-moss/20 p-2">
              {r.student_email} | {r.course_title} | {r.resource_type} x {r.quantity}
              <p>Motiv: {r.reason}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={() => resolveAdminRequest(r.id, true)}>Aproba</button>
                <button className="btn-secondary" onClick={() => resolveAdminRequest(r.id, false)}>Respinge</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Distribuire credențiale VPS via email</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          <input className="input" placeholder="Course ID" value={vpsForm.courseId} onChange={(e) => setVpsForm({ ...vpsForm, courseId: e.target.value })} />
          <input className="input" placeholder="IP VPS" value={vpsForm.ipAddress} onChange={(e) => setVpsForm({ ...vpsForm, ipAddress: e.target.value })} />
          <input className="input" placeholder="Username" value={vpsForm.username} onChange={(e) => setVpsForm({ ...vpsForm, username: e.target.value })} />
          <input className="input" placeholder="Parola" value={vpsForm.password} onChange={(e) => setVpsForm({ ...vpsForm, password: e.target.value })} />
          <button className="btn-primary md:col-span-4" onClick={sendVpsCreds}>Trimite credențiale</button>
        </div>
      </section>
    </div>
  );
}
