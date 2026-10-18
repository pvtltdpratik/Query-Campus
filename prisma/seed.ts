import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : { rejectUnauthorized: false },
  }),
});

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) throw new Error("Set SEED_PASSWORD (8+ chars) in .env before seeding");

const day = 24 * 60 * 60 * 1000;
function at(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date(Date.now() + daysFromNow * day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const passwordHash = hashPassword(password!);

  const cs = await db.department.upsert({
    where: { code: "CSE" },
    update: {},
    create: { code: "CSE", name: "Computer Science & Engineering" },
  });

  const user = (email: string, name: string, role: Role) =>
    db.user.upsert({ where: { email }, update: {}, create: { email, name, role, passwordHash } });

  await user("admin@college.test", "College Admin", "ADMIN");
  const fu1 = await user("anita.rao@college.test", "Dr. Anita Rao", "FACULTY");
  const fu2 = await user("vikram.shah@college.test", "Prof. Vikram Shah", "FACULTY");
  const fu3 = await user("meera.iyer@college.test", "Prof. Meera Iyer", "FACULTY");

  const mkFaculty = (userId: string, employeeId: string, designation: string, cabin: string) =>
    db.faculty.upsert({
      where: { userId },
      update: {},
      create: { userId, employeeId, departmentId: cs.id, designation, cabin },
    });
  const f1 = await mkFaculty(fu1.id, "F001", "Professor", "B-204");
  const f2 = await mkFaculty(fu2.id, "F002", "Associate Professor", "B-210");
  const f3 = await mkFaculty(fu3.id, "F003", "Assistant Professor", "B-118");

  const subjectData = [
    {
      code: "CS301",
      name: "Database Management Systems",
      aliases: ["dbms", "database", "databases"],
      facultyId: f1.id,
      syllabus:
        "Unit 1: ER model and relational algebra. Unit 2: SQL and PL/SQL. Unit 3: Normalization (1NF-BCNF). Unit 4: Transactions and concurrency control. Unit 5: Indexing, query processing and NoSQL basics.",
    },
    {
      code: "CS302",
      name: "Operating Systems",
      aliases: ["os"],
      facultyId: f2.id,
      syllabus:
        "Unit 1: Processes and threads. Unit 2: CPU scheduling. Unit 3: Synchronization and deadlocks. Unit 4: Memory management and virtual memory. Unit 5: File systems and I/O.",
    },
    {
      code: "CS303",
      name: "Computer Networks",
      aliases: ["cn", "networks", "networking"],
      facultyId: f3.id,
      syllabus:
        "Unit 1: OSI and TCP/IP models. Unit 2: Data link layer. Unit 3: Network layer and routing. Unit 4: Transport layer (TCP/UDP). Unit 5: Application protocols and network security.",
    },
    {
      code: "CS304",
      name: "Design and Analysis of Algorithms",
      aliases: ["daa", "algorithms", "algo"],
      facultyId: f1.id,
      syllabus:
        "Unit 1: Asymptotic analysis. Unit 2: Divide and conquer. Unit 3: Greedy and dynamic programming. Unit 4: Graph algorithms. Unit 5: NP-completeness.",
    },
    {
      code: "CS305",
      name: "Software Engineering",
      aliases: ["se", "software"],
      facultyId: f3.id,
      syllabus:
        "Unit 1: SDLC models. Unit 2: Requirements engineering. Unit 3: Design patterns and UML. Unit 4: Testing strategies. Unit 5: Project management and DevOps.",
    },
  ];
  const subjects = [];
  for (const s of subjectData) {
    subjects.push(
      await db.subject.upsert({
        where: { code: s.code },
        update: {},
        create: { ...s, departmentId: cs.id, semester: 5, credits: 4 },
      }),
    );
  }

  const students: [string, string, string][] = [
    ["aarav.patil@college.test", "Aarav Patil", "CSE5001"],
    ["diya.menon@college.test", "Diya Menon", "CSE5002"],
    ["rohan.desai@college.test", "Rohan Desai", "CSE5003"],
  ];
  const studentRows = [];
  for (const [email, name, rollNo] of students) {
    const u = await user(email, name, "STUDENT");
    studentRows.push(
      await db.student.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id, rollNo, departmentId: cs.id, semester: 5, section: "A" },
      }),
    );
  }

  if ((await db.exam.count()) === 0) {
    await db.exam.createMany({
      data: subjects.map((s, i) => ({
        subjectId: s.id,
        type: "FINAL" as const,
        startsAt: at(5 + i * 2, 10),
        durationMins: 180,
        room: `Hall ${i + 1}`,
      })),
    });
  }

  if ((await db.timetableEntry.count()) === 0) {
    const slots = [
      ["09:00", "10:00"],
      ["10:15", "11:15"],
      ["11:30", "12:30"],
    ];
    const rows = [];
    for (let d = 1; d <= 6; d++) {
      for (let k = 0; k < slots.length; k++) {
        const s = subjects[(d + k) % subjects.length];
        rows.push({
          subjectId: s.id,
          dayOfWeek: d,
          startTime: slots[k][0],
          endTime: slots[k][1],
          room: `Room ${300 + ((d + k) % 5)}`,
          section: "A",
        });
      }
    }
    await db.timetableEntry.createMany({ data: rows });
  }

  if ((await db.attendance.count()) === 0) {
    const rows = [];
    for (const st of studentRows) {
      for (const sub of subjects) {
        for (let i = 1; i <= 20; i++) {
          const date = new Date(Date.now() - i * day);
          date.setUTCHours(0, 0, 0, 0);
          // Each student/subject pair gets a different attendance rate (60-90%) so the charts have variety.
          const presentOutOf10 = 6 + ((st.rollNo.charCodeAt(6) + sub.code.charCodeAt(4)) % 4);
          const r = (i * 7) % 10;
          rows.push({
            studentId: st.id,
            subjectId: sub.id,
            date,
            status: r < presentOutOf10 ? ("PRESENT" as const) : ("ABSENT" as const),
          });
        }
      }
    }
    await db.attendance.createMany({ data: rows, skipDuplicates: true });
  }

  if ((await db.notice.count()) === 0) {
    await db.notice.createMany({
      data: [
        {
          title: "End-semester examination timetable released",
          body: "The final examination schedule for Semester 5 is now available. Check the Exams page for dates, times and halls.",
        },
        {
          title: "Library hours extended",
          body: "The central library will remain open until 9 PM during the examination period.",
          expiresAt: at(30, 0),
        },
        {
          title: "Faculty meeting",
          body: "All faculty are requested to attend the department meeting on Friday at 3 PM.",
          audience: "FACULTY",
        },
      ],
    });
  }

  console.log("Seed complete. Demo logins use SEED_PASSWORD from .env:");
  console.log("  admin@college.test | anita.rao@college.test | aarav.patil@college.test");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
