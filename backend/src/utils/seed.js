import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../config/db.js';
import { hashPassword } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');
const materialsDir = path.resolve(uploadsDir, 'materials');
const assignmentsDir = path.resolve(uploadsDir, 'assignments');

// Ensure directories exist
function ensureDirectories() {
  [uploadsDir, materialsDir, assignmentsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Create placeholder files
function createPlaceholderFile(filepath, content = 'Mock PDF Content') {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, content, 'utf-8');
  }
}

const users = [
  { name: 'Admin User', email: 'admin1@univault.local', password: 'Admin123!', role: 'administrator' },
  { name: 'Profesor Popescu', email: 'prof1@univault.local', password: 'Profesor123!', role: 'profesor' },
  { name: 'Profesor Ionescu', email: 'prof2@univault.local', password: 'Profesor123!', role: 'profesor' },
  { name: 'Student One', email: 'student1@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Two', email: 'student2@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Three', email: 'student3@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Four', email: 'student4@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Student Five', email: 'student5@univault.local', password: 'Student123!', role: 'student' },
  { name: 'Audit User', email: 'audit1@univault.local', password: 'Audit123!', role: 'audit' }
];

const activities = [
  ['rezumat text', 10],
  ['generare imagine', 50],
  ['asistență dezvoltare aplicații software', 5000],
  ['Traducere text', 15],
  ['Analiza sentiment', 20],
  ['Generare cod', 200],
  ['Corectie gramaticala', 8],
  ['Clasificare date', 30],
  ['Extractie informatii', 25],
  ['Generare raport', 100]
];

async function run() {
  try {
    console.log('🌱 Starting database seed...\n');
    ensureDirectories();

    const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await query(schemaSql);
    console.log('✓ Schema applied\n');

    console.log('👤 Creating users...');
    const userMap = {};
    for (const u of users) {
      const hash = await hashPassword(u.password);
      const result = await query(
        `INSERT INTO users (name, email, password_hash, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4::user_role, TRUE, TRUE)
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, email_verified = TRUE
         RETURNING id`,
        [u.name, u.email, hash, u.role]
      );
      userMap[u.email] = result.rows[0].id;

      await query(
        `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
         VALUES ($1, $2, $3::user_role, 'user_registered', $4)`,
        [result.rows[0].id, u.email, u.role, `User registered: ${u.name}`]
      );
    }
    console.log(`✓ ${users.length} users created\n`);

    console.log('📋 Creating activities...');
    const activityMap = {};
    for (const [name, tokenCost] of activities) {
      const result = await query(
        `INSERT INTO activities (name, token_cost, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (name) DO UPDATE SET token_cost = EXCLUDED.token_cost, is_active = TRUE
         RETURNING id, name`,
        [name, tokenCost]
      );
      activityMap[name] = result.rows[0].id;
    }
    console.log(`✓ ${activities.length} activities created\n`);

    console.log('🎓 Creating courses...');
    const prof1Id = userMap['prof1@univault.local'];
    const prof2Id = userMap['prof2@univault.local'];
    const admin1Id = userMap['admin1@univault.local'];

    const courseConfigs = [
      {
        title: 'Inteligență Artificială Aplicată',
        description: 'Deep dive into AI applications and machine learning concepts',
        maxStudents: 20,
        tokensPerStudent: 5000,
        vpsPerStudent: 1,
        professorId: prof1Id,
        enrollments: ['student1@univault.local', 'student2@univault.local', 'student3@univault.local']
      },
      {
        title: 'Dezvoltare Software Modernă',
        description: 'Modern software development practices and architectures',
        maxStudents: 15,
        tokensPerStudent: 3000,
        vpsPerStudent: 0,
        professorId: prof1Id,
        enrollments: ['student1@univault.local', 'student4@univault.local', 'student5@univault.local']
      },
      {
        title: 'Securitate Cibernetică',
        description: 'Cybersecurity principles and practices',
        maxStudents: 10,
        tokensPerStudent: 2000,
        vpsPerStudent: 2,
        professorId: prof2Id,
        enrollments: ['student2@univault.local', 'student3@univault.local', 'student4@univault.local']
      }
    ];

    const courseMap = {};
    for (const courseConfig of courseConfigs) {
      const courseResult = await query(
        `INSERT INTO courses (title, description, max_students, professor_id, tokens_per_student, vps_per_student)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, professor_id`,
        [
          courseConfig.title,
          courseConfig.description,
          courseConfig.maxStudents,
          courseConfig.professorId,
          courseConfig.tokensPerStudent,
          courseConfig.vpsPerStudent
        ]
      );

      const courseId = courseResult.rows[0].id;
      courseMap[courseConfig.title] = courseResult.rows[0];

      await query(
        `INSERT INTO course_allocations (course_id, allocated_tokens, allocated_vps)
         VALUES ($1, 0, 0)`,
        [courseId]
      );

      await query(
        `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
         VALUES ($1, $2, $3::user_role, 'course_created', $4)`,
        [
          courseConfig.professorId,
          courseConfig.professorId === prof1Id ? 'prof1@univault.local' : 'prof2@univault.local',
          'profesor',
          `Course created: ${courseConfig.title}`
        ]
      );

      for (const studentEmail of courseConfig.enrollments) {
        const studentId = userMap[studentEmail];
        await query('INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
          courseId,
          studentId
        ]);

        await query(
          `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
           VALUES ($1, $2, $3::user_role, 'student_enrolled', $4)`,
          [studentId, studentEmail, 'student', `Enrolled in ${courseConfig.title}`]
        );

        await query(
          `INSERT INTO student_course_resources (course_id, student_id, allocated_tokens, allocated_vps)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (course_id, student_id) DO NOTHING`,
          [courseId, studentId, courseConfig.tokensPerStudent, courseConfig.vpsPerStudent]
        );
      }
    }
    console.log(`✓ ${courseConfigs.length} courses created with enrollments\n`);

    console.log('🏫 Setting up university resource pool...');
    await query(
      `UPDATE university_resources SET total_tokens = 60000, total_vps = 15, updated_at = NOW() WHERE id = 1`
    );
    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
       VALUES ($1, $2, $3::user_role, 'admin_resource_pool_set', $4)`,
      [admin1Id, 'admin1@univault.local', 'administrator', 'Set university resource pool: 60000 tokens, 15 VPS']
    );
    console.log('✓ University pool: 60000 tokens, 15 VPS\n');

    console.log('💼 Distributing course resources...');
    const distributions = [
      {
        courseTitle: 'Inteligență Artificială Aplicată',
        tokens: 16500,
        vps: 3,
        profTokens: 1650,
        profVps: 0
      },
      {
        courseTitle: 'Dezvoltare Software Modernă',
        tokens: 9900,
        vps: 0,
        profTokens: 990,
        profVps: 0
      },
      {
        courseTitle: 'Securitate Cibernetică',
        tokens: 6600,
        vps: 6,
        profTokens: 660,
        profVps: 0
      }
    ];

    for (const dist of distributions) {
      const course = courseMap[dist.courseTitle];
      await query(
        `UPDATE course_allocations
         SET allocated_tokens = $1, allocated_vps = $2, professor_extra_tokens = $3,
             professor_extra_vps = $4, distribution_confirmed = TRUE, updated_at = NOW()
         WHERE course_id = $5`,
        [dist.tokens, dist.vps, dist.profTokens, dist.profVps, course.id]
      );

      await query(
        `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
         VALUES ($1, $2, $3::user_role, 'admin_course_distribution', $4)`,
        [
          admin1Id,
          'admin1@univault.local',
          'administrator',
          `Distributed ${dist.tokens} tokens and ${dist.vps} VPS to ${dist.courseTitle}`
        ]
      );

      console.log(`  ✓ ${dist.courseTitle}: ${dist.tokens} tokens, ${dist.vps} VPS`);
    }
    console.log();

    console.log('📚 Seeding course materials...');
    const materials = [
      {
        courseTitle: 'Inteligență Artificială Aplicată',
        files: ['Curs 1 - Introducere in AI.pdf', 'Lab 1 - Prompt Engineering.pdf']
      },
      {
        courseTitle: 'Dezvoltare Software Modernă',
        files: ['Curs 1 - Clean Architecture.pdf']
      },
      {
        courseTitle: 'Securitate Cibernetică',
        files: ['Curs 1 - Criptografie Simetrica.pdf', 'Lab 1 - OpenSSL Basics.pdf']
      }
    ];

    for (const materialGroup of materials) {
      const course = courseMap[materialGroup.courseTitle];
      for (const fileName of materialGroup.files) {
        const filePath = `materials/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;
        const fullPath = path.resolve(uploadsDir, filePath);
        createPlaceholderFile(fullPath, `Mock material: ${fileName}`);

        await query(
          `INSERT INTO course_materials (course_id, professor_id, file_name, file_path, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, 'application/pdf', 1024)`,
          [course.id, course.professor_id, fileName, filePath]
        );

        await query(
          `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
           VALUES ($1, $2, $3::user_role, 'material_uploaded', $4)`,
          [
            course.professor_id,
            course.professor_id === prof1Id ? 'prof1@univault.local' : 'prof2@univault.local',
            'profesor',
            `Material uploaded: ${fileName}`
          ]
        );

        console.log(`  ✓ ${materialGroup.courseTitle}: ${fileName}`);
      }
    }
    console.log();

    console.log('📝 Seeding homework submissions...');
    for (const courseTitle of Object.keys(courseMap)) {
      const course = courseMap[courseTitle];
      const enrollments = await query('SELECT student_id FROM enrollments WHERE course_id = $1', [course.id]);

      for (const enrollment of enrollments.rows) {
        const studentEmail = Object.entries(userMap).find(([email, id]) => id === enrollment.student_id)?.[0];
        const studentName = studentEmail?.split('@')[0] || 'student';
        const fileName = `tema1_${studentName}.pdf`;

        const filePath = `assignments/${Date.now()}-${fileName}`;
        const fullPath = path.resolve(uploadsDir, filePath);
        createPlaceholderFile(fullPath, `Homework submission from ${studentName}`);

        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

        await query(
          `INSERT INTO assignments (course_id, student_id, file_name, file_path, mime_type, size_bytes, uploaded_at)
           VALUES ($1, $2, $3, $4, 'application/pdf', 1024, $5)`,
          [course.id, enrollment.student_id, fileName, filePath, twoDaysAgo]
        );

        await query(
          `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
           VALUES ($1, $2, $3::user_role, 'homework_uploaded', $4)`,
          [enrollment.student_id, studentEmail, 'student', `Homework submitted for ${courseTitle}`]
        );

        console.log(`  ✓ ${courseTitle}: ${studentName}`);
      }
    }
    console.log();

    console.log('🔌 Seeding token consumptions...');
    const consumptions = [
      {
        studentEmail: 'student1@univault.local',
        courseTitle: 'Inteligență Artificială Aplicată',
        items: [
          { activityName: 'generare imagine', repetitions: 5 },
          { activityName: 'asistență dezvoltare aplicații software', repetitions: 1 }
        ]
      },
      {
        studentEmail: 'student2@univault.local',
        courseTitle: 'Inteligență Artificială Aplicată',
        items: [
          { activityName: 'rezumat text', repetitions: 3 },
          { activityName: 'generare imagine', repetitions: 2 }
        ]
      },
      {
        studentEmail: 'student3@univault.local',
        courseTitle: 'Securitate Cibernetică',
        items: [{ activityName: 'rezumat text', repetitions: 10 }]
      },
      {
        studentEmail: 'student1@univault.local',
        courseTitle: 'Dezvoltare Software Modernă',
        items: [{ activityName: 'generare imagine', repetitions: 4 }]
      }
    ];

    for (const consumption of consumptions) {
      const studentId = userMap[consumption.studentEmail];
      const course = courseMap[consumption.courseTitle];

      for (const item of consumption.items) {
        const activityId = activityMap[item.activityName];
        const activity = activities.find((a) => a[0] === item.activityName);
        const tokensCost = activity[1] * item.repetitions;

        await query(
          `INSERT INTO token_consumptions (course_id, student_id, activity_id, repetitions, tokens_spent)
           VALUES ($1, $2, $3, $4, $5)`,
          [course.id, studentId, activityId, item.repetitions, tokensCost]
        );

        await query(
          `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
           VALUES ($1, $2, $3::user_role, 'token_consumed', $4)`,
          [studentId, consumption.studentEmail, 'student', `Consumed ${tokensCost} tokens for ${item.activityName}`]
        );

        console.log(`  ✓ ${consumption.studentEmail}: ${item.activityName} (×${item.repetitions})`);
      }
    }
    console.log();

    console.log('📬 Seeding resource requests...');
    const student1Id = userMap['student1@univault.local'];
    const student2Id = userMap['student2@univault.local'];
    const student3Id = userMap['student3@univault.local'];
    const course1 = courseMap['Inteligență Artificială Aplicată'];
    const course3 = courseMap['Securitate Cibernetică'];

    await query(
      `INSERT INTO resource_requests (student_id, professor_id, course_id, resource_type, quantity, reason, status)
       VALUES ($1, $2, $3, 'tokens'::resource_type, 2000, $4, 'pending_professor')`,
      [student1Id, prof1Id, course1.id, 'Need more tokens for additional AI experiments']
    );

    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
       VALUES ($1, $2, $3::user_role, 'resource_request_created', $4)`,
      [student1Id, 'student1@univault.local', 'student', 'Requested 2000 extra tokens']
    );
    console.log('  ✓ Request A: student1 -> 2000 tokens (pending_professor)');

    await query(
      `INSERT INTO resource_requests (student_id, professor_id, course_id, resource_type, quantity, reason, status)
       VALUES ($1, $2, $3, 'tokens'::resource_type, 8000, $4, 'pending_admin')`,
      [student2Id, prof1Id, course1.id, 'Significant additional computational needs']
    );

    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
       VALUES ($1, $2, $3::user_role, 'resource_request_created', $4)`,
      [student2Id, 'student2@univault.local', 'student', 'Requested 8000 extra tokens']
    );
    console.log('  ✓ Request B: student2 -> 8000 tokens (pending_admin)');

    await query(
      `INSERT INTO resource_requests (student_id, professor_id, course_id, resource_type, quantity, reason, status)
       VALUES ($1, $2, $3, 'tokens'::resource_type, 500, $4, 'approved')`,
      [student3Id, prof2Id, course3.id, 'Additional cryptography resources']
    );

    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
       VALUES ($1, $2, $3::user_role, 'resource_request_created', $4)`,
      [student3Id, 'student3@univault.local', 'student', 'Requested 500 extra tokens']
    );

    await query(
      `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details)
       VALUES ($1, $2, $3::user_role, 'resource_request_approved', $4)`,
      [prof2Id, 'prof2@univault.local', 'profesor', 'Approved 500 extra tokens for student3']
    );
    console.log('  ✓ Request C: student3 -> 500 tokens (approved)');
    console.log();

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  • ${users.length} users created`);
    console.log(`  • ${courseConfigs.length} courses with enrollments`);
    console.log(`  • 10 course materials uploaded`);
    console.log(`  • 9 homework submissions created`);
    console.log(`  • Token consumptions seeded`);
    console.log(`  • 3 resource requests created`);
    console.log(`  • Comprehensive audit logs recorded\n`);

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
