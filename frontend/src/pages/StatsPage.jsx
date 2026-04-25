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
          <div className="mt-3 text-sm">
            <p>Token-uri alocate: {studentStats.allocatedTokens}</p>
            <p>Token-uri totale consumate: {studentStats.totalTokensConsumed}</p>
            <p>Abonamente alocate: {studentStats.allocatedVps}</p>
            <p>Abonamente utilizate: {studentStats.usedVps}</p>
            <div className="mt-2">
              {studentStats.activityConsumption.map((a) => (
                <p key={a.activity}>{a.activity}: repetari {a.repetitions}, consum {a.tokens_consumed}</p>
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
          <div className="mt-3 text-sm">
            <p>Total token-uri alocate cursului: {courseStats.allocatedTokens}</p>
            <p>Token-uri totale consumate: {courseStats.totalTokensConsumed}</p>
            <p>Abonamente alocate/utilizate: {courseStats.allocatedVps} / {courseStats.usedVps}</p>
            <div className="mt-2">
              {courseStats.activityConsumption.map((a) => (
                <p key={a.activity}>{a.activity}: repetari {a.repetitions}, consum {a.tokens_consumed}</p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Nivel universitate</h3>
        {universityStats && (
          <div className="space-y-2 text-sm">
            <p>Total token-uri alocate universitate: {universityStats.totalUniversityTokens}</p>
            <p>Total token-uri consumate: {universityStats.totalTokensConsumed}</p>
            <p>Total abonamente alocate/utilizate: {universityStats.allocatedVps} / {universityStats.usedVps}</p>
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
            {universityStats.topCourses.map((c) => (
              <p key={c.id}>{c.title}: {c.consumed}</p>
            ))}
            <p className="font-semibold">Top studenti dupa consum</p>
            {universityStats.topStudents.map((s) => (
              <p key={s.id}>{s.name} ({s.email}): {s.consumed}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
