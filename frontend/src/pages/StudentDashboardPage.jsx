import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function StudentDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState({ allCourses: [], enrolledCourses: [] });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const response = await api('/student/courses', { token });
      setData(response);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function enroll(courseId) {
    setMsg('');
    setErr('');
    try {
      const response = await api(`/student/courses/${courseId}/enroll`, { method: 'POST', token });
      setMsg(response.message);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">Dashboard Student</h2>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Cursurile mele</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.enrolledCourses.length === 0 && <p className="text-sm">Nu esti inrolat la niciun curs.</p>}
          {data.enrolledCourses.map((course) => (
            <div key={course.id} className="rounded-xl border border-moss/25 p-3">
              <div className="mb-2 inline-block rounded-full bg-moss/10 px-2 py-1 text-xs text-moss">Inrolat</div>
              <h4 className="font-semibold">{course.title}</h4>
              <p className="text-sm text-ink/70">{course.description}</p>
              <Link className="btn-primary mt-3 inline-flex" to={`/student/course/${course.id}`}>
                Deschide curs
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">Toate cursurile disponibile</h3>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-moss/20 text-left">
                <th className="p-2">Titlu</th>
                <th className="p-2">Locuri</th>
                <th className="p-2">Studenti inrolati</th>
                <th className="p-2">Resurse</th>
                <th className="p-2">Materiale</th>
                <th className="p-2">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {data.allCourses.map((course) => (
                <tr key={course.id} className="border-b border-moss/10">
                  <td className="p-2">{course.title}</td>
                  <td className="p-2">{course.available_spots}</td>
                  <td className="p-2">{course.enrolled_count} / {course.max_students}</td>
                  <td className="p-2">{course.tokens_per_student} tokens, {course.vps_per_student} VPS</td>
                  <td className="p-2">{course.materials_count}</td>
                  <td className="p-2">
                    {course.is_enrolled ? (
                      <span className="text-moss">Deja inrolat</span>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => enroll(course.id)}
                        disabled={Number(course.available_spots) <= 0}
                      >
                        Inrolare
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
