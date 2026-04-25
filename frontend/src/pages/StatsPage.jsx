import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function StatsPage() {
  const { token } = useAuth();
  const [selectors, setSelectors] = useState({ students: [], courses: [] });
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [studentStats, setStudentStats] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [universityStats, setUniversityStats] = useState(null);
  const [err, setErr] = useState('');

  const maxActivity = universityStats?.activityChart?.length
    ? Math.max(...universityStats.activityChart.map((a) => Number(a.tokens_consumed)))
    : 1;

  async function loadSelectors() {
    try {
      const resp = await api('/stats/selectors', { token });
      setSelectors(resp);
      if (resp.students[0]) setStudentId(String(resp.students[0].id));
      if (resp.courses[0]) setCourseId(String(resp.courses[0].id));
    } catch (e) {
      setErr(e.message);
    }
  }

  async function loadUniversity() {
    try {
      const resp = await api('/stats/university', { token });
      setUniversityStats(resp);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    loadSelectors();
    loadUniversity();
  }, []);

  async function loadStudentStats() {
    if (!studentId) return;
    try {
      const resp = await api(`/stats/student/${studentId}`, { token });
      setStudentStats(resp);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function loadCourseStats() {
    if (!courseId) return;
    try {
      const resp = await api(`/stats/course/${courseId}`, { token });
      setCourseStats(resp);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    loadStudentStats();
  }, [studentId]);

  useEffect(() => {
    loadCourseStats();
  }, [courseId]);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">Statistici</h2>
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Per student</h3>
        <select className="input mt-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {selectors.students.map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
          ))}
        </select>
        {studentStats && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-canvas/60 p-3">Token-uri alocate: <span className="font-semibold">{studentStats.allocatedTokens}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Token-uri consumate: <span className="font-semibold">{studentStats.totalTokensConsumed}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Abonamente alocate: <span className="font-semibold">{studentStats.allocatedVps}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Abonamente utilizate: <span className="font-semibold">{studentStats.usedVps}</span></div>
            </div>
            <div className="space-y-2">
              {studentStats.activityConsumption.map((a) => (
                <div key={a.activity} className="rounded-xl border border-moss/15 p-3">
                  <p className="font-medium">{a.activity}</p>
                  <p className="mt-1 text-ink/75">Repetari {a.repetitions}, consum {a.tokens_consumed}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Per curs</h3>
        <select className="input mt-2" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {selectors.courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {courseStats && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-canvas/60 p-3">Token-uri alocate: <span className="font-semibold">{courseStats.allocatedTokens}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Token-uri consumate: <span className="font-semibold">{courseStats.totalTokensConsumed}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Abonamente VPS: <span className="font-semibold">{courseStats.allocatedVps} / {courseStats.usedVps}</span></div>
            </div>
            <div className="space-y-2">
              {courseStats.activityConsumption.map((a) => (
                <div key={a.activity} className="rounded-xl border border-moss/15 p-3">
                  <p className="font-medium">{a.activity}</p>
                  <p className="mt-1 text-ink/75">Repetari {a.repetitions}, consum {a.tokens_consumed}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Nivel universitate</h3>
        {universityStats && (
          <div className="space-y-2 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-canvas/60 p-3">Token-uri alocate: <span className="font-semibold">{universityStats.totalUniversityTokens}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Token-uri consumate: <span className="font-semibold">{universityStats.totalTokensConsumed}</span></div>
              <div className="rounded-xl bg-canvas/60 p-3">Abonamente VPS: <span className="font-semibold">{universityStats.allocatedVps} / {universityStats.usedVps}</span></div>
            </div>
            <p className="font-semibold">Grafic consum per activitate</p>
            <div className="space-y-2">
              {universityStats.activityChart.map((a) => (
                <div key={a.activity}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{a.activity}</span>
                    <span>{a.tokens_consumed}</span>
                  </div>
                  <div className="h-3 w-full rounded bg-moss/15">
                    <div
                      className="h-3 rounded bg-moss"
                      style={{ width: `${Math.max(4, (Number(a.tokens_consumed) / maxActivity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="font-semibold">Top cursuri dupa consum</p>
            <div className="grid gap-2 lg:grid-cols-2">
              {universityStats.topCourses.map((c) => (
                <div key={c.id} className="rounded-xl border border-moss/15 p-3">{c.title}: {c.consumed}</div>
              ))}
            </div>
            <p className="font-semibold">Top studenti dupa consum</p>
            <div className="grid gap-2 lg:grid-cols-2">
              {universityStats.topStudents.map((s) => (
                <div key={s.id} className="rounded-xl border border-moss/15 p-3">{s.name} ({s.email}): {s.consumed}</div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
