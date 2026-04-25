# UniVault

Ești un senior full-stack developer. Construiește o aplicație web completă de gestionare a resurselor digitale universitare, respectând EXACT specificațiile de mai jos. Prioritatea maximă este să implementezi fiecare funcționalitate fără excepție.

## STACK TEHNIC (alege tu cel mai potrivit, preferabil):
- Backend: Node.js + Express SAU Python + FastAPI/Django
- Frontend: React + TailwindCSS SAU Vue 3 + TailwindCSS
- Bază de date: PostgreSQL SAU MySQL SAU MongoDB
- Email: Nodemailer (Node) SAU smtplib/FastMail (Python)
- Hashing parole: bcrypt
- Autentificare: JWT sau sesiuni server-side

---

## ROLURI ȘI AUTENTIFICARE (15 puncte)

Implementează un sistem complet de autentificare cu 4 roluri: **administrator**, **profesor**, **student**, **audit**.

### Pagina de login/înregistrare:
1. Formular de înregistrare: câmpuri pentru nume, email, parolă, confirmare parolă. La înregistrare, rolul implicit este "student".
2. Formular de login: email + parolă, cu redirecționare bazată pe rol după autentificare.
3. Mecanism de resetare parolă: trimite link de reset pe email cu token temporar (expiră în 1 oră); pagina de reset cu câmp pentru parolă nouă.
4. Toate parolele stocate cu bcrypt (minimum 10 salt rounds).
5. Fiecare rol poate accesa EXCLUSIV paginile aferente rolului său — orice acces neautorizat redirecționează la login.

### Gestionarea rolurilor (admin):
- Pagină dedicată unde administratorul vede lista tuturor utilizatorilor.
- Poate ATRIBUI un rol oricărui utilizator (administrator, profesor, student, audit).
- Poate MODIFICA rolul unui utilizator existent.
- Poate REVOCA rolul (revenire la "student" sau dezactivare cont).

---

## PAGINA PRINCIPALĂ — STUDENT (10 puncte)

### Funcționalități:
1. Afișează TOATE cursurile disponibile în sistem (indiferent de înscriere), cu numărul de locuri disponibile, resursele oferite și numărul de studenți înrolați.
2. Afișează SEPARAT cursurile la care studentul este deja înrolat (cu badge/secțiune distinctă).
3. Buton de înrolare la cursuri cu locuri libere (verifică: locuri disponibile > 0 și studentul nu este deja înrolat). Înrolarea alocă automat resursele studentului conform setărilor cursului.

---

## PAGINA DE CURS (20 puncte)

Fiecare curs are propria pagină, accesibilă studentului înrolat.

### Funcționalități:
1. Vizualizare materiale încărcate de profesor (fișiere: PDF, TXT, imagini, etc.) cu posibilitate de descărcare.
2. Afișare resurse digitale disponibile studentului în cadrul acestui curs:
   - Token-uri alocate / Token-uri folosite / Token-uri rămase
   - Abonamente VPS (dacă cursul are)
3. Încărcare teme de către studenți (fișiere .pdf, .txt, .docx, .zip, etc.) cu afișarea listei de teme încărcate anterior.
4. Consum manual de token-uri: student selectează activitățile desfășurate (checkbox sau dropdown multiplu cu cantitate), sistemul calculează și deduce token-urile. Exemplu UI: listă activități cu câmp numeric pentru număr de repetări → buton "Înregistrează consum". Validare: nu permite consum peste limita disponibilă.
5. Simulare validare abonament VPS: trimite un POST request la https://httpbin.org/post cu credențialele VPS (username, password, IP) ca JSON body. Afișează răspunsul primit de la API ca dovadă de validare. Marchează abonamentul ca "validat" în baza de date.
6. Solicitare resurse suplimentare: formular unde studentul specifică tipul și cantitatea de resurse necesare, cu motiv. Flux:
   - Dacă cantitatea solicitată ≤ suplimentarul profesorului (10% din total curs): profesorul aprobă direct.
   - Dacă depășește suplimentarul profesorului: profesorul vede cererea și o înaintează administratorului. Administratorul aprobă/respinge.

---

## PAGINA ADMINISTRATOR (25 puncte)

### Funcționalități:

1. **Tipuri de resurse** (2 tipuri obligatorii):
   - Token-uri AI
   - Abonamente VPS

2. **Gestionare activități** (minim 10 activități predefinite, editabile):
   - Rezumat text — 10 token-uri
   - Generare imagine — 50 token-uri
   - Asistență dezvoltare software — 5000 token-uri
   - Traducere text — 15 token-uri
   - Analiză sentiment — 20 token-uri
   - Generare cod — 200 token-uri
   - Corecție gramaticală — 8 token-uri
   - Clasificare date — 30 token-uri
   - Extracție informații — 25 token-uri
   - Generare raport — 100 token-uri
   UI: tabel cu activitate + token-uri, butoane de adăugare/editare/ștergere.

3. **Distribuire credențiale VPS via email**: când un curs cu abonamente VPS are studenți înrolați, administratorul apasă "Trimite credențiale" și fiecare student primește pe email: IP VPS, username, parolă.

4. **Alocare token-uri**: câmp pentru numărul TOTAL de token-uri disponibile la nivel universitar. Sistem de distribuție per curs pe baza cerințelor introduse de profesori (nr. studenți × token-uri per student + 10% extra). Administrator confirmă distribuția.

5. **Alocare abonamente VPS**: câmp pentru numărul TOTAL de abonamente disponibile. Distribuție per curs similar cu token-urile. Administrator confirmă.

6. **Acordare supliment profesor (10%)**: profesorul poate solicita suplimentul de 10% din resurse. Administratorul îl aprobă și alocă automat în sistem.

7. **Flux de aprobare cereri suplimentare studenți**: când o cerere a unui student depășește suplimentarul profesorului, administratorul vede cererea în panoul său, cu detalii (student, curs, motiv, cantitate) și poate APROBA (resursele se alocă automat) sau RESPINGE (cu mesaj de feedback).

---

## PAGINA PROFESOR (10 puncte)

### Funcționalități:
1. **Creare curs**: formular cu câmpuri: titlu, descriere, număr maxim studenți, resurse necesare per student (nr. token-uri AI, nr. abonamente VPS, ambele sau niciuna).
2. **Lista cursuri**: vizualizarea tuturor cursurilor create de profesor, cu statusul lor (studenți înrolați / total locuri, resurse alocate sau nu).
3. **Încărcare materiale**: în pagina fiecărui curs, profesor poate uploada fișiere (PDF, PPT, DOCX, etc.) care devin vizibile studenților.
4. **Aprobarea resurselor suplimentare**: profesor vede lista cererilor de la studenții săi. Poate aproba (dacă suplimentarul său permite) sau înaintează la administrator.

---

## JURNALIZARE — AUDIT (5 puncte)

### Funcționalități:
1. Rolul "audit" are acces EXCLUSIV la pagina de jurnalizare (vizibilă DOAR pentru audit în meniu).
2. Implementare jurnal complet: FIECARE acțiune a oricărui utilizator se salvează în baza de date cu: timestamp, utilizator (email + rol), acțiunea efectuată, detalii relevante (ex: "Student X a consumat 50 tokens la cursul Y"), IP-ul clientului.
3. Pagina de audit afișează log-ul cu filtrare după: dată, rol utilizator, tip acțiune. Tabel paginat.

Acțiuni de jurnalizat (minimum): login, logout, înregistrare, resetare parolă, înrolare curs, consum token-uri, upload temă, upload material, creare curs, solicitare resurse suplimentare, aprobare/respingere cerere, distribuire credențiale VPS, modificare rol utilizator, alocare resurse.

---

## STATISTICI (15 puncte)

Pagina de statistici este accesibilă administratorului.

1. **Per student**: selectezi un student din dropdown → afișează:
   - Token-uri alocate total
   - Token-uri consumate per activitate (tabel: activitate, număr repetări, token-uri consumate)
   - Token-uri totale consumate
   - Abonamente alocate
   - Abonamente utilizate (validate prin httpbin)

2. **Per curs**: selectezi un curs → afișează:
   - Totalul token-urilor alocate cursului
   - Defalcarea consumului per activitate pentru toți studenții
   - Token-uri totale consumate
   - Abonamente alocate / utilizate

3. **La nivel de universitate**: vizualizare agregată:
   - Totalul token-urilor alocate universității
   - Totalul token-urilor consumate (cu grafic per activitate)
   - Totalul abonamentelor alocate / utilizate
   - Top cursuri după consum
   - Top studenți după consum

---

## CERINȚE TRANSVERSALE OBLIGATORII

- Toate formularele au validare atât client-side cât și server-side.
- Mesaje de eroare și succes clare pentru fiecare acțiune.
- Interfața este responsivă (mobile-friendly).
- Folosește variabile de mediu (.env) pentru: connection string DB, secret JWT, credențiale SMTP, etc.
- Structură de proiect curată cu separare clară frontend/backend.
- Furnizează un fișier README.md cu: instrucțiuni de instalare, variabile de mediu necesare, comanda de pornire, utilizator admin default (email + parolă).
- Furnizează un script SQL (sau seed) pentru popularea inițială cu: 1 admin, 2 profesori, 5 studenți, 1 auditor, 10 activități predefinite.

---

## LIVRABILE

1. Cod sursă complet, organizat în foldere logice.
2. README.md cu instrucțiuni clare.
3. Script de seed/migrare pentru baza de date.
4. Fișier .env.example cu toate variabilele necesare.

Implementează TOTUL. Nu sări nicio funcționalitate. Dacă ceva nu poate fi implementat complet, lasă un comentariu TODO cu explicație clară.