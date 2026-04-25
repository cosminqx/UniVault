import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../config/db.js';
import { hashPassword } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const users = [
  { name: 'Admin User', email: 'admin@univault.local', password: 'Admin123!', role: 'administrator' },
  { name: 'Profesor One', email: 'prof1@univault.local', password: 'Profesor123!', role: 'profesor' },
  { name: 'Profesor Two', email: 'prof2@univault.local', password: 'Profesor123!', role: 'profesor' },
  { name: 'Student One', email: 'student1@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Two', email: 'student2@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Three', email: 'student3@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Four', email: 'student4@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Five', email: 'student5@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Audit User', email: 'audit@univault.local', password: 'Audit123!', role: 'audit' }
];

const activities = [
  ['Rezumat text', 10],
  ['Generare imagine', 50],
  ['Asistenta dezvoltare software', 5000],
  ['Traducere text', 15],
  ['Analiza sentiment', 20],
  ['Generare cod', 200],
  ['Corectie gramaticala', 8],
  ['Clasificare date', 30],
  ['Extractie informatii', 25],
  ['Generare raport', 100]
];

async function run() {
  const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await query(schemaSql);

  for (const u of users) {
    const hash = await hashPassword(u.password);
    await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4::user_role)
       ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [u.name, u.email, hash, u.role]
    );
  }

  for (const [name, tokenCost] of activities) {
    await query(
      `INSERT INTO activities (name, token_cost)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET token_cost = EXCLUDED.token_cost, is_active = TRUE`,
      [name, tokenCost]
    );
  }

  console.log('Seed complete.');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
