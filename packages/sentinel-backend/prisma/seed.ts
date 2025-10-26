import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@sentinel.com";
  const password = "password";
  const name = "Demo User";

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const validator = await prisma.validator.create({
      data: {
        id: "demo-validator-123",
        name: "Demo Validator",
        beaconNodeUrl: "http://localhost:5052",
        userId: user.id,
        apiKey: "demo_validator_key_123",
      },
    });

    await prisma.agent.create({
      data: {
        id: "demo-agent-123",
        apiKey: "demo_agent_key_123",
        name: "Demo Agent",
        validatorId: validator.id,
        isActive: true,
      },
    });

    console.log(
      "✅ Seeded demo user with email demo@sentinel.com and password 'password'"
    );
  } else {
    console.log("ℹ️ Demo user already exists, skipping seeding.");
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
