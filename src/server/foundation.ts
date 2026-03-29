import "server-only";

import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";

import {
  DEMO_GUILD_TAG,
  MANAGED_DEMO_GUILD_FOCUS_LABELS,
  MANAGED_DEMO_GUILD_TAGS,
  type ManagedDemoGuildTag,
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionViewer, type SessionViewer } from "@/server/auth";

export type FoundationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type KnownError = {
  code?: string;
  message?: string;
};

const ACTIVE_DEMO_GUILD_COOKIE = "guild-exchange-active-guild";
const ACTIVE_PLAY_CONTEXT_COOKIE = "guild-exchange-active-context";

const demoGuildIdentitySelect = {
  id: true,
  name: true,
  tag: true,
  level: true,
  xp: true,
  gold: true,
  marketUnlockedAt: true,
  tradeUnlockedAt: true,
  marketSlotsBase: true,
  activeHeroSlots: true,
  user: {
    select: {
      displayName: true,
      email: true,
    },
  },
  _count: {
    select: {
      heroes: true,
      inventoryItems: true,
      marketClaims: true,
    },
  },
} satisfies Prisma.GuildSelect;

type DemoGuildIdentityRecord = Prisma.GuildGetPayload<{
  select: typeof demoGuildIdentitySelect;
}>;

export type DemoGuildIdentity = {
  id: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  gold: number;
  marketUnlockedAt: Date | null;
  tradeUnlockedAt: Date | null;
  marketSlotsBase: number;
  activeHeroSlots: number;
  user: {
    displayName: string;
    email: string;
  };
  counts: {
    heroes: number;
    inventoryItems: number;
    marketClaims: number;
  };
};

export type DemoShellContext = {
  ready: boolean;
  error: string | null;
  activeGuildTag: string | null;
  managedGuilds: Array<{
    id: string;
    name: string;
    tag: string;
    level: number;
    gold: number;
    heroCount: number;
    inventoryCount: number;
    claimBoxCount: number;
    marketUnlocked: boolean;
    tradeUnlocked: boolean;
    focusLabel: string;
    isDefault: boolean;
  }>;
};

export type AppShellContext = {
  mode: "authenticated" | "demo";
  viewer: {
    id: string;
    displayName: string;
    email: string;
    guildName: string | null;
    guildTag: string | null;
  } | null;
  demoContext: DemoShellContext;
};

function mapDemoGuildIdentity(guild: DemoGuildIdentityRecord): DemoGuildIdentity {
  return {
    ...guild,
    counts: guild._count,
  };
}

function mapViewer(viewer: SessionViewer | null) {
  if (!viewer) {
    return null;
  }

  return {
    id: viewer.id,
    displayName: viewer.displayName,
    email: viewer.email,
    guildName: viewer.guild?.name ?? null,
    guildTag: viewer.guild?.tag ?? null,
  };
}

function isManagedDemoGuildTag(value: string | null | undefined): value is ManagedDemoGuildTag {
  return Boolean(value) && MANAGED_DEMO_GUILD_TAGS.includes(value as ManagedDemoGuildTag);
}

async function loadManagedDemoGuildIdentities() {
  const guilds = await prisma.guild.findMany({
    where: {
      tag: {
        in: [...MANAGED_DEMO_GUILD_TAGS],
      },
    },
    select: demoGuildIdentitySelect,
  });

  const guildsByTag = new Map(guilds.map((guild) => [guild.tag, mapDemoGuildIdentity(guild)]));
  const orderedGuilds = MANAGED_DEMO_GUILD_TAGS.map((tag) => guildsByTag.get(tag)).filter(
    (guild): guild is DemoGuildIdentity => Boolean(guild),
  );

  if (orderedGuilds.length === 0) {
    throw new Error(
      "Демо-гильдии не найдены. Выполните `npm run db:setup`, чтобы инициализировать SQLite и seed.",
    );
  }

  return orderedGuilds;
}

async function readRequestedActiveDemoGuildTag() {
  const cookieStore = await cookies();
  const requestedTag = cookieStore.get(ACTIVE_DEMO_GUILD_COOKIE)?.value ?? null;

  return isManagedDemoGuildTag(requestedTag) ? requestedTag : DEMO_GUILD_TAG;
}

async function readRequestedActivePlayContext(hasAuthenticatedGuild: boolean) {
  const cookieStore = await cookies();
  const requestedContext = cookieStore.get(ACTIVE_PLAY_CONTEXT_COOKIE)?.value ?? null;

  if (requestedContext === "demo") {
    return "demo" as const;
  }

  if (requestedContext === "user" && hasAuthenticatedGuild) {
    return "user" as const;
  }

  return hasAuthenticatedGuild ? ("user" as const) : ("demo" as const);
}

function selectActiveGuild(guilds: DemoGuildIdentity[], requestedTag: ManagedDemoGuildTag) {
  return guilds.find((guild) => guild.tag === requestedTag)
    ?? guilds.find((guild) => guild.tag === DEMO_GUILD_TAG)
    ?? guilds[0]
    ?? null;
}

export async function getDemoGuildIdentity(guildTag: ManagedDemoGuildTag = DEMO_GUILD_TAG) {
  const guilds = await loadManagedDemoGuildIdentities();
  const guild = guilds.find((entry) => entry.tag === guildTag);

  if (!guild) {
    throw new Error(
      "Демо-гильдия не найдена. Выполните `npm run db:setup`, чтобы инициализировать SQLite и seed.",
    );
  }

  return guild;
}

export async function getManagedDemoGuildIdentities() {
  return loadManagedDemoGuildIdentities();
}

export async function getActiveDemoGuildIdentity() {
  const guilds = await loadManagedDemoGuildIdentities();
  const requestedTag = await readRequestedActiveDemoGuildTag();
  const activeGuild = selectActiveGuild(guilds, requestedTag);

  if (!activeGuild) {
    throw new Error(
      "Активная demo-гильдия недоступна. Выполните `npm run db:setup`, чтобы инициализировать SQLite и seed.",
    );
  }

  return activeGuild;
}

export async function setActivePlayContext(mode: "user" | "demo") {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PLAY_CONTEXT_COOKIE, mode, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function loadAuthenticatedGuildIdentityForViewer(viewer: SessionViewer) {
  if (!viewer.guild) {
    return null;
  }

  const guild = await prisma.guild.findUnique({
    where: {
      id: viewer.guild.id,
    },
    select: demoGuildIdentitySelect,
  });

  return guild ? mapDemoGuildIdentity(guild) : null;
}

export async function getActiveGuildIdentity() {
  const viewer = await getCurrentSessionViewer();
  const requestedContext = await readRequestedActivePlayContext(Boolean(viewer?.guild));

  if (viewer?.guild && requestedContext === "user") {
    const authenticatedGuild = await loadAuthenticatedGuildIdentityForViewer(viewer);

    if (authenticatedGuild) {
      return authenticatedGuild;
    }
  }

  return getActiveDemoGuildIdentity();
}

export async function setActiveDemoGuildTag(guildTag: string) {
  if (!isManagedDemoGuildTag(guildTag)) {
    throw new Error("Можно выбрать только управляемую demo-гильдию из switcher-а.");
  }

  const guilds = await loadManagedDemoGuildIdentities();
  const targetGuild = selectActiveGuild(guilds, guildTag);

  if (!targetGuild || targetGuild.tag !== guildTag) {
    throw new Error("Выбранная demo-гильдия не найдена в seed-окружении.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_DEMO_GUILD_COOKIE, targetGuild.tag, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return targetGuild;
}

export async function getDemoShellContext(): Promise<DemoShellContext> {
  try {
    const guilds = await loadManagedDemoGuildIdentities();
    const requestedTag = await readRequestedActiveDemoGuildTag();
    const activeGuild = selectActiveGuild(guilds, requestedTag);

    return {
      ready: true,
      error: null,
      activeGuildTag: activeGuild?.tag ?? null,
      managedGuilds: guilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        tag: guild.tag,
        level: guild.level,
        gold: guild.gold,
        heroCount: guild.counts.heroes,
        inventoryCount: guild.counts.inventoryItems,
        claimBoxCount: guild.counts.marketClaims,
        marketUnlocked: Boolean(guild.marketUnlockedAt),
        tradeUnlocked: Boolean(guild.tradeUnlockedAt),
        focusLabel: MANAGED_DEMO_GUILD_FOCUS_LABELS[guild.tag as ManagedDemoGuildTag],
        isDefault: guild.tag === DEMO_GUILD_TAG,
      })),
    };
  } catch (error) {
    return {
      ready: false,
      error: describeFoundationError(error),
      activeGuildTag: null,
      managedGuilds: [],
    };
  }
}

export async function getAppShellContext(): Promise<AppShellContext> {
  const [viewer, demoContext] = await Promise.all([getCurrentSessionViewer(), getDemoShellContext()]);
  const requestedContext = await readRequestedActivePlayContext(Boolean(viewer?.guild));

  return {
    mode: viewer?.guild && requestedContext === "user" ? "authenticated" : "demo",
    viewer: mapViewer(viewer),
    demoContext,
  };
}

export function describeFoundationError(error: unknown) {
  const knownError = error as KnownError;

  if (knownError?.code === "P2021" || knownError?.code === "P2022") {
    return "SQLite schema ещё не подготовлена. Выполните `npm run db:setup`.";
  }

  if (
    knownError?.message &&
    /no such table|does not exist|table .* not found/i.test(knownError.message)
  ) {
    return "SQLite база ещё не инициализирована. Выполните `npm run db:setup`.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Игровые данные временно недоступны. Выполните `npm run db:setup` и перезапустите сервер.";
}
