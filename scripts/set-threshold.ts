import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.settings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      collegeName: "Kips College G-9",
      matchThreshold: 0.55,
      requireLiveness: true,
    },
    update: { matchThreshold: 0.55 },
  });
  console.log("threshold", s.matchThreshold);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
