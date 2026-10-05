const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const prisma = new PrismaClient();

  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log("Bootstrap skipped: user records already exist.");
      return;
    }

    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@yourorg.com").toLowerCase();
    const displayName = process.env.BOOTSTRAP_ADMIN_NAME || "System Administrator";
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "AdminPassword123!";

    const passwordHash = await argon2.hash(password);
    const admin = await prisma.user.create({
      data: {
        email,
        displayName,
        role: "ADMIN",
        passwordHash,
        isActive: true,
      },
    });

    console.log(`Bootstrap admin created: ${admin.email}`);
    console.log(`Default password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
