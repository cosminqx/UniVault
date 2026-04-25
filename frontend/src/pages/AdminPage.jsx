import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const realisticActivityPresets = [
  { name: 'Generare rezumat articol stiintific', tokenCost: 120 },
  { name: 'Explicare concept dificil pentru seminar', tokenCost: 90 },
  { name: 'Generare quiz de verificare', tokenCost: 140 },
  { name: 'Feedback automat pentru tema', tokenCost: 220 },
  { name: 'Asistenta pentru laborator de programare', tokenCost: 350 },
  { name: 'Analiza set de date pentru proiect', tokenCost: 280 },
  { name: 'Traducere material academic', tokenCost: 75 },
  { name: 'Generare draft raport de cercetare', tokenCost: 260 }
];

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <p className="text-xs text-ink/65">{hint}</p> : null}
    </label>
  );
}

export default function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [totals, setTotals] = useState({ total_tokens: '', total_vps: '' });
  const [distribution, setDistribution] = useState([]);
  const [profSuppRequests, setProfSuppRequests] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [newActivity, setNewActivity] = useState({ name: '', tokenCost: '' });
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
      setTotals({
        total_tokens: String(t.totals.total_tokens ?? ''),
        total_vps: String(t.totals.total_vps ?? '')
      });
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
      const resp = await api('/admin/activities', {
        method: 'POST',
        token,
        body: {
          ...newActivity,
          tokenCost: Number(newActivity.tokenCost || 0)
        }
      });
      setMsg(resp.message);
      setNewActivity({ name: '', tokenCost: '' });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addPresetActivities() {
    setErr('');
    setMsg('');

    let created = 0;

    for (const preset of realisticActivityPresets) {
      try {
        await api('/admin/activities', { method: 'POST', token, body: preset });
        created += 1;
      } catch (e) {
        if (e.status !== 400 && e.status !== 409) {
          setErr(e.message);
          return;
        }
      }
    }

    setMsg(
      created > 0
        ? `Au fost adaugate ${created} activitati demo mai realiste pentru platforma.`
        : 'Activitatile demo recomandate exista deja sau nu au putut fi adaugate din cauza duplicatelor.'
    );
    await load();
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
      <p className="max-w-5xl text-sm text-ink/80">
        Din aceasta pagina configurezi utilizatorii, activitatile disponibile, bugetul total de resurse si accesul la mediile VPS.
        VPS inseamna <span className="font-semibold">Virtual Private Server</span>: un server remote pe care studentii il pot folosi ca mediu de lucru pentru laboratoare, proiecte sau validari tehnice.
      </p>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card overflow-auto">
        <h3 className="font-heading text-xl font-semibold">Gestionare roluri utilizatori</h3>
        <p className="mt-1 text-sm text-ink/75">
          Alege rolul corect pentru fiecare utilizator. `administrator` configureaza platforma, `profesor` creeaza cursuri, `student` consuma resurse, iar `audit` vede jurnalul complet de actiuni.
        </p>
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
        <p className="mt-1 text-sm text-ink/75">
          O activitate reprezinta o actiune pe care studentul o poate consuma manual in platforma. Pentru fiecare activitate definesti un nume clar si costul ei in token-uri.
        </p>

        <div className="mt-3 rounded-xl border border-moss/20 bg-canvas/60 p-3">
          <p className="text-sm font-semibold">Exemple mai realiste pentru demo</p>
          <p className="mt-1 text-xs text-ink/70">
            Poti folosi exemplele de mai jos pentru o prezentare mai credibila a platformei in context universitar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {realisticActivityPresets.map((preset) => (
              <button
                key={preset.name}
                className="btn-outline text-xs"
                onClick={() => setNewActivity(preset)}
                type="button"
              >
                {preset.name} ({preset.tokenCost})
              </button>
            ))}
          </div>
          <button className="btn-secondary mt-3" onClick={addPresetActivities} type="button">
            Adauga toate activitatile demo recomandate
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr_auto]">
          <Field
            label="Numele activitatii"
            hint="Scrie exact actiunea pe care studentul o va selecta in platforma, de exemplu: Generare quiz de verificare."
          >
            <input
              className="input"
              placeholder="Ex: Feedback automat pentru tema"
              value={newActivity.name}
              onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
            />
          </Field>
          <Field
            label="Cost in token-uri"
            hint="Acesta este numarul de token-uri care se scad cand studentul foloseste activitatea o data."
          >
            <input
              className="input"
              type="number"
              min={0}
                 placeholder="Ex: 220"
                 value={newActivity.tokenCost}
                  onChange={(e) => setNewActivity({ ...newActivity, tokenCost: e.target.value.replace(/\D/g, '') })}
                />
          </Field>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={createActivity}>Adauga activitate</button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-moss/20 p-2">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-ink/65">Cost curent: {a.token_cost} token-uri per utilizare</p>
              </div>
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
        <p className="mt-1 text-sm text-ink/75">
          Aici setezi bugetul total al universitatii. Aceste valori reprezinta plafonul general din care platforma recomanda ulterior distributia pe cursuri.
        </p>

        <div className="mt-3 rounded-xl border border-moss/20 bg-canvas/60 p-3 text-sm text-ink/80">
          <p><span className="font-semibold">Token-uri</span>: resursa consumata de studenti cand folosesc activitati din platforma.</p>
          <p className="mt-1"><span className="font-semibold">VPS</span>: numarul total de accesari/abonamente pentru servere virtuale folosite in cursuri tehnice.</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Buget total de token-uri la nivel de universitate"
            hint="Introdu numarul total de token-uri disponibile pentru toate cursurile. Exemplu pentru demo: 500000."
          >
            <input
              className="input"
              type="number"
              min={0}
              value={totals.total_tokens}
              onChange={(e) => setTotals((p) => ({ ...p, total_tokens: e.target.value.replace(/\D/g, '') }))}
              placeholder="Ex: 500000"
            />
          </Field>
          <Field
            label="Numar total de abonamente sau validari VPS"
            hint="Introdu cate accesari VPS poate sustine universitatea in total. Exemplu pentru demo: 100."
          >
            <input
              className="input"
              type="number"
              min={0}
              value={totals.total_vps}
              onChange={(e) => setTotals((p) => ({ ...p, total_vps: e.target.value.replace(/\D/g, '') }))}
              placeholder="Ex: 100"
            />
          </Field>
          <button className="btn-primary md:col-span-2" onClick={saveTotals}>Salveaza totale</button>
        </div>

        <h4 className="mt-4 font-semibold">Distribuire recomandata per curs</h4>
        <p className="mt-1 text-sm text-ink/75">
          Sistemul calculeaza automat o recomandare pe baza numarului de studenti inscrisi si a resurselor necesare per student, apoi adauga o marja de aproximativ 10%.
        </p>
        <div className="mt-2 space-y-2 text-sm">
          {distribution.map((d) => (
            <div key={d.courseId} className="rounded-lg border border-moss/20 p-2">
              <span className="font-semibold">{d.title}</span>: {d.students} studenti inscrisi, {d.recommendedTokens} token-uri recomandate, {d.recommendedVps} VPS recomandate
            </div>
          ))}
        </div>
        <button className="btn-secondary mt-3" onClick={confirmDistribution}>Confirma distributia recomandata</button>
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
        <p className="mt-1 text-sm text-ink/75">
          Dupa ce un curs are studenti inscrisi, poti trimite prin email datele de conectare la serverul VPS asociat cursului.
        </p>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <Field
            label="ID-ul cursului"
            hint="Introdu ID-ul numeric al cursului pentru care trimiti credentialele VPS."
          >
            <input className="input" placeholder="Ex: 3" value={vpsForm.courseId} onChange={(e) => setVpsForm({ ...vpsForm, courseId: e.target.value })} />
          </Field>
          <Field
            label="Adresa IP a serverului VPS"
            hint="Exemplu: 192.168.10.25 sau o adresa publica a serverului."
          >
            <input className="input" placeholder="Ex: 192.168.10.25" value={vpsForm.ipAddress} onChange={(e) => setVpsForm({ ...vpsForm, ipAddress: e.target.value })} />
          </Field>
          <Field
            label="Username pentru autentificare"
            hint="Contul cu care studentii se conecteaza pe server."
          >
            <input className="input" placeholder="Ex: student_lab" value={vpsForm.username} onChange={(e) => setVpsForm({ ...vpsForm, username: e.target.value })} />
          </Field>
          <Field
            label="Parola contului VPS"
            hint="Parola care va fi trimisa prin email catre studentii inscrisi la curs."
          >
            <input className="input" placeholder="Ex: Lab2026!" value={vpsForm.password} onChange={(e) => setVpsForm({ ...vpsForm, password: e.target.value })} />
          </Field>
          <button className="btn-primary md:col-span-4" onClick={sendVpsCreds}>Trimite credențiale</button>
        </div>
      </section>
    </div>
  );
}
