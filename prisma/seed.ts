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
