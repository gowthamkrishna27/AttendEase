import { prisma } from './prisma.js';

interface FacultyUpdate {
  name: string;
  department: 'CSD' | 'CSIT';
  designation: 'Class Mentor' | 'Counselor' | 'Subject Faculty';
  emailFallback?: string;
  avatarUrlFallback?: string;
}

const FACULTY_LIST: FacultyUpdate[] = [
  // 1. A. Aswini Priyanka — CSD · Class Mentor
  { name: 'A. Aswini Priyanka', department: 'CSD', designation: 'Class Mentor', emailFallback: 'aapriyanka@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1339.jpg' },
  // 2. Angara Satyam — CSD · Counselor
  { name: 'Angara Satyam', department: 'CSD', designation: 'Counselor', emailFallback: 'asatyam@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1472.jpg' },
  // 3. Anusuri Krishna Veni — CSIT · Subject Faculty
  { name: 'Anusuri Krishna Veni', department: 'CSIT', designation: 'Subject Faculty', emailFallback: 'akveni@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1478.jpg' },
  // 4. D Parvathi — CSIT · Class Mentor
  { name: 'D Parvathi', department: 'CSIT', designation: 'Class Mentor', emailFallback: 'parvathiram21@gmail.com', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1503.jpeg' },
  // 5. Dr. Godi Sudhakar — CSIT · Counselor
  { name: 'Dr. Godi Sudhakar', department: 'CSIT', designation: 'Counselor', emailFallback: 'sudhakar.godi@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=Godi+Sudhakar&background=EA580C&color=fff' },
  // 6. Dr. K. Srinivasa Rao — CSD · Subject Faculty
  { name: 'Dr. K. Srinivasa Rao', department: 'CSD', designation: 'Subject Faculty', emailFallback: 'ksrinivasarao@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1474.jpg' },
  // 7. Dr.Giridhar Koppisetti — CSIT · Class Mentor
  { name: 'Dr.Giridhar Koppisetti', department: 'CSIT', designation: 'Class Mentor', emailFallback: 'giridhar.koppisetti@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=Giridhar+Koppisetti&background=EA580C&color=fff' },
  // 8. K Sri Vigyna — CSIT · Counselor
  { name: 'K Sri Vigyna', department: 'CSIT', designation: 'Counselor', emailFallback: 'vignyak@gmail.com', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1509.jpeg' },
  // 9. K V Sunil Varma — CSIT · Subject Faculty
  { name: 'K V Sunil Varma', department: 'CSIT', designation: 'Subject Faculty', emailFallback: 'kvsunilvarma@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1372.jpg' },
  // 10. K V V Satya Trinadh Naidu — CSIT · Class Mentor
  { name: 'K V V Satya Trinadh Naidu', department: 'CSIT', designation: 'Class Mentor', emailFallback: 'kvvstnaidu@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1480.jpg' },
  // 11. K. Bhanu Rajesh Naidu — CSD · Counselor
  { name: 'K. Bhanu Rajesh Naidu', department: 'CSD', designation: 'Counselor', emailFallback: 'kbrnaidu@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1479.jpg' },
  // 12. M Sai Madhurya — CSD · Subject Faculty
  { name: 'M Sai Madhurya', department: 'CSD', designation: 'Subject Faculty', emailFallback: 'madhuryamudundi@gmail.com', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1504.jpeg' },
  // 13. M. Suseela — CSD · Class Mentor
  { name: 'M. Suseela', department: 'CSD', designation: 'Class Mentor', emailFallback: 'msuseela@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=M+Suseela&background=EA580C&color=fff' },
  // 14. Mohan Surendra Jaladi — CSIT · Counselor
  { name: 'Mohan Surendra Jaladi', department: 'CSIT', designation: 'Counselor', emailFallback: 'mohansurendra@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=Mohan+Surendra&background=EA580C&color=fff' },
  // 15. N. Aneela — CSD · Subject Faculty
  { name: 'N. Aneela', department: 'CSD', designation: 'Subject Faculty', emailFallback: 'aneela@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1483.jpg' },
  // 16. N. Navya — CSIT · Class Mentor
  { name: 'N. Navya', department: 'CSIT', designation: 'Class Mentor', emailFallback: 'navyanallaparaju@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1259.jpg' },
  // 17. Neti Praveen — CSIT · Counselor
  { name: 'Neti Praveen', department: 'CSIT', designation: 'Counselor', emailFallback: 'npraveen@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1348.jpg' },
  // 18. P Manoj — CSIT · Subject Faculty
  { name: 'P Manoj', department: 'CSIT', designation: 'Subject Faculty', emailFallback: 'manoj.p@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1399.jpeg' },
  // 19. P Mouna — CSIT · Class Mentor
  { name: 'P Mouna', department: 'CSIT', designation: 'Class Mentor', emailFallback: 'mouna.p@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csit/1398.jpeg' },
  // 20. P S V Surya Kumar — CSD · Counselor
  { name: 'P S V Surya Kumar', department: 'CSD', designation: 'Counselor', emailFallback: 'psvsuryakumar@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1382.jpg' },
  // 21. Prudhvi Varma M — CSIT · Subject Faculty
  { name: 'Prudhvi Varma M', department: 'CSIT', designation: 'Subject Faculty', emailFallback: 'prudhvi.varma@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=Prudhvi+Varma&background=EA580C&color=fff' },
  // 22. Rohit — CSD · Class Mentor
  { name: 'Rohit', department: 'CSD', designation: 'Class Mentor', emailFallback: 'rohit@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=Rohit&background=EA580C&color=fff' },
  // 23. S. Mohan Krishna — CSD · Counselor
  { name: 'S. Mohan Krishna', department: 'CSD', designation: 'Counselor', emailFallback: 'mohanakrishna.seerla@srkrec.ac.in', avatarUrlFallback: 'https://www.srkrec.ac.in/assets/images/faculty/csd/1376.jpeg' },
  // 24. Srinu Manne — CSIT · Subject Faculty
  { name: 'Srinu Manne', department: 'CSIT', designation: 'Subject Faculty', emailFallback: 'srinu.manne@srkrec.ac.in', avatarUrlFallback: 'https://ui-avatars.com/api/?name=Srinu+Manne&background=EA580C&color=fff' },
];

function generateSlug(name: string, dept: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `fac-${dept.toLowerCase()}-${clean.slice(0, 10)}`;
}

async function run() {
  console.log('🔄 Starting faculty designation updates in Supabase PostgreSQL...');

  let updatedCount = 0;
  let createdCount = 0;

  for (const item of FACULTY_LIST) {
    const allFaculty = await prisma.user.findMany({
      where: {
        role: { in: ['faculty', 'hod'] },
      },
    });

    const match = allFaculty.find(f => {
      const dbName = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const searchName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const emailMatch = item.emailFallback && f.email.toLowerCase() === item.emailFallback.toLowerCase();
      return dbName === searchName || dbName.includes(searchName) || searchName.includes(dbName) || emailMatch;
    });

    if (match) {
      await prisma.user.update({
        where: { id: match.id },
        data: {
          designation: item.designation,
          department: item.department,
          name: item.name,
          ...(item.avatarUrlFallback && (!match.avatarUrl || match.avatarUrl.includes('ui-avatars')) ? { avatarUrl: item.avatarUrlFallback } : {}),
        },
      });
      console.log(`✅ Updated: "${item.name}" -> ${item.department} · ${item.designation}`);
      updatedCount++;
    } else {
      const email = item.emailFallback || `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@srkrec.ac.in`;
      const userId = generateSlug(item.name, item.department);
      await prisma.user.create({
        data: {
          userId,
          name: item.name,
          email,
          role: 'faculty',
          department: item.department,
          designation: item.designation,
          password: '1234',
          avatarUrl: item.avatarUrlFallback,
          isActive: true,
        },
      });
      console.log(`➕ Created: "${item.name}" (${userId}) -> ${item.department} · ${item.designation}`);
      createdCount++;
    }
  }

  console.log(`\n🎉 Completed: ${updatedCount} faculty updated, ${createdCount} faculty created.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
