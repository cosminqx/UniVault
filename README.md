# UniVault

Aplicație web full-stack pentru gestionarea resurselor digitale universitare.

Stack implementat:
- Backend: Node.js + Express
- Frontend: React + TailwindCSS
- Bază de date: PostgreSQL
- Email: Nodemailer
- Parole: bcrypt (10 salt rounds)
- Autentificare: JWT

## Structură proiect

- backend
   - src (config, middleware, routes, controllers, services, utils)
   - sql/schema.sql
- frontend
   - src (pages, components, lib, styles)
- .env.example

## Funcționalități implementate

- Autentificare completă: register, login, logout, resetare parolă cu token expirat în 1 oră.
- 4 roluri: administrator, profesor, student, audit.
- RBAC server-side și protecție rute client-side (redirecționare la login la acces neautorizat).
- Student:
   - vede toate cursurile și separat cursurile înrolate
   - înrolare cu validare locuri disponibile
   - pagină de curs: materiale descărcabile, resurse, upload teme
   - consum manual de token-uri pe activități
   - validare VPS prin POST la https://httpbin.org/post
   - solicitare resurse suplimentare (flux profesor/admin)
- Profesor:
   - creare curs
   - listă cursuri cu status și resurse
   - upload materiale
   - aprobare/forward cereri resurse studenți
   - solicitare supliment 10% către admin
- Administrator:
   - management utilizatori/roluri (inclusiv revocare/dezactivare)
   - management activități (CRUD)
   - setare total resurse universitate
   - distribuție resurse per curs (recomandare + confirmare)
   - aprobare supliment profesor 10%
   - aprobare/respingere cereri escaladate de profesor
   - distribuire credențiale VPS prin email
- Audit:
   - pagină dedicată audit
   - jurnalizare completă acțiuni (filtrare + paginare)
- Statistici (admin): per student, per curs, universitate (inclusiv grafic per activitate)

## Configurare mediu

1. Copiază variabilele de mediu:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Creează baza de date PostgreSQL, de exemplu:

```bash
createdb univault
```

3. Actualizează `DATABASE_URL` în `backend/.env`.

## Instalare dependențe

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Migrare + seed

Scriptul de seed rulează și schema SQL automat, apoi populează utilizatori + activități.

```bash
cd backend
npm run seed
```

Date seed incluse:
- 1 administrator
- 2 profesori
- 5 studenți
- 1 auditor
- 10 activități predefinite

## Pornire aplicație

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:4000/api

## Utilizator admin default

- Email: admin@univault.local
- Parolă: Admin123!

## Alte conturi seed

- Profesori:
   - prof1@univault.local / Profesor123!
   - prof2@univault.local / Profesor123!
- Studenți:
   - student1@univault.local / Student123!
   - student2@univault.local / Student123!
   - student3@univault.local / Student123!
   - student4@univault.local / Student123!
   - student5@univault.local / Student123!
- Audit:
   - audit@univault.local / Audit123!

## Variabile de mediu necesare

Backend (`backend/.env`):
- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN
- PORT
- FRONTEND_URL
- RESET_TOKEN_EXPIRES_MINUTES
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

Frontend (`frontend/.env`):
- VITE_API_URL

## Note

- Dacă SMTP nu este configurat, endpoint-ul de forgot password returnează `developmentResetUrl` pentru testare locală.
- Upload-urile sunt stocate local în `backend/src/uploads`.