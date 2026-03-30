import "server-only";

import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";

import {
  DEMO_GUILD_TAG,
  MANAGED_DEMO_GUILD_FOCUS_LABELS,
  MANAGED_DEMO_GUILD_TAGS,
  type ManagedDemoGuildTag,
} from "@/lib/domain";
import {
  buildGuildIdentitySnapshot,
  isGuildIdentityColorKey,
  isGuildIdentityCrestKey,
  isGuildIdentityTitleKey,
  resolveGuildIdentityState,
  type GuildIdentitySnapshot,
  type GuildIdentityState,
} from "@/lib/guild-identity";
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
const GUILD_WATCHLIST_COOKIE = "guild-exchange-watchlist";
const GUILD_WATCHLIST_EMPTY_SENTINEL = "__empty__";

export type WatchlistStorageMode = "account" | "demo";

export type PersistedWatchlistState = {
  storageMode: WatchlistStorageMode;
  guildTags: string[];
  configured: boolean;
};

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
  publicTitleKey: true,
  crestKey: true,
  signatureColorKey: true,
  motto: true,
  publicBio: true,
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
  identityState: GuildIdentityState;
  identity: GuildIdentitySnapshot;
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
    identity: GuildIdentitySnapshot;
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

function normalizeGuildTag(value: string) {
  return value.trim().toUpperCase();
}

function sanitizeWatchlistGuildTags(guildTags: string[]) {
  return [...new Set(
    guildTags
      .map((guildTag) => normalizeGuildTag(guildTag))
      .filter((guildTag) => /^[A-Z0-9-]{2,12}$/i.test(guildTag)),
  )];
}

function mapDemoGuildIdentity(guild: DemoGuildIdentityRecord): DemoGuildIdentity {
  const identityState = resolveGuildIdentityState({
    publicTitleKey: guild.publicTitleKey,
    crestKey: guild.crestKey,
    signatureColorKey: guild.signatureColorKey,
    motto: guild.motto,
    publicBio: guild.publicBio,
  });

  return {
    id: guild.id,
    name: guild.name,
    tag: guild.tag,
    level: guild.level,
    xp: guild.xp,
    gold: guild.gold,
    marketUnlockedAt: guild.marketUnlockedAt,
    tradeUnlockedAt: guild.tradeUnlockedAt,
    marketSlotsBase: guild.marketSlotsBase,
    activeHeroSlots: guild.activeHeroSlots,
    user: guild.user,
    counts: guild._count,
    identityState,
    identity: buildGuildIdentitySnapshot({
      guildName: guild.name,
      guildTag: guild.tag,
      state: identityState,
    }),
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

async function resolveWatchlistStorageContext() {
  const viewer = await getCurrentSessionViewer();
  const requestedContext = await readRequestedActivePlayContext(Boolean(viewer?.guild));

  if (viewer?.guild && requestedContext === "user") {
    return {
      storageMode: "account" as const,
      viewerId: viewer.id,
    };
  }

  return {
    storageMode: "demo" as const,
    viewerId: null,
  };
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

export async function saveGuildIdentityForCurrentContext(input: {
  publicTitleKey?: string | null;
  crestKey?: string | null;
  signatureColorKey?: string | null;
  motto?: string | null;
  publicBio?: string | null;
}) {
  const currentGuild = await getActiveGuildIdentity();

  if (input.publicTitleKey && !isGuildIdentityTitleKey(input.publicTitleKey)) {
    throw new Error("Укажите корректный public title для гильдии.");
  }

  if (input.crestKey && !isGuildIdentityCrestKey(input.crestKey)) {
    throw new Error("Укажите корректную crest theme для гильдии.");
  }

  if (input.signatureColorKey && !isGuildIdentityColorKey(input.signatureColorKey)) {
    throw new Error("Укажите корректный signature color для гильдии.");
  }

  const nextIdentityState = resolveGuildIdentityState({
    publicTitleKey: input.publicTitleKey ?? currentGuild.identityState.publicTitleKey,
    crestKey: input.crestKey ?? currentGuild.identityState.crestKey,
    signatureColorKey: input.signatureColorKey ?? currentGuild.identityState.signatureColorKey,
    motto: input.motto ?? currentGuild.identityState.motto,
    publicBio: input.publicBio ?? currentGuild.identityState.publicBio,
  });

  const updatedGuild = await prisma.guild.update({
    where: {
      id: currentGuild.id,
    },
    data: {
      publicTitleKey: nextIdentityState.publicTitleKey,
      crestKey: nextIdentityState.crestKey,
      signatureColorKey: nextIdentityState.signatureColorKey,
      motto: nextIdentityState.motto,
      publicBio: nextIdentityState.publicBio,
    },
    select: demoGuildIdentitySelect,
  });

  return mapDemoGuildIdentity(updatedGuild);
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

export async function loadPersistedWatchlistState(): Promise<PersistedWatchlistState> {
  const context = await resolveWatchlistStorageContext();

  if (context.storageMode === "account" && context.viewerId) {
    const entries = await prisma.guildWatchlistEntry.findMany({
      where: {
        userId: context.viewerId,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        guild: {
          select: {
            tag: true,
          },
        },
      },
    });

    return {
      storageMode: "account",
      guildTags: sanitizeWatchlistGuildTags(entries.map((entry) => entry.guild.tag)),
      configured: true,
    };
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GUILD_WATCHLIST_COOKIE)?.value;

  if (typeof cookieValue !== "string") {
    return {
      storageMode: "demo",
      guildTags: [],
      configured: false,
    };
  }

  if (cookieValue === GUILD_WATCHLIST_EMPTY_SENTINEL) {
    return {
      storageMode: "demo",
      guildTags: [],
      configured: true,
    };
  }

  return {
    storageMode: "demo",
    guildTags: sanitizeWatchlistGuildTags(cookieValue.split(",")),
    configured: true,
  };
}

export async function setPersistedWatchlistGuildTags(
  guildTags: string[],
): Promise<PersistedWatchlistState> {
  const context = await resolveWatchlistStorageContext();
  const sanitizedGuildTags = sanitizeWatchlistGuildTags(guildTags);

  if (context.storageMode === "account" && context.viewerId) {
    const guilds = sanitizedGuildTags.length > 0
      ? await prisma.guild.findMany({
        where: {
          tag: {
            in: sanitizedGuildTags,
          },
        },
        select: {
          id: true,
          tag: true,
        },
      })
      : [];
    const guildIdByTag = new Map(guilds.map((guild) => [guild.tag, guild.id]));
    const nextGuildTags = sanitizedGuildTags.filter((guildTag) => guildIdByTag.has(guildTag));
    const operations: Prisma.PrismaPromise<unknown>[] = [
      prisma.guildWatchlistEntry.deleteMany({
        where: {
          userId: context.viewerId,
        },
      }),
      ...nextGuildTags.map((guildTag) =>
        prisma.guildWatchlistEntry.create({
          data: {
            userId: context.viewerId,
            guildId: guildIdByTag.get(guildTag)!,
          },
        }),
      ),
    ];

    await prisma.$transaction(operations);

    return {
      storageMode: "account",
      guildTags: nextGuildTags,
      configured: true,
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(GUILD_WATCHLIST_COOKIE, sanitizedGuildTags.length > 0 ? sanitizedGuildTags.join(",") : GUILD_WATCHLIST_EMPTY_SENTINEL, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    storageMode: "demo",
    guildTags: sanitizedGuildTags,
    configured: true,
  };
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
        identity: guild.identity,
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
