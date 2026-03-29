import "server-only";

import {
  BuyOrderStatus,
  EconomyEventType,
  ExpeditionResultTier,
  ExpeditionStatus,
  MarketListingStatus,
  Prisma,
  ResourceType,
} from "@prisma/client";

import { getResourceLabel } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type Tone = "neutral" | "accent" | "success" | "warning";

export type WorldEventKey = "frontier-surge" | "trade-convoy" | "forge-drive";
export type WorldEventRewardTierKey = "bronze" | "silver" | "gold";
export type WorldEventRoute = "dashboard" | "expedition" | "market" | "guilds";

type WorldEventReward = {
  gold: number;
  guildXp: number;
  resource?: {
    resourceType: ResourceType;
    quantity: number;
  };
};

type WorldEventRewardTierDefinition = {
  key: WorldEventRewardTierKey;
  label: string;
  thresholdPoints: number;
  reward: WorldEventReward;
};

type WorldEventDefinition = {
  key: WorldEventKey;
  title: string;
  eyebrow: string;
  description: string;
  objectiveLabel: string;
  tone: Tone;
  relatedRoutes: WorldEventRoute[];
  primaryHref: string;
  primaryActionLabel: string;
  targetPoints: number;
  tiers: WorldEventRewardTierDefinition[];
};

type WorldEventGuildInfo = {
  id: string;
  name: string;
  tag: string;
};

type WorldEventContribution = {
  points: number;
  activityCount: number;
  detail: string;
  highlight: string;
  lastContributionAt: Date | null;
};

type ContributionMap = Record<WorldEventKey, Map<string, WorldEventContribution>>;
type ClaimMap = Map<string, Map<WorldEventKey, Map<WorldEventRewardTierKey, Date>>>;

export type WorldEventSeasonSnapshot = {
  key: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
  daysRemaining: number;
  hoursRemaining: number;
  progressLabel: string;
  summary: string;
};

export type WorldEventRewardTierSnapshot = {
  key: WorldEventRewardTierKey;
  label: string;
  thresholdPoints: number;
  rewardLabels: string[];
  status: "locked" | "claimable" | "claimed";
  statusLabel: string;
  claimedAt: Date | null;
  remainingPoints: number;
};

export type WorldEventStandingEntry = {
  rank: number;
  guildId: string;
  guildName: string;
  guildTag: string;
  points: number;
  detail: string;
  profileHref: string;
  isCurrentContext: boolean;
  isFocusGuild: boolean;
};

export type WorldEventFocusGuildSnapshot = {
  guildId: string;
  guildName: string;
  guildTag: string;
  points: number;
  detail: string;
  highlight: string;
  rank: number;
  total: number;
  gapToLeader: number | null;
  gapToNext: number | null;
  nextThresholdLabel: string | null;
  claimableRewardCount: number;
  claimedRewardCount: number;
  isCurrentContext: boolean;
};

export type WorldEventRecentActivityEntry = {
  id: string;
  eventKey: WorldEventKey;
  eventTitle: string;
  guildId: string;
  guildName: string;
  guildTag: string;
  sourceLabel: string;
  title: string;
  summary: string;
  detail: string;
  href: string;
  at: Date;
  tone: Tone;
  isCurrentContext: boolean;
};

export type WorldEventSnapshot = {
  key: WorldEventKey;
  title: string;
  eyebrow: string;
  description: string;
  objectiveLabel: string;
  tone: Tone;
  primaryHref: string;
  primaryActionLabel: string;
  relatedRoutes: WorldEventRoute[];
  progressPoints: number;
  targetPoints: number;
  progressPercent: number;
  progressLabel: string;
  statusLabel: string;
  rewardPreview: string;
  focusGuild: WorldEventFocusGuildSnapshot | null;
  rewardTiers: WorldEventRewardTierSnapshot[];
  standings: WorldEventStandingEntry[];
  recentActivity: WorldEventRecentActivityEntry[];
};

export type WorldEventBoardSnapshot = {
  season: WorldEventSeasonSnapshot;
  currentGuildTag: string | null;
  focusGuildTag: string | null;
  summary: {
    eventCount: number;
    claimableRewardCount: number;
    nearGoalCount: number;
    recentActivityCount: number;
  };
  events: WorldEventSnapshot[];
  recentActivity: WorldEventRecentActivityEntry[];
};

type WorldEventLoaderOptions = {
  currentGuildTag?: string | null;
  focusGuildTag?: string | null;
};

type WorldEventClaimState = {
  season: WorldEventSeasonSnapshot;
  contributions: ContributionMap;
  claims: ClaimMap;
};

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

const WORLD_EVENT_SEASON_DURATION_MS = 1000 * 60 * 60 * 24 * 14;
const WORLD_EVENT_SEASON_ANCHOR = new Date("2026-01-05T00:00:00.000Z");
const WORLD_EVENT_ACTIVITY_LIMIT = 12;

const WORLD_EVENT_DEFINITIONS: readonly WorldEventDefinition[] = [
  {
    key: "frontier-surge",
    title: "Frontier Surge",
    eyebrow: "High-risk expedition board",
    description:
      "Сообщество давит на frontier: high-risk и elite clears двигают общий сезон, а claim награды экспедиции превращает вылазку в публичный вклад.",
    objectiveLabel: "Claim успешные high-risk и elite expedition rewards.",
    tone: "accent",
    relatedRoutes: ["dashboard", "expedition", "guilds"],
    primaryHref: "/expedition",
    primaryActionLabel: "Идти в экспедиции",
    targetPoints: 72,
    tiers: [
      {
        key: "bronze",
        label: "Bronze cache",
        thresholdPoints: 12,
        reward: { gold: 26, guildXp: 14, resource: { resourceType: ResourceType.ARCANE_DUST, quantity: 1 } },
      },
      {
        key: "silver",
        label: "Silver cache",
        thresholdPoints: 24,
        reward: { gold: 42, guildXp: 20, resource: { resourceType: ResourceType.ARCANE_DUST, quantity: 2 } },
      },
      {
        key: "gold",
        label: "Gold cache",
        thresholdPoints: 40,
        reward: { gold: 70, guildXp: 30, resource: { resourceType: ResourceType.ARCANE_DUST, quantity: 3 } },
      },
    ],
  },
  {
    key: "trade-convoy",
    title: "Trade Convoy",
    eyebrow: "Public market rush",
    description:
      "Мир следит за тем, кто реально двигает рынок: продажи на витрине и закрытие чужих buy orders складываются в общий convoy season.",
    objectiveLabel: "Sell on market and fulfill foreign buy orders.",
    tone: "success",
    relatedRoutes: ["dashboard", "market", "guilds"],
    primaryHref: "/market",
    primaryActionLabel: "Открыть рынок",
    targetPoints: 96,
    tiers: [
      {
        key: "bronze",
        label: "Bronze convoy",
        thresholdPoints: 14,
        reward: { gold: 24, guildXp: 8, resource: { resourceType: ResourceType.HERBS, quantity: 4 } },
      },
      {
        key: "silver",
        label: "Silver convoy",
        thresholdPoints: 28,
        reward: { gold: 38, guildXp: 14, resource: { resourceType: ResourceType.LEATHER, quantity: 4 } },
      },
      {
        key: "gold",
        label: "Gold convoy",
        thresholdPoints: 44,
        reward: { gold: 64, guildXp: 20, resource: { resourceType: ResourceType.ARCANE_DUST, quantity: 2 } },
      },
    ],
  },
  {
    key: "forge-drive",
    title: "Forge Drive",
    eyebrow: "Contracts + workshop season",
    description:
      "Guild objective board, workshop и structural upgrades теперь собираются в общую civic гонку: кто лучше превращает supply loops в долгий рост.",
    objectiveLabel: "Claim contracts, push workshop tiers and buy guild upgrades.",
    tone: "warning",
    relatedRoutes: ["dashboard", "guilds"],
    primaryHref: "/dashboard",
    primaryActionLabel: "Открыть dashboard",
    targetPoints: 68,
    tiers: [
      {
        key: "bronze",
        label: "Bronze allotment",
        thresholdPoints: 8,
        reward: { gold: 20, guildXp: 8, resource: { resourceType: ResourceType.IRON_ORE, quantity: 4 } },
      },
      {
        key: "silver",
        label: "Silver allotment",
        thresholdPoints: 18,
        reward: { gold: 34, guildXp: 16, resource: { resourceType: ResourceType.LEATHER, quantity: 4 } },
      },
      {
        key: "gold",
        label: "Gold allotment",
        thresholdPoints: 30,
        reward: { gold: 56, guildXp: 24, resource: { resourceType: ResourceType.ARCANE_DUST, quantity: 2 } },
      },
    ],
  },
] as const;

function buildGuildProfileHref(guildTag: string) {
  return `/guilds/${encodeURIComponent(guildTag)}`;
}

export function buildWorldEventRewardLabels(reward: WorldEventReward) {
  const labels = [] as string[];

  if (reward.gold > 0) {
    labels.push(`${reward.gold} зол.`);
  }

  if (reward.guildXp > 0) {
    labels.push(`${reward.guildXp} XP гильдии`);
  }

  if (reward.resource) {
    labels.push(`${reward.resource.quantity} ${getResourceLabel(reward.resource.resourceType)}`);
  }

  return labels;
}

function getWorldEventDefinition(key: WorldEventKey) {
  return WORLD_EVENT_DEFINITIONS.find((event) => event.key === key) ?? null;
}

export function isWorldEventKey(value: string): value is WorldEventKey {
  return WORLD_EVENT_DEFINITIONS.some((event) => event.key === value);
}

export function isWorldEventRewardTierKey(value: string): value is WorldEventRewardTierKey {
  return value === "bronze" || value === "silver" || value === "gold";
}

export function getCurrentWorldEventSeasonSnapshot(now = new Date()): WorldEventSeasonSnapshot {
  const elapsed = now.getTime() - WORLD_EVENT_SEASON_ANCHOR.getTime();
  const seasonIndex = elapsed >= 0 ? Math.floor(elapsed / WORLD_EVENT_SEASON_DURATION_MS) : 0;
  const startsAt = new Date(WORLD_EVENT_SEASON_ANCHOR.getTime() + seasonIndex * WORLD_EVENT_SEASON_DURATION_MS);
  const endsAt = new Date(startsAt.getTime() + WORLD_EVENT_SEASON_DURATION_MS);
  const remainingMs = Math.max(0, endsAt.getTime() - now.getTime());
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));

  return {
    key: `season-${seasonIndex + 1}`,
    label: `Season ${seasonIndex + 1}`,
    startsAt,
    endsAt,
    daysRemaining,
    hoursRemaining,
    progressLabel: `${daysRemaining} дн. / ${hoursRemaining} ч. до ротации`,
    summary: "Сезон derived из текущей экономики и PvE без live-ops backend: вклад считается по последним двум неделям.",
  };
}

export function buildWorldEventRewardReferenceId(
  seasonKey: string,
  eventKey: WorldEventKey,
  tierKey: WorldEventRewardTierKey,
) {
  return `world-event:${seasonKey}:${eventKey}:${tierKey}`;
}

function parseWorldEventRewardReference(referenceId: string) {
  const [prefix, seasonKey, eventKey, tierKey] = referenceId.split(":");

  if (
    prefix !== "world-event" ||
    !seasonKey ||
    !eventKey ||
    !tierKey ||
    !isWorldEventKey(eventKey) ||
    !isWorldEventRewardTierKey(tierKey)
  ) {
    return null;
  }

  return {
    seasonKey,
    eventKey,
    tierKey,
  };
}

function getRiskScore(code: string, requiredGuildLevel: number) {
  if (code.includes("elite")) {
    return 4;
  }

  if (code.includes("high-risk") || requiredGuildLevel >= 4) {
    return 3;
  }

  if (requiredGuildLevel >= 3) {
    return 2;
  }

  return 1;
}

function emptyContributionMap(): ContributionMap {
  return {
    "frontier-surge": new Map<string, WorldEventContribution>(),
    "trade-convoy": new Map<string, WorldEventContribution>(),
    "forge-drive": new Map<string, WorldEventContribution>(),
  };
}

function addRewardClaim(
  claims: ClaimMap,
  guildId: string,
  eventKey: WorldEventKey,
  tierKey: WorldEventRewardTierKey,
  claimedAt: Date,
) {
  const guildClaims = claims.get(guildId) ?? new Map<WorldEventKey, Map<WorldEventRewardTierKey, Date>>();
  const eventClaims = guildClaims.get(eventKey) ?? new Map<WorldEventRewardTierKey, Date>();
  eventClaims.set(tierKey, claimedAt);
  guildClaims.set(eventKey, eventClaims);
  claims.set(guildId, guildClaims);
}

function buildTradeContributions(
  soldListings: Array<{ sellerGuildId: string; totalPriceGold: number; soldAt: Date | null }>,
  fulfilledOrders: Array<{ fulfillerGuildId: string | null; totalPriceGold: number; fulfilledAt: Date | null }>,
) {
  const soldByGuild = new Map<string, { count: number; value: number; lastAt: Date | null }>();
  const fulfilledByGuild = new Map<string, { count: number; value: number; lastAt: Date | null }>();

  for (const listing of soldListings) {
    const current = soldByGuild.get(listing.sellerGuildId) ?? { count: 0, value: 0, lastAt: null as Date | null };
    current.count += 1;
    current.value += listing.totalPriceGold;

    if (listing.soldAt && (!current.lastAt || listing.soldAt.getTime() > current.lastAt.getTime())) {
      current.lastAt = listing.soldAt;
    }

    soldByGuild.set(listing.sellerGuildId, current);
  }

  for (const order of fulfilledOrders) {
    if (!order.fulfillerGuildId) {
      continue;
    }

    const current = fulfilledByGuild.get(order.fulfillerGuildId) ?? { count: 0, value: 0, lastAt: null as Date | null };
    current.count += 1;
    current.value += order.totalPriceGold;

    if (order.fulfilledAt && (!current.lastAt || order.fulfilledAt.getTime() > current.lastAt.getTime())) {
      current.lastAt = order.fulfilledAt;
    }

    fulfilledByGuild.set(order.fulfillerGuildId, current);
  }

  const contributions = new Map<string, WorldEventContribution>();
  const guildIds = new Set([...soldByGuild.keys(), ...fulfilledByGuild.keys()]);

  for (const guildId of guildIds) {
    const sales = soldByGuild.get(guildId) ?? { count: 0, value: 0, lastAt: null };
    const fulfilled = fulfilledByGuild.get(guildId) ?? { count: 0, value: 0, lastAt: null };
    const points = sales.count * 10 + Math.min(20, Math.floor(sales.value / 25) * 2) + fulfilled.count * 12;
    const lastContributionAt = [sales.lastAt, fulfilled.lastAt]
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

    contributions.set(guildId, {
      points,
      activityCount: sales.count + fulfilled.count,
      detail: `${sales.count} продаж · ${sales.value} зол. оборота · ${fulfilled.count} закрытых buy orders`,
      highlight:
        fulfilled.count > 0
          ? `Закрыто ${fulfilled.count} чужих buy orders и зафиксирован реальный social market presence.`
          : `Продаж на витрине: ${sales.count}. Следующая сделка двинет convoy board заметнее.`,
      lastContributionAt,
    });
  }

  return contributions;
}

function buildFrontierContributions(
  expeditions: Array<{
    guildId: string;
    resultTier: ExpeditionResultTier | null;
    claimedAt: Date | null;
    location: { code: string; requiredGuildLevel: number };
  }>,
) {
  const stats = new Map<string, { highRisk: number; elite: number; triumphs: number; lastAt: Date | null }>();

  for (const expedition of expeditions) {
    const wasSuccessful =
      expedition.resultTier === ExpeditionResultTier.SUCCESS || expedition.resultTier === ExpeditionResultTier.TRIUMPH;

    if (!wasSuccessful) {
      continue;
    }

    const riskScore = getRiskScore(expedition.location.code, expedition.location.requiredGuildLevel);

    if (riskScore < 3) {
      continue;
    }

    const current = stats.get(expedition.guildId) ?? { highRisk: 0, elite: 0, triumphs: 0, lastAt: null as Date | null };
    current.highRisk += 1;

    if (riskScore >= 4) {
      current.elite += 1;
    }

    if (expedition.resultTier === ExpeditionResultTier.TRIUMPH) {
      current.triumphs += 1;
    }

    if (expedition.claimedAt && (!current.lastAt || expedition.claimedAt.getTime() > current.lastAt.getTime())) {
      current.lastAt = expedition.claimedAt;
    }

    stats.set(expedition.guildId, current);
  }

  const contributions = new Map<string, WorldEventContribution>();

  for (const [guildId, entry] of stats.entries()) {
    const points = entry.highRisk * 12 + entry.elite * 6 + entry.triumphs * 5;
    contributions.set(guildId, {
      points,
      activityCount: entry.highRisk,
      detail: `${entry.highRisk} high-risk clears · ${entry.elite} elite clears · ${entry.triumphs} triumph`,
      highlight:
        entry.elite > 0
          ? `Elite clears уже делают гильдию заметной на frontier board.`
          : `High-risk экспедиции уже двигают world event, но до elite push нужен ещё один чистый заход.`,
      lastContributionAt: entry.lastAt,
    });
  }

  return contributions;
}

function normalizeWorkshopReference(referenceId: string) {
  return referenceId.endsWith(":catalyst") ? referenceId.slice(0, -9) : referenceId;
}

function buildForgeContributions(
  ledgerRows: Array<{ guildId: string; eventType: EconomyEventType; referenceId: string; createdAt: Date }>,
) {
  const stats = new Map<string, {
    contracts: number;
    workshopProjects: Set<string>;
    upgrades: Set<string>;
    lastAt: Date | null;
  }>();

  for (const row of ledgerRows) {
    if (
      row.eventType !== EconomyEventType.CONTRACT_REWARD &&
      row.eventType !== EconomyEventType.WORKSHOP_UPGRADE &&
      row.eventType !== EconomyEventType.GUILD_UPGRADE_PURCHASE
    ) {
      continue;
    }

    const current = stats.get(row.guildId) ?? {
      contracts: 0,
      workshopProjects: new Set<string>(),
      upgrades: new Set<string>(),
      lastAt: null as Date | null,
    };

    if (row.eventType === EconomyEventType.CONTRACT_REWARD) {
      current.contracts += 1;
    }

    if (row.eventType === EconomyEventType.WORKSHOP_UPGRADE) {
      current.workshopProjects.add(normalizeWorkshopReference(row.referenceId));
    }

    if (row.eventType === EconomyEventType.GUILD_UPGRADE_PURCHASE) {
      current.upgrades.add(row.referenceId);
    }

    if (!current.lastAt || row.createdAt.getTime() > current.lastAt.getTime()) {
      current.lastAt = row.createdAt;
    }

    stats.set(row.guildId, current);
  }

  const contributions = new Map<string, WorldEventContribution>();

  for (const [guildId, entry] of stats.entries()) {
    const workshopProjects = entry.workshopProjects.size;
    const upgrades = entry.upgrades.size;
    const points = entry.contracts * 8 + workshopProjects * 10 + upgrades * 12;
    contributions.set(guildId, {
      points,
      activityCount: entry.contracts + workshopProjects + upgrades,
      detail: `${entry.contracts} контрактов · ${workshopProjects} workshop-проектов · ${upgrades} structural upgrades`,
      highlight:
        workshopProjects > 0 || upgrades > 0
          ? `Гильдия уже конвертирует supply loops в долгий рост facilities и power.`
          : `Пока board держится на контрактах; workshop и guild upgrades дадут следующий рывок.`,
      lastContributionAt: entry.lastAt,
    });
  }

  return contributions;
}

function buildClaimsMap(rows: Array<{ guildId: string; referenceId: string; createdAt: Date }>, seasonKey: string) {
  const claims = new Map<string, Map<WorldEventKey, Map<WorldEventRewardTierKey, Date>>>();

  for (const row of rows) {
    const parsed = parseWorldEventRewardReference(row.referenceId);

    if (!parsed || parsed.seasonKey !== seasonKey) {
      continue;
    }

    addRewardClaim(claims, row.guildId, parsed.eventKey, parsed.tierKey, row.createdAt);
  }

  return claims;
}

function buildContributionMaps(input: {
  soldListings: Array<{ sellerGuildId: string; totalPriceGold: number; soldAt: Date | null }>;
  fulfilledOrders: Array<{ fulfillerGuildId: string | null; totalPriceGold: number; fulfilledAt: Date | null }>;
  expeditions: Array<{
    guildId: string;
    resultTier: ExpeditionResultTier | null;
    claimedAt: Date | null;
    location: { code: string; requiredGuildLevel: number };
  }>;
  ledgerRows: Array<{ guildId: string; eventType: EconomyEventType; referenceId: string; createdAt: Date }>;
}) {
  const contributions = emptyContributionMap();
  contributions["trade-convoy"] = buildTradeContributions(input.soldListings, input.fulfilledOrders);
  contributions["frontier-surge"] = buildFrontierContributions(input.expeditions);
  contributions["forge-drive"] = buildForgeContributions(input.ledgerRows);
  return contributions;
}

function getContribution(contributions: ContributionMap, eventKey: WorldEventKey, guildId: string): WorldEventContribution {
  return contributions[eventKey].get(guildId) ?? {
    points: 0,
    activityCount: 0,
    detail: "Вклад ещё не зафиксирован в текущем сезоне.",
    highlight: "Следующее релевантное действие сразу появится на board.",
    lastContributionAt: null,
  };
}

function getClaimsForGuildEvent(claims: ClaimMap, guildId: string, eventKey: WorldEventKey) {
  return claims.get(guildId)?.get(eventKey) ?? new Map<WorldEventRewardTierKey, Date>();
}

function buildRewardTierSnapshots(input: {
  definition: WorldEventDefinition;
  guildContributionPoints: number;
  guildClaims: Map<WorldEventRewardTierKey, Date>;
}) {
  return input.definition.tiers.map((tier) => {
    const claimedAt = input.guildClaims.get(tier.key) ?? null;
    const remainingPoints = Math.max(0, tier.thresholdPoints - input.guildContributionPoints);
    const status = claimedAt ? "claimed" : input.guildContributionPoints >= tier.thresholdPoints ? "claimable" : "locked";

    return {
      key: tier.key,
      label: tier.label,
      thresholdPoints: tier.thresholdPoints,
      rewardLabels: buildWorldEventRewardLabels(tier.reward),
      status,
      statusLabel:
        status === "claimed"
          ? "Забрано"
          : status === "claimable"
            ? "Можно забрать"
            : `Нужно ещё ${remainingPoints} очк.`,
      claimedAt,
      remainingPoints,
    } satisfies WorldEventRewardTierSnapshot;
  });
}

function buildStandings(input: {
  definition: WorldEventDefinition;
  guilds: WorldEventGuildInfo[];
  contributions: ContributionMap;
  currentGuildTag: string | null;
  focusGuildTag: string | null;
}) {
  const ranked = [...input.guilds].sort((left, right) => {
    const leftContribution = getContribution(input.contributions, input.definition.key, left.id);
    const rightContribution = getContribution(input.contributions, input.definition.key, right.id);

    return (
      rightContribution.points - leftContribution.points ||
      rightContribution.activityCount - leftContribution.activityCount ||
      left.tag.localeCompare(right.tag, "ru")
    );
  });

  return ranked.map((guild, index) => {
    const contribution = getContribution(input.contributions, input.definition.key, guild.id);

    return {
      rank: index + 1,
      guildId: guild.id,
      guildName: guild.name,
      guildTag: guild.tag,
      points: contribution.points,
      detail: contribution.detail,
      profileHref: buildGuildProfileHref(guild.tag),
      isCurrentContext: guild.tag === input.currentGuildTag,
      isFocusGuild: guild.tag === input.focusGuildTag,
    } satisfies WorldEventStandingEntry;
  });
}

function buildFocusGuildSnapshot(input: {
  definition: WorldEventDefinition;
  guild: WorldEventGuildInfo | null;
  standings: WorldEventStandingEntry[];
  contributions: ContributionMap;
  claims: ClaimMap;
  currentGuildTag: string | null;
}) {
  if (!input.guild) {
    return null;
  }

  const guild = input.guild;
  const contribution = getContribution(input.contributions, input.definition.key, guild.id);
  const standingsEntry = input.standings.find((entry) => entry.guildId === guild.id) ?? null;
  const nextEntry = standingsEntry ? input.standings[standingsEntry.rank - 2] ?? null : null;
  const leader = input.standings[0] ?? null;
  const rewardTiers = buildRewardTierSnapshots({
    definition: input.definition,
    guildContributionPoints: contribution.points,
    guildClaims: getClaimsForGuildEvent(input.claims, guild.id, input.definition.key),
  });
  const nextTier = rewardTiers.find((tier) => tier.status === "locked") ?? null;

  return {
    guildId: guild.id,
    guildName: guild.name,
    guildTag: guild.tag,
    points: contribution.points,
    detail: contribution.detail,
    highlight: contribution.highlight,
    rank: standingsEntry?.rank ?? input.standings.length,
    total: input.standings.length,
    gapToLeader: leader ? Math.max(0, leader.points - contribution.points) : null,
    gapToNext: nextEntry ? Math.max(0, nextEntry.points - contribution.points) : null,
    nextThresholdLabel: nextTier ? `${nextTier.label} через ${nextTier.remainingPoints} очк.` : null,
    claimableRewardCount: rewardTiers.filter((tier) => tier.status === "claimable").length,
    claimedRewardCount: rewardTiers.filter((tier) => tier.status === "claimed").length,
    isCurrentContext: guild.tag === input.currentGuildTag,
  } satisfies WorldEventFocusGuildSnapshot;
}

function buildTradeActivity(input: {
  soldListings: Array<{
    id: string;
    sellerGuildId: string;
    totalPriceGold: number;
    soldAt: Date | null;
    sellerGuild: { name: string; tag: string };
    buyerGuild: { name: string; tag: string } | null;
    resourceType: ResourceType | null;
    itemDefinition: { name: string } | null;
    quantity: number;
  }>;
  fulfilledOrders: Array<{
    id: string;
    fulfillerGuildId: string | null;
    totalPriceGold: number;
    fulfilledAt: Date | null;
    resourceType: ResourceType;
    quantity: number;
    fulfillerGuild: { name: string; tag: string } | null;
    buyerGuild: { name: string; tag: string };
  }>;
  currentGuildTag: string | null;
}) {
  const soldEntries = input.soldListings
    .filter((listing) => listing.soldAt)
    .map((listing) => ({
      id: `trade-sale-${listing.id}`,
      eventKey: "trade-convoy" as const,
      eventTitle: "Trade Convoy",
      guildId: listing.sellerGuildId,
      guildName: listing.sellerGuild.name,
      guildTag: listing.sellerGuild.tag,
      sourceLabel: "Market",
      title: `${listing.sellerGuild.tag} закрыла публичную продажу`,
      summary: listing.itemDefinition
        ? `${listing.itemDefinition.name} куплена гильдией ${listing.buyerGuild?.name ?? "другой гильдией"}.`
        : `${getResourceLabel(listing.resourceType)} ушёл со склада в публичную витрину.`,
      detail: `${listing.quantity} ед. · ${listing.totalPriceGold} зол. оборота`,
      href: "/market",
      at: listing.soldAt ?? new Date(0),
      tone: "success" as const,
      isCurrentContext: listing.sellerGuild.tag === input.currentGuildTag,
    }));

  const buyOrderEntries = input.fulfilledOrders
    .filter((order) => order.fulfilledAt && order.fulfillerGuild && order.fulfillerGuildId)
    .map((order) => ({
      id: `trade-fulfillment-${order.id}`,
      eventKey: "trade-convoy" as const,
      eventTitle: "Trade Convoy",
      guildId: order.fulfillerGuildId ?? "",
      guildName: order.fulfillerGuild?.name ?? "—",
      guildTag: order.fulfillerGuild?.tag ?? "—",
      sourceLabel: "Buy order",
      title: `${order.fulfillerGuild?.tag ?? "—"} закрыла чужой спрос`,
      summary: `${order.buyerGuild.name} [${order.buyerGuild.tag}] получила ${getResourceLabel(order.resourceType)}.`,
      detail: `${order.quantity} ед. · payout ${order.totalPriceGold} зол.`,
      href: "/market",
      at: order.fulfilledAt ?? new Date(0),
      tone: "accent" as const,
      isCurrentContext: order.fulfillerGuild?.tag === input.currentGuildTag,
    }));

  return [...soldEntries, ...buyOrderEntries];
}

function buildFrontierActivity(input: {
  expeditions: Array<{
    id: string;
    guildId: string;
    claimedAt: Date | null;
    resultTier: ExpeditionResultTier | null;
    rewardGold: number;
    rewardGuildXp: number;
    guild: { name: string; tag: string };
    location: { name: string; code: string; requiredGuildLevel: number };
  }>;
  currentGuildTag: string | null;
}) {
  return input.expeditions
    .filter((expedition) => expedition.claimedAt)
    .map((expedition) => {
      const riskScore = getRiskScore(expedition.location.code, expedition.location.requiredGuildLevel);

      if (riskScore < 3) {
        return null;
      }

      return {
        id: `frontier-${expedition.id}`,
        eventKey: "frontier-surge" as const,
        eventTitle: "Frontier Surge",
        guildId: expedition.guildId,
        guildName: expedition.guild.name,
        guildTag: expedition.guild.tag,
        sourceLabel: "Expedition",
        title: `${expedition.guild.tag} закрепила frontier clear`,
        summary: `${expedition.location.name} добавила новый social proof для high-risk board.`,
        detail: `${expedition.rewardGold} зол. · ${expedition.rewardGuildXp} XP · ${expedition.resultTier === ExpeditionResultTier.TRIUMPH ? "триумф" : "успех"}`,
        href: "/expedition",
        at: expedition.claimedAt ?? new Date(0),
        tone: expedition.resultTier === ExpeditionResultTier.TRIUMPH ? ("warning" as const) : ("accent" as const),
        isCurrentContext: expedition.guild.tag === input.currentGuildTag,
      } satisfies WorldEventRecentActivityEntry;
    })
    .filter(isDefined);
}

function buildForgeActivity(input: {
  ledgerRows: Array<{
    id: string;
    guildId: string;
    eventType: EconomyEventType;
    referenceId: string;
    createdAt: Date;
    guild: { name: string; tag: string };
  }>;
  currentGuildTag: string | null;
}) {
  return input.ledgerRows
    .map((row) => {
      if (row.eventType === EconomyEventType.CONTRACT_REWARD) {
        return {
          id: `forge-contract-${row.id}`,
          eventKey: "forge-drive" as const,
          eventTitle: "Forge Drive",
          guildId: row.guildId,
          guildName: row.guild.name,
          guildTag: row.guild.tag,
          sourceLabel: "Contracts",
          title: `${row.guild.tag} забрала civic contract`,
          summary: "Objective board превратился в сезонный вклад, а не только в локальную награду.",
          detail: row.referenceId,
          href: "/dashboard",
          at: row.createdAt,
          tone: "accent" as const,
          isCurrentContext: row.guild.tag === input.currentGuildTag,
        } satisfies WorldEventRecentActivityEntry;
      }

      if (row.eventType === EconomyEventType.WORKSHOP_UPGRADE) {
        if (row.referenceId.endsWith(":catalyst")) {
          return null;
        }

        return {
          id: `forge-workshop-${row.id}`,
          eventKey: "forge-drive" as const,
          eventTitle: "Forge Drive",
          guildId: row.guildId,
          guildName: row.guild.name,
          guildTag: row.guild.tag,
          sourceLabel: "Workshop",
          title: `${row.guild.tag} усилила предмет в workshop`,
          summary: "Поставка ресурсов и вложение в power теперь видны на public civic board.",
          detail: normalizeWorkshopReference(row.referenceId),
          href: "/inventory",
          at: row.createdAt,
          tone: "warning" as const,
          isCurrentContext: row.guild.tag === input.currentGuildTag,
        } satisfies WorldEventRecentActivityEntry;
      }

      if (row.eventType === EconomyEventType.GUILD_UPGRADE_PURCHASE) {
        return {
          id: `forge-upgrade-${row.id}`,
          eventKey: "forge-drive" as const,
          eventTitle: "Forge Drive",
          guildId: row.guildId,
          guildName: row.guild.name,
          guildTag: row.guild.tag,
          sourceLabel: "Guild upgrade",
          title: `${row.guild.tag} купила structural upgrade`,
          summary: "Сезонная civic гонка видит не только золото, но и долгие investment loops.",
          detail: row.referenceId,
          href: "/dashboard",
          at: row.createdAt,
          tone: "success" as const,
          isCurrentContext: row.guild.tag === input.currentGuildTag,
        } satisfies WorldEventRecentActivityEntry;
      }

      if (row.eventType === EconomyEventType.WORLD_EVENT_REWARD) {
        const parsed = parseWorldEventRewardReference(row.referenceId);
        const definition = parsed ? getWorldEventDefinition(parsed.eventKey) : null;

        if (!parsed || !definition) {
          return null;
        }

        return {
          id: `forge-claim-${row.id}`,
          eventKey: parsed.eventKey,
          eventTitle: definition.title,
          guildId: row.guildId,
          guildName: row.guild.name,
          guildTag: row.guild.tag,
          sourceLabel: "Seasonal board",
          title: `${row.guild.tag} забрала ${parsed.tierKey} reward`,
          summary: `${definition.title} уже приносит не только статус, но и реальные ресурсы гильдии.`,
          detail: parsed.tierKey,
          href: definition.primaryHref,
          at: row.createdAt,
          tone: "success" as const,
          isCurrentContext: row.guild.tag === input.currentGuildTag,
        } satisfies WorldEventRecentActivityEntry;
      }

      return null;
    })
    .filter(isDefined);
}

async function queryWorldEventBoardRuntime(client: typeof prisma, season: WorldEventSeasonSnapshot) {
  return Promise.all([
    client.guild.findMany({
      orderBy: { tag: "asc" },
      select: {
        id: true,
        name: true,
        tag: true,
      },
    }),
    client.marketListing.findMany({
      where: {
        status: MarketListingStatus.SOLD,
        soldAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        id: true,
        sellerGuildId: true,
        totalPriceGold: true,
        soldAt: true,
        resourceType: true,
        quantity: true,
        sellerGuild: { select: { name: true, tag: true } },
        buyerGuild: { select: { name: true, tag: true } },
        itemDefinition: { select: { name: true } },
      },
    }),
    client.buyOrder.findMany({
      where: {
        status: BuyOrderStatus.FULFILLED,
        fulfilledAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        id: true,
        fulfillerGuildId: true,
        totalPriceGold: true,
        fulfilledAt: true,
        resourceType: true,
        quantity: true,
        fulfillerGuild: { select: { name: true, tag: true } },
        buyerGuild: { select: { name: true, tag: true } },
      },
    }),
    client.expedition.findMany({
      where: {
        status: ExpeditionStatus.CLAIMED,
        claimedAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        id: true,
        guildId: true,
        resultTier: true,
        claimedAt: true,
        rewardGold: true,
        rewardGuildXp: true,
        guild: { select: { name: true, tag: true } },
        location: {
          select: {
            name: true,
            code: true,
            requiredGuildLevel: true,
          },
        },
      },
    }),
    client.economyLedgerEntry.findMany({
      where: {
        eventType: {
          in: [
            EconomyEventType.CONTRACT_REWARD,
            EconomyEventType.WORKSHOP_UPGRADE,
            EconomyEventType.GUILD_UPGRADE_PURCHASE,
            EconomyEventType.WORLD_EVENT_REWARD,
          ],
        },
        createdAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        id: true,
        guildId: true,
        eventType: true,
        referenceId: true,
        createdAt: true,
        guild: { select: { name: true, tag: true } },
      },
    }),
  ]);
}

export async function loadWorldEventBoardSnapshot(
  options: WorldEventLoaderOptions = {},
): Promise<WorldEventBoardSnapshot> {
  const season = getCurrentWorldEventSeasonSnapshot();
  const [guilds, soldListings, fulfilledOrders, expeditions, ledgerRows] = await queryWorldEventBoardRuntime(
    prisma,
    season,
  );
  const contributions = buildContributionMaps({
    soldListings,
    fulfilledOrders,
    expeditions,
    ledgerRows: ledgerRows.map((row) => ({
      guildId: row.guildId,
      eventType: row.eventType,
      referenceId: row.referenceId,
      createdAt: row.createdAt,
    })),
  });
  const claims = buildClaimsMap(
    ledgerRows
      .filter((row) => row.eventType === EconomyEventType.WORLD_EVENT_REWARD)
      .map((row) => ({ guildId: row.guildId, referenceId: row.referenceId, createdAt: row.createdAt })),
    season.key,
  );
  const focusGuild = options.focusGuildTag
    ? guilds.find((guild) => guild.tag === options.focusGuildTag) ?? null
    : null;
  const allActivity = [
    ...buildTradeActivity({ soldListings, fulfilledOrders, currentGuildTag: options.currentGuildTag ?? null }),
    ...buildFrontierActivity({ expeditions, currentGuildTag: options.currentGuildTag ?? null }),
    ...buildForgeActivity({ ledgerRows, currentGuildTag: options.currentGuildTag ?? null }),
  ]
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, WORLD_EVENT_ACTIVITY_LIMIT);

  const events = WORLD_EVENT_DEFINITIONS.map((definition) => {
    const standings = buildStandings({
      definition,
      guilds,
      contributions,
      currentGuildTag: options.currentGuildTag ?? null,
      focusGuildTag: options.focusGuildTag ?? null,
    });
    const totalPoints = standings.reduce((sum, entry) => sum + entry.points, 0);
    const focus = buildFocusGuildSnapshot({
      definition,
      guild: focusGuild,
      standings,
      contributions,
      claims,
      currentGuildTag: options.currentGuildTag ?? null,
    });
    const rewardTiers = focus
      ? buildRewardTierSnapshots({
          definition,
          guildContributionPoints: focus.points,
          guildClaims: getClaimsForGuildEvent(claims, focus.guildId, definition.key),
        })
      : definition.tiers.map((tier) => ({
          key: tier.key,
          label: tier.label,
          thresholdPoints: tier.thresholdPoints,
          rewardLabels: buildWorldEventRewardLabels(tier.reward),
          status: "locked",
          statusLabel: `Нужно ${tier.thresholdPoints} очк.`,
          claimedAt: null,
          remainingPoints: tier.thresholdPoints,
        } satisfies WorldEventRewardTierSnapshot));

    return {
      key: definition.key,
      title: definition.title,
      eyebrow: definition.eyebrow,
      description: definition.description,
      objectiveLabel: definition.objectiveLabel,
      tone: definition.tone,
      primaryHref: definition.primaryHref,
      primaryActionLabel: definition.primaryActionLabel,
      relatedRoutes: definition.relatedRoutes,
      progressPoints: totalPoints,
      targetPoints: definition.targetPoints,
      progressPercent: Math.min(100, Math.round((totalPoints / Math.max(1, definition.targetPoints)) * 100)),
      progressLabel: `${totalPoints} / ${definition.targetPoints} очков сообщества`,
      statusLabel:
        totalPoints >= definition.targetPoints
          ? "Глобальная цель сезона выполнена"
          : `Нужно ещё ${Math.max(0, definition.targetPoints - totalPoints)} очк. до community goal`,
      rewardPreview: definition.tiers.map((tier) => `${tier.label} · ${tier.thresholdPoints}`).join(" • "),
      focusGuild: focus,
      rewardTiers,
      standings: standings.slice(0, 5),
      recentActivity: allActivity.filter((entry) => entry.eventKey === definition.key).slice(0, 4),
    } satisfies WorldEventSnapshot;
  });

  return {
    season,
    currentGuildTag: options.currentGuildTag ?? null,
    focusGuildTag: options.focusGuildTag ?? null,
    summary: {
      eventCount: events.length,
      claimableRewardCount: events.reduce(
        (sum, event) => sum + event.rewardTiers.filter((tier) => tier.status === "claimable").length,
        0,
      ),
      nearGoalCount: events.reduce(
        (sum, event) =>
          sum + Number(Boolean(event.focusGuild?.nextThresholdLabel && event.rewardTiers.some((tier) => tier.remainingPoints <= 6 && tier.status === "locked"))),
        0,
      ),
      recentActivityCount: allActivity.length,
    },
    events,
    recentActivity: allActivity,
  };
}

export function getWorldEventRewardTierDefinition(eventKey: WorldEventKey, tierKey: WorldEventRewardTierKey) {
  return getWorldEventDefinition(eventKey)?.tiers.find((tier) => tier.key === tierKey) ?? null;
}

export async function loadWorldEventClaimStateTx(
  tx: Prisma.TransactionClient,
  guildId: string,
): Promise<WorldEventClaimState> {
  const season = getCurrentWorldEventSeasonSnapshot();
  const [soldListings, fulfilledOrders, expeditions, ledgerRows] = await Promise.all([
    tx.marketListing.findMany({
      where: {
        sellerGuildId: guildId,
        status: MarketListingStatus.SOLD,
        soldAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        sellerGuildId: true,
        totalPriceGold: true,
        soldAt: true,
      },
    }),
    tx.buyOrder.findMany({
      where: {
        fulfillerGuildId: guildId,
        status: BuyOrderStatus.FULFILLED,
        fulfilledAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        fulfillerGuildId: true,
        totalPriceGold: true,
        fulfilledAt: true,
      },
    }),
    tx.expedition.findMany({
      where: {
        guildId,
        status: ExpeditionStatus.CLAIMED,
        claimedAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        guildId: true,
        resultTier: true,
        claimedAt: true,
        location: { select: { code: true, requiredGuildLevel: true } },
      },
    }),
    tx.economyLedgerEntry.findMany({
      where: {
        guildId,
        eventType: {
          in: [
            EconomyEventType.CONTRACT_REWARD,
            EconomyEventType.WORKSHOP_UPGRADE,
            EconomyEventType.GUILD_UPGRADE_PURCHASE,
            EconomyEventType.WORLD_EVENT_REWARD,
          ],
        },
        createdAt: {
          gte: season.startsAt,
          lt: season.endsAt,
        },
      },
      select: {
        guildId: true,
        eventType: true,
        referenceId: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    season,
    contributions: buildContributionMaps({
      soldListings,
      fulfilledOrders,
      expeditions,
      ledgerRows,
    }),
    claims: buildClaimsMap(
      ledgerRows
        .filter((row) => row.eventType === EconomyEventType.WORLD_EVENT_REWARD)
        .map((row) => ({ guildId: row.guildId, referenceId: row.referenceId, createdAt: row.createdAt })),
      season.key,
    ),
  };
}

export function getWorldEventContributionForGuild(
  state: WorldEventClaimState,
  eventKey: WorldEventKey,
  guildId: string,
) {
  return getContribution(state.contributions, eventKey, guildId);
}

export function getWorldEventClaimRecordForGuild(
  state: WorldEventClaimState,
  eventKey: WorldEventKey,
  guildId: string,
  tierKey: WorldEventRewardTierKey,
) {
  const claimedAt = state.claims.get(guildId)?.get(eventKey)?.get(tierKey) ?? null;
  return claimedAt ? { tierKey, claimedAt } : null;
}
