import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const { token } = useAuth();

  const [courseData, setCourseData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [extraRequests, setExtraRequests] = useState([]);
  const [consumeValues, setConsumeValues] = useState({});
  const [extraReq, setExtraReq] = useState({ resourceType: 'tokens', quantity: '1', reason: '' });
  const [vps, setVps] = useState({ username: '', password: '', ip: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [submittingExtra, setSubmittingExtra] = useState(false);
  const [submittingConsumption, setSubmittingConsumption] = useState(false);

  async function load() {
    try {
      const [courseResp, actResp, requestsResp] = await Promise.all([
        api(`/student/courses/${courseId}`, { token }),
        api('/student/activities', { token }),
        api('/student/extra-requests', { token })
      ]);
      setCourseData(courseResp);
      setActivities(actResp.activities);
      setExtraRequests(requestsResp.requests.filter((request) => String(request.course_id) === String(courseId)));
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [courseId]);

  const pendingRequestForType = extraRequests.find(
    (request) =>
      request.resource_type === extraReq.resourceType &&
      (request.status === 'pending_professor' || request.status === 'pending_admin')
  );

  function getStatusLabel(status) {
    if (status === 'pending_professor') return 'In asteptare la profesor';
    if (status === 'pending_admin') return 'Escalata la administrator';
    if (status === 'approved') return 'Aprobata';
    if (status === 'rejected') return 'Respinsa';
    return status;
  }

  function updateConsume(activityId, repetitions) {
    setConsumeValues((prev) => ({ ...prev, [activityId]: repetitions.replace(/\D/g, '') }));
  }

  const consumeItems = Object.entries(consumeValues)
    .map(([activityId, repetitions]) => ({
      activityId: Number(activityId),
      repetitions: Number(repetitions)
    }))
    .filter((item) => item.repetitions > 0);

  async function submitConsumption() {
    setErr('');
    setMsg('');
    if (!consumeItems.length) {
      setErr('Completeaza cel putin o activitate cu un numar de repetari mai mare decat 0.');
      return;
    }
    setSubmittingConsumption(true);
    try {
      const resp = await api(`/student/courses/${courseId}/consume`, {
        method: 'POST',
        token,
        body: { items: consumeItems }
      });
      setMsg(`${resp.message} Total: ${resp.totalTokens}`);
      setConsumeValues({});
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmittingConsumption(false);
    }
  }

  async function uploadAssignment(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    try {
      const resp = await api(`/student/courses/${courseId}/assignments`, {
        method: 'POST',
        token,
        isForm: true,
        body: form
      });
      setMsg(resp.message);
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function validateVps() {
    try {
      const resp = await api(`/student/courses/${courseId}/vps/validate`, {
        method: 'POST',
        token,
        body: vps
      });
      setMsg(resp.message);
      setApiResponse(resp.apiResponse);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function requestExtra() {
    setErr('');
    setMsg('');
    setSubmittingExtra(true);
    try {
      const resp = await api(`/student/courses/${courseId}/extra-resources`, {
        method: 'POST',
        token,
        body: {
          ...extraReq,
          quantity: Number(extraReq.quantity)
        }
      });
      setMsg(resp.message);
      setExtraReq((prev) => ({ ...prev, quantity: '1', reason: '' }));
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmittingExtra(false);
    }
  }

  if (!courseData) return <div>Loading course...</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">{courseData.course.title}</h2>
      <p>{courseData.course.description}</p>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="font-heading text-lg font-semibold">Resursele tale</h3>
          <ul className="mt-2 text-sm">
            <li>Token-uri alocate: {courseData.resources.allocatedTokens}</li>
            <li>Token-uri folosite: {courseData.resources.usedTokens}</li>
            <li>Token-uri ramase: {courseData.resources.remainingTokens}</li>
            <li>VPS alocate: {courseData.resources.allocatedVps}</li>
            <li>VPS validate: {courseData.resources.usedVps}</li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold">Validare VPS</h3>
          <div className="mt-2 space-y-2">
            <input className="input" placeholder="IP" value={vps.ip} onChange={(e) => setVps({ ...vps, ip: e.target.value })} />
            <input className="input" placeholder="Username" value={vps.username} onChange={(e) => setVps({ ...vps, username: e.target.value })} />
            <input className="input" placeholder="Password" value={vps.password} onChange={(e) => setVps({ ...vps, password: e.target.value })} />
            <button className="btn-primary w-full sm:w-auto" onClick={validateVps}>Valideaza prin httpbin</button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Materiale curs</h3>
        <ul className="mt-3 list-disc pl-6">
          {courseData.materials.map((m) => (
            <li key={m.id}>
              <a className="text-moss underline" href={`http://localhost:4000/uploads/${m.file_path}`} target="_blank" rel="noreferrer">
                {m.file_name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Incarcare teme</h3>
        <input className="mt-2" type="file" onChange={uploadAssignment} />
        <ul className="mt-3 list-disc pl-6">
          {courseData.assignments.map((a) => (
            <li key={a.id}>{a.file_name}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Consum manual token-uri</h3>
        <div className="mt-2 space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="grid gap-2 rounded-xl border border-moss/15 p-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-center">
              <span className="text-sm">{activity.name} ({activity.token_cost} tokens)</span>
              <input
                type="number"
                min={0}
                className="input w-full"
                placeholder="Repetari"
                value={consumeValues[activity.id] || ''}
                onChange={(e) => updateConsume(activity.id, e.target.value)}
              />
            </div>
          ))}
          <button className="btn-secondary w-full sm:w-auto" onClick={submitConsumption} disabled={submittingConsumption || !consumeItems.length}>
            {submittingConsumption ? 'Se inregistreaza consumul...' : 'Inregistreaza consum'}
          </button>
          {consumeItems.length > 0 && (
            <p className="text-sm text-ink/70">
              Ai pregatit {consumeItems.length} activitati pentru trimitere. Dupa inregistrare, formularul se reseteaza automat.
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Solicitare resurse suplimentare</h3>
        <p className="mt-1 text-sm text-ink/75">
          Trimite o singura cerere per tip de resursa cat timp solicitarea este in analiza. Vei vedea mai jos statusul exact al cererilor tale.
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <select className="input" value={extraReq.resourceType} onChange={(e) => setExtraReq({ ...extraReq, resourceType: e.target.value })}>
            <option value="tokens">Token-uri</option>
            <option value="vps">VPS</option>
          </select>
          <input
            type="number"
            min={1}
            className="input"
            value={extraReq.quantity}
            onChange={(e) => setExtraReq({ ...extraReq, quantity: e.target.value.replace(/\D/g, '') })}
          />
          <input
            className="input md:col-span-3"
            placeholder="Motiv"
            value={extraReq.reason}
            onChange={(e) => setExtraReq({ ...extraReq, reason: e.target.value })}
          />
          {pendingRequestForType && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 md:col-span-3">
              Ai deja o cerere activa pentru <span className="font-semibold">{extraReq.resourceType}</span>.
              Status curent: <span className="font-semibold">{getStatusLabel(pendingRequestForType.status)}</span>.
            </div>
          )}
          <button
            className="btn-primary w-full md:col-span-3"
            onClick={requestExtra}
            disabled={Boolean(pendingRequestForType) || submittingExtra}
          >
            {submittingExtra ? 'Se trimite solicitarea...' : 'Trimite solicitare'}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <h4 className="font-semibold">Solicitarile tale pentru acest curs</h4>
          {extraRequests.length === 0 && (
            <p className="text-sm text-ink/70">Nu ai trimis inca nicio solicitare suplimentara pentru acest curs.</p>
          )}
          {extraRequests.map((request) => (
            <div key={request.id} className="rounded-xl border border-moss/20 bg-white/80 p-3 text-sm">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p>
                  <span className="font-semibold">{request.resource_type}</span> x {request.quantity}
                </p>
                <span className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">
                  {getStatusLabel(request.status)}
                </span>
              </div>
              <p className="mt-2 text-ink/80">Motiv: {request.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {apiResponse && (
        <section className="card overflow-auto">
          <h3 className="font-heading text-lg font-semibold">Raspuns API validare VPS</h3>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(apiResponse, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
