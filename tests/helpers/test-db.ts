import { execSync } from "node:child_process";

import { prisma } from "@/lib/prisma";

const TEST_DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/test.db";

function run(command: string) {
  execSync(command, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}

export async function resetTestDatabase() {
  await prisma.$disconnect();
  run("npm run db:push -- --skip-generate");
  run("npm run db:seed");
  await prisma.$disconnect();
}

export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

