import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { UserStatus } from "@prisma/client";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const AUTH_SESSION_COOKIE = "guild-exchange-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SCRYPT_KEY_LENGTH = 64;

export type SessionViewer = {
  id: string;
  email: string;
  displayName: string;
  guild: {
    id: string;
    name: string;
    tag: string;
  } | null;
};

function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}

export function normalizeCredentialsEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedPasswordHash: string) {
  const [algorithm, salt, expectedHash] = storedPasswordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  return expectedBuffer.length === actualHash.length && timingSafeEqual(expectedBuffer, actualHash);
}

export async function createUserSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastSeenAt: new Date(),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, sessionToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function deleteCurrentUserSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (sessionToken) {
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: hashSessionToken(sessionToken),
      },
    });
  }

  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export async function getCurrentSessionViewer(): Promise<SessionViewer | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken),
    },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          guild: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    guild: session.user.guild,
  };
}
