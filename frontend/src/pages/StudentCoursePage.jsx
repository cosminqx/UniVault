import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function StudentCoursePage() {
  const { courseId } = useParams();
  const { token } = useAuth();

  const [courseData, setCourseData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [consumeItems, setConsumeItems] = useState([]);
  const [extraReq, setExtraReq] = useState({ resourceType: 'tokens', quantity: 1, reason: '' });
  const [vps, setVps] = useState({ username: '', password: '', ip: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [apiResponse, setApiResponse] = useState(null);

  async function load() {
    try {
      const [courseResp, actResp] = await Promise.all([
        api(`/student/courses/${courseId}`, { token }),
        api('/student/activities', { token })
      ]);
      setCourseData(courseResp);
      setActivities(actResp.activities);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [courseId]);

  function updateConsume(activityId, repetitions) {
    setConsumeItems((prev) => {
      const filtered = prev.filter((item) => item.activityId !== activityId);
      if (!repetitions || repetitions <= 0) {
        return filtered;
      }
      return [...filtered, { activityId, repetitions: Number(repetitions) }];
    });
  }

  async function submitConsumption() {
    setErr('');
    setMsg('');
    try {
      const resp = await api(`/student/courses/${courseId}/consume`, {
        method: 'POST',
        token,
        body: { items: consumeItems }
      });
      setMsg(`${resp.message} Total: ${resp.totalTokens}`);
      await load();
    } catch (e) {
      setErr(e.message);
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
    try {
      const resp = await api(`/student/courses/${courseId}/extra-resources`, {
        method: 'POST',
        token,
        body: extraReq
      });
      setMsg(resp.message);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!courseData) return <div>Loading course...</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">{courseData.course.title}</h2>
      <p>{courseData.course.description}</p>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card grid gap-4 md:grid-cols-2">
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
            <button className="btn-primary" onClick={validateVps}>Valideaza prin httpbin</button>
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
            <div key={activity.id} className="flex items-center gap-3">
              <span className="min-w-72 text-sm">{activity.name} ({activity.token_cost} tokens)</span>
              <input
                type="number"
                min={0}
                className="input max-w-28"
                placeholder="Repetari"
                onChange={(e) => updateConsume(activity.id, Number(e.target.value))}
              />
            </div>
          ))}
          <button className="btn-secondary" onClick={submitConsumption}>Inregistreaza consum</button>
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Solicitare resurse suplimentare</h3>
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
            onChange={(e) => setExtraReq({ ...extraReq, quantity: Number(e.target.value) })}
          />
          <input
            className="input md:col-span-3"
            placeholder="Motiv"
            value={extraReq.reason}
            onChange={(e) => setExtraReq({ ...extraReq, reason: e.target.value })}
          />
          <button className="btn-primary md:col-span-3" onClick={requestExtra}>Trimite solicitare</button>
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
