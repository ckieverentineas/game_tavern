import { UserStatus } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createUserSession,
  deleteCurrentUserSession,
  getCurrentSessionViewer,
  normalizeCredentialsEmail,
  verifyPassword,
} from "@/server/auth";
import { createStarterAccount } from "@/server/bootstrap";
import {
  getActiveGuildIdentity,
  getAppShellContext,
  setActiveDemoGuildTag,
  setActivePlayContext,
} from "@/server/foundation";
import { disconnectTestDatabase, resetTestDatabase } from "../helpers/test-db";
import { resetMockCookies } from "../mocks/next-headers";

describe("auth/bootstrap integration", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  beforeEach(() => {
    resetMockCookies();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  test("signup/login/bootstrap flow and demo fallback stay operational", async () => {
    const defaultDemoGuild = await getActiveGuildIdentity();
    expect(defaultDemoGuild.tag).toBe("DEMO");

    const emailInput = "  Alpha.Player@Example.com  ";
    const normalizedEmail = normalizeCredentialsEmail(emailInput);
    const password = "AlphaReady123";

    const account = await createStarterAccount({
      displayName: "Alpha Tester",
      guildName: "Alpha Wardens",
      email: emailInput,
      password,
    });

    expect(account.email).toBe(normalizedEmail);
    expect(account.guildTag).toHaveLength(4);

    const createdUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        status: true,
        passwordHash: true,
        guild: {
          select: {
            id: true,
            tag: true,
            name: true,
            publicTitleKey: true,
            crestKey: true,
            signatureColorKey: true,
            motto: true,
            publicBio: true,
          },
        },
      },
    });

    expect(createdUser?.status).toBe(UserStatus.ACTIVE);
    expect(createdUser?.guild?.tag).toBe(account.guildTag);
    expect(createdUser?.passwordHash).toBeTruthy();
    expect(createdUser?.guild?.publicTitleKey).toBeTruthy();
    expect(createdUser?.guild?.crestKey).toBeTruthy();
    expect(createdUser?.guild?.signatureColorKey).toBeTruthy();
    expect(createdUser?.guild?.motto.length ?? 0).toBeGreaterThan(0);
    expect(createdUser?.guild?.publicBio.length ?? 0).toBeGreaterThan(0);

    if (!createdUser?.passwordHash) {
      throw new Error("У созданного пользователя отсутствует passwordHash.");
    }

    expect(await verifyPassword(password, createdUser.passwordHash)).toBe(true);

    await createUserSession(createdUser.id);

    let viewer = await getCurrentSessionViewer();
    expect(viewer?.email).toBe(normalizedEmail);
    expect(viewer?.guild?.tag).toBe(account.guildTag);

    await setActivePlayContext("user");
    const authenticatedGuild = await getActiveGuildIdentity();
    expect(authenticatedGuild.tag).toBe(account.guildTag);
    expect(authenticatedGuild.identity.showcaseTitle).toContain(account.guildName);
    expect(authenticatedGuild.identity.motto.length).toBeGreaterThan(0);

    await setActiveDemoGuildTag("RIVL");
    await setActivePlayContext("demo");

    const sandboxGuild = await getActiveGuildIdentity();
    expect(sandboxGuild.tag).toBe("RIVL");

    await setActivePlayContext("user");
    const restoredUserGuild = await getActiveGuildIdentity();
    expect(restoredUserGuild.tag).toBe(account.guildTag);

    await deleteCurrentUserSession();
    expect(await getCurrentSessionViewer()).toBeNull();

    await setActivePlayContext("user");
    const fallbackGuild = await getActiveGuildIdentity();
    expect(fallbackGuild.tag).toBe("RIVL");

    const shellContext = await getAppShellContext();
    expect(shellContext.mode).toBe("demo");
    expect(shellContext.viewer).toBeNull();

    await createUserSession(createdUser.id);
    viewer = await getCurrentSessionViewer();
    expect(viewer?.id).toBe(createdUser.id);
    expect(viewer?.guild?.name).toBe(account.guildName);
  });
});
