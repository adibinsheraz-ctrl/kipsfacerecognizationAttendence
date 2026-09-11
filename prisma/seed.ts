import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const email = "kips@7777";
  const passwordHash = await hashPassword("kips@8888");

  // Clean up any old admin email entries
  await prisma.admin.deleteMany({
    where: { email: { not: email } },
  });

  await prisma.admin.upsert({
    where: { email },
    create: {
      email,
      name: "Kips Admin",
      passwordHash,
    },
    update: {
      passwordHash,
    },
  });
  console.log("Admin security credentials seeded.");

  await prisma.settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      collegeName: "Kips College G-9",
      matchThreshold: 0.55,
      requireLiveness: true,
    },
    update: {},
  });

  // Seed academic hierarchy: Department -> Course -> Class
  const departmentsData = [
    {
      name: "Computer Science",
      courses: [
        {
          name: "ICS",
          classes: ["RCSB1", "RCSB2", "RCSB3"],
        },
        {
          name: "BS-CS",
          classes: ["BSCS-1", "BSCS-2"],
        },
      ],
    },
    {
      name: "Science",
      courses: [
        {
          name: "FSc Pre-Medical",
          classes: ["FSC-M1", "FSC-M2"],
        },
        {
          name: "FSc Pre-Engineering",
          classes: ["FSC-E1", "FSC-E2"],
        },
      ],
    },
    {
      name: "Commerce",
      courses: [
        {
          name: "I.Com",
          classes: ["ICOM-1", "ICOM-2"],
        },
      ],
    },
  ];

  for (const deptData of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { name: deptData.name },
      create: { name: deptData.name },
      update: {},
    });

    for (const courseData of deptData.courses) {
      const course = await prisma.course.upsert({
        where: {
          departmentId_name: {
            departmentId: dept.id,
            name: courseData.name,
          },
        },
        create: {
          departmentId: dept.id,
          name: courseData.name,
        },
        update: {},
      });

      for (const className of courseData.classes) {
        const cls = await prisma.class.upsert({
          where: {
            courseId_name: {
              courseId: course.id,
              name: className,
            },
          },
          create: {
            courseId: course.id,
            name: className,
          },
          update: {},
        });

        // Link any existing person who had this className or department
        await prisma.person.updateMany({
          where: {
            className: cls.name,
            classId: null,
          },
          data: {
            classId: cls.id,
            department: dept.name,
          },
        });
      }
    }
  }

  console.log("Academic structure seeded (Department -> Course -> Class).");
  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
