import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <p className="text-xs text-ink/65">{hint}</p> : null}
    </label>
  );
}

export default function ProfessorPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    maxStudents: '30',
    tokensPerStudent: '',
    vpsPerStudent: ''
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

  function updateCourseField(field, value) {
    setNewCourse((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateCourseForm() {
    const errors = {};
    const title = newCourse.title.trim();
    const description = newCourse.description.trim();

    if (title.length < 3) {
      errors.title = 'Titlul cursului trebuie sa aiba cel putin 3 caractere.';
    }

    if (description.length < 10) {
      errors.description = 'Descrierea cursului trebuie sa aiba cel putin 10 caractere.';
    }

    if (!Number.isInteger(Number(newCourse.maxStudents)) || Number(newCourse.maxStudents) < 1) {
      errors.maxStudents = 'Numarul maxim de studenti trebuie sa fie de cel putin 1.';
    }

    if (!Number.isInteger(Number(newCourse.tokensPerStudent)) || Number(newCourse.tokensPerStudent) < 0) {
      errors.tokensPerStudent = 'Token-urile per student trebuie sa fie 0 sau mai mult.';
    }

    if (!Number.isInteger(Number(newCourse.vpsPerStudent)) || Number(newCourse.vpsPerStudent) < 0) {
      errors.vpsPerStudent = 'Numarul de VPS per student trebuie sa fie 0 sau mai mult.';
    }

    return errors;
  }

  async function createCourse() {
    setMsg('');
    setErr('');
    const errors = validateCourseForm();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setErr('Formularul nu este completat corect. Verifica campurile marcate mai jos.');
      return;
    }

    setFieldErrors({});
    setBusyAction('create-course');

    try {
      const resp = await api('/professor/courses', {
        method: 'POST',
        token,
        body: {
          ...newCourse,
          title: newCourse.title.trim(),
          description: newCourse.description.trim(),
          maxStudents: Number(newCourse.maxStudents),
          tokensPerStudent: Number(newCourse.tokensPerStudent || 0),
          vpsPerStudent: Number(newCourse.vpsPerStudent || 0)
        }
      });
      setMsg(resp.message);
      setNewCourse({
        title: '',
        description: '',
        maxStudents: '30',
        tokensPerStudent: '',
        vpsPerStudent: ''
      });
      await load();
    } catch (e) {
      if (Array.isArray(e.payload?.errors)) {
        const backendErrors = {};
        for (const item of e.payload.errors) {
          backendErrors[item.field] = item.msg;
        }
        setFieldErrors(backendErrors);
        setErr('Datele trimise nu au trecut validarea. Verifica mesajele de sub campuri.');
      } else {
        setErr(e.message);
      }
    } finally {
      setBusyAction('');
    }
  }

  async function uploadMaterial(courseId, file) {
    setMsg('');
    setErr('');
    setBusyAction(`upload-${courseId}`);
    const form = new FormData();
    form.append('file', file);
    try {
      const resp = await api(`/professor/courses/${courseId}/materials`, {
        method: 'POST',
        token,
        isForm: true,
        body: form
      });
      setMsg(`Material incarcat cu succes. Studentii pot vedea acum fisierul in curs.`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAction('');
    }
  }

  async function resolveRequest(id, approve) {
    setMsg('');
    setErr('');
    setBusyAction(`request-${id}`);
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
    } finally {
      setBusyAction('');
    }
  }

  async function requestSupplement(courseId) {
    setMsg('');
    setErr('');
    setBusyAction(`supplement-${courseId}`);
    try {
      const resp = await api(`/professor/courses/${courseId}/supplement-request`, { method: 'POST', token, body: {} });
      setMsg('Solicitarea de supliment a fost trimisa catre administrator.');
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold">Panou Profesor</h2>
      {msg && <p className="rounded-lg bg-green-100 p-2 text-green-700">{msg}</p>}
      {err && <p className="rounded-lg bg-red-100 p-2 text-red-700">{err}</p>}

      <section className="card">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-heading text-xl font-semibold">Creare curs</h3>
            <p className="mt-1 max-w-3xl text-sm text-ink/75">
              Completeaza toate campurile de mai jos pentru a defini cursul si resursele de baza pe care le va primi fiecare student inscris.
            </p>
          </div>
          <div className="rounded-xl bg-moss/10 px-3 py-2 text-xs text-ink/80">
            Campurile cu numere accepta doar valori pozitive sau zero.
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Titlul cursului"
            hint="Scrie numele complet al cursului, de exemplu: Programare Web, Baze de Date, Inteligenta Artificiala."
          >
            <div className="space-y-1">
              <input
                className={`input ${fieldErrors.title ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                placeholder="Ex: Programare Web"
                value={newCourse.title}
                onChange={(e) => updateCourseField('title', e.target.value)}
              />
              {fieldErrors.title ? <p className="text-xs text-red-600">{fieldErrors.title}</p> : null}
            </div>
          </Field>

          <Field
            label="Numar maxim de studenti"
            hint="Acesta este numarul total de locuri disponibile pentru inscriere."
          >
            <div className="space-y-1">
              <input
                className={`input ${fieldErrors.maxStudents ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                type="number"
                min={1}
                placeholder="Ex: 30"
                value={newCourse.maxStudents}
                onChange={(e) => updateCourseField('maxStudents', e.target.value.replace(/\D/g, ''))}
              />
              {fieldErrors.maxStudents ? <p className="text-xs text-red-600">{fieldErrors.maxStudents}</p> : null}
            </div>
          </Field>

          <Field
            label="Descrierea cursului"
            hint="Explica pe scurt ce contine cursul, ce vor invata studentii si pentru cine este potrivit."
          >
            <div className="space-y-1">
              <textarea
                className={`input min-h-32 resize-y ${fieldErrors.description ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                placeholder="Ex: Curs introductiv despre dezvoltarea aplicatiilor web, cu accent pe frontend, backend si baze de date."
                value={newCourse.description}
                onChange={(e) => updateCourseField('description', e.target.value)}
              />
              {fieldErrors.description ? <p className="text-xs text-red-600">{fieldErrors.description}</p> : null}
            </div>
          </Field>

          <div className="grid gap-4">
            <Field
              label="Token-uri alocate fiecarui student"
              hint="Introdu cate token-uri primeste un student imediat dupa inscrierea la acest curs."
            >
              <div className="space-y-1">
                <input
                  className={`input ${fieldErrors.tokensPerStudent ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                type="number"
                min={0}
                placeholder="Ex: 500"
                value={newCourse.tokensPerStudent}
                onChange={(e) => updateCourseField('tokensPerStudent', e.target.value.replace(/\D/g, ''))}
              />
                {fieldErrors.tokensPerStudent ? <p className="text-xs text-red-600">{fieldErrors.tokensPerStudent}</p> : null}
              </div>
            </Field>

            <Field
              label="Abonamente VPS alocate fiecarui student"
              hint="Introdu cate validari sau abonamente VPS sunt disponibile per student pentru acest curs."
            >
              <div className="space-y-1">
                <input
                  className={`input ${fieldErrors.vpsPerStudent ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                type="number"
                min={0}
                placeholder="Ex: 1"
                value={newCourse.vpsPerStudent}
                onChange={(e) => updateCourseField('vpsPerStudent', e.target.value.replace(/\D/g, ''))}
              />
                {fieldErrors.vpsPerStudent ? <p className="text-xs text-red-600">{fieldErrors.vpsPerStudent}</p> : null}
              </div>
            </Field>

            <div className="rounded-xl border border-moss/20 bg-canvas/60 p-3 text-sm text-ink/80">
              Dupa ce creezi cursul, administratorul poate confirma distributia totala de resurse pentru el, iar tu poti incarca materiale si gestiona cererile studentilor.
            </div>
          </div>

          <button className="btn-primary md:col-span-2" onClick={createCourse} disabled={busyAction === 'create-course'}>
            {busyAction === 'create-course' ? 'Se creeaza cursul...' : 'Creeaza curs'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-heading text-xl font-semibold">Cursurile mele</h3>
            <p className="text-sm text-ink/75">
              Aici vezi cursurile create, numarul de studenti inscrisi, resursele alocate si actiunile disponibile pentru fiecare curs.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="rounded-xl border border-moss/20 p-3">
              <h4 className="font-semibold">{course.title}</h4>
              <p className="mt-1 text-sm text-ink/80">{course.description}</p>
              <p className="mt-2 text-sm">Studenti inscrisi: {course.enrolled_students} din {course.max_students} locuri</p>
              <p className="text-sm">Resurse alocate cursului: {course.allocated_tokens} tokens, {course.allocated_vps} VPS</p>
              <p className="text-sm">Status distributie resurse de la administrator: {course.distribution_confirmed ? 'Confirmata' : 'Neconfirmata'}</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <label className="btn-outline cursor-pointer">
                  {busyAction === `upload-${course.id}` ? 'Se incarca materialul...' : 'Incarca material pentru studenti'}
                  <input
                    className="hidden"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadMaterial(course.id, file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                <button
                  className="btn-secondary"
                  onClick={() => requestSupplement(course.id)}
                  disabled={busyAction === `supplement-${course.id}`}
                >
                  {busyAction === `supplement-${course.id}` ? 'Se trimite solicitarea...' : 'Solicita supliment de 10% resurse'}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink/65">
                Foloseste primul buton pentru fisiere precum PDF, suport de curs, laborator sau cerinte. Foloseste al doilea buton cand resursele initiale ale cursului nu mai sunt suficiente.
              </p>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="rounded-xl border border-dashed border-moss/25 p-4 text-sm text-ink/75">
              Nu ai creat inca niciun curs. Completeaza formularul de mai sus si apasa pe `Creeaza curs`.
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <div>
          <h3 className="font-heading text-xl font-semibold">Cereri resurse studenti</h3>
          <p className="mt-1 text-sm text-ink/75">
            Studentii pot cere token-uri sau VPS suplimentare. Tu decizi daca aprobi direct, iar daca cererea depaseste bugetul tau suplimentar de 10%, sistemul o escaladeaza automat la administrator.
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-moss/20 p-3 text-sm">
              <p>
                <span className="font-semibold">{r.student_email}</span> a cerut <span className="font-semibold">{r.resource_type} x {r.quantity}</span> pentru cursul <span className="font-semibold">{r.course_title}</span>
              </p>
              <p className="mt-1">Motiv declarat de student: {r.reason}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={() => resolveRequest(r.id, true)} disabled={busyAction === `request-${r.id}`}>
                  {busyAction === `request-${r.id}` ? 'Se proceseaza...' : 'Aproba cererea'}
                </button>
                <button className="btn-secondary" onClick={() => resolveRequest(r.id, false)} disabled={busyAction === `request-${r.id}`}>
                  {busyAction === `request-${r.id}` ? 'Se proceseaza...' : 'Respinge cererea'}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink/65">
                Daca aprobarea depaseste resursele suplimentare disponibile pentru profesor, cererea merge automat mai departe la administrator.
              </p>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="rounded-xl border border-dashed border-moss/25 p-4 text-sm text-ink/75">
              Nu exista cereri in asteptare din partea studentilor.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
