(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.DATABASE_URL ??= "file:./prisma/test.db";
