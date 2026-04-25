import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { confirmAction } from '../lib/confirm';

function describeCourseLoad(course) {
  const seats = Number(course.max_students);
  if (seats >= 80) return 'Curs cu audienta mare';
  if (seats >= 40) return 'Curs de dimensiune medie';
  return 'Curs cu grupa restransa';
}

function describeResources(course) {
  const tokens = Number(course.tokens_per_student);
  const vps = Number(course.vps_per_student);

  if (tokens >= 500 && vps > 0) {
    return 'Potrivit pentru proiecte practice cu resurse tehnice dedicate.';
  }
  if (tokens >= 200) {
    return 'Include un buget bun pentru activitati digitale si exercitii asistate.';
  }
  if (vps > 0) {
    return 'Include acces la mediu tehnic VPS pentru lucru practic.';
  }
  return 'Curs orientat mai ales pe materiale si activitati cu consum redus.';
}

export default function StudentDashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState({ allCourses: [], enrolledCourses: [] });
  const [selectedCourseId, setSelectedCourseId] = useState(null);
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

  const isAdmin = user?.role === 'administrator';
  const selectedCourse = data.allCourses.find((course) => course.id === selectedCourseId) || null;

  async function enroll(courseId) {
    setMsg('');
    setErr('');

    if (!confirmAction('Te inrolezi la acest curs?')) {
      return;
    }

    try {
      const response = await api(`/student/courses/${courseId}/enroll`, { method: 'POST', token });
      setMsg(response.message);
      setSelectedCourseId(courseId);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">{isAdmin ? 'Cursuri universitare' : 'Dashboard Student'}</h2>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      {!isAdmin && (
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
      )}

      <section className="card">
        <h3 className="font-heading text-xl font-semibold">{isAdmin ? 'Toate cursurile' : 'Toate cursurile disponibile'}</h3>
        <p className="mt-1 text-sm text-ink/75">
          {isAdmin
            ? 'Ca administrator poti deschide detaliile fiecarui curs pentru a vedea profesorul, resursele alocate si materialele disponibile.'
            : 'Inainte sa te inrolezi, poti deschide detaliile unui curs ca sa vezi cine il preda, ce resurse primesti si cate locuri mai sunt disponibile.'}
        </p>

        {selectedCourse && (
          <div className="mt-4 rounded-2xl border border-moss/20 bg-canvas/60 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-moss">Preview curs</p>
                <h4 className="mt-1 font-heading text-2xl font-bold">{selectedCourse.title}</h4>
                <p className="mt-2 text-sm text-ink/80">{selectedCourse.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-ink">{describeCourseLoad(selectedCourse)}</span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-ink">{selectedCourse.materials_count} materiale deja incarcate</span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-ink">
                    {Number(selectedCourse.available_spots) > 0 ? 'Inscriere disponibila' : 'Fara locuri disponibile'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isAdmin && !selectedCourse.is_enrolled && (
                  <button
                    className="btn-primary"
                    onClick={() => enroll(selectedCourse.id)}
                    disabled={Number(selectedCourse.available_spots) <= 0}
                  >
                    Inroleaza-ma la acest curs
                  </button>
                )}
                {!isAdmin && selectedCourse.is_enrolled && (
                  <Link className="btn-primary" to={`/student/course/${selectedCourse.id}`}>
                    Deschide cursul
                  </Link>
                )}
                <button className="btn-outline" onClick={() => setSelectedCourseId(null)} type="button">
                  Inchide detaliile
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-moss/20 bg-white/80 p-4 text-sm">
                  <p className="font-semibold">Despre acest curs</p>
                  <p className="mt-2 text-ink/80">
                    {describeResources(selectedCourse)}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-canvas/70 p-3">
                      <p className="font-medium">Ce primesti dupa inrolare</p>
                      <ul className="mt-2 list-disc pl-5 text-ink/80">
                        <li>Acces la pagina completa a cursului</li>
                        <li>Acces la materialele incarcate de profesor</li>
                        <li>{selectedCourse.tokens_per_student} token-uri initiale pentru activitati</li>
                        <li>{selectedCourse.vps_per_student} accesari sau abonamente VPS</li>
                      </ul>
                    </div>
                    <div className="rounded-xl bg-canvas/70 p-3">
                      <p className="font-medium">Ce sa verifici inainte</p>
                      <ul className="mt-2 list-disc pl-5 text-ink/80">
                        <li>Daca tema cursului corespunde intereselor tale</li>
                        <li>Daca mai sunt locuri disponibile</li>
                        <li>Daca resursele oferite sunt suficiente pentru nevoile tale</li>
                        <li>Daca profesorul si tipul cursului ti se potrivesc</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-moss/20 bg-white/80 p-4 text-sm">
                  <p className="font-semibold">Pe scurt</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-canvas/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-ink/65">Capacitate</p>
                      <p className="mt-1 font-semibold">{selectedCourse.enrolled_count} / {selectedCourse.max_students} studenti</p>
                    </div>
                    <div className="rounded-xl bg-canvas/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-ink/65">Token-uri</p>
                      <p className="mt-1 font-semibold">{selectedCourse.tokens_per_student} per student</p>
                    </div>
                    <div className="rounded-xl bg-canvas/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-ink/65">VPS</p>
                      <p className="mt-1 font-semibold">{selectedCourse.vps_per_student} per student</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-moss/20 bg-white/80 p-3 text-sm">
                  <p className="font-semibold">Cine preda</p>
                  <p className="mt-1">{selectedCourse.professor_name}</p>
                  <p className="text-ink/70">{selectedCourse.professor_email}</p>
                </div>
                <div className="rounded-xl border border-moss/20 bg-white/80 p-3 text-sm">
                  <p className="font-semibold">Locuri disponibile</p>
                  <p className="mt-1">{selectedCourse.available_spots} ramase din {selectedCourse.max_students}</p>
                  <p className="text-ink/70">{selectedCourse.enrolled_count} studenti deja inscrisi</p>
                </div>
                <div className="rounded-xl border border-moss/20 bg-white/80 p-3 text-sm">
                  <p className="font-semibold">Resurse incluse</p>
                  <p className="mt-1">{selectedCourse.tokens_per_student} token-uri / student</p>
                  <p className="text-ink/70">{selectedCourse.vps_per_student} VPS / student</p>
                </div>
                <div className="rounded-xl border border-moss/20 bg-white/80 p-3 text-sm">
                  <p className="font-semibold">Materiale disponibile</p>
                  <p className="mt-1">{selectedCourse.materials_count} materiale incarcate</p>
                  <p className="text-ink/70">Le poti accesa complet dupa inrolare.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:hidden">
          {data.allCourses.map((course) => (
            <div key={course.id} className="rounded-2xl border border-moss/20 bg-white/80 p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <h4 className="font-semibold">{course.title}</h4>
                  <p className="mt-1 text-sm text-ink/70">{course.professor_name}</p>
                  <p className="text-xs text-ink/60">{course.professor_email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-canvas/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink/60">Locuri</p>
                    <p className="mt-1 font-semibold">{course.available_spots}</p>
                  </div>
                  <div className="rounded-xl bg-canvas/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink/60">Inscrisi</p>
                    <p className="mt-1 font-semibold">{course.enrolled_count} / {course.max_students}</p>
                  </div>
                  <div className="rounded-xl bg-canvas/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink/60">Token-uri</p>
                    <p className="mt-1 font-semibold">{course.tokens_per_student}</p>
                  </div>
                  <div className="rounded-xl bg-canvas/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-ink/60">VPS</p>
                    <p className="mt-1 font-semibold">{course.vps_per_student}</p>
                  </div>
                </div>
                <p className="text-sm text-ink/70">{course.materials_count} materiale disponibile</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button className="btn-outline" onClick={() => setSelectedCourseId(course.id)} type="button">
                    Vezi detalii
                  </button>
                  {!isAdmin && course.is_enrolled ? (
                    <span className="rounded-xl bg-moss/10 px-3 py-2 text-sm text-moss">Deja inrolat</span>
                  ) : !isAdmin ? (
                    <button
                      className="btn-primary"
                      onClick={() => enroll(course.id)}
                      disabled={Number(course.available_spots) <= 0}
                    >
                      Inrolare
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 hidden overflow-auto lg:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-moss/20 text-left">
                <th className="p-2">Titlu</th>
                <th className="p-2">Profesor</th>
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
                  <td className="p-2">
                    <div>{course.professor_name}</div>
                    <div className="text-xs text-ink/65">{course.professor_email}</div>
                  </td>
                  <td className="p-2">{course.available_spots}</td>
                  <td className="p-2">{course.enrolled_count} / {course.max_students}</td>
                  <td className="p-2">{course.tokens_per_student} tokens, {course.vps_per_student} VPS</td>
                  <td className="p-2">{course.materials_count}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-outline" onClick={() => setSelectedCourseId(course.id)} type="button">
                        Vezi detalii
                      </button>
                      {!isAdmin && course.is_enrolled ? (
                        <span className="self-center text-moss">Deja inrolat</span>
                      ) : !isAdmin ? (
                        <button
                          className="btn-primary"
                          onClick={() => enroll(course.id)}
                          disabled={Number(course.available_spots) <= 0}
                        >
                          Inrolare
                        </button>
                      ) : null}
                    </div>
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
