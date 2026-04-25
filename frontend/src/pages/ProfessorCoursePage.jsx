import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export default function ProfessorCoursePage() {
  const { courseId } = useParams();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [courseData, setCourseData] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyAction, setBusyAction] = useState('');

  async function load() {
    setErr('');
    try {
      const response = await api(`/professor/courses/${courseId}`, { token });
      setCourseData(response);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [courseId]);

  async function uploadMaterial(file) {
    if (!file) return;

    setMsg('');
    setErr('');
    setBusyAction('upload-material');
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
      showToast({
        title: 'Material incarcat',
        message: 'Materialul este disponibil in curs pentru studenti.'
      });
      await load();
    } catch (e) {
      setErr(e.message);
      showToast({
        title: 'Upload esuat',
        message: e.message,
        type: 'error'
      });
    } finally {
      setBusyAction('');
    }
  }

  async function deleteMaterial(materialId) {
    setMsg('');
    setErr('');
    setBusyAction(`delete-material-${materialId}`);

    try {
      const resp = await api(`/professor/courses/${courseId}/materials/${materialId}`, {
        method: 'DELETE',
        token
      });
      setMsg(resp.message);
      showToast({
        title: 'Material sters',
        message: 'Profesorul a sters materialul din curs. Temele studentilor au ramas neatinse.'
      });
      await load();
    } catch (e) {
      setErr(e.message);
      showToast({
        title: 'Stergerea a esuat',
        message: e.message,
        type: 'error'
      });
    } finally {
      setBusyAction('');
    }
  }

  if (!courseData) {
    return <div className="p-4">Loading course...</div>;
  }

  const { course, materials, assignments, students } = courseData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-ink/65">Vizualizare detaliata profesor</p>
          <h2 className="font-heading text-3xl font-bold">{course.title}</h2>
          <p className="mt-2 max-w-4xl text-ink/80">{course.description}</p>
        </div>
        <Link className="btn-outline" to="/professor">
          Inapoi la panoul profesorului
        </Link>
      </div>

      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-moss/20 bg-white/80 p-4">
          <h3 className="font-heading text-lg font-semibold">Panou curs</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-canvas/70 p-3">
              <p className="text-xs uppercase tracking-wide text-ink/65">Studenti</p>
              <p className="mt-1 font-semibold">{course.enrolled_students} / {course.max_students}</p>
            </div>
            <div className="rounded-xl bg-canvas/70 p-3">
              <p className="text-xs uppercase tracking-wide text-ink/65">Distributie</p>
              <p className="mt-1 font-semibold">{course.distribution_confirmed ? 'Confirmata' : 'Neconfirmata'}</p>
            </div>
            <div className="rounded-xl bg-canvas/70 p-3">
              <p className="text-xs uppercase tracking-wide text-ink/65">Token-uri curs</p>
              <p className="mt-1 font-semibold">{course.allocated_tokens}</p>
              <p className="text-xs text-ink/65">Extra profesor: {course.professor_extra_tokens}</p>
            </div>
            <div className="rounded-xl bg-canvas/70 p-3">
              <p className="text-xs uppercase tracking-wide text-ink/65">VPS curs</p>
              <p className="mt-1 font-semibold">{course.allocated_vps}</p>
              <p className="text-xs text-ink/65">Extra profesor: {course.professor_extra_vps}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-moss/20 bg-white/80 p-4">
          <h3 className="font-heading text-lg font-semibold">Actiuni profesor</h3>
          <p className="mt-2 text-sm text-ink/75">
            Aici gestionezi doar materialele cursului. Temele studentilor sunt afisate separat si nu pot fi sterse de profesor.
          </p>
          <label className="btn-primary mt-4 inline-flex cursor-pointer">
            {busyAction === 'upload-material' ? 'Se incarca materialul...' : 'Incarca material nou'}
            <input
              className="hidden"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadMaterial(file);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Materiale adaugate de profesor</h3>
        <p className="mt-1 text-sm text-ink/75">
          Doar aceste fisiere pot fi sterse de tine. Fiecare element de mai jos reprezinta un material incarcat de profesor pentru curs.
        </p>
        {materials.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Nu exista inca materiale incarcate pentru acest curs.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {materials.map((material) => (
              <div key={material.id} className="rounded-xl border border-moss/15 bg-white/80 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <a
                      className="font-medium text-moss underline underline-offset-2"
                      href={`http://localhost:4000/uploads/${material.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {material.file_name}
                    </a>
                    <p className="mt-1 text-xs text-ink/65">
                      Adaugat la {new Date(material.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    disabled={busyAction === `delete-material-${material.id}`}
                    onClick={() => deleteMaterial(material.id)}
                    type="button"
                  >
                    {busyAction === `delete-material-${material.id}` ? 'Se sterge...' : 'Sterge materialul'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Teme incarcate de studenti</h3>
        <p className="mt-1 text-sm text-ink/75">
          Aceste fisiere sunt doar pentru consultare. Profesorul nu are actiuni de stergere asupra temelor studentilor.
        </p>
        {assignments.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Studentii nu au incarcat inca teme pentru acest curs.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-moss/15 bg-white/80 p-3">
                <a
                  className="font-medium text-moss underline underline-offset-2"
                  href={`http://localhost:4000/uploads/${assignment.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {assignment.file_name}
                </a>
                <p className="mt-1 text-sm text-ink/75">
                  Student: {assignment.student_name || assignment.student_email} ({assignment.student_email})
                </p>
                <p className="text-xs text-ink/65">
                  Incarcata la {new Date(assignment.uploaded_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold">Studenti inscrisi</h3>
        {students.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">Nu exista studenti inscrisi momentan.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {students.map((student) => (
              <div key={student.id} className="rounded-xl border border-moss/15 bg-white/80 p-3 text-sm">
                <p className="font-medium">{student.name}</p>
                <p className="text-ink/70">{student.email}</p>
                <p className="mt-1 text-xs text-ink/60">
                  Inscris la {new Date(student.enrolled_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
