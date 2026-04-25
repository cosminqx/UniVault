import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { confirmAction } from '../lib/confirm';
import { useToast } from '../lib/toast';

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
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [courseAssignments, setCourseAssignments] = useState({});
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

      // Fetch student assignments for each course
      const assignmentsMap = {};
      for (const course of courseResp.courses) {
        try {
          const assignResp = await api(`/professor/courses/${course.id}/student-assignments`, { token });
          assignmentsMap[course.id] = assignResp.assignments || [];
        } catch (e) {
          console.error(`Failed to fetch assignments for course ${course.id}:`, e);
          assignmentsMap[course.id] = [];
        }
      }
      setCourseAssignments(assignmentsMap);
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

    if (!confirmAction('Creezi acest curs acum? Verifica inca o data titlul, descrierea si resursele.')) {
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
      showToast({
        title: 'Curs creat',
        message: 'Cursul a fost salvat cu succes si este acum disponibil in lista ta.'
      });
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
      showToast({
        title: 'Nu am putut crea cursul',
        message: Array.isArray(e.payload?.errors) ? 'Verifica datele introduse in formular.' : e.message,
        type: 'error'
      });
    } finally {
      setBusyAction('');
    }
  }

  async function uploadMaterial(courseId, file) {
    setMsg('');
    setErr('');

    if (!confirmAction('Vrei sa incarci acest material pentru studenti?')) {
      return;
    }

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
      showToast({
        title: 'Material incarcat',
        message: `Fisierul a fost atasat cursului si este disponibil pentru studenti.`
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

  async function resolveRequest(id, approve) {
    setMsg('');
    setErr('');

    if (!confirmAction(approve ? 'Aprobi aceasta cerere de resurse?' : 'Respingi aceasta cerere de resurse?')) {
      return;
    }

    setBusyAction(`request-${id}`);
    try {
      const resp = await api(`/professor/requests/${id}/resolve`, {
        method: 'POST',
        token,
        body: { approve }
      });
      setMsg(resp.message);
      showToast({
        title: approve ? 'Cerere aprobata' : 'Cerere respinsa',
        message: approve
          ? 'Studentul va vedea actualizarea statusului in pagina cursului.'
          : 'Cererea a fost marcata ca respinsa.'
      });
      await load();
    } catch (e) {
      setErr(e.message);
      showToast({
        title: 'Nu am putut procesa cererea',
        message: e.message,
        type: 'error'
      });
    } finally {
      setBusyAction('');
    }
  }

  async function requestSupplement(courseId) {
    setMsg('');
    setErr('');

    if (!confirmAction('Trimiti o solicitare de supliment de resurse catre administrator?')) {
      return;
    }

    setBusyAction(`supplement-${courseId}`);
    try {
      const resp = await api(`/professor/courses/${courseId}/supplement-request`, { method: 'POST', token, body: {} });
      setMsg('Solicitarea de supliment a fost trimisa catre administrator.');
      showToast({
        title: 'Solicitare trimisa',
        message: 'Administratorul a primit cererea ta de supliment de resurse.'
      });
      await load();
    } catch (e) {
      setErr(e.message);
      showToast({
        title: 'Solicitarea nu a fost trimisa',
        message: e.message,
        type: 'error'
      });
    } finally {
      setBusyAction('');
    }
  }

  async function deleteAssignment(courseId, assignmentId) {
    setMsg('');
    setErr('');

    if (!confirmAction('Esti sigur ca vrei sa stergi aceasta tema?')) {
      return;
    }

    setBusyAction(`delete-${assignmentId}`);
    try {
      const resp = await api(`/professor/courses/${courseId}/assignments/${assignmentId}`, {
        method: 'DELETE',
        token
      });
      setMsg('Tema a fost stearsa cu succes.');
      showToast({
        title: 'Tema stearsa',
        message: 'Fisierul temei a fost sters din sistem.'
      });
      await load();
    } catch (e) {
      setErr(e.message);
      showToast({
        title: 'Nu am putut sterge tema',
        message: e.message,
        type: 'error'
      });
    } finally {
      setBusyAction('');
    }
  }

  async function downloadAssignment(courseId, assignmentId, fileName) {
    setBusyAction(`download-${assignmentId}`);
    try {
      const response = await fetch(`/api/professor/courses/${courseId}/assignments/${assignmentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Nu am putut descarca fisierul');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast({
        title: 'Fisierul descarcat',
        message: 'Tema a fost descarcata cu succes.'
      });
    } catch (e) {
      setErr(e.message);
      showToast({
        title: 'Nu am putut descarca fisierul',
        message: e.message,
        type: 'error'
      });
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

          <button className="btn-primary w-full md:col-span-2" onClick={createCourse} disabled={busyAction === 'create-course'}>
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

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="btn-outline cursor-pointer text-center">
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

              <div className="mt-4 rounded-xl border border-moss/15 bg-white/70 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="font-semibold">Materiale adaugate pentru studenti</h5>
                  <span className="text-xs text-ink/60">
                    {(course.materials || []).length} fisiere incarcate
                  </span>
                </div>

                {(!course.materials || course.materials.length === 0) && (
                  <p className="mt-2 text-sm text-ink/70">
                    Inca nu ai incarcat materiale pentru acest curs.
                  </p>
                )}

                {course.materials?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {course.materials.map((material) => (
                      <div key={material.id} className="rounded-xl border border-moss/10 bg-canvas/60 p-3 text-sm">
                        <p className="font-medium break-all">{material.file_name}</p>
                        <p className="mt-1 text-xs text-ink/65">
                          Adaugat la {new Date(material.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-moss/15 bg-white/70 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="font-semibold">Tema adaugata de studenti</h5>
                  <span className="text-xs text-ink/60">
                    {(courseAssignments[course.id] || []).length} fisiere
                  </span>
                </div>

                {(!courseAssignments[course.id] || courseAssignments[course.id].length === 0) && (
                  <p className="mt-2 text-sm text-ink/70">
                    Studentii nu au incarcat tema inca pentru acest curs.
                  </p>
                )}

                {courseAssignments[course.id]?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {courseAssignments[course.id].map((assignment) => (
                      <div key={assignment.id} className="rounded-xl border border-moss/10 bg-canvas/60 p-3 text-sm">
                        <p className="font-medium break-all">{assignment.file_name}</p>
                        <p className="text-xs text-ink/70">
                          Incarcata de <span className="font-semibold">{assignment.student_name}</span> ({assignment.student_email})
                        </p>
                        <p className="mt-1 text-xs text-ink/65">
                          {new Date(assignment.uploaded_at).toLocaleString()}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="btn-secondary text-xs"
                            onClick={() => downloadAssignment(course.id, assignment.id, assignment.file_name)}
                            disabled={busyAction === `download-${assignment.id}`}
                          >
                            {busyAction === `download-${assignment.id}` ? 'Se descarca...' : 'Descarca'}
                          </button>
                          <button
                            className="btn-secondary text-xs text-red-600 hover:bg-red-100"
                            onClick={() => deleteAssignment(course.id, assignment.id)}
                            disabled={busyAction === `delete-${assignment.id}`}
                          >
                            {busyAction === `delete-${assignment.id}` ? 'Se sterge...' : 'Sterge'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
