import "server-only";

import {
  BuyOrderStatus,
  EconomyEventType,
  ExpeditionResultTier,
  ExpeditionStatus,
  MarketListingStatus,
  Prisma,
  ResourceType,
  TradeOfferStatus,
} from "@prisma/client";

import {
  getHeroClassLabel,
  getHeroStatusLabel,
  getListingTypeLabel,
  getRarityLabel,
  getResourceLabel,
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { getActiveGuildIdentity } from "@/server/foundation";
import {
  loadWorldEventBoardSnapshot,
  type WorldEventBoardSnapshot,
} from "@/server/world-events";

type Tone = "neutral" | "accent" | "success" | "warning";

export type GuildPrestigeContributionKey =
  | "market-sales"
  | "buy-order-fulfillment"
  | "reliable-deals"
  | "completed-contracts"
  | "elite-pve";

export type GuildPrestigeTierKey = "rising" | "known" | "trusted" | "prestige" | "legendary";

export type GuildPrestigeBadge = {
  key: "trusted-trader" | "demand-broker" | "contract-house" | "elite-explorers" | "rising-guild";
  label: string;
  description: string;
  tone: Tone;
};

export type GuildPrestigeContribution = {
  key: GuildPrestigeContributionKey;
  label: string;
  value: number;
  score: number;
  detail: string;
};

export type GuildPrestigeSurface = {
  score: number;
  rank: number;
  total: number;
  tierKey: GuildPrestigeTierKey;
  tierLabel: string;
  descriptor: string;
  summary: string;
  spotlight: string;
  tone: Tone;
  recentTrustActions: number;
  recentTrustLabel: string;
  primaryBadgeLabel: string | null;
  badges: GuildPrestigeBadge[];
};

export type GuildPrestigeSnapshot = GuildPrestigeSurface & {
  rankingContributions: GuildPrestigeContribution[];
};

export type GuildRenownContributionKey =
  | "favorite-traders"
  | "repeat-business"
  | "cross-channel-links"
  | "recent-social-memory";

export type GuildRenownTierKey =
  | "new-contact"
  | "known-counterparty"
  | "familiar-house"
  | "preferred-network"
  | "renowned-circle";

export type GuildRenownBadge = {
  key:
    | "first-impressions"
    | "familiar-face"
    | "house-favorite"
    | "cross-channel-tie"
    | "social-streak";
  label: string;
  description: string;
  tone: Tone;
};

export type GuildRenownPerk = {
  key: "directory-spotlight" | "preferred-trader-callout" | "social-badge" | "memory-recap";
  label: string;
  description: string;
  tone: Tone;
};

export type GuildFavoriteCounterparty = {
  guildId: string;
  guildName: string;
  guildTag: string;
  profileHref: string;
  marketHref: string;
  dealsHref: string;
  interactionCount: number;
  recentInteractions: number;
  marketSalesAsSeller: number;
  marketSalesAsBuyer: number;
  buyOrderSupplied: number;
  buyOrderReceived: number;
  acceptedDeals: number;
  channelCount: number;
  strengthScore: number;
  relationshipLabel: string;
  summary: string;
  lastInteractionAt: Date | null;
  isCurrentContext: boolean;
};

export type GuildRecurringInteractionSummary = {
  activeCounterparties: number;
  recurringCounterparties: number;
  repeatBusinessCount: number;
  crossChannelCounterparties: number;
  recentInteractions: number;
  favoriteCounterpartyLabel: string | null;
  summary: string;
  spotlight: string;
};

export type GuildRenownContribution = {
  key: GuildRenownContributionKey;
  label: string;
  value: number;
  score: number;
  detail: string;
};

export type GuildRenownSurface = {
  score: number;
  rank: number;
  total: number;
  tierKey: GuildRenownTierKey;
  tierLabel: string;
  descriptor: string;
  summary: string;
  spotlight: string;
  tone: Tone;
  recentInteractionCount: number;
  recentInteractionLabel: string;
  recurringCounterparties: number;
  recurringLabel: string;
  favoriteCounterpartyLabel: string | null;
  primaryBadgeLabel: string | null;
  primaryPerkLabel: string | null;
  badges: GuildRenownBadge[];
  perks: GuildRenownPerk[];
};

export type GuildRenownSnapshot = GuildRenownSurface & {
  rankingContributions: GuildRenownContribution[];
};

export type GuildSocialMemoryActivity = {
  id: string;
  sourceLabel: string;
  title: string;
  summary: string;
  detail: string;
  at: Date;
  href: string;
  tone: Tone;
  counterpartyGuildTag: string | null;
};

export type GuildPrestigeSummary = {
  guildId: string;
  guildName: string;
  guildTag: string;
  profileHref: string;
  marketHref: string;
  dealsHref: string;
  isCurrentContext: boolean;
  prestige: GuildPrestigeSurface;
  renown: GuildRenownSurface;
  recurringSummary: GuildRecurringInteractionSummary;
  favoriteCounterparties: GuildFavoriteCounterparty[];
};

export type GuildLeaderboardKey = "renown" | "prestige" | "level" | "wealth" | "power" | "market";

export type GuildLeaderboardSnapshot = {
  key: GuildLeaderboardKey;
  title: string;
  description: string;
  metricLabel: string;
  entries: Array<{
    rank: number;
    guildId: string;
    guildName: string;
    guildTag: string;
    ownerDisplayName: string;
    value: number;
    valueLabel: string;
    detail: string;
    href: string;
    isCurrentContext: boolean;
    tierLabel: string;
    renownTierLabel: string;
    primaryBadgeLabel: string | null;
    primaryRenownPerkLabel: string | null;
    favoriteCounterpartyLabel: string | null;
  }>;
};

export type GuildDirectoryPageData = {
  currentGuildTag: string | null;
  worldEventBoard: WorldEventBoardSnapshot;
  community: {
    guildCount: number;
    playerCount: number;
    activeListings: number;
    activeBuyOrders: number;
    contractsClaimed: number;
    resolvedExpeditions: number;
    prestigeLeaders: number;
    renownLeaders: number;
    recentTrustActions: number;
    recurringPairs: number;
  };
  leaderboards: GuildLeaderboardSnapshot[];
  guilds: Array<{
    guildId: string;
    guildName: string;
    guildTag: string;
    ownerDisplayName: string;
    prestige: GuildPrestigeSurface;
    renown: GuildRenownSurface;
    level: number;
    gold: number;
    rosterPower: number;
    heroCount: number;
    marketActivity: number;
    marketActivityLabel: string;
    contractsCompleted: number;
    privateDealsCompleted: number;
    completedExpeditions: number;
    pveLabel: string;
    socialSummary: string;
    favoriteCounterparties: GuildFavoriteCounterparty[];
    recurringSummary: GuildRecurringInteractionSummary;
    profileHref: string;
    marketHref: string;
    dealsHref: string;
    isCurrentContext: boolean;
  }>;
  players: Array<{
    userId: string;
    displayName: string;
    guildName: string;
    guildTag: string;
    prestige: GuildPrestigeSurface;
    renown: GuildRenownSurface;
    guildLevel: number;
    rosterPower: number;
    marketActivity: number;
    joinedAt: Date;
    socialSummary: string;
    profileHref: string;
    dealsHref: string;
    isCurrentContext: boolean;
  }>;
};

export type GuildPublicProfilePageData = {
  currentGuildTag: string | null;
  worldEventBoard: WorldEventBoardSnapshot;
  guild: {
    id: string;
    name: string;
    tag: string;
    ownerDisplayName: string;
    ownerSince: Date;
    level: number;
    xp: number;
    nextLevelXp: number | null;
    gold: number;
    rosterPower: number;
    heroCount: number;
    heroSlotLimit: number;
    highestHeroPower: number;
    marketUnlocked: boolean;
    tradeUnlocked: boolean;
    marketActivity: number;
    activeListingsCount: number;
    activeBuyOrdersCount: number;
    contractsCompleted: number;
    privateDealsCompleted: number;
    completedExpeditions: number;
    activeExpeditions: number;
    pveLabel: string;
    highestUnlockedRiskLabel: string;
    socialSummary: string;
    isCurrentContext: boolean;
  };
  prestige: GuildPrestigeSnapshot;
  renown: GuildRenownSnapshot;
  leaderboardPlacements: Array<{
    key: GuildLeaderboardKey;
    title: string;
    rank: number;
    total: number;
    valueLabel: string;
    detail: string;
  }>;
  featuredHeroes: Array<{
    id: string;
    name: string;
    heroClassLabel: string;
    level: number;
    heroXp: number;
    powerScore: number;
    rarityLabel: string;
    statusLabel: string;
  }>;
  activeListings: Array<{
    id: string;
    listingTypeLabel: string;
    itemLabel: string;
    quantity: number;
    totalPriceGold: number;
    detailLabel: string;
    valueSummary: string;
    expiresAt: Date;
  }>;
  activeBuyOrders: Array<{
    id: string;
    resourceLabel: string;
    quantity: number;
    totalPriceGold: number;
    priceSummary: string;
    expiresAt: Date;
  }>;
  recentActivity: Array<{
    id: string;
    sourceLabel: string;
    title: string;
    summary: string;
    detail: string;
    prestigeImpactLabel: string;
    at: Date;
    href: string;
    tone: Tone;
  }>;
  socialMemory: GuildSocialMemoryActivity[];
  favoriteTraders: GuildFavoriteCounterparty[];
  recurringSummary: GuildRecurringInteractionSummary;
  socialCtas: {
    directoryHref: string;
    marketHref: string;
    dealsHref: string;
  };
};

type SocialGuildMetrics = {
  level: number;
  wealth: number;
  power: number;
  market: number;
  heroCount: number;
  highestHeroPower: number;
  activeListingsCount: number;
  soldListingsCount: number;
  soldListingsValue: number;
  activeBuyOrdersCount: number;
  fulfilledBuyOrdersCount: number;
  fulfilledSupplyCount: number;
  contractsCompleted: number;
  acceptedTradesCount: number;
  activeExpeditions: number;
  completedExpeditions: number;
  highRiskClears: number;
  eliteClears: number;
  triumphClears: number;
  unlockedLocationCount: number;
  totalLocationCount: number;
  highestUnlockedRiskLabel: string;
  recentTrustActions: number;
};

type SocialGuildRecord = Prisma.GuildGetPayload<{
  select: typeof socialGuildSelect;
}>;

type SocialComputedGuild = {
  id: string;
  name: string;
  tag: string;
  level: number;
  xp: number;
  gold: number;
  createdAt: Date;
  ownerUserId: string;
  ownerDisplayName: string;
  heroSlotLimit: number;
  marketUnlocked: boolean;
  tradeUnlocked: boolean;
  heroes: SocialGuildRecord["heroes"];
  metrics: SocialGuildMetrics;
  reputation: GuildPrestigeSnapshot;
  renown: GuildRenownSnapshot;
  recurringSummary: GuildRecurringInteractionSummary;
  favoriteCounterparties: GuildFavoriteCounterparty[];
  pveLabel: string;
  socialSummary: string;
  profileHref: string;
  marketHref: string;
  dealsHref: string;
  isCurrentContext: boolean;
};

type CounterpartyChannelKey = "market" | "demand" | "deal";

type RawCounterpartyMemory = {
  counterpartyGuildId: string;
  interactionCount: number;
  recentInteractions: number;
  marketSalesAsSeller: number;
  marketSalesAsBuyer: number;
  buyOrderSupplied: number;
  buyOrderReceived: number;
  acceptedDeals: number;
  lastInteractionAt: Date | null;
  channels: Set<CounterpartyChannelKey>;
};

const PRESTIGE_RECENT_WINDOW_MS = 1000 * 60 * 60 * 72;

const socialGuildSelect = {
  id: true,
  name: true,
  tag: true,
  level: true,
  xp: true,
  gold: true,
  marketUnlockedAt: true,
  tradeUnlockedAt: true,
  activeHeroSlots: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      displayName: true,
    },
  },
  heroes: {
    orderBy: [{ powerScore: "desc" }, { level: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      heroClass: true,
      level: true,
      heroXp: true,
      powerScore: true,
      rarity: true,
      status: true,
    },
  },
} satisfies Prisma.GuildSelect;

const prestigeTierDefinitions = [
  {
    key: "rising",
    minScore: 0,
    label: "Rising guild",
    tone: "neutral",
    description: "Гильдия только собирает первые public proofs для рынка, сделок и PvE.",
  },
  {
    key: "known",
    minScore: 20,
    label: "Known name",
    tone: "accent",
    description: "Имя уже видно в каталоге и читается как полезный социальный контекст.",
  },
  {
    key: "trusted",
    minScore: 45,
    label: "Trusted house",
    tone: "success",
    description: "Гильдия выглядит надёжным контрагентом для торговли, контрактов и мягкой кооперации.",
  },
  {
    key: "prestige",
    minScore: 70,
    label: "Prestige circle",
    tone: "accent",
    description: "Статусный игрок сообщества с заметным весом в текущих social loops.",
  },
  {
    key: "legendary",
    minScore: 100,
    label: "Exchange legend",
    tone: "accent",
    description: "Гильдия уже выглядит как имя, вокруг которого строится social attention всего альфа-среза.",
  },
] as const;

const renownTierDefinitions = [
  {
    key: "new-contact",
    minScore: 0,
    label: "New contact",
    tone: "neutral",
    description: "Гильдия только собирает первые знакомые имена и ещё не сформировала повторный social loop.",
  },
  {
    key: "known-counterparty",
    minScore: 18,
    label: "Known counterparty",
    tone: "accent",
    description: "На рынке и в deals уже появляются первые знакомые дома, к которым хочется вернуться ещё раз.",
  },
  {
    key: "familiar-house",
    minScore: 36,
    label: "Familiar house",
    tone: "success",
    description: "Гильдия собрала повторные связи и читается как приятный знакомый контрагент, а не анонимный ник.",
  },
  {
    key: "preferred-network",
    minScore: 60,
    label: "Preferred network",
    tone: "accent",
    description: "Контрагенты возвращаются сериями через рынок, buy orders и private deals, формируя устойчивую social retention-сеть.",
  },
  {
    key: "renowned-circle",
    minScore: 88,
    label: "Renowned circle",
    tone: "accent",
    description: "Вокруг гильдии уже сложился узнаваемый круг повторных связей, который сам подталкивает к следующим визитам.",
  },
] as const;

const prestigeContributionDefinitions = [
  {
    key: "market-sales",
    label: "Рыночные продажи",
    getValue: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.soldListingsCount,
    getScore: (guild: { metrics: SocialGuildMetrics }) =>
      guild.metrics.soldListingsCount * 18 + Math.min(12, Math.floor(guild.metrics.soldListingsValue / 90) * 2),
    getDetail: (guild: { metrics: SocialGuildMetrics }) =>
      `${guild.metrics.soldListingsCount} продаж · ${guild.metrics.soldListingsValue} зол. валового оборота.`,
  },
  {
    key: "buy-order-fulfillment",
    label: "Закрытый чужой спрос",
    getValue: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.fulfilledSupplyCount,
    getScore: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.fulfilledSupplyCount * 20,
    getDetail: (guild: { metrics: SocialGuildMetrics }) =>
      `${guild.metrics.fulfilledSupplyCount} buy orders исполнено поставкой ресурсов.`,
  },
  {
    key: "reliable-deals",
    label: "Accepted private deals",
    getValue: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.acceptedTradesCount,
    getScore: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.acceptedTradesCount * 16,
    getDetail: (guild: { metrics: SocialGuildMetrics }) =>
      `${guild.metrics.acceptedTradesCount} private deals дошли до финального принятия.`,
  },
  {
    key: "completed-contracts",
    label: "Contract house credit",
    getValue: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.contractsCompleted,
    getScore: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.contractsCompleted * 14,
    getDetail: (guild: { metrics: SocialGuildMetrics }) =>
      `${guild.metrics.contractsCompleted} наград objective board уже превращены в публичный статус.`,
  },
  {
    key: "elite-pve",
    label: "High-risk / elite PvE",
    getValue: (guild: { metrics: SocialGuildMetrics }) => guild.metrics.highRiskClears,
    getScore: (guild: { metrics: SocialGuildMetrics }) =>
      guild.metrics.highRiskClears * 12 + guild.metrics.eliteClears * 12 + guild.metrics.triumphClears * 6,
    getDetail: (guild: { metrics: SocialGuildMetrics }) =>
      `${guild.metrics.highRiskClears} high-risk · ${guild.metrics.eliteClears} elite · ${guild.metrics.triumphClears} triumph clears.`,
  },
] as const;

const renownContributionDefinitions = [
  {
    key: "favorite-traders",
    label: "Favorite traders",
    getValue: (input: {
      recurringSummary: GuildRecurringInteractionSummary;
      favoriteCounterparties: GuildFavoriteCounterparty[];
    }) => input.favoriteCounterparties.filter((entry) => entry.interactionCount >= 2).length,
    getScore: (input: {
      recurringSummary: GuildRecurringInteractionSummary;
      favoriteCounterparties: GuildFavoriteCounterparty[];
    }) => {
      const favoriteCount = input.favoriteCounterparties.filter((entry) => entry.interactionCount >= 2).length;
      const topStrength = input.favoriteCounterparties[0]?.strengthScore ?? 0;

      return favoriteCount * 12 + Math.min(18, Math.floor(topStrength / 8) * 3);
    },
    getDetail: (input: {
      recurringSummary: GuildRecurringInteractionSummary;
      favoriteCounterparties: GuildFavoriteCounterparty[];
    }) => {
      const labels = input.favoriteCounterparties.slice(0, 2).map((entry) => `${entry.guildTag} (${entry.interactionCount})`);

      return labels.length > 0
        ? `Топ знакомые дома: ${labels.join(" • ")}.`
        : "Любой повторный контрагент сразу начнёт собирать familiar-house слой.";
    },
  },
  {
    key: "repeat-business",
    label: "Repeat business",
    getValue: (input: { recurringSummary: GuildRecurringInteractionSummary }) => input.recurringSummary.repeatBusinessCount,
    getScore: (input: { recurringSummary: GuildRecurringInteractionSummary }) => input.recurringSummary.repeatBusinessCount * 8,
    getDetail: (input: { recurringSummary: GuildRecurringInteractionSummary }) =>
      `${input.recurringSummary.recurringCounterparties} повторных связей дали ${input.recurringSummary.repeatBusinessCount} возвратов к уже знакомым домам.`,
  },
  {
    key: "cross-channel-links",
    label: "Cross-channel links",
    getValue: (input: { recurringSummary: GuildRecurringInteractionSummary }) => input.recurringSummary.crossChannelCounterparties,
    getScore: (input: { recurringSummary: GuildRecurringInteractionSummary }) => input.recurringSummary.crossChannelCounterparties * 18,
    getDetail: (input: { recurringSummary: GuildRecurringInteractionSummary }) =>
      `${input.recurringSummary.crossChannelCounterparties} знакомых домов живут сразу в нескольких каналах: market, request board или deals.`,
  },
  {
    key: "recent-social-memory",
    label: "Recent social memory",
    getValue: (input: { recurringSummary: GuildRecurringInteractionSummary }) => input.recurringSummary.recentInteractions,
    getScore: (input: { recurringSummary: GuildRecurringInteractionSummary }) =>
      Math.min(24, input.recurringSummary.recentInteractions * 6),
    getDetail: (input: { recurringSummary: GuildRecurringInteractionSummary }) =>
      input.recurringSummary.recentInteractions > 0
        ? `${input.recurringSummary.recentInteractions} свежих social memory-сигналов удерживают ощущение живого знакомого мира.`
        : "Свежие повторные сделки быстро оживят memory recap и preferred-trader callouts.",
  },
] as const;

const leaderboardDefinitions = [
  {
    key: "renown",
    title: "Renown leaderboard",
    description: "Кто уже собрал знакомые дома, repeat business и preferred-trader связи, ради которых хочется возвращаться сериями.",
    metricLabel: "Renown",
    getValue: (guild: SocialComputedGuild) => guild.renown.score,
    getValueLabel: (guild: SocialComputedGuild) => `${guild.renown.score} renown`,
    getDetail: (guild: SocialComputedGuild) => guild.renown.summary,
  },
  {
    key: "prestige",
    title: "Prestige leaderboard",
    description: "Кто уже выглядит самым приятным и статусным контрагентом для рынка, deals и social discovery.",
    metricLabel: "Prestige",
    getValue: (guild: SocialComputedGuild) => guild.reputation.score,
    getValueLabel: (guild: SocialComputedGuild) => `${guild.reputation.score} prestige`,
    getDetail: (guild: SocialComputedGuild) => guild.reputation.summary,
  },
  {
    key: "level",
    title: "Guild level",
    description: "Кто дальше остальных протолкнул progression, unlock-цепочки и общий вес гильдии.",
    metricLabel: "Уровень",
    getValue: (guild: SocialComputedGuild) => guild.metrics.level,
    getValueLabel: (guild: SocialComputedGuild) => `Lv. ${guild.metrics.level}`,
    getDetail: (guild: SocialComputedGuild) =>
      `${guild.metrics.unlockedLocationCount}/${guild.metrics.totalLocationCount} зон · ${guild.metrics.contractsCompleted} контрактов`,
  },
  {
    key: "power",
    title: "Суммарная сила ростера",
    description: "Power ростера показывает статус, опасность и readiness к более дорогим PvE-маршрутам.",
    metricLabel: "Power",
    getValue: (guild: SocialComputedGuild) => guild.metrics.power,
    getValueLabel: (guild: SocialComputedGuild) => `${guild.metrics.power} power`,
    getDetail: (guild: SocialComputedGuild) =>
      `${guild.metrics.heroCount} героев · пик ${guild.metrics.highestHeroPower} power`,
  },
  {
    key: "wealth",
    title: "Золото в казне",
    description: "Понятная и статусная метрика ликвидности: у кого больше всего золота под следующий шаг.",
    metricLabel: "Gold",
    getValue: (guild: SocialComputedGuild) => guild.metrics.wealth,
    getValueLabel: (guild: SocialComputedGuild) => `${guild.metrics.wealth} зол.`,
    getDetail: (guild: SocialComputedGuild) =>
      `Витрина ${guild.metrics.activeListingsCount} · спрос ${guild.metrics.activeBuyOrdersCount}`,
  },
  {
    key: "market",
    title: "Рыночная активность",
    description: "Лоты, продажи, buy orders и исполненный спрос складываются в понятную social visibility метрику.",
    metricLabel: "Активность",
    getValue: (guild: SocialComputedGuild) => guild.metrics.market,
    getValueLabel: (guild: SocialComputedGuild) => `${guild.metrics.market} активностей`,
    getDetail: (guild: SocialComputedGuild) =>
      `Продаж ${guild.metrics.soldListingsCount} · лотов ${guild.metrics.activeListingsCount} · заявок ${guild.metrics.activeBuyOrdersCount}`,
  },
] as const;

function buildGuildProfileHref(guildTag: string) {
  return `/guilds/${encodeURIComponent(guildTag)}`;
}

function buildGuildMarketContextHref(guildTag: string) {
  return `/market?guild=${encodeURIComponent(guildTag)}`;
}

function buildGuildDealsContextHref(guildTag: string) {
  return `/deals?to=${encodeURIComponent(guildTag)}`;
}

function getNextLevelXp(level: number) {
  const thresholds = [0, 60, 150, 300, 520, 800] as const;
  return thresholds[level] ?? null;
}

function getRiskScore(code: string, requiredGuildLevel: number) {
  if (code.includes("elite")) {
    return 4;
  }

  if (code.includes("smuggler")) {
    return 3;
  }

  if (code.includes("supply")) {
    return 1;
  }

  if (requiredGuildLevel >= 4) {
    return 3;
  }

  if (requiredGuildLevel >= 2) {
    return 2;
  }

  return 1;
}

function getRiskLabel(score: number) {
  if (score >= 4) {
    return "Экстремальный риск";
  }

  if (score === 3) {
    return "Высокий риск";
  }

  if (score === 2) {
    return "Средний риск";
  }

  return "Низкий риск";
}

function isWithinRecentWindow(value: Date | null | undefined) {
  return value instanceof Date && Date.now() - value.getTime() <= PRESTIGE_RECENT_WINDOW_MS;
}

function buildMarketMetrics(
  rows: Array<{
    sellerGuildId: string;
    status: MarketListingStatus;
    totalPriceGold: number;
    soldAt: Date | null;
  }>,
) {
  const counts = new Map<string, { active: number; sold: number; soldValue: number; recentSold: number }>();

  for (const row of rows) {
    const current = counts.get(row.sellerGuildId) ?? { active: 0, sold: 0, soldValue: 0, recentSold: 0 };

    if (row.status === MarketListingStatus.ACTIVE) {
      current.active += 1;
    }

    if (row.status === MarketListingStatus.SOLD) {
      current.sold += 1;
      current.soldValue += row.totalPriceGold;

      if (isWithinRecentWindow(row.soldAt)) {
        current.recentSold += 1;
      }
    }

    counts.set(row.sellerGuildId, current);
  }

  return counts;
}

function buildBuyOrderBuyerMetrics(
  rows: Array<{
    buyerGuildId: string;
    status: BuyOrderStatus;
  }>,
) {
  const counts = new Map<string, { active: number; fulfilled: number }>();

  for (const row of rows) {
    const current = counts.get(row.buyerGuildId) ?? { active: 0, fulfilled: 0 };

    if (row.status === BuyOrderStatus.ACTIVE) {
      current.active += 1;
    }

    if (row.status === BuyOrderStatus.FULFILLED) {
      current.fulfilled += 1;
    }

    counts.set(row.buyerGuildId, current);
  }

  return counts;
}

function buildBuyOrderSupplierMetrics(
  rows: Array<{
    fulfillerGuildId: string | null;
    status: BuyOrderStatus;
    fulfilledAt: Date | null;
  }>,
) {
  const counts = new Map<string, { count: number; recent: number }>();

  for (const row of rows) {
    if (row.status !== BuyOrderStatus.FULFILLED || !row.fulfillerGuildId) {
      continue;
    }

    const current = counts.get(row.fulfillerGuildId) ?? { count: 0, recent: 0 };
    current.count += 1;

    if (isWithinRecentWindow(row.fulfilledAt)) {
      current.recent += 1;
    }

    counts.set(row.fulfillerGuildId, current);
  }

  return counts;
}

function buildLedgerMetrics(
  rows: Array<{
    guildId: string;
    eventType: EconomyEventType;
    createdAt: Date;
  }>,
) {
  const counts = new Map<string, { contracts: number; trades: number; recentContracts: number; recentTrades: number }>();

  for (const row of rows) {
    const current = counts.get(row.guildId) ?? {
      contracts: 0,
      trades: 0,
      recentContracts: 0,
      recentTrades: 0,
    };

    if (row.eventType === EconomyEventType.CONTRACT_REWARD) {
      current.contracts += 1;

      if (isWithinRecentWindow(row.createdAt)) {
        current.recentContracts += 1;
      }
    }

    if (row.eventType === EconomyEventType.TRADE_COMPLETED) {
      current.trades += 1;

      if (isWithinRecentWindow(row.createdAt)) {
        current.recentTrades += 1;
      }
    }

    counts.set(row.guildId, current);
  }

  return counts;
}

function buildExpeditionMetrics(
  rows: Array<{
    guildId: string;
    status: ExpeditionStatus;
    resultTier: ExpeditionResultTier | null;
    resolvedAt: Date | null;
    claimedAt: Date | null;
    location: {
      code: string;
      requiredGuildLevel: number;
    };
  }>,
) {
  const counts = new Map<string, {
    active: number;
    completed: number;
    claimed: number;
    highRisk: number;
    elite: number;
    triumphs: number;
    recentPrestige: number;
  }>();

  for (const row of rows) {
    const current = counts.get(row.guildId) ?? {
      active: 0,
      completed: 0,
      claimed: 0,
      highRisk: 0,
      elite: 0,
      triumphs: 0,
      recentPrestige: 0,
    };

    if (row.status === ExpeditionStatus.ACTIVE) {
      current.active += 1;
    }

    if (row.status === ExpeditionStatus.COMPLETED) {
      current.completed += 1;
    }

    if (row.status === ExpeditionStatus.CLAIMED) {
      current.claimed += 1;
    }

    const wasSuccessful =
      row.resultTier === ExpeditionResultTier.SUCCESS || row.resultTier === ExpeditionResultTier.TRIUMPH;

    if (wasSuccessful) {
      const riskScore = getRiskScore(row.location.code, row.location.requiredGuildLevel);

      if (riskScore >= 3) {
        current.highRisk += 1;
      }

      if (riskScore >= 4) {
        current.elite += 1;
      }

      if (row.resultTier === ExpeditionResultTier.TRIUMPH) {
        current.triumphs += 1;
      }

      if (riskScore >= 3 && isWithinRecentWindow(row.claimedAt ?? row.resolvedAt)) {
        current.recentPrestige += 1;
      }
    }

    counts.set(row.guildId, current);
  }

  return counts;
}

function buildPveMetrics(
  guildLevel: number,
  locations: Array<{ code: string; name: string; requiredGuildLevel: number }>,
) {
  const unlockedLocations = locations.filter((location) => location.requiredGuildLevel <= guildLevel);
  const highestRiskScore = unlockedLocations.reduce((max, location) => {
    return Math.max(max, getRiskScore(location.code, location.requiredGuildLevel));
  }, 0);

  return {
    unlockedLocationCount: unlockedLocations.length,
    totalLocationCount: locations.length,
    highestUnlockedRiskLabel: highestRiskScore > 0 ? getRiskLabel(highestRiskScore) : "—",
  };
}

function ensureCounterpartyMemory(
  memories: Map<string, Map<string, RawCounterpartyMemory>>,
  guildId: string,
  counterpartyGuildId: string,
) {
  const guildMemories = memories.get(guildId) ?? new Map<string, RawCounterpartyMemory>();
  const memory = guildMemories.get(counterpartyGuildId) ?? {
    counterpartyGuildId,
    interactionCount: 0,
    recentInteractions: 0,
    marketSalesAsSeller: 0,
    marketSalesAsBuyer: 0,
    buyOrderSupplied: 0,
    buyOrderReceived: 0,
    acceptedDeals: 0,
    lastInteractionAt: null,
    channels: new Set<CounterpartyChannelKey>(),
  };

  guildMemories.set(counterpartyGuildId, memory);
  memories.set(guildId, guildMemories);

  return memory;
}

function registerCounterpartyInteraction(
  memories: Map<string, Map<string, RawCounterpartyMemory>>,
  input: {
    guildId: string | null | undefined;
    counterpartyGuildId: string | null | undefined;
    channel: CounterpartyChannelKey;
    at: Date | null | undefined;
    field:
      | "marketSalesAsSeller"
      | "marketSalesAsBuyer"
      | "buyOrderSupplied"
      | "buyOrderReceived"
      | "acceptedDeals";
  },
) {
  if (!input.guildId || !input.counterpartyGuildId || input.guildId === input.counterpartyGuildId) {
    return;
  }

  const memory = ensureCounterpartyMemory(memories, input.guildId, input.counterpartyGuildId);
  memory.interactionCount += 1;
  memory[input.field] += 1;
  memory.channels.add(input.channel);

  if (isWithinRecentWindow(input.at)) {
    memory.recentInteractions += 1;
  }

  if (input.at && (!memory.lastInteractionAt || input.at.getTime() > memory.lastInteractionAt.getTime())) {
    memory.lastInteractionAt = input.at;
  }
}

function buildCounterpartyMemories(input: {
  marketRows: Array<{
    sellerGuildId: string;
    buyerGuildId: string | null;
    status: MarketListingStatus;
    soldAt: Date | null;
  }>;
  buyOrderRows: Array<{
    buyerGuildId: string;
    fulfillerGuildId: string | null;
    status: BuyOrderStatus;
    fulfilledAt: Date | null;
  }>;
  tradeOfferRows: Array<{
    senderGuildId: string;
    receiverGuildId: string;
    status: TradeOfferStatus;
    createdAt: Date;
    respondedAt: Date | null;
  }>;
}) {
  const memories = new Map<string, Map<string, RawCounterpartyMemory>>();

  for (const row of input.marketRows) {
    if (row.status !== MarketListingStatus.SOLD || !row.buyerGuildId) {
      continue;
    }

    registerCounterpartyInteraction(memories, {
      guildId: row.sellerGuildId,
      counterpartyGuildId: row.buyerGuildId,
      channel: "market",
      at: row.soldAt,
      field: "marketSalesAsSeller",
    });
    registerCounterpartyInteraction(memories, {
      guildId: row.buyerGuildId,
      counterpartyGuildId: row.sellerGuildId,
      channel: "market",
      at: row.soldAt,
      field: "marketSalesAsBuyer",
    });
  }

  for (const row of input.buyOrderRows) {
    if (row.status !== BuyOrderStatus.FULFILLED || !row.fulfillerGuildId) {
      continue;
    }

    registerCounterpartyInteraction(memories, {
      guildId: row.fulfillerGuildId,
      counterpartyGuildId: row.buyerGuildId,
      channel: "demand",
      at: row.fulfilledAt,
      field: "buyOrderSupplied",
    });
    registerCounterpartyInteraction(memories, {
      guildId: row.buyerGuildId,
      counterpartyGuildId: row.fulfillerGuildId,
      channel: "demand",
      at: row.fulfilledAt,
      field: "buyOrderReceived",
    });
  }

  for (const row of input.tradeOfferRows) {
    if (row.status !== TradeOfferStatus.ACCEPTED) {
      continue;
    }

    const finalAt = row.respondedAt ?? row.createdAt;
    registerCounterpartyInteraction(memories, {
      guildId: row.senderGuildId,
      counterpartyGuildId: row.receiverGuildId,
      channel: "deal",
      at: finalAt,
      field: "acceptedDeals",
    });
    registerCounterpartyInteraction(memories, {
      guildId: row.receiverGuildId,
      counterpartyGuildId: row.senderGuildId,
      channel: "deal",
      at: finalAt,
      field: "acceptedDeals",
    });
  }

  return memories;
}

function buildRelationshipLabel(memory: RawCounterpartyMemory) {
  if (memory.channels.size >= 3 || (memory.channels.size >= 2 && memory.interactionCount >= 4)) {
    return "Preferred trader";
  }

  if (memory.acceptedDeals >= 2) {
    return "Deal ally";
  }

  if (memory.buyOrderSupplied + memory.buyOrderReceived >= 2) {
    return "Supply partner";
  }

  if (memory.marketSalesAsSeller + memory.marketSalesAsBuyer >= 2) {
    return "Market regular";
  }

  if (memory.interactionCount >= 2) {
    return "Recurring contact";
  }

  return "Fresh contact";
}

function buildFavoriteCounterpartySummary(memory: RawCounterpartyMemory) {
  const parts: string[] = [];
  const marketCount = memory.marketSalesAsSeller + memory.marketSalesAsBuyer;
  const demandCount = memory.buyOrderSupplied + memory.buyOrderReceived;

  if (marketCount > 0) {
    parts.push(`market ×${marketCount}`);
  }

  if (demandCount > 0) {
    parts.push(`requests ×${demandCount}`);
  }

  if (memory.acceptedDeals > 0) {
    parts.push(`deals ×${memory.acceptedDeals}`);
  }

  if (memory.recentInteractions > 0) {
    parts.push(`${memory.recentInteractions} recent`);
  }

  return parts.join(" • ") || "Первое знакомство уже зафиксировано.";
}

function buildGuildRecurringSummary(counterparties: GuildFavoriteCounterparty[]): GuildRecurringInteractionSummary {
  const activeCounterparties = counterparties.length;
  const recurringCounterparties = counterparties.filter((entry) => entry.interactionCount >= 2).length;
  const repeatBusinessCount = counterparties.reduce((sum, entry) => sum + Math.max(0, entry.interactionCount - 1), 0);
  const crossChannelCounterparties = counterparties.filter((entry) => entry.channelCount >= 2).length;
  const recentInteractions = counterparties.reduce((sum, entry) => sum + entry.recentInteractions, 0);
  const favoriteCounterparty = counterparties[0] ?? null;
  const favoriteCounterpartyLabel = favoriteCounterparty
    ? `${favoriteCounterparty.guildName} [${favoriteCounterparty.guildTag}]`
    : null;

  return {
    activeCounterparties,
    recurringCounterparties,
    repeatBusinessCount,
    crossChannelCounterparties,
    recentInteractions,
    favoriteCounterpartyLabel,
    summary:
      activeCounterparties > 0
        ? `${activeCounterparties} знакомых домов · ${recurringCounterparties} повторяющихся связей · ${crossChannelCounterparties} multi-channel tie.`
        : "Пока рынок помнит только первые касания, но ещё не сформировал любимые дома.",
    spotlight: favoriteCounterparty
      ? `${favoriteCounterparty.guildName} [${favoriteCounterparty.guildTag}] уже считывается как ${favoriteCounterparty.relationshipLabel.toLowerCase()} и удерживает repeat-business loop живым.`
      : "Первые повторные сделки быстро превратят анонимный рынок в сеть знакомых домов.",
  };
}

function buildFavoriteCounterparties(input: {
  guildId: string;
  currentGuildTag: string | null;
  guildDirectory: Map<string, { id: string; name: string; tag: string }>;
  counterpartyMemories: Map<string, Map<string, RawCounterpartyMemory>>;
}) {
  const guildMemories = [...(input.counterpartyMemories.get(input.guildId)?.values() ?? [])]
    .map((memory) => {
      const counterparty = input.guildDirectory.get(memory.counterpartyGuildId) ?? null;

      if (!counterparty) {
        return null;
      }

      const channelCount = memory.channels.size;
      const strengthScore =
        memory.interactionCount * 7 +
        memory.recentInteractions * 4 +
        channelCount * 5 +
        memory.acceptedDeals * 4 +
        (memory.buyOrderSupplied + memory.buyOrderReceived) * 2;

      return {
        guildId: counterparty.id,
        guildName: counterparty.name,
        guildTag: counterparty.tag,
        profileHref: buildGuildProfileHref(counterparty.tag),
        marketHref: buildGuildMarketContextHref(counterparty.tag),
        dealsHref: buildGuildDealsContextHref(counterparty.tag),
        interactionCount: memory.interactionCount,
        recentInteractions: memory.recentInteractions,
        marketSalesAsSeller: memory.marketSalesAsSeller,
        marketSalesAsBuyer: memory.marketSalesAsBuyer,
        buyOrderSupplied: memory.buyOrderSupplied,
        buyOrderReceived: memory.buyOrderReceived,
        acceptedDeals: memory.acceptedDeals,
        channelCount,
        strengthScore,
        relationshipLabel: buildRelationshipLabel(memory),
        summary: buildFavoriteCounterpartySummary(memory),
        lastInteractionAt: memory.lastInteractionAt,
        isCurrentContext: counterparty.tag === input.currentGuildTag,
      } satisfies GuildFavoriteCounterparty;
    })
    .filter((entry): entry is GuildFavoriteCounterparty => Boolean(entry))
    .sort((left, right) => {
      return (
        right.strengthScore - left.strengthScore ||
        right.interactionCount - left.interactionCount ||
        (right.lastInteractionAt?.getTime() ?? 0) - (left.lastInteractionAt?.getTime() ?? 0) ||
        left.guildTag.localeCompare(right.guildTag, "ru")
      );
    });

  return {
    all: guildMemories,
    top: guildMemories.slice(0, 3),
    recurringSummary: buildGuildRecurringSummary(guildMemories),
  };
}

function buildRenownBadges(input: {
  recurringSummary: GuildRecurringInteractionSummary;
  favoriteCounterparties: GuildFavoriteCounterparty[];
  score: number;
}) {
  const badges: GuildRenownBadge[] = [];
  const favoriteCounterparty = input.favoriteCounterparties[0] ?? null;

  if (input.recurringSummary.recurringCounterparties >= 1) {
    badges.push({
      key: "familiar-face",
      label: "Familiar face",
      description: "У гильдии уже есть повторяющиеся связи, которые делают рынок менее анонимным.",
      tone: "success",
    });
  }

  if (favoriteCounterparty && favoriteCounterparty.interactionCount >= 3) {
    badges.push({
      key: "house-favorite",
      label: "House favorite",
      description: `Один из домов возвращается к этой гильдии снова и снова: ${favoriteCounterparty.guildTag}.`,
      tone: "accent",
    });
  }

  if (input.recurringSummary.crossChannelCounterparties >= 1) {
    badges.push({
      key: "cross-channel-tie",
      label: "Cross-channel tie",
      description: "Связи не застревают в одном окне и переходят между market, request board и deals.",
      tone: "accent",
    });
  }

  if (input.recurringSummary.recentInteractions >= 2) {
    badges.push({
      key: "social-streak",
      label: "Social streak",
      description: "Свежие взаимодействия удерживают social memory тёплой и напоминают вернуться.",
      tone: "success",
    });
  }

  if (badges.length === 0 || input.score < 18) {
    badges.unshift({
      key: "first-impressions",
      label: "First impressions",
      description: "Первые знакомые имена уже появились, но retention loop ещё только собирается.",
      tone: "warning",
    });
  }

  return badges.slice(0, 3);
}

function buildRenownPerks(input: {
  score: number;
  recurringSummary: GuildRecurringInteractionSummary;
  favoriteCounterparties: GuildFavoriteCounterparty[];
}) {
  const perks: GuildRenownPerk[] = [];
  const favoriteCounterparty = input.favoriteCounterparties[0] ?? null;

  if (input.score >= 18) {
    perks.push({
      key: "directory-spotlight",
      label: "Directory spotlight",
      description: "Каталог поднимает гильдию выше и объясняет, почему к ней возвращаются повторно.",
      tone: "accent",
    });
  }

  if (favoriteCounterparty) {
    perks.push({
      key: "preferred-trader-callout",
      label: "Preferred trader callout",
      description: `${favoriteCounterparty.guildName} [${favoriteCounterparty.guildTag}] подсвечивается как знакомый дом для мягкого возврата в market/deals.`,
      tone: "success",
    });
  }

  if (input.recurringSummary.recurringCounterparties >= 1) {
    perks.push({
      key: "social-badge",
      label: "Social badge",
      description: "Public profile получает заметный recurring-links badge без экономического power creep-а.",
      tone: "accent",
    });
  }

  if (input.recurringSummary.recentInteractions >= 2) {
    perks.push({
      key: "memory-recap",
      label: "Memory recap",
      description: "Dashboard и public profile показывают свежую серию знакомых взаимодействий как повод вернуться.",
      tone: "success",
    });
  }

  return perks.slice(0, 4);
}

function getRenownTier(score: number) {
  return [...renownTierDefinitions].reverse().find((tier) => score >= tier.minScore) ?? renownTierDefinitions[0];
}

function buildRenownSpotlight(
  contribution: GuildRenownContribution | null,
  recurringSummary: GuildRecurringInteractionSummary,
  favoriteCounterparties: GuildFavoriteCounterparty[],
  tierDescription: string,
) {
  const favoriteCounterparty = favoriteCounterparties[0] ?? null;

  if (!contribution || contribution.score <= 0) {
    return "Первые повторные сделки быстро создадут preferred trader memory и поднимут гильдию из режима одноразовых касаний.";
  }

  if (contribution.key === "favorite-traders") {
    return favoriteCounterparty
      ? `${favoriteCounterparty.guildName} [${favoriteCounterparty.guildTag}] уже стала знакомым домом, а не случайной строчкой в витрине.`
      : "Знакомые дома начинают складываться в понятный favorite traders loop.";
  }

  if (contribution.key === "repeat-business") {
    return "Игроки уже возвращаются к этой гильдии сериями, а не разовыми покупками и офферами.";
  }

  if (contribution.key === "cross-channel-links") {
    return "Связи мигрируют между market, request board и deals, поэтому social loop не обнуляется между экранами.";
  }

  if (contribution.key === "recent-social-memory") {
    return recurringSummary.recentInteractions > 0
      ? "Свежая серия знакомых взаимодействий удерживает гильдию в живой social памяти сообщества."
      : tierDescription;
  }

  return tierDescription;
}

function buildGuildRenown(input: {
  recurringSummary: GuildRecurringInteractionSummary;
  favoriteCounterparties: GuildFavoriteCounterparty[];
}) {
  const rankingContributions = renownContributionDefinitions
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      value: definition.getValue(input),
      score: definition.getScore(input),
      detail: definition.getDetail(input),
    }))
    .sort((left, right) => right.score - left.score || right.value - left.value || left.label.localeCompare(right.label, "ru"));
  const score = rankingContributions.reduce((sum, contribution) => sum + contribution.score, 0);
  const tier = getRenownTier(score);
  const leadingContribution = rankingContributions.find((contribution) => contribution.score > 0) ?? null;
  const badges = buildRenownBadges({
    recurringSummary: input.recurringSummary,
    favoriteCounterparties: input.favoriteCounterparties,
    score,
  });
  const perks = buildRenownPerks({
    score,
    recurringSummary: input.recurringSummary,
    favoriteCounterparties: input.favoriteCounterparties,
  });

  return {
    score,
    rank: 0,
    total: 0,
    tierKey: tier.key,
    tierLabel: tier.label,
    descriptor: leadingContribution
      ? `${tier.description} Главный renown-вклад идёт из слоя «${leadingContribution.label.toLowerCase()}».`
      : tier.description,
    summary:
      perks.length > 0
        ? `${tier.label} · ${perks.map((perk) => perk.label).join(" · ")}`
        : badges.length > 0
          ? `${tier.label} · ${badges.map((badge) => badge.label).join(" · ")}`
          : tier.label,
    spotlight: buildRenownSpotlight(leadingContribution, input.recurringSummary, input.favoriteCounterparties, tier.description),
    tone: tier.tone,
    recentInteractionCount: input.recurringSummary.recentInteractions,
    recentInteractionLabel:
      input.recurringSummary.recentInteractions > 0
        ? `${input.recurringSummary.recentInteractions} свежих familiar interactions за 72 часа.`
        : "Свежая social memory пока слабая, но первые знакомые дома уже можно собрать.",
    recurringCounterparties: input.recurringSummary.recurringCounterparties,
    recurringLabel:
      input.recurringSummary.recurringCounterparties > 0
        ? `${input.recurringSummary.recurringCounterparties} повторяющихся связей удерживают retention loop живым.`
        : "Повторяющихся связей пока нет — каждый знакомый дом сейчас особенно ценен.",
    favoriteCounterpartyLabel: input.recurringSummary.favoriteCounterpartyLabel,
    primaryBadgeLabel: badges[0]?.label ?? null,
    primaryPerkLabel: perks[0]?.label ?? null,
    badges,
    perks,
    rankingContributions,
  } satisfies GuildRenownSnapshot;
}

function buildPrestigeBadges(guild: {
  createdAt: Date;
  metrics: SocialGuildMetrics;
  score: number;
}) {
  const badges: GuildPrestigeBadge[] = [];

  if (guild.metrics.soldListingsCount >= 1) {
    badges.push({
      key: "trusted-trader",
      label: "Trusted trader",
      description: "Гильдия уже проводит успешные публичные продажи и читается как безопасный market-контрагент.",
      tone: "success",
    });
  }

  if (guild.metrics.fulfilledSupplyCount >= 1) {
    badges.push({
      key: "demand-broker",
      label: "Demand broker",
      description: "Гильдия закрывает чужие buy orders и выглядит надёжным поставщиком под текущий спрос.",
      tone: "accent",
    });
  }

  if (guild.metrics.contractsCompleted >= 1) {
    badges.push({
      key: "contract-house",
      label: "Contract house",
      description: "Objective board уже подтверждает, что гильдия дожимает обещания до claimed rewards.",
      tone: "success",
    });
  }

  if (guild.metrics.highRiskClears >= 1) {
    badges.push({
      key: "elite-explorers",
      label: "Elite explorers",
      description: "High-risk и elite clears превращают PvE в публичный prestige signal.",
      tone: "accent",
    });
  }

  if (badges.length === 0 || guild.score < 45) {
    badges.unshift({
      key: "rising-guild",
      label: "Rising guild",
      description: "Гильдия уже собирает первые подтверждённые social signals и растёт на глазах каталога.",
      tone: "warning",
    });
  }

  return badges.slice(0, 3);
}

function getPrestigeTier(score: number) {
  return [...prestigeTierDefinitions].reverse().find((tier) => score >= tier.minScore) ?? prestigeTierDefinitions[0];
}

function buildPrestigeSpotlight(contribution: GuildPrestigeContribution | null, tierDescription: string) {
  if (!contribution || contribution.score <= 0) {
    return "Первые успешные продажи, контракты, сделки или high-risk clears быстро поднимут social видимость этой гильдии.";
  }

  if (contribution.key === "market-sales") {
    return "Лоты этой гильдии уже превращаются в реальные сделки и создают ощущение надёжной витрины.";
  }

  if (contribution.key === "buy-order-fulfillment") {
    return "Гильдия закрывает чужой спрос и потому выглядит приятной стороной для request-driven взаимодействия.";
  }

  if (contribution.key === "reliable-deals") {
    return "Accepted deals показывают, что гильдия не просто пишет предложения, а доводит их до результата.";
  }

  if (contribution.key === "completed-contracts") {
    return "Contract board уже работает на публичный статус этой гильдии и делает её дисциплину видимой.";
  }

  if (contribution.key === "elite-pve") {
    return "Frontier prestige подкреплён high-risk clears, так что сила гильдии чувствуется и за пределами витрины рынка.";
  }

  return tierDescription;
}

function buildGuildPrestige(input: {
  createdAt: Date;
  metrics: SocialGuildMetrics;
}) {
  const rankingContributions = prestigeContributionDefinitions
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      value: definition.getValue({ metrics: input.metrics }),
      score: definition.getScore({ metrics: input.metrics }),
      detail: definition.getDetail({ metrics: input.metrics }),
    }))
    .sort((left, right) => right.score - left.score || right.value - left.value || left.label.localeCompare(right.label, "ru"));
  const score = rankingContributions.reduce((sum, contribution) => sum + contribution.score, 0);
  const tier = getPrestigeTier(score);
  const leadingContribution = rankingContributions.find((contribution) => contribution.score > 0) ?? null;
  const badges = buildPrestigeBadges({
    createdAt: input.createdAt,
    metrics: input.metrics,
    score,
  });

  return {
    score,
    rank: 0,
    total: 0,
    tierKey: tier.key,
    tierLabel: tier.label,
    descriptor: leadingContribution
      ? `${tier.description} Главный prestige-вклад идёт из слоя «${leadingContribution.label.toLowerCase()}».`
      : tier.description,
    summary: badges.length > 0 ? `${tier.label} · ${badges.map((badge) => badge.label).join(" · ")}` : tier.label,
    spotlight: buildPrestigeSpotlight(leadingContribution, tier.description),
    tone: tier.tone,
    recentTrustActions: input.metrics.recentTrustActions,
    recentTrustLabel:
      input.metrics.recentTrustActions > 0
        ? `${input.metrics.recentTrustActions} trust signals за последние 72 часа.`
        : "Свежих trust signals пока мало, но база для роста уже видна.",
    primaryBadgeLabel: badges[0]?.label ?? null,
    badges,
    rankingContributions,
  } satisfies GuildPrestigeSnapshot;
}

function buildComputedGuild(input: {
  guild: SocialGuildRecord;
  currentGuildTag: string | null;
  locations: Array<{ code: string; name: string; requiredGuildLevel: number }>;
  guildDirectory: Map<string, { id: string; name: string; tag: string }>;
  marketMetrics: Map<string, { active: number; sold: number; soldValue: number; recentSold: number }>;
  buyOrderBuyerMetrics: Map<string, { active: number; fulfilled: number }>;
  buyOrderSupplierMetrics: Map<string, { count: number; recent: number }>;
  ledgerMetrics: Map<string, { contracts: number; trades: number; recentContracts: number; recentTrades: number }>;
  counterpartyMemories: Map<string, Map<string, RawCounterpartyMemory>>;
  expeditionMetrics: Map<string, {
    active: number;
    completed: number;
    claimed: number;
    highRisk: number;
    elite: number;
    triumphs: number;
    recentPrestige: number;
  }>;
}) {
  const marketMetrics = input.marketMetrics.get(input.guild.id) ?? {
    active: 0,
    sold: 0,
    soldValue: 0,
    recentSold: 0,
  };
  const buyOrderBuyerMetrics = input.buyOrderBuyerMetrics.get(input.guild.id) ?? { active: 0, fulfilled: 0 };
  const buyOrderSupplierMetrics = input.buyOrderSupplierMetrics.get(input.guild.id) ?? { count: 0, recent: 0 };
  const ledgerMetrics = input.ledgerMetrics.get(input.guild.id) ?? {
    contracts: 0,
    trades: 0,
    recentContracts: 0,
    recentTrades: 0,
  };
  const expeditionMetrics = input.expeditionMetrics.get(input.guild.id) ?? {
    active: 0,
    completed: 0,
    claimed: 0,
    highRisk: 0,
    elite: 0,
    triumphs: 0,
    recentPrestige: 0,
  };
  const rosterPower = input.guild.heroes.reduce((sum, hero) => sum + hero.powerScore, 0);
  const highestHeroPower = input.guild.heroes[0]?.powerScore ?? 0;
  const pveMetrics = buildPveMetrics(input.guild.level, input.locations);
  const completedExpeditions = expeditionMetrics.completed + expeditionMetrics.claimed;
  const marketActivity =
    marketMetrics.active +
    marketMetrics.sold +
    buyOrderBuyerMetrics.active +
    buyOrderBuyerMetrics.fulfilled +
    buyOrderSupplierMetrics.count;
  const metrics = {
    level: input.guild.level,
    wealth: input.guild.gold,
    power: rosterPower,
    market: marketActivity,
    heroCount: input.guild.heroes.length,
    highestHeroPower,
    activeListingsCount: marketMetrics.active,
    soldListingsCount: marketMetrics.sold,
    soldListingsValue: marketMetrics.soldValue,
    activeBuyOrdersCount: buyOrderBuyerMetrics.active,
    fulfilledBuyOrdersCount: buyOrderBuyerMetrics.fulfilled,
    fulfilledSupplyCount: buyOrderSupplierMetrics.count,
    contractsCompleted: ledgerMetrics.contracts,
    acceptedTradesCount: ledgerMetrics.trades,
    activeExpeditions: expeditionMetrics.active,
    completedExpeditions,
    highRiskClears: expeditionMetrics.highRisk,
    eliteClears: expeditionMetrics.elite,
    triumphClears: expeditionMetrics.triumphs,
    unlockedLocationCount: pveMetrics.unlockedLocationCount,
    totalLocationCount: pveMetrics.totalLocationCount,
    highestUnlockedRiskLabel: pveMetrics.highestUnlockedRiskLabel,
    recentTrustActions:
      marketMetrics.recentSold +
      buyOrderSupplierMetrics.recent +
      ledgerMetrics.recentContracts +
      ledgerMetrics.recentTrades +
      expeditionMetrics.recentPrestige,
  } satisfies SocialGuildMetrics;
  const reputation = buildGuildPrestige({
    createdAt: input.guild.createdAt,
    metrics,
  });
  const counterpartySnapshot = buildFavoriteCounterparties({
    guildId: input.guild.id,
    currentGuildTag: input.currentGuildTag,
    guildDirectory: input.guildDirectory,
    counterpartyMemories: input.counterpartyMemories,
  });
  const renown = buildGuildRenown({
    recurringSummary: counterpartySnapshot.recurringSummary,
    favoriteCounterparties: counterpartySnapshot.top,
  });

  return {
    id: input.guild.id,
    name: input.guild.name,
    tag: input.guild.tag,
    level: input.guild.level,
    xp: input.guild.xp,
    gold: input.guild.gold,
    createdAt: input.guild.createdAt,
    ownerUserId: input.guild.user.id,
    ownerDisplayName: input.guild.user.displayName,
    heroSlotLimit: input.guild.activeHeroSlots,
    marketUnlocked: Boolean(input.guild.marketUnlockedAt),
    tradeUnlocked: Boolean(input.guild.tradeUnlockedAt),
    heroes: input.guild.heroes,
    metrics,
    reputation,
    renown,
    recurringSummary: counterpartySnapshot.recurringSummary,
    favoriteCounterparties: counterpartySnapshot.top,
    pveLabel: `${pveMetrics.unlockedLocationCount}/${pveMetrics.totalLocationCount} зон · ${pveMetrics.highestUnlockedRiskLabel}`,
    socialSummary:
      counterpartySnapshot.recurringSummary.favoriteCounterpartyLabel
        ? `${renown.summary}. Любимый дом: ${counterpartySnapshot.recurringSummary.favoriteCounterpartyLabel}. ${renown.spotlight}`
        : `${renown.summary}. ${renown.spotlight}`,
    profileHref: buildGuildProfileHref(input.guild.tag),
    marketHref: buildGuildMarketContextHref(input.guild.tag),
    dealsHref: buildGuildDealsContextHref(input.guild.tag),
    isCurrentContext: input.guild.tag === input.currentGuildTag,
  } satisfies SocialComputedGuild;
}

function rankGuilds(
  guilds: SocialComputedGuild[],
  definition: (typeof leaderboardDefinitions)[number],
) {
  return [...guilds].sort((left, right) => {
    const metricDelta = definition.getValue(right) - definition.getValue(left);

    if (metricDelta !== 0) {
      return metricDelta;
    }

    const renownDelta = right.renown.score - left.renown.score;

    if (renownDelta !== 0) {
      return renownDelta;
    }

    const reputationDelta = right.reputation.score - left.reputation.score;

    if (reputationDelta !== 0) {
      return reputationDelta;
    }

    return right.metrics.power - left.metrics.power || left.tag.localeCompare(right.tag, "ru");
  });
}

async function loadComputedGuilds(currentGuildTag: string | null) {
  const [locations, guilds, marketRows, buyOrderRows, tradeOfferRows, ledgerRows, expeditionRows] = await Promise.all([
    prisma.location.findMany({
      where: { isEnabled: true },
      orderBy: { requiredGuildLevel: "asc" },
      select: {
        code: true,
        name: true,
        requiredGuildLevel: true,
      },
    }),
    prisma.guild.findMany({
      orderBy: [{ level: "desc" }, { tag: "asc" }],
      select: socialGuildSelect,
    }),
    prisma.marketListing.findMany({
      select: {
        sellerGuildId: true,
        buyerGuildId: true,
        status: true,
        totalPriceGold: true,
        soldAt: true,
      },
    }),
    prisma.buyOrder.findMany({
      select: {
        buyerGuildId: true,
        fulfillerGuildId: true,
        status: true,
        fulfilledAt: true,
      },
    }),
    prisma.tradeOffer.findMany({
      where: { status: TradeOfferStatus.ACCEPTED },
      select: {
        senderGuildId: true,
        receiverGuildId: true,
        status: true,
        createdAt: true,
        respondedAt: true,
      },
    }),
    prisma.economyLedgerEntry.findMany({
      where: {
        eventType: {
          in: [EconomyEventType.CONTRACT_REWARD, EconomyEventType.TRADE_COMPLETED],
        },
      },
      select: {
        guildId: true,
        eventType: true,
        createdAt: true,
      },
    }),
    prisma.expedition.findMany({
      select: {
        guildId: true,
        status: true,
        resultTier: true,
        resolvedAt: true,
        claimedAt: true,
        location: {
          select: {
            code: true,
            requiredGuildLevel: true,
          },
        },
      },
    }),
  ]);

  const guildDirectory = new Map(guilds.map((guild) => [guild.id, { id: guild.id, name: guild.name, tag: guild.tag }]));
  const marketMetrics = buildMarketMetrics(marketRows);
  const buyOrderBuyerMetrics = buildBuyOrderBuyerMetrics(buyOrderRows);
  const buyOrderSupplierMetrics = buildBuyOrderSupplierMetrics(buyOrderRows);
  const counterpartyMemories = buildCounterpartyMemories({
    marketRows,
    buyOrderRows,
    tradeOfferRows,
  });
  const ledgerMetrics = buildLedgerMetrics(ledgerRows);
  const expeditionMetrics = buildExpeditionMetrics(expeditionRows);
  const computedGuilds = guilds.map((guild) =>
    buildComputedGuild({
      guild,
      currentGuildTag,
      locations,
      guildDirectory,
      marketMetrics,
      buyOrderBuyerMetrics,
      buyOrderSupplierMetrics,
      ledgerMetrics,
      counterpartyMemories,
      expeditionMetrics,
    }),
  );
  const renownRankedGuilds = [...computedGuilds].sort((left, right) => {
    return (
      right.renown.score - left.renown.score ||
      right.reputation.score - left.reputation.score ||
      right.metrics.power - left.metrics.power ||
      left.tag.localeCompare(right.tag, "ru")
    );
  });
  const prestigeRankedGuilds = [...computedGuilds].sort((left, right) => {
    return (
      right.reputation.score - left.reputation.score ||
      right.renown.score - left.renown.score ||
      right.metrics.power - left.metrics.power ||
      left.tag.localeCompare(right.tag, "ru")
    );
  });
  const total = prestigeRankedGuilds.length;
  const renownRanks = new Map(renownRankedGuilds.map((guild, index) => [guild.id, index + 1]));
  const prestigeRanks = new Map(prestigeRankedGuilds.map((guild, index) => [guild.id, index + 1]));

  return computedGuilds.map((guild) => ({
    ...guild,
    renown: {
      ...guild.renown,
      rank: renownRanks.get(guild.id) ?? total,
      total,
    },
    reputation: {
      ...guild.reputation,
      rank: prestigeRanks.get(guild.id) ?? total,
      total,
    },
  }));
}

function buildLeaderboards(guilds: SocialComputedGuild[]) {
  return leaderboardDefinitions.map((definition) => {
    const rankedGuilds = rankGuilds(guilds, definition);

    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      metricLabel: definition.metricLabel,
      entries: rankedGuilds.slice(0, 5).map((guild, index) => ({
        rank: index + 1,
        guildId: guild.id,
        guildName: guild.name,
        guildTag: guild.tag,
        ownerDisplayName: guild.ownerDisplayName,
        value: definition.getValue(guild),
        valueLabel: definition.getValueLabel(guild),
        detail: definition.getDetail(guild),
        href: guild.profileHref,
        isCurrentContext: guild.isCurrentContext,
        tierLabel: guild.reputation.tierLabel,
        renownTierLabel: guild.renown.tierLabel,
        primaryBadgeLabel: guild.reputation.primaryBadgeLabel,
        primaryRenownPerkLabel: guild.renown.primaryPerkLabel,
        favoriteCounterpartyLabel: guild.renown.favoriteCounterpartyLabel,
      })),
    } satisfies GuildLeaderboardSnapshot;
  });
}

function buildLeaderboardPlacements(guilds: SocialComputedGuild[], guildId: string) {
  return leaderboardDefinitions.map((definition) => {
    const rankedGuilds = rankGuilds(guilds, definition);
    const rankIndex = rankedGuilds.findIndex((guild) => guild.id === guildId);
    const targetGuild = rankIndex >= 0 ? rankedGuilds[rankIndex] : null;

    return {
      key: definition.key,
      title: definition.title,
      rank: rankIndex >= 0 ? rankIndex + 1 : rankedGuilds.length,
      total: rankedGuilds.length,
      valueLabel: targetGuild ? definition.getValueLabel(targetGuild) : "—",
      detail: targetGuild ? definition.getDetail(targetGuild) : "Данные временно недоступны.",
    };
  });
}

function buildListingDetails(listing: {
  quantity: number;
  totalPriceGold: number;
  resourceType: ResourceType | null;
  itemDefinition: {
    name: string;
    powerScore: number;
  } | null;
}) {
  if (listing.itemDefinition) {
    return {
      itemLabel: listing.itemDefinition.name,
      detailLabel:
        listing.itemDefinition.powerScore > 0
          ? `${listing.itemDefinition.powerScore} power`
          : `${listing.quantity} шт.`,
      valueSummary: `Цена ${listing.totalPriceGold} зол.`,
    };
  }

  if (listing.resourceType) {
    const resourceLabel = getResourceLabel(listing.resourceType);
    const pricePerUnit = Math.max(1, Math.round(listing.totalPriceGold / Math.max(1, listing.quantity)));

    return {
      itemLabel: resourceLabel,
      detailLabel: `${resourceLabel} · ${listing.quantity} шт.`,
      valueSummary: `${pricePerUnit} зол./шт.`,
    };
  }

  return {
    itemLabel: "Товар",
    detailLabel: `${listing.quantity} шт.`,
    valueSummary: `Цена ${listing.totalPriceGold} зол.`,
  };
}

function buildActivityDetail(input: {
  goldDelta: number;
  resourceType: ResourceType | null;
  resourceDelta: number | null;
  itemName: string | null;
}) {
  const parts: string[] = [];

  if (input.goldDelta !== 0) {
    parts.push(`${input.goldDelta > 0 ? "+" : ""}${input.goldDelta} зол.`);
  }

  if (input.resourceType && input.resourceDelta) {
    parts.push(
      `${input.resourceDelta > 0 ? "+" : ""}${input.resourceDelta} ${getResourceLabel(input.resourceType)}`,
    );
  }

  if (input.itemName) {
    parts.push(input.itemName);
  }

  return parts.join(" · ") || "Статус обновлён.";
}

function mapToPrestigeSummary(guild: SocialComputedGuild): GuildPrestigeSummary {
  return {
    guildId: guild.id,
    guildName: guild.name,
    guildTag: guild.tag,
    profileHref: guild.profileHref,
    marketHref: guild.marketHref,
    dealsHref: guild.dealsHref,
    isCurrentContext: guild.isCurrentContext,
    renown: {
      score: guild.renown.score,
      rank: guild.renown.rank,
      total: guild.renown.total,
      tierKey: guild.renown.tierKey,
      tierLabel: guild.renown.tierLabel,
      descriptor: guild.renown.descriptor,
      summary: guild.renown.summary,
      spotlight: guild.renown.spotlight,
      tone: guild.renown.tone,
      recentInteractionCount: guild.renown.recentInteractionCount,
      recentInteractionLabel: guild.renown.recentInteractionLabel,
      recurringCounterparties: guild.renown.recurringCounterparties,
      recurringLabel: guild.renown.recurringLabel,
      favoriteCounterpartyLabel: guild.renown.favoriteCounterpartyLabel,
      primaryBadgeLabel: guild.renown.primaryBadgeLabel,
      primaryPerkLabel: guild.renown.primaryPerkLabel,
      badges: guild.renown.badges,
      perks: guild.renown.perks,
    },
    prestige: {
      score: guild.reputation.score,
      rank: guild.reputation.rank,
      total: guild.reputation.total,
      tierKey: guild.reputation.tierKey,
      tierLabel: guild.reputation.tierLabel,
      descriptor: guild.reputation.descriptor,
      summary: guild.reputation.summary,
      spotlight: guild.reputation.spotlight,
      tone: guild.reputation.tone,
      recentTrustActions: guild.reputation.recentTrustActions,
      recentTrustLabel: guild.reputation.recentTrustLabel,
      primaryBadgeLabel: guild.reputation.primaryBadgeLabel,
      badges: guild.reputation.badges,
    },
    recurringSummary: guild.recurringSummary,
    favoriteCounterparties: guild.favoriteCounterparties,
  };
}

export async function loadGuildPrestigeSummaries(currentGuildTag: string | null) {
  const guilds = await loadComputedGuilds(currentGuildTag);

  return guilds
    .sort((left, right) => {
      return (
        right.renown.score - left.renown.score ||
        right.reputation.score - left.reputation.score ||
        right.level - left.level ||
        right.metrics.power - left.metrics.power ||
        left.tag.localeCompare(right.tag, "ru")
      );
    })
    .map(mapToPrestigeSummary);
}

export async function loadGuildDirectoryPageData(): Promise<GuildDirectoryPageData> {
  const currentGuild = await getActiveGuildIdentity();
  const [guilds, worldEventBoard] = await Promise.all([
    loadComputedGuilds(currentGuild?.tag ?? null),
    loadWorldEventBoardSnapshot({
      currentGuildTag: currentGuild?.tag ?? null,
      focusGuildTag: currentGuild?.tag ?? null,
    }),
  ]);
  const leaderboards = buildLeaderboards(guilds);

  return {
    currentGuildTag: currentGuild?.tag ?? null,
    worldEventBoard,
    community: {
      guildCount: guilds.length,
      playerCount: guilds.length,
      activeListings: guilds.reduce((sum, guild) => sum + guild.metrics.activeListingsCount, 0),
      activeBuyOrders: guilds.reduce((sum, guild) => sum + guild.metrics.activeBuyOrdersCount, 0),
      contractsClaimed: guilds.reduce((sum, guild) => sum + guild.metrics.contractsCompleted, 0),
      resolvedExpeditions: guilds.reduce((sum, guild) => sum + guild.metrics.completedExpeditions, 0),
      prestigeLeaders: guilds.filter((guild) => guild.reputation.score >= 45).length,
      renownLeaders: guilds.filter((guild) => guild.renown.score >= 36).length,
      recentTrustActions: guilds.reduce((sum, guild) => sum + guild.metrics.recentTrustActions, 0),
      recurringPairs: guilds.reduce((sum, guild) => sum + guild.recurringSummary.recurringCounterparties, 0),
    },
    leaderboards,
    guilds: [...guilds]
      .sort((left, right) => {
        const renownDelta = right.renown.score - left.renown.score;

        if (renownDelta !== 0) {
          return renownDelta;
        }

        const prestigeDelta = right.reputation.score - left.reputation.score;

        if (prestigeDelta !== 0) {
          return prestigeDelta;
        }

        return right.metrics.power - left.metrics.power || left.tag.localeCompare(right.tag, "ru");
      })
      .map((guild) => ({
        guildId: guild.id,
        guildName: guild.name,
        guildTag: guild.tag,
        ownerDisplayName: guild.ownerDisplayName,
        prestige: guild.reputation,
        renown: guild.renown,
        level: guild.level,
        gold: guild.gold,
        rosterPower: guild.metrics.power,
        heroCount: guild.metrics.heroCount,
        marketActivity: guild.metrics.market,
        marketActivityLabel:
          `Продаж ${guild.metrics.soldListingsCount} · закрыто спроса ${guild.metrics.fulfilledSupplyCount} · ` +
          `live-лотов ${guild.metrics.activeListingsCount}`,
        contractsCompleted: guild.metrics.contractsCompleted,
        privateDealsCompleted: guild.metrics.acceptedTradesCount,
        completedExpeditions: guild.metrics.completedExpeditions,
        pveLabel: guild.pveLabel,
        socialSummary: guild.socialSummary,
        favoriteCounterparties: guild.favoriteCounterparties,
        recurringSummary: guild.recurringSummary,
        profileHref: guild.profileHref,
        marketHref: guild.marketHref,
        dealsHref: guild.dealsHref,
        isCurrentContext: guild.isCurrentContext,
      })),
    players: [...guilds]
      .sort((left, right) => {
        return (
          right.renown.score - left.renown.score ||
          right.reputation.score - left.reputation.score ||
          right.metrics.power - left.metrics.power ||
          left.ownerDisplayName.localeCompare(right.ownerDisplayName, "ru")
        );
      })
      .map((guild) => ({
        userId: guild.ownerUserId,
        displayName: guild.ownerDisplayName,
        guildName: guild.name,
        guildTag: guild.tag,
        prestige: guild.reputation,
        renown: guild.renown,
        guildLevel: guild.level,
        rosterPower: guild.metrics.power,
        marketActivity: guild.metrics.market,
        joinedAt: guild.createdAt,
        socialSummary: guild.socialSummary,
        profileHref: guild.profileHref,
        dealsHref: guild.dealsHref,
        isCurrentContext: guild.isCurrentContext,
      })),
  };
}

export async function loadGuildPublicProfilePageData(
  guildTag: string,
): Promise<GuildPublicProfilePageData> {
  const normalizedGuildTag = guildTag.trim().toUpperCase();

  if (!normalizedGuildTag) {
    throw new Error("Публичная гильдия не найдена.");
  }

  const currentGuild = await getActiveGuildIdentity();
  const [guilds, worldEventBoard] = await Promise.all([
    loadComputedGuilds(currentGuild?.tag ?? null),
    loadWorldEventBoardSnapshot({
      currentGuildTag: currentGuild?.tag ?? null,
      focusGuildTag: normalizedGuildTag,
    }),
  ]);
  const computedGuild = guilds.find((guild) => guild.tag === normalizedGuildTag) ?? null;

  if (!computedGuild) {
    throw new Error("Публичная гильдия не найдена.");
  }

  const [guildDetail, soldListings, fulfilledOrders, recentLedgerEntries, recentExpeditions] = await Promise.all([
    prisma.guild.findUnique({
      where: { id: computedGuild.id },
      select: {
        heroes: {
          orderBy: [{ powerScore: "desc" }, { level: "desc" }, { name: "asc" }],
          take: 6,
          select: {
            id: true,
            name: true,
            heroClass: true,
            level: true,
            heroXp: true,
            powerScore: true,
            rarity: true,
            status: true,
          },
        },
        marketListingsAsSeller: {
          where: { status: MarketListingStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            listingType: true,
            quantity: true,
            totalPriceGold: true,
            expiresAt: true,
            resourceType: true,
            itemDefinition: {
              select: {
                name: true,
                powerScore: true,
              },
            },
          },
        },
        buyOrdersAsBuyer: {
          where: { status: BuyOrderStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            resourceType: true,
            quantity: true,
            totalPriceGold: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.marketListing.findMany({
      where: {
        sellerGuildId: computedGuild.id,
        status: MarketListingStatus.SOLD,
      },
      orderBy: { soldAt: "desc" },
      take: 4,
      select: {
        id: true,
        quantity: true,
        totalPriceGold: true,
        saleTaxGold: true,
        soldAt: true,
        resourceType: true,
        itemDefinition: {
          select: {
            name: true,
            powerScore: true,
          },
        },
        buyerGuild: {
          select: {
            name: true,
            tag: true,
          },
        },
      },
    }),
    prisma.buyOrder.findMany({
      where: {
        fulfillerGuildId: computedGuild.id,
        status: BuyOrderStatus.FULFILLED,
      },
      orderBy: { fulfilledAt: "desc" },
      take: 4,
      select: {
        id: true,
        resourceType: true,
        quantity: true,
        totalPriceGold: true,
        fulfilledAt: true,
        buyerGuild: {
          select: {
            name: true,
            tag: true,
          },
        },
      },
    }),
    prisma.economyLedgerEntry.findMany({
      where: {
        guildId: computedGuild.id,
        eventType: {
          in: [EconomyEventType.TRADE_COMPLETED, EconomyEventType.CONTRACT_REWARD],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        eventType: true,
        goldDelta: true,
        resourceType: true,
        resourceDelta: true,
        counterpartyGuildId: true,
        createdAt: true,
        inventoryItem: {
          select: {
            itemDefinition: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.expedition.findMany({
      where: {
        guildId: computedGuild.id,
        status: { in: [ExpeditionStatus.COMPLETED, ExpeditionStatus.CLAIMED] },
      },
      orderBy: [{ claimedAt: "desc" }, { resolvedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        resultTier: true,
        rewardGold: true,
        rewardGuildXp: true,
        resultSummary: true,
        claimedAt: true,
        resolvedAt: true,
        location: {
          select: {
            name: true,
            code: true,
            requiredGuildLevel: true,
          },
        },
      },
    }),
  ]);

  if (!guildDetail) {
    throw new Error("Публичная гильдия не найдена.");
  }

  const counterpartyIds = [...new Set(
    recentLedgerEntries
      .map((entry) => entry.counterpartyGuildId)
      .filter((value): value is string => Boolean(value)),
  )];
  const counterparties = counterpartyIds.length > 0
    ? await prisma.guild.findMany({
      where: { id: { in: counterpartyIds } },
      select: { id: true, name: true, tag: true },
    })
    : [];
  const counterpartyMap = new Map(counterparties.map((guild) => [guild.id, guild]));

  const trustActivity = [
    ...soldListings.map((listing) => {
      const details = buildListingDetails(listing);
      const buyerLabel = listing.buyerGuild ? `${listing.buyerGuild.name} [${listing.buyerGuild.tag}]` : "другая гильдия";
      const payoutGold = Math.max(0, listing.totalPriceGold - (listing.saleTaxGold ?? 0));

      return {
        id: `sale-${listing.id}`,
        sourceLabel: "Market",
        title: "Завершена публичная продажа",
        summary: `${details.itemLabel} ушёл гильдии ${buyerLabel}.`,
        detail: `${details.detailLabel} · ${listing.totalPriceGold} зол. брутто · ${payoutGold} зол. после tax.`,
        prestigeImpactLabel: "+market credibility",
        at: listing.soldAt ?? new Date(0),
        href: "/market",
        tone: "success" as const,
        counterpartyGuildTag: listing.buyerGuild?.tag ?? null,
      };
    }),
    ...fulfilledOrders.map((order) => ({
      id: `fulfillment-${order.id}`,
      sourceLabel: "Market",
      title: "Закрыт чужой buy order",
      summary: `${order.buyerGuild.name} [${order.buyerGuild.tag}] получила ${getResourceLabel(order.resourceType)}.`,
      detail: `${order.quantity} × ${getResourceLabel(order.resourceType)} · payout ${order.totalPriceGold} зол.`,
      prestigeImpactLabel: "+demand broker",
      at: order.fulfilledAt ?? new Date(0),
      href: "/market",
      tone: "success" as const,
      counterpartyGuildTag: order.buyerGuild.tag,
    })),
    ...recentLedgerEntries.map((entry) => {
      const counterparty = entry.counterpartyGuildId ? counterpartyMap.get(entry.counterpartyGuildId) ?? null : null;
      const counterpartyLabel = counterparty ? `${counterparty.name} [${counterparty.tag}]` : null;
      const detail = buildActivityDetail({
        goldDelta: entry.goldDelta,
        resourceType: entry.resourceType,
        resourceDelta: entry.resourceDelta,
        itemName: entry.inventoryItem?.itemDefinition.name ?? null,
      });

      if (entry.eventType === EconomyEventType.TRADE_COMPLETED) {
        return {
          id: `trade-${entry.id}`,
          sourceLabel: "Deals",
          title: "Подтверждена private deal",
          summary: counterpartyLabel
            ? `Обмен с ${counterpartyLabel} дошёл до финального акцепта.`
            : "Private deal завершилась и добавила гильдии trust credit.",
          detail,
          prestigeImpactLabel: "+reliable deal",
          at: entry.createdAt,
          href: "/deals",
          tone: "success" as const,
          counterpartyGuildTag: counterparty?.tag ?? null,
        };
      }

      return {
        id: `contract-${entry.id}`,
        sourceLabel: "Contracts",
        title: "Забран contract reward",
        summary: "Objective board снова превратился в claimed reward и social credit.",
        detail,
        prestigeImpactLabel: "+contract prestige",
        at: entry.createdAt,
        href: "/dashboard",
        tone: "accent" as const,
        counterpartyGuildTag: counterparty?.tag ?? null,
      };
    }),
    ...recentExpeditions
      .filter((expedition) => {
        return (
          (expedition.resultTier === ExpeditionResultTier.SUCCESS ||
            expedition.resultTier === ExpeditionResultTier.TRIUMPH)
          && getRiskScore(expedition.location.code, expedition.location.requiredGuildLevel) >= 3
        );
      })
      .map((expedition) => ({
        id: `expedition-${expedition.id}`,
        sourceLabel: "PvE",
        title: "High-risk clear закреплён",
        summary: `${expedition.location.name} дала гильдии новый frontier prestige signal.`,
        detail:
          `${getRiskLabel(getRiskScore(expedition.location.code, expedition.location.requiredGuildLevel))} · ` +
          `${expedition.rewardGold} зол. · ${expedition.rewardGuildXp} XP. ${expedition.resultSummary ?? ""}`.trim(),
        prestigeImpactLabel: expedition.resultTier === ExpeditionResultTier.TRIUMPH ? "+elite glory" : "+frontier prestige",
        at: expedition.claimedAt ?? expedition.resolvedAt ?? new Date(0),
        href: "/expedition",
        tone: expedition.resultTier === ExpeditionResultTier.TRIUMPH ? "accent" as const : "success" as const,
        counterpartyGuildTag: null,
      })),
  ]
    .filter((entry) => entry.at.getTime() > 0)
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 8);

  return {
    currentGuildTag: currentGuild?.tag ?? null,
    worldEventBoard,
    guild: {
      id: computedGuild.id,
      name: computedGuild.name,
      tag: computedGuild.tag,
      ownerDisplayName: computedGuild.ownerDisplayName,
      ownerSince: computedGuild.createdAt,
      level: computedGuild.level,
      xp: computedGuild.xp,
      nextLevelXp: getNextLevelXp(computedGuild.level),
      gold: computedGuild.gold,
      rosterPower: computedGuild.metrics.power,
      heroCount: computedGuild.metrics.heroCount,
      heroSlotLimit: computedGuild.heroSlotLimit,
      highestHeroPower: computedGuild.metrics.highestHeroPower,
      marketUnlocked: computedGuild.marketUnlocked,
      tradeUnlocked: computedGuild.tradeUnlocked,
      marketActivity: computedGuild.metrics.market,
      activeListingsCount: computedGuild.metrics.activeListingsCount,
      activeBuyOrdersCount: computedGuild.metrics.activeBuyOrdersCount,
      contractsCompleted: computedGuild.metrics.contractsCompleted,
      privateDealsCompleted: computedGuild.metrics.acceptedTradesCount,
      completedExpeditions: computedGuild.metrics.completedExpeditions,
      activeExpeditions: computedGuild.metrics.activeExpeditions,
      pveLabel: computedGuild.pveLabel,
      highestUnlockedRiskLabel: computedGuild.metrics.highestUnlockedRiskLabel,
      socialSummary: computedGuild.socialSummary,
      isCurrentContext: computedGuild.isCurrentContext,
    },
    prestige: computedGuild.reputation,
    renown: computedGuild.renown,
    leaderboardPlacements: buildLeaderboardPlacements(guilds, computedGuild.id),
    featuredHeroes: guildDetail.heroes.map((hero) => ({
      id: hero.id,
      name: hero.name,
      heroClassLabel: getHeroClassLabel(hero.heroClass),
      level: hero.level,
      heroXp: hero.heroXp,
      powerScore: hero.powerScore,
      rarityLabel: getRarityLabel(hero.rarity),
      statusLabel: getHeroStatusLabel(hero.status),
    })),
    activeListings: guildDetail.marketListingsAsSeller.map((listing) => {
      const details = buildListingDetails(listing);

      return {
        id: listing.id,
        listingTypeLabel: getListingTypeLabel(listing.listingType),
        itemLabel: details.itemLabel,
        quantity: listing.quantity,
        totalPriceGold: listing.totalPriceGold,
        detailLabel: details.detailLabel,
        valueSummary: details.valueSummary,
        expiresAt: listing.expiresAt,
      };
    }),
    activeBuyOrders: guildDetail.buyOrdersAsBuyer.map((order) => ({
      id: order.id,
      resourceLabel: getResourceLabel(order.resourceType),
      quantity: order.quantity,
      totalPriceGold: order.totalPriceGold,
      priceSummary: `${order.totalPriceGold} зол. суммой · ${Math.max(1, Math.round(order.totalPriceGold / Math.max(1, order.quantity)))} зол./шт.`,
      expiresAt: order.expiresAt,
    })),
    recentActivity: trustActivity,
    socialMemory: trustActivity.map((entry) => ({
      id: entry.id,
      sourceLabel: entry.sourceLabel,
      title: entry.title,
      summary: entry.summary,
      detail: entry.detail,
      at: entry.at,
      href: entry.href,
      tone: entry.tone,
      counterpartyGuildTag: entry.counterpartyGuildTag,
    })),
    favoriteTraders: computedGuild.favoriteCounterparties,
    recurringSummary: computedGuild.recurringSummary,
    socialCtas: {
      directoryHref: "/guilds",
      marketHref: buildGuildMarketContextHref(computedGuild.tag),
      dealsHref: buildGuildDealsContextHref(computedGuild.tag),
    },
  };
}
