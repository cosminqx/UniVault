import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ProfessorPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    maxStudents: 30,
    tokensPerStudent: 0,
    vpsPerStudent: 0
  });

  async function load() {
    try {
      const [courseResp, reqResp] = await Promise.all([
        api('/professor/courses', { token }),
        api('/professor/requests/student-extras', { token })
      ]);
      setCourses(courseResp.courses);
      setRequests(reqResp.requests);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createCourse() {
    try {
      const resp = await api('/professor/courses', { method: 'POST', token, body: newCourse });
      setMsg(resp.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function uploadMaterial(courseId, file) {
    const form = new FormData();
    form.append('file', file);
    try {
      const resp = await api(`/professor/courses/${courseId}/materials`, {
        method: 'POST',
        token,
        isForm: true,
        body: form
      });
      setMsg(resp.message);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function resolveRequest(id, approve) {
    try {
      const resp = await api(`/professor/requests/${id}/resolve`, {
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

  async function requestSupplement(courseId) {
    try {
      const resp = await api(`/professor/courses/${courseId}/supplement-request`, { method: 'POST', token, body: {} });
      setMsg(resp.message);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">Panou Profesor</h2>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Creare curs</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="input" placeholder="Titlu" value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} />
          <input
            className="input"
            type="number"
            min={1}
            placeholder="Nr max studenti"
            value={newCourse.maxStudents}
            onChange={(e) => setNewCourse({ ...newCourse, maxStudents: Number(e.target.value) })}
          />
          <input
            className="input md:col-span-2"
            placeholder="Descriere"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
          />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Token-uri / student"
            value={newCourse.tokensPerStudent}
            onChange={(e) => setNewCourse({ ...newCourse, tokensPerStudent: Number(e.target.value) })}
          />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="VPS / student"
            value={newCourse.vpsPerStudent}
            onChange={(e) => setNewCourse({ ...newCourse, vpsPerStudent: Number(e.target.value) })}
          />
          <button className="btn-primary md:col-span-2" onClick={createCourse}>Creeaza curs</button>
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Cursurile mele</h3>
        <div className="mt-3 space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="rounded-xl border border-moss/20 p-3">
              <h4 className="font-semibold">{course.title}</h4>
              <p className="text-sm">Studenti: {course.enrolled_students}/{course.max_students}</p>
              <p className="text-sm">Resurse alocate: {course.allocated_tokens} tokens, {course.allocated_vps} VPS</p>
              <p className="text-sm">Status distributie: {course.distribution_confirmed ? 'Confirmata' : 'Neconfirmata'}</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <label className="btn-outline cursor-pointer">
                  Upload material
                  <input
                    className="hidden"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMaterial(course.id, file);
                    }}
                  />
                </label>
                <button className="btn-secondary" onClick={() => requestSupplement(course.id)}>Solicita supliment 10%</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Cereri resurse studenti</h3>
        <div className="mt-3 space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-moss/20 p-3 text-sm">
              <p>
                {r.student_email} | {r.course_title} | {r.resource_type} x {r.quantity}
              </p>
              <p>Motiv: {r.reason}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={() => resolveRequest(r.id, true)}>Aproba</button>
                <button className="btn-secondary" onClick={() => resolveRequest(r.id, false)}>Respinge</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
