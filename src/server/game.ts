import {
  BuyOrderStatus,
  EconomyEventType,
  EquipmentSlot,
  ExpeditionResultTier,
  ExpeditionStatus,
  GuildUpgradeType,
  HeroClass,
  HeroRarity,
  HeroStatus,
  InventoryItemState,
  ItemRarity,
  ItemType,
  ListingType,
  MarketClaimSourceType,
  MarketClaimStatus,
  MarketClaimType,
  MarketListingStatus,
  Prisma,
  ReservationType,
  ResourceType,
  TradeOfferSide,
  TradeOfferStatus,
} from "@prisma/client";

import {
  getBuyOrderStatusLabel,
  getExpeditionResultLabel,
  getClaimTypeLabel,
  getEconomyEventLabel,
  getExpeditionStatusLabel,
  getHeroClassLabel,
  getHeroClassTacticLabel,
  getHeroStatusLabel,
  getInventoryStateLabel,
  getItemTypeLabel,
  getListingTypeLabel,
  getMarketStatusLabel,
  getRarityLabel,
  getResourceLabel,
  getTradeStatusLabel,
  MARKET_RULE_SUMMARY,
  TRADE_RULE_SUMMARY,
} from "@/lib/domain";
import {
  buildGuildIdentityEditorSnapshot,
  type GuildIdentityEditorSnapshot,
  type GuildIdentitySnapshot,
} from "@/lib/guild-identity";
import { prisma } from "@/lib/prisma";
import {
  describeFoundationError,
  type FoundationResult,
  getActiveGuildIdentity,
} from "@/server/foundation";
import {
  loadDashboardSocialSnapshot,
  loadGuildDirectoryPageData,
  loadGuildPrestigeSummaries,
  loadGuildPublicProfilePageData,
  type GuildDirectoryPageData,
  type GuildPrestigeSummary,
  type GuildPublicProfilePageData,
  type GuildWatchlistSnapshot,
  type PersonalizedSocialFeedSnapshot,
  type WatchlistGuildCard,
} from "@/server/social";
import {
  buildWorldEventRewardLabels,
  buildWorldEventRewardReferenceId,
  getCurrentWorldEventSeasonSnapshot,
  getWorldEventClaimRecordForGuild,
  getWorldEventContributionForGuild,
  getWorldEventRewardTierDefinition,
  isWorldEventKey,
  isWorldEventRewardTierKey,
  loadWorldEventBoardSnapshot,
  loadWorldEventClaimStateTx,
  type WorldEventBoardSnapshot,
} from "@/server/world-events";

const GUILD_LEVEL_THRESHOLDS = [0, 60, 150, 300, 520, 800];
const HERO_LEVEL_THRESHOLDS = [0, 24, 60, 110, 180, 270, 380] as const;
const MARKET_LISTING_DURATION_HOURS = 12;
const BUY_ORDER_DURATION_HOURS = 12;
const MARKET_LISTING_FEE_GOLD = 3;
const MARKET_SALE_TAX_RATE = 0.1;
const MARKET_SLOT_UPGRADE_COSTS = [90, 160, 260] as const;
const WORKSHOP_FACILITY_UPGRADE_COSTS = [60, 115, 180] as const;
const HERO_SLOT_UPGRADE_COSTS = [45, 80, 125, 180] as const;
const TRADE_OFFER_DURATION_HOURS = 12;
const EXPEDITION_PARTY_SIZE = 3;
const HERO_RECRUITMENT_COST_GOLD = 55;
const SECOND_PARTY_TARGET = EXPEDITION_PARTY_SIZE * 2;
const MARKET_UNLOCK_LEVEL = 2;
const TRADE_UNLOCK_LEVEL = 3;
const TRADE_SLOT_UPGRADE_COSTS = [70, 110, 170] as const;
const WORKSHOP_CATALYST_RESOURCE = ResourceType.ARCANE_DUST;
const BASE_TRADE_SLOTS = 1;
const CONTRACT_REWARD_REFERENCE_PREFIX = "contract:";
const HERO_RARITY_ORDER = {
  [HeroRarity.COMMON]: 1,
  [HeroRarity.UNCOMMON]: 2,
  [HeroRarity.RARE]: 3,
} satisfies Record<HeroRarity, number>;
const MANAGED_GUILD_UPGRADES = [
  GuildUpgradeType.HERO_SLOTS,
  GuildUpgradeType.MARKET_SLOTS,
  GuildUpgradeType.STORAGE,
  GuildUpgradeType.TRADE_SLOTS,
] as const;

type ManagedGuildUpgradeType = (typeof MANAGED_GUILD_UPGRADES)[number];

type ExpeditionScenarioType =
  | "standard-route"
  | "supply-run"
  | "high-risk-route"
  | "elite-expedition";

type LocationScenarioProfile = {
  scenarioType: ExpeditionScenarioType;
  scenarioLabel: string;
  scenarioSummary: string;
  rewardFocusLabel: string;
  riskLabel: string;
  riskScore: number;
  isElite: boolean;
  specialRules: string[];
  hazardLabel: string;
  preferredClasses: HeroClass[];
  pressureMultiplier: number;
  opener: string;
  outcome: {
    goldMultiplier: number;
    guildXpMultiplier: number;
    heroXpMultiplier: number;
    resourceMultiplier: number;
    itemMultiplier: number;
    extraRolls: number;
    volatility: number;
    guaranteedResourceRolls: number;
    guaranteedItemRolls: number;
    triumphItemRolls: number;
    preferredRoleBonus: number;
    outcomePenalty: number;
  };
};

const LOCATION_PROFILES = {
  "green-glen": {
    scenarioType: "standard-route",
    scenarioLabel: "Стандартная экспедиция",
    scenarioSummary: "Базовый маршрут без сильного перекоса в risk/reward: безопаснее стартовать, чем форсить jackpot.",
    rewardFocusLabel: "Стабильные травы, кожа и ранние utility-предметы",
    riskLabel: "Низкий риск",
    riskScore: 1,
    isElite: false,
    specialRules: [
      "Служит baseline-маршрутом без перекоса в золото, ресурсы или rare drop-ы.",
      "Лучше всего показывает цену закрытия всех трёх ролей партии без специальных модификаторов.",
    ],
    hazardLabel: "Чаща, звериные засады и быстрые смены маршрута",
    preferredClasses: [HeroClass.RANGER, HeroClass.MYSTIC],
    pressureMultiplier: 0.9,
    opener: "Маршрут требует разведки и контроля темпа почти на каждом отрезке.",
    outcome: {
      goldMultiplier: 1,
      guildXpMultiplier: 1,
      heroXpMultiplier: 1,
      resourceMultiplier: 1,
      itemMultiplier: 1,
      extraRolls: 0,
      volatility: 12,
      guaranteedResourceRolls: 0,
      guaranteedItemRolls: 0,
      triumphItemRolls: 0,
      preferredRoleBonus: 2,
      outcomePenalty: 0,
    },
  },
  "green-glen-supply-line": {
    scenarioType: "supply-run",
    scenarioLabel: "Снабженческий рейс",
    scenarioSummary: "Маршрут под workshop-материалы: меньше золота, зато намного выше шанс вернуться с полезным сырьём.",
    rewardFocusLabel: "Много трав и кожи, меньше золота и guild XP",
    riskLabel: "Низкий риск",
    riskScore: 1,
    isElite: false,
    specialRules: [
      "Успешный рейс добавляет гарантированные resource-roll-ы поверх базового лута.",
      "Платит хуже обычной зоны по золоту и XP, зато quantity ресурсов заметно выше стандарта.",
    ],
    hazardLabel: "Интендантские тайники, короткие вылазки и давление на темп без тяжёлого боя",
    preferredClasses: [HeroClass.RANGER, HeroClass.MYSTIC],
    pressureMultiplier: 0.94,
    opener: "Рейс награждает за аккуратную навигацию и быстрое вытаскивание запасов с поля.",
    outcome: {
      goldMultiplier: 0.78,
      guildXpMultiplier: 0.82,
      heroXpMultiplier: 0.85,
      resourceMultiplier: 1.65,
      itemMultiplier: 0.75,
      extraRolls: 1,
      volatility: 8,
      guaranteedResourceRolls: 2,
      guaranteedItemRolls: 0,
      triumphItemRolls: 0,
      preferredRoleBonus: 3,
      outcomePenalty: 0,
    },
  },
  "old-quarry": {
    scenarioType: "standard-route",
    scenarioLabel: "Стандартная экспедиция",
    scenarioSummary: "Тяжёлый, но читаемый mid-tier маршрут: руда и фронтовой лут приходят стабильно, если партия держит строй.",
    rewardFocusLabel: "Руда, базовые фронтовые предметы и ровный payout",
    riskLabel: "Средний риск",
    riskScore: 2,
    isElite: false,
    specialRules: [
      "Даёт хороший baseline для сравнения с более жадными high-risk ветками.",
      "Сильнее штрафует за отсутствие авангарда, чем стартовые зоны.",
    ],
    hazardLabel: "Обвалы, тесные проходы и тяжёлые фронтовые стычки",
    preferredClasses: [HeroClass.VANGUARD, HeroClass.RANGER],
    pressureMultiplier: 1.02,
    opener: "Карьер наказывает за плохой фронт и слишком медленную навигацию.",
    outcome: {
      goldMultiplier: 1,
      guildXpMultiplier: 1,
      heroXpMultiplier: 1,
      resourceMultiplier: 1,
      itemMultiplier: 1,
      extraRolls: 0,
      volatility: 12,
      guaranteedResourceRolls: 0,
      guaranteedItemRolls: 0,
      triumphItemRolls: 0,
      preferredRoleBonus: 2,
      outcomePenalty: 0,
    },
  },
  "old-quarry-smuggler-cut": {
    scenarioType: "high-risk-route",
    scenarioLabel: "Высокорисковый маршрут",
    scenarioSummary: "Жадная ветка через контрабандные карманы: payoff по золоту заметно выше, но волатильность и шанс сорвать темп растут.",
    rewardFocusLabel: "Больше золота и guild XP, меньше надёжного сырья",
    riskLabel: "Высокий риск",
    riskScore: 3,
    isElite: false,
    specialRules: [
      "Разброс исходов шире обычного, поэтому setback здесь встречается заметно чаще baseline-зон.",
      "Триумф открывает дополнительный contraband item-roll и сильно бустит payout по золоту.",
    ],
    hazardLabel: "Срезы через обвалы, тёмные карманы и давление на темп ради раннего payout-а",
    preferredClasses: [HeroClass.VANGUARD, HeroClass.RANGER],
    pressureMultiplier: 1.12,
    opener: "Контрабандный обход награждает смелость, но наказывает за любой развал фронта почти мгновенно.",
    outcome: {
      goldMultiplier: 1.6,
      guildXpMultiplier: 1.35,
      heroXpMultiplier: 1.05,
      resourceMultiplier: 0.85,
      itemMultiplier: 1,
      extraRolls: 0,
      volatility: 24,
      guaranteedResourceRolls: 0,
      guaranteedItemRolls: 0,
      triumphItemRolls: 1,
      preferredRoleBonus: 4,
      outcomePenalty: 6,
    },
  },
  "sunken-archives": {
    scenarioType: "standard-route",
    scenarioLabel: "Стандартная экспедиция",
    scenarioSummary: "Длинный late-mid маршрут с хорошим балансом XP, пыли и rare utility-предметов.",
    rewardFocusLabel: "Чародейская пыль, rare utility-лут и ровный guild XP",
    riskLabel: "Высокий риск",
    riskScore: 3,
    isElite: false,
    specialRules: [
      "Остаётся самым надёжным способом закрыть arcane dust без ухода в extreme risk.",
      "Штрафует за слабую разведку и отсутствие мистика заметнее, чем карьер.",
    ],
    hazardLabel: "Аномалии, реликтовые ловушки и магическое истощение",
    preferredClasses: [HeroClass.MYSTIC, HeroClass.RANGER],
    pressureMultiplier: 1.1,
    opener: "Архивы проверяют, может ли партия одновременно читать угрозу и держать темп.",
    outcome: {
      goldMultiplier: 1,
      guildXpMultiplier: 1,
      heroXpMultiplier: 1,
      resourceMultiplier: 1,
      itemMultiplier: 1,
      extraRolls: 0,
      volatility: 12,
      guaranteedResourceRolls: 0,
      guaranteedItemRolls: 0,
      triumphItemRolls: 0,
      preferredRoleBonus: 3,
      outcomePenalty: 0,
    },
  },
  "sunken-archives-elite-breach": {
    scenarioType: "elite-expedition",
    scenarioLabel: "Элитная экспедиция",
    scenarioSummary: "Короткое окно на rare/epic трофеи и ускоренный рост героев: ставка на item jackpot и XP, а не на массовый фарм ресурсов.",
    rewardFocusLabel: "Rare loot, hero XP и guild XP",
    riskLabel: "Экстремальный риск",
    riskScore: 4,
    isElite: true,
    specialRules: [
      "Уже с успеха даёт гарантированный item-roll, а triumph добавляет ещё один поверх общего пула.",
      "Базовое сырьё режется, зато guild XP и hero XP существенно выше стандартных архивов.",
    ],
    hazardLabel: "Прорыв через архивариуса-стража, элитные аномалии и сжатое окно на добычу",
    preferredClasses: [HeroClass.MYSTIC, HeroClass.VANGUARD],
    pressureMultiplier: 1.24,
    opener: "Элитный breach требует плотного фронта и контроля магического давления без права на длинную ошибку.",
    outcome: {
      goldMultiplier: 0.95,
      guildXpMultiplier: 1.45,
      heroXpMultiplier: 1.35,
      resourceMultiplier: 0.75,
      itemMultiplier: 1.1,
      extraRolls: 1,
      volatility: 18,
      guaranteedResourceRolls: 0,
      guaranteedItemRolls: 1,
      triumphItemRolls: 1,
      preferredRoleBonus: 6,
      outcomePenalty: 3,
    },
  },
  "ashen-pass": {
    scenarioType: "standard-route",
    scenarioLabel: "Стандартная экспедиция",
    scenarioSummary: "Поздний baseline-маршрут: дорогой mixed loot и высокий pressure без особого jackpot-модификатора.",
    rewardFocusLabel: "Сильный mixed loot, поздняя пыль и top-end экипировка",
    riskLabel: "Экстремальный риск",
    riskScore: 4,
    isElite: false,
    specialRules: [
      "Остаётся самой длинной стандартной зоной без специальных reward-shift правил.",
      "Показывает, готова ли гильдия выдерживать поздний pressure без опоры на сценарные бонусы.",
    ],
    hazardLabel: "Элитные угрозы, изнурение и долгий марш без права на ошибку",
    preferredClasses: [HeroClass.VANGUARD, HeroClass.MYSTIC],
    pressureMultiplier: 1.18,
    opener: "Перевал требует плотного фронта, выживаемости и дисциплины по ресурсам.",
    outcome: {
      goldMultiplier: 1,
      guildXpMultiplier: 1,
      heroXpMultiplier: 1.1,
      resourceMultiplier: 1,
      itemMultiplier: 1,
      extraRolls: 0,
      volatility: 14,
      guaranteedResourceRolls: 0,
      guaranteedItemRolls: 0,
      triumphItemRolls: 0,
      preferredRoleBonus: 4,
      outcomePenalty: 1,
    },
  },
} satisfies Record<string, LocationScenarioProfile>;

type RecruitCandidateTemplate = {
  key: string;
  name: string;
  heroClass: HeroClass;
  rarity: HeroRarity;
  level: number;
  heroXp: number;
  powerScore: number;
  zoneFocusLabel: string;
  summary: string;
};

const RECRUITMENT_TEMPLATES: Record<HeroClass, readonly RecruitCandidateTemplate[]> = {
  [HeroClass.VANGUARD]: [
    {
      key: "quarry-bastion",
      name: "Doran Flint",
      heroClass: HeroClass.VANGUARD,
      rarity: HeroRarity.COMMON,
      level: 1,
      heroXp: 10,
      powerScore: 34,
      zoneFocusLabel: "Old Quarry · держит тяжёлый фронт",
      summary: "Полезен как запасной фронтлайнер, когда базовый авангард уже ушёл в поход.",
    },
    {
      key: "ashen-warden",
      name: "Petra Ashshield",
      heroClass: HeroClass.VANGUARD,
      rarity: HeroRarity.UNCOMMON,
      level: 1,
      heroXp: 14,
      powerScore: 36,
      zoneFocusLabel: "Ashen Pass · выдерживает длинный марш",
      summary: "Даёт второй крепкий фронт под более жёсткие и долгие маршруты.",
    },
    {
      key: "road-captain",
      name: "Marek Wayn",
      heroClass: HeroClass.VANGUARD,
      rarity: HeroRarity.COMMON,
      level: 1,
      heroXp: 12,
      powerScore: 35,
      zoneFocusLabel: "Green Glen · страхует мобильную группу",
      summary: "Удобен для ротации экипировки и сборки более гибких стартовых троек.",
    },
    {
      key: "ember-bulwark",
      name: "Ivara Stonewake",
      heroClass: HeroClass.VANGUARD,
      rarity: HeroRarity.RARE,
      level: 2,
      heroXp: 68,
      powerScore: 58,
      zoneFocusLabel: "Ashen Pass · элитный фронт под поздние зоны",
      summary: "Редкий ветеран появляется только после серьёзного роста гильдии и расширяет late-MVP ротацию.",
    },
  ],
  [HeroClass.RANGER]: [
    {
      key: "glen-scout",
      name: "Nessa Briar",
      heroClass: HeroClass.RANGER,
      rarity: HeroRarity.COMMON,
      level: 1,
      heroXp: 11,
      powerScore: 35,
      zoneFocusLabel: "Green Glen · темп и тропы",
      summary: "Подходит для сборки второй разведывательной линии без ожидания возврата основной тройки.",
    },
    {
      key: "archive-runner",
      name: "Corin Vell",
      heroClass: HeroClass.RANGER,
      rarity: HeroRarity.UNCOMMON,
      level: 1,
      heroXp: 15,
      powerScore: 36,
      zoneFocusLabel: "Sunken Archives · чтение угроз",
      summary: "Полезен для зон, где партия штрафуется за слабую разведку и потерю темпа.",
    },
    {
      key: "ember-scout",
      name: "Riva Emberstep",
      heroClass: HeroClass.RANGER,
      rarity: HeroRarity.COMMON,
      level: 1,
      heroXp: 12,
      powerScore: 34,
      zoneFocusLabel: "Ashen Pass · держит скорость под давлением",
      summary: "Даёт ротацию под длинные походы, где нужен отдельный слот под мобильного следопыта.",
    },
    {
      key: "archive-strider",
      name: "Lio Vey",
      heroClass: HeroClass.RANGER,
      rarity: HeroRarity.RARE,
      level: 2,
      heroXp: 66,
      powerScore: 57,
      zoneFocusLabel: "Sunken Archives · late scouting и чтение угроз",
      summary: "Редкий следопыт усиливает дальние зоны и становится новой recruit-целью после развития гильдии.",
    },
  ],
  [HeroClass.MYSTIC]: [
    {
      key: "fen-seer",
      name: "Tamsin Veil",
      heroClass: HeroClass.MYSTIC,
      rarity: HeroRarity.COMMON,
      level: 1,
      heroXp: 12,
      powerScore: 34,
      zoneFocusLabel: "Green Glen · контроль риска",
      summary: "Закрывает поддержку и стабилизацию, если основной мистик уже занят экспедицией.",
    },
    {
      key: "archive-lantern",
      name: "Oris Candle",
      heroClass: HeroClass.MYSTIC,
      rarity: HeroRarity.UNCOMMON,
      level: 1,
      heroXp: 16,
      powerScore: 36,
      zoneFocusLabel: "Sunken Archives · аномалии и реликты",
      summary: "Помогает собирать более точную тройку под магически тяжёлые зоны.",
    },
    {
      key: "ember-rite",
      name: "Selka Dawn",
      heroClass: HeroClass.MYSTIC,
      rarity: HeroRarity.COMMON,
      level: 1,
      heroXp: 13,
      powerScore: 35,
      zoneFocusLabel: "Ashen Pass · выравнивает длинные забеги",
      summary: "Нужна, когда гильдия хочет держать второй саппорт для параллельных походов.",
    },
    {
      key: "cinder-oracle",
      name: "Serit Ash",
      heroClass: HeroClass.MYSTIC,
      rarity: HeroRarity.RARE,
      level: 2,
      heroXp: 72,
      powerScore: 56,
      zoneFocusLabel: "Ashen Pass · late support anchor",
      summary: "Редкий мистик открывает следующий quality breakpoint recruitment board-а и усиливает длинные маршруты.",
    },
  ],
};

type PresentationTone = "neutral" | "accent" | "success" | "warning";

type DashboardInboxEntry = {
  id: string;
  kind: "expedition-claim" | "market-claim" | "trade-offer" | "world-event-reward";
  title: string;
  summary: string;
  detail: string;
  actionLabel: string;
  href: string;
  createdAt: Date;
  tone: PresentationTone;
};

type DashboardRecentActivityEntry = {
  id: string;
  source: "market" | "trade" | "world-event";
  title: string;
  summary: string;
  detail: string;
  href: string;
  createdAt: Date;
  tone: PresentationTone;
};

type ContractBoardRoute = "dashboard" | "expedition" | "market" | "inventory";

type GuildContractStatus = "in-progress" | "ready" | "claimed" | "unavailable";

type GuildContractKey =
  | "supply-surplus"
  | "black-cut-recon"
  | "brokered-demand"
  | "frontline-refit"
  | "market-showcase";

type GuildContractReward = {
  gold: number;
  guildXp: number;
  resource?: {
    resourceType: ResourceType;
    quantity: number;
  };
};

type GuildContractEntry = {
  key: GuildContractKey;
  title: string;
  archetypeLabel: string;
  summary: string;
  status: GuildContractStatus;
  statusLabel: string;
  tone: PresentationTone;
  progressLabel: string;
  rewardLabels: string[];
  blockers: string[];
  href: string;
  actionLabel: string;
  claimable: boolean;
  claimedAt: Date | null;
  relatedRoutes: ContractBoardRoute[];
  relatedActionSummary: string;
};

type GuildContractRecentEntry = {
  key: GuildContractKey;
  title: string;
  claimedAt: Date;
  rewardLabels: string[];
  summary: string;
  href: string;
};

type ContractBoardSnapshot = {
  summary: {
    readyCount: number;
    inProgressCount: number;
    claimedCount: number;
    unavailableCount: number;
  };
  entries: GuildContractEntry[];
  recentCompleted: GuildContractRecentEntry[];
};

type GuildFacilitySummary = {
  key: "roster" | "market" | "workshop" | "trade";
  title: string;
  unlocked: boolean;
  statusLabel: string;
  summary: string;
  limitLabel: string;
  nextGoalLabel: string | null;
  href: string;
};

type GuildUpgradeBoardTier = {
  level: number;
  costGold: number;
  requiredGuildLevel: number;
  effectLabel: string;
  status: "completed" | "available" | "locked";
  requirementSummary: string;
};

type GuildUpgradeBoardEntry = {
  upgradeType: ManagedGuildUpgradeType;
  title: string;
  summary: string;
  actionLabel: string;
  href: string;
  currentLevel: number;
  maxLevel: number;
  currentValueLabel: string;
  nextValueLabel: string | null;
  nextCostGold: number | null;
  nextLevel: number | null;
  usageLabel: string;
  milestoneLabel: string;
  canAfford: boolean;
  canPurchase: boolean;
  blockerSummary: string | null;
  tiers: GuildUpgradeBoardTier[];
};

type GuildMilestoneSummary = {
  key: string;
  title: string;
  summary: string;
  progressLabel: string;
  href: string;
  status: "completed" | "next";
};

type GuildMetaprogressionSnapshot = {
  facilities: GuildFacilitySummary[];
  upgradeBoard: GuildUpgradeBoardEntry[];
  nextGoals: GuildMilestoneSummary[];
};

type RecruitmentProgression = {
  currentRarityLabel: string;
  nextRarityLabel: string | null;
  statusLabel: string;
  nextGoalLabel: string | null;
  progressLabel: string;
};

type ZoneProgression = {
  nextLocationName: string | null;
  nextRequiredGuildLevel: number | null;
  statusLabel: string;
  nextGoalLabel: string | null;
  unlockedLocationCount: number;
  totalLocationCount: number;
  unlockedSpecialScenarioCount: number;
  totalSpecialScenarioCount: number;
  highestUnlockedRiskLabel: string;
};

type BestAvailablePartyOption = {
  partyNames: string[];
  tacticalPower: number;
  threatScore: number;
  margin: number;
};

type PveHorizonSnapshot = {
  unlockedLocationCount: number;
  totalLocationCount: number;
  unlockedSpecialScenarioCount: number;
  totalSpecialScenarioCount: number;
  highestUnlockedRiskLabel: string;
  nextGoalLabel: string | null;
  highlightedScenarios: Array<{
    code: string;
    name: string;
    scenarioLabel: string;
    riskLabel: string;
    rewardFocusLabel: string;
    summary: string;
    statusLabel: string;
    progressSummary: string;
    specialRules: string[];
    isUnlocked: boolean;
    isElite: boolean;
  }>;
};

type MarketClaimView = {
  id: string;
  claimTypeLabel: string;
  payloadLabel: string;
  sourceLabel: string;
  statusLabel: string;
  createdAt: Date;
  claimedAt: Date | null;
  isPending: boolean;
};

type MarketHistoryEntry = {
  id: string;
  outcomeKey: "sold" | "bought" | "cancelled" | "expired";
  outcomeLabel: string;
  tone: PresentationTone;
  listingTypeLabel: string;
  itemLabel: string;
  quantity: number;
  totalPriceGold: number;
  detailLabel: string;
  counterpartyLabel: string | null;
  priceSummary: string;
  outcomeSummary: string;
  claimSummary: string | null;
  claimStatusLabel: string | null;
  claimPending: boolean;
  eventAt: Date;
};

type BuyOrderView = {
  id: string;
  buyerGuildId: string;
  resourceType: ResourceType;
  resourceLabel: string;
  quantity: number;
  totalPriceGold: number;
  pricePerUnitGold: number;
  statusLabel: string;
  buyerLabel: string;
  buyerGuildTag: string;
  isMine: boolean;
  canFulfill: boolean;
  availabilitySummary: string;
  priceSummary: string;
  createdAt: Date;
  expiresAt: Date;
};

type BuyOrderHistoryEntry = {
  id: string;
  outcomeKey: "fulfilled" | "cancelled" | "expired";
  outcomeLabel: string;
  tone: PresentationTone;
  resourceLabel: string;
  quantity: number;
  totalPriceGold: number;
  priceSummary: string;
  outcomeSummary: string;
  counterpartyLabel: string | null;
  claimSummary: string | null;
  claimStatusLabel: string | null;
  claimPending: boolean;
  eventAt: Date;
};

type OnboardingMilestoneKey =
  | "equip-hero"
  | "start-expedition"
  | "claim-expedition"
  | "upgrade-item"
  | "list-market-lot"
  | "recruit-hero";

type OnboardingMilestoneStatus = "completed" | "available" | "blocked";

type OnboardingMilestone = {
  key: OnboardingMilestoneKey;
  title: string;
  summary: string;
  status: OnboardingMilestoneStatus;
  statusLabel: string;
  tone: PresentationTone;
  progressLabel: string;
  href: string;
  actionLabel: string;
  blockers: string[];
};

type OnboardingRecommendedAction = {
  key: OnboardingMilestoneKey;
  title: string;
  summary: string;
  href: string;
  actionLabel: string;
  tone: PresentationTone;
  reason: string;
  blockers: string[];
};

type OnboardingSnapshot = {
  isActive: boolean;
  totalMilestones: number;
  completedCount: number;
  availableCount: number;
  blockedCount: number;
  progressLabel: string;
  progressPercent: number;
  summary: string;
  blockers: string[];
  recommendedAction: OnboardingRecommendedAction | null;
  milestones: OnboardingMilestone[];
};

export type DashboardPageData = {
  guild: {
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
    user: { displayName: string; email: string };
    counts: {
      heroes: number;
      inventoryItems: number;
      pendingClaims: number;
    };
    nextLevelXp: number | null;
    identity: GuildIdentitySnapshot;
  };
  activeExpeditions: Array<{
    id: string;
    locationName: string;
    statusLabel: string;
    scenarioLabel: string;
    riskLabel: string;
    rewardFocusLabel: string;
    riskRewardSummary: string;
    endsAt: Date;
    partyNames: string[];
    partyPowerSnapshot: number;
    threatScoreSnapshot: number;
  }>;
  claimableExpeditions: Array<{
    id: string;
    locationName: string;
    rewardGold: number;
    rewardGuildXp: number;
    rewardSummary: string[];
    completedAt: Date | null;
    resultTier: ExpeditionResultTier | null;
    resultLabel: string | null;
    resultSummary: string | null;
    scenarioLabel: string;
    riskLabel: string;
    rewardFocusLabel: string;
    riskRewardSummary: string;
    heroXpRewardPerHero: number | null;
    combatLog: string[];
    partyPowerSnapshot: number;
    threatScoreSnapshot: number;
  }>;
  resources: Array<{
    resourceType: ResourceType;
    label: string;
    amount: number;
  }>;
  recentLedger: Array<{
    id: string;
    eventLabel: string;
    goldDelta: number;
    resourceLabel: string | null;
    resourceDelta: number | null;
    isSuspicious: boolean;
    createdAt: Date;
  }>;
  marketUpgrade: {
    nextCostGold: number | null;
    nextLevel: number | null;
    canAfford: boolean;
  };
  heroSlotsUpgrade: {
    currentLevel: number;
    nextCostGold: number | null;
    nextLevel: number | null;
    nextSlotLimit: number | null;
    canAfford: boolean;
    canPurchase: boolean;
  };
  contractBoard: ContractBoardSnapshot;
  metaprogression: GuildMetaprogressionSnapshot;
  pveHorizon: PveHorizonSnapshot;
  recruitmentProgression: RecruitmentProgression;
  rosterProgression: {
    heroCount: number;
    heroSlotLimit: number;
    usedSlots: number;
    freeSlots: number;
    availableHeroes: number;
    activeHeroes: number;
    reserveLoopTarget: number;
    reserveLoopUnlocked: boolean;
    reserveLoopShortfall: number;
    recruitCostGold: number;
    canRecruit: boolean;
  };
  heroProgression: {
    totalHeroXp: number;
    highestHeroLevel: number;
    averageHeroLevel: number;
  };
  inbox: {
    pending: DashboardInboxEntry[];
    recent: DashboardRecentActivityEntry[];
  };
  onboarding: OnboardingSnapshot;
  guildPrestige: GuildPrestigeSummary | null;
  guildIdentityEditor: GuildIdentityEditorSnapshot;
  watchlist: GuildWatchlistSnapshot;
  followedGuilds: WatchlistGuildCard[];
  suggestedGuilds: WatchlistGuildCard[];
  personalizedFeed: PersonalizedSocialFeedSnapshot;
  worldEventBoard: WorldEventBoardSnapshot;
};

export type HeroesPageData = {
  guildName: string;
  guildGold: number;
  workshop: {
    unlocked: boolean;
    facilityLevel: number;
    maxItemLevel: number;
    summary: string;
    projectCount: number;
    nextGoalLabel: string | null;
    projects: Array<{
      itemId: string;
      heroName: string;
      itemName: string;
      slotLabel: string;
      workshopLevelLabel: string;
      currentPowerLabel: string;
      nextEffectSummary: string | null;
      costSummary: string | null;
      limitationSummary: string | null;
      nextDeltaPower: number;
      canUpgrade: boolean;
    }>;
  };
  roster: {
    heroSlotLimit: number;
    usedSlots: number;
    freeSlots: number;
    availableHeroes: number;
    activeHeroes: number;
    reserveLoopTarget: number;
    reserveLoopUnlocked: boolean;
    reserveLoopShortfall: number;
  };
  recruitment: {
    costGold: number;
    canAfford: boolean;
    hasOpenSlot: boolean;
    candidates: Array<{
      key: string;
      name: string;
      heroClassLabel: string;
      tacticalRoleLabel: string;
      rarityLabel: string;
      level: number;
      heroXp: number;
      powerScore: number;
      recruitCostGold: number;
      zoneFocusLabel: string;
      summary: string;
      canHire: boolean;
    }>;
  };
  recruitmentProgression: RecruitmentProgression;
  heroSlotsUpgrade: {
    currentLevel: number;
    nextCostGold: number | null;
    nextLevel: number | null;
    nextSlotLimit: number | null;
    canAfford: boolean;
    canPurchase: boolean;
  };
  totalHeroXp: number;
  highestHeroLevel: number;
  heroes: Array<{
    id: string;
    name: string;
    heroClassLabel: string;
    status: HeroStatus;
    statusLabel: string;
    rarityLabel: string;
    level: number;
    heroXp: number;
    nextLevelXp: number | null;
    powerScore: number;
    equipmentPower: number;
    equipment: Array<{
      id: string;
      name: string;
      rarityLabel: string;
      slotKey: string;
      slotLabel: string;
      powerScore: number;
      powerLabel: string;
      workshopLevelLabel: string;
      workshopSummary: string;
      valueSummary: string;
    }>;
    slotUpgrades: Array<{
      slotKey: string;
      slotLabel: string;
      currentPower: number;
      bestAvailablePower: number;
      delta: number;
    }>;
    equipOptions: Array<{
      id: string;
      name: string;
      slotKey: string;
      slotLabel: string;
      rarityLabel: string;
      powerScore: number;
      powerLabel: string;
      workshopLevelLabel: string;
      valueSummary: string;
      deltaVsEquipped: number;
      comparisonLabel: string;
    }>;
  }>;
  equippableItems: Array<{
    id: string;
    name: string;
    slotKey: string;
    slotLabel: string;
    rarityLabel: string;
    powerScore: number;
    powerLabel: string;
    workshopLevelLabel: string;
    workshopSummary: string;
    valueSummary: string;
    progressionLabel: string;
  }>;
  onboarding: OnboardingSnapshot;
};

export type ExpeditionPageData = {
  guildLevel: number;
  contractBoard: ContractBoardSnapshot;
  onboarding: OnboardingSnapshot;
  worldEventBoard: WorldEventBoardSnapshot;
  rosterProgression: {
    totalHeroes: number;
    heroSlotLimit: number;
    openSlots: number;
    reserveLoopTarget: number;
    reserveLoopUnlocked: boolean;
    reserveLoopShortfall: number;
  };
  zoneProgression: ZoneProgression;
  locations: Array<{
    id: string;
    code: string;
    name: string;
    requiredGuildLevel: number;
    durationSeconds: number;
    recommendedPower: number;
    isUnlocked: boolean;
    lootPreview: string[];
    lootValueSummary: string;
    topLootLabel: string;
    hazardLabel: string;
    preferredRoles: string[];
    scenarioLabel: string;
    scenarioSummary: string;
    riskLabel: string;
    rewardFocusLabel: string;
    rewardRules: string[];
    blockerSummary: string;
    bestPartyNames: string[];
    bestPartyPower: number | null;
    powerGap: number | null;
    isElite: boolean;
  }>;
  availableHeroes: Array<{
    id: string;
    name: string;
    heroClassLabel: string;
    tacticalRoleLabel: string;
    powerScore: number;
  }>;
  expeditions: Array<{
    id: string;
    status: ExpeditionStatus;
    statusLabel: string;
    resultTier: ExpeditionResultTier | null;
    resultLabel: string | null;
    resultSummary: string | null;
    startedAt: Date;
    endsAt: Date;
    resolvedAt: Date | null;
    claimedAt: Date | null;
    rewardGold: number;
    rewardGuildXp: number;
    rewardSummary: string[];
    partyNames: string[];
    locationName: string;
    scenarioLabel: string;
    riskLabel: string;
    rewardFocusLabel: string;
    riskRewardSummary: string;
    heroXpRewardPerHero: number | null;
    partyPowerSnapshot: number;
    threatScoreSnapshot: number;
    combatLog: string[];
  }>;
};

export type InventoryPageData = {
  gold: number;
  resources: Array<{
    id: string;
    label: string;
    amount: number;
  }>;
  workshop: {
    unlocked: boolean;
    facilityLevel: number;
    maxItemLevel: number;
    summary: string;
    nextGoalLabel: string | null;
    candidateCount: number;
    candidates: Array<{
      id: string;
      name: string;
      slotLabel: string;
      rarityLabel: string;
      stateLabel: string;
      equippedHeroName: string | null;
      workshopLevelLabel: string;
      effectivePowerLabel: string;
      nextEffectSummary: string | null;
      costSummary: string | null;
      limitationSummary: string | null;
      canUpgrade: boolean;
    }>;
  };
  onboarding: OnboardingSnapshot;
  items: Array<{
    id: string;
    name: string;
    typeLabel: string;
    slotLabel: string;
    rarityLabel: string;
    powerScore: number;
    powerLabel: string;
    workshopLevelLabel: string;
    workshopSummary: string;
    state: InventoryItemState;
    stateLabel: string;
    equippedHeroName: string | null;
    boundToGuild: boolean;
    tradable: boolean;
    vendorBasePrice: number | null;
    valueSummary: string;
    progressionLabel: string;
    tradeLabel: string;
    reservationLabel: string | null;
    acquiredAt: Date;
  }>;
};

export type MarketPageData = {
  guildName: string;
  guildTag: string;
  guildPrestige: GuildPrestigeSummary | null;
  contractBoard: ContractBoardSnapshot;
  onboarding: OnboardingSnapshot;
  worldEventBoard: WorldEventBoardSnapshot;
  marketUnlocked: boolean;
  marketSlotsBase: number;
  myActiveListingsCount: number;
  myListingLimit: number;
  guildGold: number;
  listingFeeGold: number;
  saleTaxPercent: number;
  activeListings: Array<{
    id: string;
    sellerGuildId: string;
    sellerGuildTag: string;
    isMine: boolean;
    listingTypeLabel: string;
    itemLabel: string;
    quantity: number;
    totalPriceGold: number;
    statusLabel: string;
    expiresAt: Date;
    sellerLabel: string;
    detailLabel: string;
    valueSummary: string;
  }>;
  myListings: Array<{
    id: string;
    listingTypeLabel: string;
    itemLabel: string;
    quantity: number;
    totalPriceGold: number;
    expiresAt: Date;
    detailLabel: string;
    valueSummary: string;
  }>;
  claimBox: MarketClaimView[];
  marketHistory: MarketHistoryEntry[];
  activeBuyOrders: BuyOrderView[];
  myBuyOrders: BuyOrderView[];
  fulfillableBuyOrders: BuyOrderView[];
  buyOrderHistory: BuyOrderHistoryEntry[];
  sellableItems: Array<{
    id: string;
    label: string;
  }>;
  sellableResources: Array<{
    resourceType: ResourceType;
    label: string;
    amount: number;
  }>;
  requestableResources: Array<{
    resourceType: ResourceType;
    label: string;
    ownedAmount: number;
  }>;
  highlightedGuildContext: {
    tag: string;
    name: string;
    activeListingsCount: number;
    activeBuyOrdersCount: number;
    prestige: GuildPrestigeSummary["prestige"] | null;
    renown: GuildPrestigeSummary["renown"] | null;
    recurringSummary: GuildPrestigeSummary["recurringSummary"] | null;
    favoriteCounterparties: GuildPrestigeSummary["favoriteCounterparties"];
    relationshipLabel: string | null;
    profileHref: string;
    dealsHref: string;
  } | null;
  nextUpgradeCostGold: number | null;
  ruleSummary: readonly string[];
};

type TradeOfferView = {
  id: string;
  status: TradeOfferStatus;
  tone: PresentationTone;
  directionKey: "incoming" | "outgoing";
  directionLabel: string;
  counterpartyLabel: string;
  statusLabel: string;
  outcomeLabel: string;
  outcomeSummary: string;
  message: string | null;
  createdAt: Date;
  expiresAt: Date;
  respondedAt: Date | null;
  finalAt: Date;
  offeredSummary: string;
  requestedSummary: string;
  isPending: boolean;
  isIncoming: boolean;
};

export type DealsPageData = {
  guildName: string;
  guildTag: string;
  guildPrestige: GuildPrestigeSummary | null;
  tradeUnlocked: boolean;
  pendingIncoming: TradeOfferView[];
  pendingOutgoing: TradeOfferView[];
  resolvedOffers: TradeOfferView[];
  prefillReceiverGuildTag: string | null;
  prefillReceiverLabel: string | null;
  prefillReceiverProfileHref: string | null;
  counterparties: Array<{
    guildTag: string;
    label: string;
    prestige: GuildPrestigeSummary["prestige"] | null;
    renown: GuildPrestigeSummary["renown"] | null;
    relationshipLabel: string | null;
    isFavoriteTrader: boolean;
  }>;
  offerableItems: Array<{
    id: string;
    label: string;
  }>;
  offerableResources: Array<{
    resourceType: ResourceType;
    label: string;
    amount: number;
  }>;
  requestableItems: Array<{
    id: string;
    guildTag: string;
    label: string;
  }>;
  requestableResources: Array<{
    guildTag: string;
    resourceType: ResourceType;
    label: string;
    amount: number;
  }>;
  ruleSummary: readonly string[];
};

type TransactionClient = Prisma.TransactionClient;

type ItemPresentationInput = {
  name: string;
  itemType: ItemType;
  rarity: ItemRarity;
  equipSlot: EquipmentSlot | null;
  powerScore: number;
  vendorBasePrice: number | null;
  isStarterLocked?: boolean;
};

type ExpeditionRewardView = {
  rewardType: string;
  quantity: number;
  resourceType: ResourceType | null;
  itemDefinition: ItemPresentationInput | null;
};

type TradeOfferForRelease = {
  id: string;
  senderGuildId: string;
  items: Array<{
    side: TradeOfferSide;
    inventoryItemId: string | null;
    resourceType: ResourceType | null;
    quantity: number;
  }>;
};

type GuildUpgradeRuntimeState = {
  guildId: string;
  guildLevel: number;
  gold: number;
  heroCount: number;
  activeListings: number;
  pendingOutgoingTrades: number;
  heroSlots: number;
  marketSlots: number;
  tradeSlots: number;
  marketUnlocked: boolean;
  tradeUnlocked: boolean;
  upgradeLevels: Record<ManagedGuildUpgradeType, number>;
};

type GuildContractRuntimeContext = {
  guildId: string;
  guildLevel: number;
  marketUnlocked: boolean;
  storageLevel: number;
  resources: Partial<Record<ResourceType, number>>;
  maxWorkshopLevel: number;
  soldListingsCount: number;
  activeListingsCount: number;
  expeditions: Array<{
    status: ExpeditionStatus;
    locationCode: string;
  }>;
  activeForeignBuyOrdersCount: number;
  fulfillableForeignBuyOrdersCount: number;
  claimedFilledBuyOrderClaims: number;
  pendingFilledBuyOrderClaims: number;
  claimedContracts: Map<GuildContractKey, Date>;
};

type OnboardingRuntimeContext = {
  guildLevel: number;
  gold: number;
  heroCount: number;
  availableHeroes: number;
  heroSlots: number;
  heroSlotUpgradeLevel: number;
  equippedItemCount: number;
  equippableItemCount: number;
  workshopFacilityLevel: number;
  workshopItemCount: number;
  upgradeableWorkshopItemCount: number;
  maxWorkshopItemLevel: number;
  unlockedLocationCount: number;
  expeditionCount: number;
  activeExpeditionCount: number;
  completedExpeditionCount: number;
  claimedExpeditionCount: number;
  marketUnlocked: boolean;
  activeListingsCount: number;
  soldListingsCount: number;
  sellableItemCount: number;
  sellableResourceTypeCount: number;
};

type GuildContractEvaluation = {
  completed: boolean;
  unavailable: boolean;
  progressLabel: string;
  blockers: string[];
  relatedActionSummary: string;
};

type GuildContractDefinition = {
  key: GuildContractKey;
  title: string;
  archetypeLabel: string;
  summary: string;
  href: string;
  relatedRoutes: ContractBoardRoute[];
  reward: GuildContractReward;
  evaluate: (context: GuildContractRuntimeContext) => GuildContractEvaluation;
};

type GuildUpgradeTierConfig = {
  level: number;
  costGold: number;
  requiredGuildLevel: number;
  requiredUpgradeLevels?: Partial<Record<ManagedGuildUpgradeType, number>>;
  effectLabel: string;
  milestoneLabel: string;
};

type GuildUpgradeDefinition = {
  title: string;
  summary: string;
  actionLabel: string;
  href: string;
  getCurrentValueLabel: (state: GuildUpgradeRuntimeState) => string;
  getNextValueLabel: (state: GuildUpgradeRuntimeState) => string;
  getUsageLabel: (state: GuildUpgradeRuntimeState) => string;
  getLockedSummary: (state: GuildUpgradeRuntimeState) => string | null;
  tiers: readonly GuildUpgradeTierConfig[];
};

type WorkshopPlanInput = {
  workshopFacilityLevel: number;
  availableGold: number;
  availableResources: Partial<Record<ResourceType, number>>;
  workshopLevel: number;
  state: InventoryItemState;
  reservedByType?: ReservationType | null;
  heroStatus?: HeroStatus | null;
  boundToGuild: boolean;
  definition: Pick<ItemPresentationInput, "name" | "itemType" | "rarity" | "equipSlot" | "powerScore">;
};

type WorkshopPlan = {
  unlocked: boolean;
  canUpgrade: boolean;
  nextLevel: number | null;
  maxLevel: number;
  costGold: number | null;
  primaryResource: ResourceType | null;
  primaryQuantity: number;
  catalystResource: ResourceType | null;
  catalystQuantity: number;
  powerDelta: number;
  resultPowerScore: number | null;
  costSummary: string | null;
  effectSummary: string | null;
  limitationSummary: string | null;
  bindsOnUpgrade: boolean;
};

function getGuildLevelFromXp(xp: number) {
  let level = 1;

  for (let index = 1; index < GUILD_LEVEL_THRESHOLDS.length; index += 1) {
    if (xp >= GUILD_LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    }
  }

  return level;
}

function getNextLevelXp(level: number) {
  return GUILD_LEVEL_THRESHOLDS[level] ?? null;
}

function getHeroLevelFromXp(xp: number) {
  let level = 1;

  for (let index = 1; index < HERO_LEVEL_THRESHOLDS.length; index += 1) {
    if (xp >= HERO_LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    }
  }

  return level;
}

function getNextHeroLevelXp(level: number) {
  return HERO_LEVEL_THRESHOLDS[level] ?? null;
}

function getWorkshopRarityFloor(rarity: ItemRarity) {
  if (rarity === ItemRarity.EPIC) {
    return 4;
  }

  if (rarity === ItemRarity.RARE) {
    return 3;
  }

  if (rarity === ItemRarity.UNCOMMON) {
    return 2;
  }

  return 1;
}

function getWorkshopStepPower(input: { basePowerScore: number; rarity: ItemRarity }) {
  return Math.max(getWorkshopRarityFloor(input.rarity), Math.ceil(Math.max(1, input.basePowerScore) / 8));
}

function getWorkshopPrimaryResource(equipSlot: EquipmentSlot) {
  if (equipSlot === EquipmentSlot.WEAPON) {
    return ResourceType.IRON_ORE;
  }

  if (equipSlot === EquipmentSlot.ARMOR) {
    return ResourceType.LEATHER;
  }

  return ResourceType.HERBS;
}

function getWorkshopPowerBonus(input: { basePowerScore: number; rarity: ItemRarity; workshopLevel: number }) {
  return getWorkshopStepPower(input) * input.workshopLevel;
}

function getEffectiveItemPower(input: { basePowerScore: number; rarity: ItemRarity; workshopLevel: number }) {
  return input.basePowerScore + getWorkshopPowerBonus(input);
}

function getWorkshopLevelLabel(level: number) {
  return level > 0 ? `Workshop tier ${level}` : "Без workshop-усиления";
}

function getWorkshopPowerSummary(input: { basePowerScore: number; rarity: ItemRarity; workshopLevel: number }) {
  const bonus = getWorkshopPowerBonus(input);

  return bonus > 0
    ? `База +${input.basePowerScore} · workshop +${bonus}`
    : `База +${input.basePowerScore} · без workshop-бонуса`;
}

function buildResourceAvailabilityMap(
  resources: Array<{
    resourceType: ResourceType;
    amount: number;
  }>,
) {
  return resources.reduce<Partial<Record<ResourceType, number>>>((map, resource) => {
    map[resource.resourceType] = resource.amount;
    return map;
  }, {});
}

function isGuildContractKey(value: string | null | undefined): value is GuildContractKey {
  return value === "supply-surplus"
    || value === "black-cut-recon"
    || value === "brokered-demand"
    || value === "frontline-refit"
    || value === "market-showcase";
}

function getGuildContractReferenceId(key: GuildContractKey) {
  return `${CONTRACT_REWARD_REFERENCE_PREFIX}${key}`;
}

function readGuildContractKeyFromReference(referenceId: string) {
  const key = referenceId.startsWith(CONTRACT_REWARD_REFERENCE_PREFIX)
    ? referenceId.slice(CONTRACT_REWARD_REFERENCE_PREFIX.length)
    : null;

  return isGuildContractKey(key) ? key : null;
}

function getGuildContractStatusLabel(status: GuildContractStatus) {
  switch (status) {
    case "ready":
      return "Готов к claim";
    case "claimed":
      return "Награда забрана";
    case "unavailable":
      return "Недоступен";
    default:
      return "В работе";
  }
}

function getGuildContractTone(status: GuildContractStatus): PresentationTone {
  switch (status) {
    case "ready":
      return "success";
    case "claimed":
      return "neutral";
    case "unavailable":
      return "warning";
    default:
      return "accent";
  }
}

function formatGuildContractRewardLabels(reward: GuildContractReward) {
  return [
    reward.gold > 0 ? `${reward.gold} золота` : null,
    reward.guildXp > 0 ? `${reward.guildXp} guild XP` : null,
    reward.resource ? `${reward.resource.quantity} × ${getResourceLabel(reward.resource.resourceType)}` : null,
  ].filter((entry): entry is string => Boolean(entry));
}

const GUILD_CONTRACT_DEFINITIONS: readonly GuildContractDefinition[] = [
  {
    key: "supply-surplus",
    title: "Сдать снабженческий surplus",
    archetypeLabel: "Resource delivery",
    summary: "Соберите на складе 24 травы и 16 кожи для полевого снабжения гильдии.",
    href: "/market",
    relatedRoutes: ["dashboard", "expedition", "market"],
    reward: {
      gold: 42,
      guildXp: 18,
      resource: {
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 3,
      },
    },
    evaluate: (context) => {
      const herbTarget = 24;
      const leatherTarget = 16;
      const herbs = context.resources[ResourceType.HERBS] ?? 0;
      const leather = context.resources[ResourceType.LEATHER] ?? 0;
      const hasPendingSupplyClaim = context.expeditions.some(
        (expedition) =>
          expedition.locationCode === "green-glen-supply-line"
          && expedition.status === ExpeditionStatus.COMPLETED,
      );
      const blockers = [
        herbs < herbTarget ? `Нужно ещё ${herbTarget - herbs} × ${getResourceLabel(ResourceType.HERBS).toLowerCase()}.` : null,
        leather < leatherTarget
          ? `Нужно ещё ${leatherTarget - leather} × ${getResourceLabel(ResourceType.LEATHER).toLowerCase()}.`
          : null,
      ].filter((entry): entry is string => Boolean(entry));

      if (hasPendingSupplyClaim) {
        blockers.unshift(
          "На dashboard уже ждёт claim рейс «Интендантская тропа», который закрывает значительную часть поставки.",
        );
      }

      return {
        completed: herbs >= herbTarget && leather >= leatherTarget,
        unavailable: false,
        progressLabel: `Травы ${Math.min(herbs, herbTarget)}/${herbTarget} · Кожа ${Math.min(leather, leatherTarget)}/${leatherTarget}`,
        blockers,
        relatedActionSummary:
          "Supply-run экспедиции, ресурсные лоты и buy orders на травы/кожу продвигают контракт в один и тот же складской запас.",
      } satisfies GuildContractEvaluation;
    },
  },
  {
    key: "black-cut-recon",
    title: "Закрыть контракт на «Чёрный обход»",
    archetypeLabel: "Expedition objective",
    summary: "Зачтите high-risk маршрут и подтвердите отчёт по контрабандному обходу.",
    href: "/expedition",
    relatedRoutes: ["dashboard", "expedition"],
    reward: {
      gold: 68,
      guildXp: 22,
      resource: {
        resourceType: ResourceType.IRON_ORE,
        quantity: 6,
      },
    },
    evaluate: (context) => {
      const claimedRuns = context.expeditions.filter(
        (expedition) =>
          expedition.locationCode === "old-quarry-smuggler-cut"
          && expedition.status === ExpeditionStatus.CLAIMED,
      ).length;
      const completedRuns = context.expeditions.filter(
        (expedition) =>
          expedition.locationCode === "old-quarry-smuggler-cut"
          && expedition.status === ExpeditionStatus.COMPLETED,
      ).length;
      const routeProfile = getLocationProfile("old-quarry-smuggler-cut");

      return {
        completed: claimedRuns > 0,
        unavailable: context.guildLevel < 2,
        progressLabel:
          claimedRuns > 0
            ? "1/1 high-risk отчёт закрыт"
            : completedRuns > 0
              ? "0/1 · маршрут завершён, но expedition reward ещё не забран"
              : "0/1 high-risk отчёт закрыт",
        blockers:
          context.guildLevel < 2
            ? ["Гильдии нужен минимум 2 уровень, чтобы открыть «Чёрный обход»." ]
            : completedRuns > 0
              ? ["Поход уже завершён — осталось забрать expedition rewards и закрыть отчёт."]
              : [
                  `Отправьте партию в «Чёрный обход» (${routeProfile.riskLabel}) и доведите забег до claim-а.`,
                ],
        relatedActionSummary:
          "Контракт засчитывается только после expedition claim: простой завершённый таймер без выдачи награды недостаточен.",
      } satisfies GuildContractEvaluation;
    },
  },
  {
    key: "brokered-demand",
    title: "Закрыть внешний buy order",
    archetypeLabel: "Request fulfillment",
    summary: "Исполните чужой заказ и доведите payout из claim box до казны гильдии.",
    href: "/market",
    relatedRoutes: ["dashboard", "market"],
    reward: {
      gold: 38,
      guildXp: 16,
      resource: {
        resourceType: ResourceType.LEATHER,
        quantity: 4,
      },
    },
    evaluate: (context) => ({
      completed: context.claimedFilledBuyOrderClaims > 0,
      unavailable: !context.marketUnlocked,
      progressLabel: `Выплата по request board: ${Math.min(context.claimedFilledBuyOrderClaims, 1)}/1`,
      blockers: !context.marketUnlocked
        ? ["Рынок ещё закрыт для этой гильдии."]
        : context.pendingFilledBuyOrderClaims > 0
          ? ["В claim box уже лежит выплата за исполненную заявку — заберите её на рынке."]
          : context.fulfillableForeignBuyOrdersCount > 0
            ? ["На request board уже есть исполнимая чужая заявка."]
            : context.activeForeignBuyOrdersCount > 0
              ? ["Чужой спрос открыт, но на складе пока не хватает подходящего ресурса."]
              : ["Сейчас на request board нет открытого чужого спроса."],
      relatedActionSummary:
        "Progress идёт через связку request board → fulfill buy order → claim box, а не через один изолированный клик.",
    }),
  },
  {
    key: "frontline-refit",
    title: "Фронтовая модернизация",
    archetypeLabel: "Workshop improvement",
    summary: "Поднимите любой предмет до Workshop tier 2 и закрепите его как долгую ставку гильдии.",
    href: "/inventory",
    relatedRoutes: ["dashboard", "inventory", "expedition", "market"],
    reward: {
      gold: 30,
      guildXp: 20,
      resource: {
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 2,
      },
    },
    evaluate: (context) => ({
      completed: context.maxWorkshopLevel >= 2,
      unavailable: context.storageLevel < 2,
      progressLabel: `Facility ${Math.min(context.storageLevel, 2)}/2 · предмет ${Math.min(context.maxWorkshopLevel, 2)}/2`,
      blockers:
        context.storageLevel < 2
          ? ["Сначала нужен workshop tier 2 на dashboard."]
          : context.maxWorkshopLevel >= 1
            ? ["Усильте любой экипировочный предмет ещё на один tier в inventory."]
            : ["Сначала вложитесь хотя бы в первое workshop-усиление предмета."],
      relatedActionSummary:
        "Контракт связывает facility upgrade, expedition-ресурсы и прямой рост силы экипировки поверх рынка.",
    }),
  },
  {
    key: "market-showcase",
    title: "Вывести гильдию на витрину",
    archetypeLabel: "Market brokerage",
    summary: "Проведите хотя бы одну успешную fixed-price продажу через рынок.",
    href: "/market",
    relatedRoutes: ["dashboard", "market"],
    reward: {
      gold: 34,
      guildXp: 14,
      resource: {
        resourceType: ResourceType.HERBS,
        quantity: 6,
      },
    },
    evaluate: (context) => ({
      completed: context.soldListingsCount > 0,
      unavailable: !context.marketUnlocked,
      progressLabel: `Успешные продажи: ${Math.min(context.soldListingsCount, 1)}/1`,
      blockers: !context.marketUnlocked
        ? ["Рынок ещё закрыт для этой гильдии."]
        : context.activeListingsCount > 0
          ? ["У гильдии уже висит активный лот — дождитесь покупки или закройте его через вторую сторону демо."]
          : ["Выставите ITEM или RESOURCE лот на рынке и проведите продажу через multi-guild switching."],
      relatedActionSummary:
        "Контракт закрывается через fixed-price market и подчёркивает, что витрина гильдии — часть общего loop-а, а не декоративная вкладка.",
    }),
  },
] as const;

function buildWorkshopPlan(input: WorkshopPlanInput): WorkshopPlan {
  const currentPowerScore = getEffectiveItemPower({
    basePowerScore: input.definition.powerScore,
    rarity: input.definition.rarity,
    workshopLevel: input.workshopLevel,
  });

  if (!input.definition.equipSlot) {
    return {
      unlocked: input.workshopFacilityLevel > 0,
      canUpgrade: false,
      nextLevel: null,
      maxLevel: input.workshopFacilityLevel,
      costGold: null,
      primaryResource: null,
      primaryQuantity: 0,
      catalystResource: null,
      catalystQuantity: 0,
      powerDelta: 0,
      resultPowerScore: currentPowerScore,
      costSummary: null,
      effectSummary: null,
      limitationSummary: "Workshop работает только с экипировкой.",
      bindsOnUpgrade: false,
    };
  }

  if (input.workshopFacilityLevel <= 0) {
    return {
      unlocked: false,
      canUpgrade: false,
      nextLevel: null,
      maxLevel: 0,
      costGold: null,
      primaryResource: null,
      primaryQuantity: 0,
      catalystResource: null,
      catalystQuantity: 0,
      powerDelta: 0,
      resultPowerScore: currentPowerScore,
      costSummary: null,
      effectSummary: null,
      limitationSummary: "Workshop ещё не открыт на upgrade board-е.",
      bindsOnUpgrade: false,
    };
  }

  if (input.state === InventoryItemState.RESERVED) {
    return {
      unlocked: true,
      canUpgrade: false,
      nextLevel: null,
      maxLevel: input.workshopFacilityLevel,
      costGold: null,
      primaryResource: null,
      primaryQuantity: 0,
      catalystResource: null,
      catalystQuantity: 0,
      powerDelta: 0,
      resultPowerScore: currentPowerScore,
      costSummary: null,
      effectSummary: null,
      limitationSummary: `Предмет сейчас недоступен: ${(getReservationLabel(input.reservedByType ?? null) ?? "в резерве").toLowerCase()}.`,
      bindsOnUpgrade: false,
    };
  }

  if (input.state === InventoryItemState.CONSUMED) {
    return {
      unlocked: true,
      canUpgrade: false,
      nextLevel: null,
      maxLevel: input.workshopFacilityLevel,
      costGold: null,
      primaryResource: null,
      primaryQuantity: 0,
      catalystResource: null,
      catalystQuantity: 0,
      powerDelta: 0,
      resultPowerScore: currentPowerScore,
      costSummary: null,
      effectSummary: null,
      limitationSummary: "Потраченный предмет нельзя усилить.",
      bindsOnUpgrade: false,
    };
  }

  if (input.heroStatus === HeroStatus.ON_EXPEDITION) {
    return {
      unlocked: true,
      canUpgrade: false,
      nextLevel: null,
      maxLevel: input.workshopFacilityLevel,
      costGold: null,
      primaryResource: null,
      primaryQuantity: 0,
      catalystResource: null,
      catalystQuantity: 0,
      powerDelta: 0,
      resultPowerScore: currentPowerScore,
      costSummary: null,
      effectSummary: null,
      limitationSummary: "Нельзя усиливать экипировку героя, пока он в экспедиции.",
      bindsOnUpgrade: false,
    };
  }

  if (input.workshopLevel >= input.workshopFacilityLevel) {
    const nextWorkshopTier = getNextGuildUpgradeTier(GuildUpgradeType.STORAGE, input.workshopFacilityLevel);

    return {
      unlocked: true,
      canUpgrade: false,
      nextLevel: null,
      maxLevel: input.workshopFacilityLevel,
      costGold: null,
      primaryResource: null,
      primaryQuantity: 0,
      catalystResource: null,
      catalystQuantity: 0,
      powerDelta: 0,
      resultPowerScore: currentPowerScore,
      costSummary: null,
      effectSummary: null,
      limitationSummary: nextWorkshopTier
        ? `Нужен workshop facility tier ${nextWorkshopTier.level} на dashboard.`
        : "Предмет уже достиг текущего MVP-потолка workshop-усиления.",
      bindsOnUpgrade: false,
    };
  }

  const nextLevel = input.workshopLevel + 1;
  const powerDelta = getWorkshopStepPower({
    basePowerScore: input.definition.powerScore,
    rarity: input.definition.rarity,
  });
  const resultPowerScore = currentPowerScore + powerDelta;
  const costGold =
    20 +
    input.definition.powerScore * 2 +
    input.workshopLevel * 15 +
    getWorkshopRarityFloor(input.definition.rarity) * 10;
  const primaryResource = getWorkshopPrimaryResource(input.definition.equipSlot);
  const primaryQuantity = Math.max(2, Math.ceil(Math.max(1, input.definition.powerScore) / 8)) + input.workshopLevel;
  const catalystQuantity = nextLevel >= 2 ? nextLevel - 1 : 0;
  const blockers: string[] = [];
  const primaryAvailable = input.availableResources[primaryResource] ?? 0;
  const catalystAvailable = input.availableResources[WORKSHOP_CATALYST_RESOURCE] ?? 0;

  if (input.availableGold < costGold) {
    blockers.push(`Нужно ещё ${costGold - input.availableGold} золота.`);
  }

  if (primaryAvailable < primaryQuantity) {
    blockers.push(`Не хватает ${primaryQuantity - primaryAvailable} × ${getResourceLabel(primaryResource)}.`);
  }

  if (catalystQuantity > 0 && catalystAvailable < catalystQuantity) {
    blockers.push(
      `Не хватает ${catalystQuantity - catalystAvailable} × ${getResourceLabel(WORKSHOP_CATALYST_RESOURCE)}.`,
    );
  }

  const costParts = [`${costGold} зол.`, `${primaryQuantity} × ${getResourceLabel(primaryResource)}`];

  if (catalystQuantity > 0) {
    costParts.push(`${catalystQuantity} × ${getResourceLabel(WORKSHOP_CATALYST_RESOURCE)}`);
  }

  return {
    unlocked: true,
    canUpgrade: blockers.length === 0,
    nextLevel,
    maxLevel: input.workshopFacilityLevel,
    costGold,
    primaryResource,
    primaryQuantity,
    catalystResource: catalystQuantity > 0 ? WORKSHOP_CATALYST_RESOURCE : null,
    catalystQuantity,
    powerDelta,
    resultPowerScore,
    costSummary: costParts.join(" · "),
    effectSummary: `+${powerDelta} power (итого ${getItemPowerLabel(resultPowerScore)})${
      !input.boundToGuild ? " · предмет привяжется к гильдии" : ""
    }`,
    limitationSummary: blockers.join(" ") || null,
    bindsOnUpgrade: !input.boundToGuild,
  };
}

function buildWorkshopItemPresentation(input: ItemPresentationInput & { workshopLevel: number }) {
  const effectivePowerScore = getEffectiveItemPower({
    basePowerScore: input.powerScore,
    rarity: input.rarity,
    workshopLevel: input.workshopLevel,
  });

  return {
    effectivePowerScore,
    presentation: getItemPresentation({
      ...input,
      powerScore: effectivePowerScore,
    }),
    workshopLevelLabel: getWorkshopLevelLabel(input.workshopLevel),
    workshopSummary: getWorkshopPowerSummary({
      basePowerScore: input.powerScore,
      rarity: input.rarity,
      workshopLevel: input.workshopLevel,
    }),
  };
}

function getEquipmentSlotLabel(slot: string | null | undefined) {
  if (!slot) {
    return "—";
  }

  return getItemTypeLabel(slot as Parameters<typeof getItemTypeLabel>[0]);
}

function getItemSlotLabel(itemType: ItemType, equipSlot: EquipmentSlot | null | undefined) {
  if (equipSlot) {
    return getEquipmentSlotLabel(equipSlot);
  }

  return getItemTypeLabel(itemType);
}

function getItemListingBounds(vendorBasePrice: number | null | undefined) {
  const base = vendorBasePrice ?? 20;
  const min = Math.max(5, Math.floor(base * 0.5));
  const max = Math.max(min, base * 8);

  return { min, max };
}

function getItemPowerLabel(powerScore: number) {
  return powerScore > 0 ? `+${powerScore} power` : "Без power-бонуса";
}

function getItemProgressionLabel(
  input: Pick<
    ItemPresentationInput,
    "itemType" | "rarity" | "powerScore" | "vendorBasePrice" | "isStarterLocked"
  >,
) {
  if (input.isStarterLocked) {
    return "Стартовый якорь партии";
  }

  if (input.itemType === ItemType.TROPHY) {
    if (input.rarity === ItemRarity.EPIC || (input.vendorBasePrice ?? 0) >= 70) {
      return "Премиальный трофей";
    }

    if (input.rarity === ItemRarity.RARE || (input.vendorBasePrice ?? 0) >= 40) {
      return "Ценный трофей";
    }

    return "Трофей на продажу";
  }

  if (input.rarity === ItemRarity.EPIC || input.powerScore >= 24) {
    return "Поздний боевой апгрейд";
  }

  if (input.rarity === ItemRarity.RARE || input.powerScore >= 16) {
    return "Сильный боевой апгрейд";
  }

  if (input.rarity === ItemRarity.UNCOMMON || input.powerScore >= 10) {
    return "Надёжный походный апгрейд";
  }

  return "Базовая экипировка";
}

function getItemPresentation(input: ItemPresentationInput) {
  const bounds = getItemListingBounds(input.vendorBasePrice);
  const rarityLabel = getRarityLabel(input.rarity);
  const slotLabel = getItemSlotLabel(input.itemType, input.equipSlot);
  const powerLabel = getItemPowerLabel(input.powerScore);
  const progressionLabel = getItemProgressionLabel(input);

  return {
    rarityLabel,
    slotLabel,
    powerLabel,
    progressionLabel,
    marketMinPrice: bounds.min,
    marketMaxPrice: bounds.max,
    valueSummary: input.vendorBasePrice
      ? `База ${input.vendorBasePrice} зол. · рынок ${bounds.min}–${bounds.max}`
      : `Рынок ${bounds.min}–${bounds.max}`,
    detailLabel: [rarityLabel, slotLabel, input.powerScore > 0 ? powerLabel : null]
      .filter(Boolean)
      .join(" · "),
  };
}

function getLootPreviewLabel(entry: {
  rewardType: string;
  resourceType: ResourceType | null;
  itemDefinition: ItemPresentationInput | null;
}) {
  if (entry.itemDefinition) {
    const presentation = getItemPresentation(entry.itemDefinition);

    return `${entry.itemDefinition.name} · ${presentation.detailLabel}`;
  }

  if (entry.resourceType) {
    return getResourceLabel(entry.resourceType);
  }

  return entry.rewardType;
}

function getNextMarketUpgrade(level: number) {
  const nextCostGold = MARKET_SLOT_UPGRADE_COSTS[level] ?? null;

  return {
    nextCostGold,
    nextLevel: nextCostGold ? level + 1 : null,
  };
}

function getNextHeroSlotsUpgrade(level: number) {
  const nextCostGold = HERO_SLOT_UPGRADE_COSTS[level] ?? null;

  return {
    nextCostGold,
    nextLevel: nextCostGold ? level + 1 : null,
  };
}

function createEmptyGuildUpgradeLevels(): Record<ManagedGuildUpgradeType, number> {
  return {
    [GuildUpgradeType.HERO_SLOTS]: 0,
    [GuildUpgradeType.MARKET_SLOTS]: 0,
    [GuildUpgradeType.STORAGE]: 0,
    [GuildUpgradeType.TRADE_SLOTS]: 0,
  };
}

function mapManagedGuildUpgradeLevels(upgrades: Array<{ upgradeType: GuildUpgradeType; level: number }>) {
  const levels = createEmptyGuildUpgradeLevels();

  upgrades.forEach((upgrade) => {
    if (MANAGED_GUILD_UPGRADES.includes(upgrade.upgradeType as ManagedGuildUpgradeType)) {
      levels[upgrade.upgradeType as ManagedGuildUpgradeType] = upgrade.level;
    }
  });

  return levels;
}

function getTradeSlotLimitFromUpgradeLevel(level: number) {
  return BASE_TRADE_SLOTS + level;
}

const GUILD_UPGRADE_DEFINITIONS: Record<ManagedGuildUpgradeType, GuildUpgradeDefinition> = {
  [GuildUpgradeType.HERO_SLOTS]: {
    title: "Hero slots",
    summary: "Расширяет лимит героев и двигает гильдию к полноценному второму составу.",
    actionLabel: "Купить hero slots",
    href: "/heroes",
    getCurrentValueLabel: (state) => `Лимит ростера: ${state.heroSlots}`,
    getNextValueLabel: (state) => `Лимит ростера вырастет до ${state.heroSlots + 1}`,
    getUsageLabel: (state) => `Ростер ${state.heroCount}/${state.heroSlots}`,
    getLockedSummary: () => null,
    tiers: HERO_SLOT_UPGRADE_COSTS.map((costGold, index) => ({
      level: index + 1,
      costGold,
      requiredGuildLevel: index + 1,
      effectLabel: "+1 hero slot",
      milestoneLabel:
        index + 1 >= 3
          ? "ведёт к второму составу и позднему recruit breakpoint"
          : "открывает новый слот под найм",
    })),
  },
  [GuildUpgradeType.MARKET_SLOTS]: {
    title: "Market slots",
    summary: "Углубляет gold/resource sink и расширяет витрину уже открытого рынка.",
    actionLabel: "Купить market slots",
    href: "/market",
    getCurrentValueLabel: (state) => `Лимит лотов: ${state.marketSlots}`,
    getNextValueLabel: (state) => `Лимит лотов вырастет до ${state.marketSlots + 1}`,
    getUsageLabel: (state) => `Лоты ${state.activeListings}/${state.marketSlots}`,
    getLockedSummary: (state) => (state.marketUnlocked ? null : "Канал рынка ещё закрыт."),
    tiers: MARKET_SLOT_UPGRADE_COSTS.map((costGold, index) => ({
      level: index + 1,
      costGold,
      requiredGuildLevel: index + MARKET_UNLOCK_LEVEL,
      effectLabel: "+1 market slot",
      milestoneLabel:
        index === 0
          ? "разводит первые gold sinks и вторую витрину"
          : "поддерживает более длинный market loop",
    })),
  },
  [GuildUpgradeType.STORAGE]: {
    title: "Workshop",
    summary: "Превращает expedition-ресурсы и золото в постоянное усиление существующей экипировки.",
    actionLabel: "Улучшить workshop",
    href: "/inventory",
    getCurrentValueLabel: (state) =>
      state.upgradeLevels[GuildUpgradeType.STORAGE] > 0
        ? `Лимит item tier: ${state.upgradeLevels[GuildUpgradeType.STORAGE]}`
        : "Workshop ещё не открыт",
    getNextValueLabel: (state) =>
      state.upgradeLevels[GuildUpgradeType.STORAGE] === 0
        ? "Откроет workshop и item tier 1"
        : `Лимит item tier вырастет до ${state.upgradeLevels[GuildUpgradeType.STORAGE] + 1}`,
    getUsageLabel: (state) =>
      state.upgradeLevels[GuildUpgradeType.STORAGE] > 0
        ? `Можно усиливать предметы до tier ${state.upgradeLevels[GuildUpgradeType.STORAGE]}`
        : "Power sink экипировки пока закрыт",
    getLockedSummary: () => null,
    tiers: WORKSHOP_FACILITY_UPGRADE_COSTS.map((costGold, index) => ({
      level: index + 1,
      costGold,
      requiredGuildLevel: index + 2,
      requiredUpgradeLevels:
        index === 0
          ? undefined
          : index === 1
            ? {
                [GuildUpgradeType.MARKET_SLOTS]: 1,
              }
            : {
                [GuildUpgradeType.HERO_SLOTS]: 2,
                [GuildUpgradeType.MARKET_SLOTS]: 2,
              },
      effectLabel:
        index === 0 ? "unlock workshop · item tier 1" : `поднимает cap усиления до item tier ${index + 1}`,
      milestoneLabel:
        index === 0
          ? "открывает долгий resource sink поверх экипировки"
          : index === 1
            ? "разводит выбор sell vs invest поверх рынка"
            : "фиксирует позднюю экипировку как долгосрочную ставку в ростер",
    })),
  },
  [GuildUpgradeType.TRADE_SLOTS]: {
    title: "Trade slots",
    summary: "Повышает число параллельных barter-офферов и делает сделки реальным долгим sink-ом ресурсов.",
    actionLabel: "Купить trade slots",
    href: "/deals",
    getCurrentValueLabel: (state) => `Лимит исходящих офферов: ${state.tradeSlots}`,
    getNextValueLabel: (state) => `Лимит исходящих офферов вырастет до ${state.tradeSlots + 1}`,
    getUsageLabel: (state) => `Офферы ${state.pendingOutgoingTrades}/${state.tradeSlots}`,
    getLockedSummary: (state) => (state.tradeUnlocked ? null : "Канал приватных сделок ещё закрыт."),
    tiers: TRADE_SLOT_UPGRADE_COSTS.map((costGold, index) => ({
      level: index + 1,
      costGold,
      requiredGuildLevel: index + TRADE_UNLOCK_LEVEL,
      requiredUpgradeLevels: {
        [GuildUpgradeType.MARKET_SLOTS]: index + 1,
      },
      effectLabel: "+1 trade slot",
      milestoneLabel:
        index === 0
          ? "позволяет держать два параллельных barter-оффера"
          : "расширяет social/economy horizon поверх рынка",
    })),
  },
};

function getNextGuildUpgradeTier(upgradeType: ManagedGuildUpgradeType, currentLevel: number) {
  return GUILD_UPGRADE_DEFINITIONS[upgradeType].tiers[currentLevel] ?? null;
}

function buildWorkshopFacilityView(workshopFacilityLevel: number) {
  const nextTier = getNextGuildUpgradeTier(GuildUpgradeType.STORAGE, workshopFacilityLevel);

  return {
    unlocked: workshopFacilityLevel > 0,
    facilityLevel: workshopFacilityLevel,
    maxItemLevel: workshopFacilityLevel,
    summary:
      workshopFacilityLevel > 0
        ? `Workshop tier ${workshopFacilityLevel}: можно усиливать существующую экипировку до tier ${workshopFacilityLevel}.`
        : "Workshop ещё не открыт: сначала нужен первый facility tier на dashboard.",
    nextGoalLabel: nextTier
      ? workshopFacilityLevel > 0
        ? `Следующий facility tier на dashboard поднимет cap до ${nextTier.level}.`
        : `Откройте workshop за ${nextTier.costGold} золота на dashboard.`
      : "Workshop достиг текущего MVP-потолка.",
  };
}

function summarizeGuildUpgradeTierRequirements(tier: GuildUpgradeTierConfig) {
  const parts = [`Guild Lv.${tier.requiredGuildLevel}`];

  if (tier.requiredUpgradeLevels) {
    for (const [upgradeType, requiredLevel] of Object.entries(tier.requiredUpgradeLevels) as Array<
      [ManagedGuildUpgradeType, number]
    >) {
      parts.push(`${GUILD_UPGRADE_DEFINITIONS[upgradeType].title} tier ${requiredLevel}`);
    }
  }

  return parts.join(" · ");
}

function collectGuildUpgradeBlockers(
  upgradeType: ManagedGuildUpgradeType,
  state: GuildUpgradeRuntimeState,
  tier: GuildUpgradeTierConfig,
) {
  const definition = GUILD_UPGRADE_DEFINITIONS[upgradeType];
  const blockers: string[] = [];
  const lockedSummary = definition.getLockedSummary(state);

  if (lockedSummary) {
    blockers.push(lockedSummary);
  }

  if (state.guildLevel < tier.requiredGuildLevel) {
    blockers.push(`Нужен guild level ${tier.requiredGuildLevel}.`);
  }

  if (tier.requiredUpgradeLevels) {
    for (const [requiredUpgradeType, requiredLevel] of Object.entries(
      tier.requiredUpgradeLevels,
    ) as Array<[ManagedGuildUpgradeType, number]>) {
      if (state.upgradeLevels[requiredUpgradeType] < requiredLevel) {
        blockers.push(`Нужен ${GUILD_UPGRADE_DEFINITIONS[requiredUpgradeType].title} tier ${requiredLevel}.`);
      }
    }
  }

  return blockers;
}

function buildGuildUpgradeBoardEntry(upgradeType: ManagedGuildUpgradeType, state: GuildUpgradeRuntimeState) {
  const definition = GUILD_UPGRADE_DEFINITIONS[upgradeType];
  const currentLevel = state.upgradeLevels[upgradeType];
  const nextTier = getNextGuildUpgradeTier(upgradeType, currentLevel);
  const structuralBlockers = nextTier ? collectGuildUpgradeBlockers(upgradeType, state, nextTier) : [];
  const canAfford = nextTier ? state.gold >= nextTier.costGold : false;
  const goldShortfall = nextTier ? Math.max(0, nextTier.costGold - state.gold) : 0;
  const blockerSummary = nextTier
    ? [...structuralBlockers, goldShortfall > 0 ? `Нужно ещё ${goldShortfall} золота.` : null]
        .filter((part): part is string => Boolean(part))
        .join(" ") || null
    : null;

  return {
    upgradeType,
    title: definition.title,
    summary: definition.summary,
    actionLabel: definition.actionLabel,
    href: definition.href,
    currentLevel,
    maxLevel: definition.tiers.length,
    currentValueLabel: definition.getCurrentValueLabel(state),
    nextValueLabel: nextTier ? definition.getNextValueLabel(state) : null,
    nextCostGold: nextTier?.costGold ?? null,
    nextLevel: nextTier?.level ?? null,
    usageLabel: definition.getUsageLabel(state),
    milestoneLabel: nextTier?.milestoneLabel ?? "Текущий MVP-потолок для facility уже достигнут.",
    canAfford,
    canPurchase: Boolean(nextTier) && structuralBlockers.length === 0 && canAfford,
    blockerSummary,
    tiers: definition.tiers.map((tier) => ({
      level: tier.level,
      costGold: tier.costGold,
      requiredGuildLevel: tier.requiredGuildLevel,
      effectLabel: tier.effectLabel,
      status:
        tier.level <= currentLevel
          ? "completed"
          : tier.level === currentLevel + 1 && collectGuildUpgradeBlockers(upgradeType, state, tier).length === 0
            ? "available"
            : "locked",
      requirementSummary: summarizeGuildUpgradeTierRequirements(tier),
    })),
  } satisfies GuildUpgradeBoardEntry;
}

function buildGuildUpgradeBoard(state: GuildUpgradeRuntimeState) {
  return MANAGED_GUILD_UPGRADES.map((upgradeType) => buildGuildUpgradeBoardEntry(upgradeType, state));
}

function buildFacilityNextGoalLabel(entry: GuildUpgradeBoardEntry) {
  if (!entry.nextLevel) {
    return "Текущий лимит facility закрыт в рамках MVP.";
  }

  if (entry.canPurchase && entry.nextCostGold !== null) {
    return `${entry.actionLabel} за ${entry.nextCostGold} золота.`;
  }

  return entry.blockerSummary ?? (entry.nextCostGold !== null ? `Следующий tier стоит ${entry.nextCostGold} золота.` : null);
}

function buildGuildFacilitySummaries(state: GuildUpgradeRuntimeState, upgradeBoard: GuildUpgradeBoardEntry[]) {
  const heroEntry =
    upgradeBoard.find((entry) => entry.upgradeType === GuildUpgradeType.HERO_SLOTS) ?? upgradeBoard[0];
  const marketEntry =
    upgradeBoard.find((entry) => entry.upgradeType === GuildUpgradeType.MARKET_SLOTS) ?? upgradeBoard[1];
  const workshopEntry =
    upgradeBoard.find((entry) => entry.upgradeType === GuildUpgradeType.STORAGE) ?? upgradeBoard[2];
  const tradeEntry =
    upgradeBoard.find((entry) => entry.upgradeType === GuildUpgradeType.TRADE_SLOTS) ?? upgradeBoard[3];

  return [
    {
      key: "roster",
      title: "Ростер и резерв",
      unlocked: true,
      statusLabel: `${state.heroCount}/${state.heroSlots} героев`,
      summary:
        state.heroCount >= SECOND_PARTY_TARGET
          ? "Гильдия уже держит резерв под параллельные экспедиции и более длинную ротацию."
          : `До второго полного состава не хватает ${Math.max(0, SECOND_PARTY_TARGET - state.heroCount)} героя(ев).`,
      limitLabel: `Свободных hero slots: ${Math.max(0, state.heroSlots - state.heroCount)}`,
      nextGoalLabel: buildFacilityNextGoalLabel(heroEntry),
      href: "/heroes",
    },
    {
      key: "market",
      title: "Рынок и витрина",
      unlocked: state.marketUnlocked,
      statusLabel: state.marketUnlocked ? "Открыт" : "Закрыт",
      summary: state.marketUnlocked
        ? "Лоты, claim box и market history уже работают как постоянный gold/resource sink."
        : `Рынок откроется на guild level ${MARKET_UNLOCK_LEVEL}.`,
      limitLabel: `Активные лоты: ${state.activeListings}/${state.marketSlots}`,
      nextGoalLabel: state.marketUnlocked
        ? buildFacilityNextGoalLabel(marketEntry)
        : `Достигните guild level ${MARKET_UNLOCK_LEVEL}, чтобы открыть рынок.`,
      href: "/market",
    },
    {
      key: "workshop",
      title: "Workshop",
      unlocked: state.upgradeLevels[GuildUpgradeType.STORAGE] > 0,
      statusLabel:
        state.upgradeLevels[GuildUpgradeType.STORAGE] > 0
          ? `Tier ${state.upgradeLevels[GuildUpgradeType.STORAGE]}`
          : "Закрыт",
      summary:
        state.upgradeLevels[GuildUpgradeType.STORAGE] > 0
          ? "Экипировка превращает gold и expedition-ресурсы в постоянный power вместо чистой продажи в рынок."
          : "Workshop откроет первый долгий equipment sink поверх уже работающей экономики.",
      limitLabel:
        state.upgradeLevels[GuildUpgradeType.STORAGE] > 0
          ? `Лимит усиления предмета: tier ${state.upgradeLevels[GuildUpgradeType.STORAGE]}`
          : "Усиление предметов пока недоступно",
      nextGoalLabel: buildFacilityNextGoalLabel(workshopEntry),
      href: "/inventory",
    },
    {
      key: "trade",
      title: "Приватные сделки",
      unlocked: state.tradeUnlocked,
      statusLabel: state.tradeUnlocked ? "Открыты" : "Закрыты",
      summary: state.tradeUnlocked
        ? "Barter-офферы резервируют предметы и ресурсы, превращая social/economy loop в долгую цель."
        : `Приватные сделки откроются на guild level ${TRADE_UNLOCK_LEVEL}.`,
      limitLabel: `Исходящие офферы: ${state.pendingOutgoingTrades}/${state.tradeSlots}`,
      nextGoalLabel: state.tradeUnlocked
        ? buildFacilityNextGoalLabel(tradeEntry)
        : `Достигните guild level ${TRADE_UNLOCK_LEVEL}, чтобы открыть сделки.`,
      href: "/deals",
    },
  ] satisfies GuildFacilitySummary[];
}

function buildGuildMilestoneSummaries(input: {
  state: GuildUpgradeRuntimeState;
  upgradeBoard: GuildUpgradeBoardEntry[];
  recruitmentProgression: RecruitmentProgression;
  nextLocation: { name: string; requiredGuildLevel: number } | null;
}) {
  const secondPartyHeroShortfall = Math.max(0, SECOND_PARTY_TARGET - input.state.heroCount);
  const secondPartySlotShortfall = Math.max(0, SECOND_PARTY_TARGET - input.state.heroSlots);
  const secondPartyReady = secondPartyHeroShortfall === 0 && secondPartySlotShortfall === 0;
  const secondPartyMissingParts = [
    secondPartySlotShortfall > 0 ? `${secondPartySlotShortfall} hero slot(а)` : null,
    secondPartyHeroShortfall > 0 ? `${secondPartyHeroShortfall} героя(ев)` : null,
  ].filter((part): part is string => Boolean(part));
  const primaryUpgrade = [...input.upgradeBoard]
    .filter((entry) => entry.nextLevel !== null)
    .sort(
      (left, right) =>
        Number(right.canPurchase) - Number(left.canPurchase) ||
        (left.nextCostGold ?? Number.MAX_SAFE_INTEGER) - (right.nextCostGold ?? Number.MAX_SAFE_INTEGER),
    )[0] ?? null;

  return [
    input.nextLocation
      ? {
          key: "next-zone",
          title: `Следующая зона: ${input.nextLocation.name}`,
          summary: `Новый expedition tier и более дорогой лут откроются на guild level ${input.nextLocation.requiredGuildLevel}.`,
          progressLabel: `Lv.${input.state.guildLevel}/${input.nextLocation.requiredGuildLevel}`,
          href: "/expedition",
          status: "next",
        }
      : {
          key: "next-zone",
          title: "Все зоны открыты",
          summary: "Текущая MVP-цепочка expedition-зон уже полностью разблокирована.",
          progressLabel: "4 / 4 зоны",
          href: "/expedition",
          status: "completed",
        },
    {
      key: "second-party",
      title: "Второй полный состав",
      summary: secondPartyReady
        ? `Гильдия уже держит ${SECOND_PARTY_TARGET} slots и достаточно героев для параллельной ротации.`
        : `Нужно ещё ${secondPartyMissingParts.join(" и ")}.`,
      progressLabel: `Герои ${Math.min(input.state.heroCount, SECOND_PARTY_TARGET)}/${SECOND_PARTY_TARGET} · slots ${Math.min(input.state.heroSlots, SECOND_PARTY_TARGET)}/${SECOND_PARTY_TARGET}`,
      href: "/heroes",
      status: secondPartyReady ? "completed" : "next",
    },
    {
      key: "recruit-breakpoint",
      title: `Recruit quality: ${input.recruitmentProgression.currentRarityLabel}`,
      summary:
        input.recruitmentProgression.nextGoalLabel ??
        "Максимальный quality breakpoint recruitment board-а уже достигнут.",
      progressLabel: input.recruitmentProgression.progressLabel,
      href: "/heroes",
      status: input.recruitmentProgression.nextRarityLabel ? "next" : "completed",
    },
    primaryUpgrade
      ? {
          key: `upgrade-${primaryUpgrade.upgradeType}`,
          title: `Следующий facility tier: ${primaryUpgrade.title}`,
          summary: primaryUpgrade.nextLevel
            ? primaryUpgrade.canPurchase
              ? `${primaryUpgrade.actionLabel} доступен прямо сейчас за ${primaryUpgrade.nextCostGold} золота.`
              : primaryUpgrade.blockerSummary ?? `Следующий tier стоит ${primaryUpgrade.nextCostGold} золота.`
            : "Все facility tiers текущего MVP уже куплены.",
          progressLabel: `Tier ${primaryUpgrade.currentLevel}/${primaryUpgrade.maxLevel}`,
          href: "/dashboard",
          status: primaryUpgrade.nextLevel ? "next" : "completed",
        }
      : null,
  ].filter((goal): goal is GuildMilestoneSummary => Boolean(goal));
}

function buildGuildMetaprogressionSnapshot(input: {
  state: GuildUpgradeRuntimeState;
  recruitmentProgression: RecruitmentProgression;
  nextLocation: { name: string; requiredGuildLevel: number } | null;
}) {
  const upgradeBoard = buildGuildUpgradeBoard(input.state);

  return {
    facilities: buildGuildFacilitySummaries(input.state, upgradeBoard),
    upgradeBoard,
    nextGoals: buildGuildMilestoneSummaries({
      state: input.state,
      upgradeBoard,
      recruitmentProgression: input.recruitmentProgression,
      nextLocation: input.nextLocation,
    }),
  } satisfies GuildMetaprogressionSnapshot;
}

function getOnboardingMilestoneStatusLabel(status: OnboardingMilestoneStatus) {
  switch (status) {
    case "completed":
      return "Закрыто";
    case "available":
      return "Можно сделать сейчас";
    default:
      return "Есть блокеры";
  }
}

function getOnboardingMilestoneTone(status: OnboardingMilestoneStatus): PresentationTone {
  switch (status) {
    case "completed":
      return "success";
    case "available":
      return "accent";
    default:
      return "warning";
  }
}

async function loadOnboardingRuntimeContext(guildId: string) {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: {
      level: true,
      gold: true,
      activeHeroSlots: true,
      marketUnlockedAt: true,
    },
  });

  if (!guild) {
    throw new Error("Гильдия не найдена.");
  }

  const [heroCount, availableHeroes, locations, expeditions, upgrades, inventoryItems, resourceBalances, activeListingsCount, soldListingsCount] =
    await Promise.all([
      prisma.hero.count({ where: { guildId } }),
      prisma.hero.count({ where: { guildId, status: HeroStatus.AVAILABLE } }),
      prisma.location.findMany({
        where: { isEnabled: true },
        select: { requiredGuildLevel: true },
      }),
      prisma.expedition.findMany({
        where: { guildId },
        select: { status: true },
      }),
      prisma.guildUpgrade.findMany({
        where: {
          guildId,
          upgradeType: { in: [GuildUpgradeType.HERO_SLOTS, GuildUpgradeType.STORAGE] },
        },
        select: {
          upgradeType: true,
          level: true,
        },
      }),
      prisma.inventoryItem.findMany({
        where: { guildId },
        select: {
          state: true,
          boundToGuild: true,
          workshopLevel: true,
          reservedByType: true,
          itemDefinition: {
            select: {
              name: true,
              itemType: true,
              rarity: true,
              equipSlot: true,
              powerScore: true,
              requiredGuildLevel: true,
              isTradable: true,
              isStarterLocked: true,
            },
          },
          equippedHero: {
            select: { status: true },
          },
        },
      }),
      prisma.resourceBalance.findMany({
        where: { guildId, amount: { gt: 0 } },
        select: {
          resourceType: true,
          amount: true,
        },
      }),
      prisma.marketListing.count({
        where: { sellerGuildId: guildId, status: MarketListingStatus.ACTIVE },
      }),
      prisma.marketListing.count({
        where: { sellerGuildId: guildId, status: MarketListingStatus.SOLD },
      }),
    ]);

  const upgradeLevels = mapManagedGuildUpgradeLevels(upgrades);
  const workshopFacilityLevel = upgradeLevels[GuildUpgradeType.STORAGE];
  const resourceAvailability = buildResourceAvailabilityMap(resourceBalances);
  const workshopItems = inventoryItems.filter((item) => Boolean(item.itemDefinition.equipSlot));

  return {
    guildLevel: guild.level,
    gold: guild.gold,
    heroCount,
    availableHeroes,
    heroSlots: guild.activeHeroSlots,
    heroSlotUpgradeLevel: upgradeLevels[GuildUpgradeType.HERO_SLOTS],
    equippedItemCount: inventoryItems.filter((item) => item.state === InventoryItemState.EQUIPPED).length,
    equippableItemCount: inventoryItems.filter(
      (item) =>
        item.state === InventoryItemState.AVAILABLE &&
        Boolean(item.itemDefinition.equipSlot) &&
        item.itemDefinition.requiredGuildLevel <= guild.level,
    ).length,
    workshopFacilityLevel,
    workshopItemCount: workshopItems.length,
    upgradeableWorkshopItemCount: workshopItems.filter((item) =>
      buildWorkshopPlan({
        workshopFacilityLevel,
        availableGold: guild.gold,
        availableResources: resourceAvailability,
        workshopLevel: item.workshopLevel,
        state: item.state,
        reservedByType: item.reservedByType,
        heroStatus: item.equippedHero?.status ?? null,
        boundToGuild: item.boundToGuild,
        definition: {
          name: item.itemDefinition.name,
          itemType: item.itemDefinition.itemType,
          rarity: item.itemDefinition.rarity,
          equipSlot: item.itemDefinition.equipSlot,
          powerScore: item.itemDefinition.powerScore,
        },
      }).canUpgrade,
    ).length,
    maxWorkshopItemLevel: inventoryItems.reduce((max, item) => Math.max(max, item.workshopLevel), 0),
    unlockedLocationCount: locations.filter((location) => location.requiredGuildLevel <= guild.level).length,
    expeditionCount: expeditions.length,
    activeExpeditionCount: expeditions.filter((expedition) => expedition.status === ExpeditionStatus.ACTIVE).length,
    completedExpeditionCount: expeditions.filter((expedition) => expedition.status === ExpeditionStatus.COMPLETED).length,
    claimedExpeditionCount: expeditions.filter((expedition) => expedition.status === ExpeditionStatus.CLAIMED).length,
    marketUnlocked: Boolean(guild.marketUnlockedAt),
    activeListingsCount,
    soldListingsCount,
    sellableItemCount: inventoryItems.filter(
      (item) =>
        item.state === InventoryItemState.AVAILABLE &&
        !item.boundToGuild &&
        item.itemDefinition.isTradable &&
        !item.itemDefinition.isStarterLocked,
    ).length,
    sellableResourceTypeCount: resourceBalances.length,
  } satisfies OnboardingRuntimeContext;
}

function buildOnboardingSnapshot(context: OnboardingRuntimeContext): OnboardingSnapshot {
  const freeHeroSlots = Math.max(0, context.heroSlots - context.heroCount);
  const extraEquippedItems = Math.max(0, context.equippedItemCount - context.heroCount);
  const firstListingProgress = context.activeListingsCount + context.soldListingsCount;
  const nextHeroSlotsUpgrade = getNextHeroSlotsUpgrade(context.heroSlotUpgradeLevel);

  const createMilestone = (input: {
    key: OnboardingMilestoneKey;
    title: string;
    summary: string;
    status: OnboardingMilestoneStatus;
    progressLabel: string;
    href: string;
    actionLabel: string;
    blockers: string[];
  }) => ({
    ...input,
    statusLabel: getOnboardingMilestoneStatusLabel(input.status),
    tone: getOnboardingMilestoneTone(input.status),
  }) satisfies OnboardingMilestone;

  const milestones = [
    createMilestone({
      key: "equip-hero",
      title: "Надеть первое дополнительное снаряжение",
      summary:
        "Наденьте на любого доступного героя свободную броню или аксессуар, чтобы сразу поднять power первой партии.",
      status:
        extraEquippedItems > 0
          ? "completed"
          : context.equippableItemCount > 0 && context.availableHeroes > 0
            ? "available"
            : "blocked",
      progressLabel: `Доп. экипировка: ${Math.min(extraEquippedItems, 1)}/1`,
      href: "/heroes",
      actionLabel: "Открыть ростер",
      blockers:
        extraEquippedItems > 0
          ? []
          : [
              context.equippableItemCount === 0
                ? "В инвентаре нет свободного снаряжения, которое можно надеть прямо сейчас."
                : null,
              context.availableHeroes === 0
                ? "Все герои заняты в походах, поэтому loadout временно заблокирован."
                : null,
            ].filter((entry): entry is string => Boolean(entry)),
    }),
    createMilestone({
      key: "start-expedition",
      title: "Запустить первую экспедицию",
      summary:
        "Соберите trio и отправьте первую партию, чтобы увидеть базовый PvE timer, risk/reward и будущий claim-flow.",
      status:
        context.expeditionCount > 0
          ? "completed"
          : context.availableHeroes >= 3 && context.unlockedLocationCount > 0
            ? "available"
            : "blocked",
      progressLabel: `Запущенные походы: ${Math.min(context.expeditionCount, 1)}/1`,
      href: "/expedition",
      actionLabel: "Собрать партию",
      blockers:
        context.expeditionCount > 0
          ? []
          : [
              context.availableHeroes < 3
                ? context.completedExpeditionCount > 0
                  ? "У вас уже есть готовый поход — заберите награды, чтобы вернуть партию в ростер."
                  : context.activeExpeditionCount > 0
                    ? "Нужно дождаться текущего похода или расширить ростер до второго состава."
                    : `Для первой экспедиции нужно 3 свободных героя, сейчас доступно ${context.availableHeroes}.`
                : null,
              context.unlockedLocationCount === 0
                ? "На текущем уровне гильдии ещё нет открытых локаций."
                : null,
            ].filter((entry): entry is string => Boolean(entry)),
    }),
    createMilestone({
      key: "claim-expedition",
      title: "Забрать первую награду экспедиции",
      summary:
        "После завершения забега заберите reward вручную: так закрывается базовый expedition → loot → hero XP loop.",
      status:
        context.claimedExpeditionCount > 0
          ? "completed"
          : context.completedExpeditionCount > 0
            ? "available"
            : "blocked",
      progressLabel: `Забранные походы: ${Math.min(context.claimedExpeditionCount, 1)}/1`,
      href: "/expedition",
      actionLabel: "Забрать награды",
      blockers:
        context.claimedExpeditionCount > 0 || context.completedExpeditionCount > 0
          ? []
          : [
              context.activeExpeditionCount > 0
                ? "Первая экспедиция уже в пути — награды станут доступны после завершения таймера."
                : "Сначала отправьте первую партию хотя бы в одну открытую локацию.",
            ],
    }),
    createMilestone({
      key: "upgrade-item",
      title: "Усилить первый предмет в workshop",
      summary:
        "Вложите первые expedition-ресурсы в предмет, чтобы зафиксировать первый permanent power upgrade для ростера.",
      status:
        context.maxWorkshopItemLevel >= 1
          ? "completed"
          : context.workshopFacilityLevel > 0 && context.upgradeableWorkshopItemCount > 0
            ? "available"
            : "blocked",
      progressLabel: `Усиленные предметы: ${Math.min(context.maxWorkshopItemLevel, 1)}/1`,
      href: "/inventory",
      actionLabel: "Открыть workshop",
      blockers:
        context.maxWorkshopItemLevel >= 1
          ? []
          : [
              context.workshopFacilityLevel === 0 ? "Сначала откройте workshop на dashboard." : null,
              context.workshopFacilityLevel > 0 && context.workshopItemCount === 0
                ? "В гильдии пока нет экипировки, которую можно усилить."
                : null,
              context.workshopFacilityLevel > 0 &&
              context.workshopItemCount > 0 &&
              context.upgradeableWorkshopItemCount === 0
                ? "Сейчас ни один предмет не готов к усилению: не хватает золота, ресурсов или свободного экземпляра."
                : null,
            ].filter((entry): entry is string => Boolean(entry)),
    }),
    createMilestone({
      key: "list-market-lot",
      title: "Выставить первый лот на рынке",
      summary:
        "Выставьте первый ITEM или RESOURCE лот, чтобы увидеть market fee, витрину и будущий claim box в работе.",
      status:
        firstListingProgress > 0
          ? "completed"
          : context.marketUnlocked &&
              context.gold >= MARKET_LISTING_FEE_GOLD &&
              (context.sellableItemCount > 0 || context.sellableResourceTypeCount > 0)
            ? "available"
            : "blocked",
      progressLabel: `Лоты на витрине: ${Math.min(firstListingProgress, 1)}/1`,
      href: "/market",
      actionLabel: "Открыть рынок",
      blockers:
        firstListingProgress > 0
          ? []
          : [
              !context.marketUnlocked ? `Рынок открывается на guild level ${MARKET_UNLOCK_LEVEL}.` : null,
              context.marketUnlocked &&
              context.sellableItemCount === 0 &&
              context.sellableResourceTypeCount === 0
                ? "Нужен свободный предмет или ресурсный stack, который можно выставить на витрину."
                : null,
              context.marketUnlocked && context.gold < MARKET_LISTING_FEE_GOLD
                ? `Нужно ещё ${MARKET_LISTING_FEE_GOLD - context.gold} золота на listing fee.`
                : null,
            ].filter((entry): entry is string => Boolean(entry)),
    }),
    createMilestone({
      key: "recruit-hero",
      title: "Нанять четвёртого героя",
      summary:
        "Четвёртый герой даёт первый резерв: следующий expedition cycle перестаёт упираться только в одну стартовую тройку.",
      status:
        context.heroCount >= 4
          ? "completed"
          : freeHeroSlots > 0 && context.gold >= HERO_RECRUITMENT_COST_GOLD
            ? "available"
            : "blocked",
      progressLabel: `Ростер ${Math.min(context.heroCount, 4)}/4`,
      href: "/heroes",
      actionLabel: "Открыть таверну",
      blockers:
        context.heroCount >= 4
          ? []
          : [
              freeHeroSlots === 0
                ? nextHeroSlotsUpgrade.nextCostGold !== null
                  ? context.gold >= nextHeroSlotsUpgrade.nextCostGold
                    ? `Сначала купите hero slots на dashboard за ${nextHeroSlotsUpgrade.nextCostGold} золота.`
                    : `Сначала купите hero slots на dashboard: до первого тира не хватает ${
                        nextHeroSlotsUpgrade.nextCostGold - context.gold
                      } золота.`
                  : "Свободных hero slots больше нет в текущем MVP."
                : null,
              freeHeroSlots > 0 && context.gold < HERO_RECRUITMENT_COST_GOLD
                ? `Нужно ещё ${HERO_RECRUITMENT_COST_GOLD - context.gold} золота на найм героя.`
                : null,
            ].filter((entry): entry is string => Boolean(entry)),
    }),
  ];

  const completedCount = milestones.filter((milestone) => milestone.status === "completed").length;
  const availableCount = milestones.filter((milestone) => milestone.status === "available").length;
  const blockedCount = milestones.filter((milestone) => milestone.status === "blocked").length;
  const recommendedMilestone =
    milestones.find((milestone) => milestone.status === "available") ??
    milestones.find((milestone) => milestone.status === "blocked") ??
    null;
  const blockers = Array.from(
    new Set(
      milestones
        .filter((milestone) => milestone.status === "blocked")
        .flatMap((milestone) => milestone.blockers),
    ),
  ).slice(0, 3);

  return {
    isActive: completedCount < milestones.length,
    totalMilestones: milestones.length,
    completedCount,
    availableCount,
    blockedCount,
    progressLabel: `${completedCount}/${milestones.length} milestones`,
    progressPercent: Math.round((completedCount / milestones.length) * 100),
    summary:
      completedCount === milestones.length
        ? "Базовый onboarding закрыт: ростер, экспедиции, workshop, рынок и первый резерв уже задействованы."
        : recommendedMilestone
          ? `Прогресс первого сеанса: ${completedCount}/${milestones.length}. Следующий шаг — ${recommendedMilestone.title.toLowerCase()}.`
          : `Прогресс первого сеанса: ${completedCount}/${milestones.length}. Оставшиеся шаги пока упираются в текущие блокеры.`,
    blockers,
    recommendedAction: recommendedMilestone
      ? {
          key: recommendedMilestone.key,
          title: recommendedMilestone.title,
          summary: recommendedMilestone.summary,
          href: recommendedMilestone.href,
          actionLabel: recommendedMilestone.actionLabel,
          tone: recommendedMilestone.tone,
          reason:
            recommendedMilestone.status === "available"
              ? "Этот шаг можно выполнить прямо сейчас из текущего состояния гильдии."
              : recommendedMilestone.blockers[0] ?? "Следующий шаг пока упирается в текущий блокер.",
          blockers: [...recommendedMilestone.blockers],
        }
      : null,
    milestones,
  };
}

async function loadOnboardingSnapshot(guildId: string) {
  const context = await loadOnboardingRuntimeContext(guildId);
  return buildOnboardingSnapshot(context);
}

function getRecruitmentRarityCap(input: { guildLevel: number; heroSlotUpgradeLevel: number }) {
  if (input.guildLevel >= 4 && input.heroSlotUpgradeLevel >= 3) {
    return HeroRarity.RARE;
  }

  if (input.guildLevel >= 2 || input.heroSlotUpgradeLevel >= 1) {
    return HeroRarity.UNCOMMON;
  }

  return HeroRarity.COMMON;
}

function getRecruitmentProgression(input: {
  guildLevel: number;
  heroSlotUpgradeLevel: number;
}): RecruitmentProgression {
  const rarityCap = getRecruitmentRarityCap(input);

  if (rarityCap === HeroRarity.COMMON) {
    return {
      currentRarityLabel: getRarityLabel(HeroRarity.COMMON),
      nextRarityLabel: getRarityLabel(HeroRarity.UNCOMMON),
      statusLabel: "Базовые рекруты",
      nextGoalLabel:
        "Поднимите гильдию до Lv. 2 или купите первый tier hero slots, чтобы на доске появились uncommon-рекруты.",
      progressLabel: `Guild Lv.${input.guildLevel} · hero slots tier ${input.heroSlotUpgradeLevel}`,
    };
  }

  if (rarityCap === HeroRarity.UNCOMMON) {
    return {
      currentRarityLabel: getRarityLabel(HeroRarity.UNCOMMON),
      nextRarityLabel: getRarityLabel(HeroRarity.RARE),
      statusLabel: "Uncommon recruits unlocked",
      nextGoalLabel:
        input.guildLevel >= 4 && input.heroSlotUpgradeLevel < 3
          ? "Для rare-рекрутов нужен hero slots tier 3."
          : input.guildLevel < 4 && input.heroSlotUpgradeLevel >= 3
            ? "Для rare-рекрутов нужен guild level 4."
            : "Для rare-рекрутов нужны guild level 4 и hero slots tier 3.",
      progressLabel: `Lv.${input.guildLevel}/4 · hero slots ${input.heroSlotUpgradeLevel}/3`,
    };
  }

  return {
    currentRarityLabel: getRarityLabel(HeroRarity.RARE),
    nextRarityLabel: null,
    statusLabel: "Rare recruits unlocked",
    nextGoalLabel: null,
    progressLabel: "Максимальный quality breakpoint достигнут",
  };
}

function getRecruitmentBoard(input: {
  heroCount: number;
  heroSlotUpgradeLevel: number;
  guildLevel: number;
}) {
  const rotationSeed = input.heroCount + input.heroSlotUpgradeLevel + input.guildLevel;
  const rarityCap = getRecruitmentRarityCap({
    guildLevel: input.guildLevel,
    heroSlotUpgradeLevel: input.heroSlotUpgradeLevel,
  });

  return ([HeroClass.VANGUARD, HeroClass.RANGER, HeroClass.MYSTIC] as const).map(
    (heroClass, index) => {
      const pool = RECRUITMENT_TEMPLATES[heroClass];
      const unlockedPool = pool.filter(
        (template) => HERO_RARITY_ORDER[template.rarity] <= HERO_RARITY_ORDER[rarityCap],
      );
      const template = unlockedPool[(rotationSeed + index) % unlockedPool.length] ?? unlockedPool[0] ?? pool[0];

      return {
        ...template,
        heroClassLabel: getHeroClassLabel(template.heroClass),
        tacticalRoleLabel: getHeroClassTacticLabel(template.heroClass),
        rarityLabel: getRarityLabel(template.rarity),
        recruitCostGold: HERO_RECRUITMENT_COST_GOLD,
      };
    },
  );
}

function getLocationProfile(code: string) {
  return (
    LOCATION_PROFILES[code as keyof typeof LOCATION_PROFILES] ?? {
      scenarioType: "standard-route",
      scenarioLabel: "Стандартная экспедиция",
      scenarioSummary: "Маршрут без специальных risk/reward-модификаторов.",
      rewardFocusLabel: "Смешанная добыча без выраженного перекоса",
      riskLabel: "Средний риск",
      riskScore: 2,
      isElite: false,
      specialRules: ["Маршрут использует fallback-профиль без дополнительных бонусов к награде."],
      hazardLabel: "Неизвестное давление маршрута",
      preferredClasses: [HeroClass.VANGUARD, HeroClass.RANGER],
      pressureMultiplier: 1,
      opener: "Маршрут не имеет заранее размеченного профиля угроз.",
      outcome: {
        goldMultiplier: 1,
        guildXpMultiplier: 1,
        heroXpMultiplier: 1,
        resourceMultiplier: 1,
        itemMultiplier: 1,
        extraRolls: 0,
        volatility: 12,
        guaranteedResourceRolls: 0,
        guaranteedItemRolls: 0,
        triumphItemRolls: 0,
        preferredRoleBonus: 0,
        outcomePenalty: 0,
      },
    }
  );
}

function buildZoneProgression(input: {
  guildLevel: number;
  locations: Array<{ name: string; requiredGuildLevel: number; code: string }>;
}): ZoneProgression {
  const nextLocation =
    input.locations.find((location) => location.requiredGuildLevel > input.guildLevel) ?? null;
  const unlockedLocations = input.locations.filter(
    (location) => location.requiredGuildLevel <= input.guildLevel,
  );
  const specialLocations = input.locations.filter(
    (location) => getLocationProfile(location.code).scenarioType !== "standard-route",
  );
  const unlockedSpecialLocations = specialLocations.filter(
    (location) => location.requiredGuildLevel <= input.guildLevel,
  );
  const highestUnlockedRiskProfile = [...unlockedLocations]
    .map((location) => getLocationProfile(location.code))
    .sort((left, right) => right.riskScore - left.riskScore)[0] ?? null;

  if (!nextLocation) {
    return {
      nextLocationName: null,
      nextRequiredGuildLevel: null,
      statusLabel: "Все PvE-сценарии открыты",
      nextGoalLabel: `Открыты все ${input.locations.length} маршрутов, включая ${specialLocations.length} special-сценария поверх baseline-зон.`,
      unlockedLocationCount: unlockedLocations.length,
      totalLocationCount: input.locations.length,
      unlockedSpecialScenarioCount: unlockedSpecialLocations.length,
      totalSpecialScenarioCount: specialLocations.length,
      highestUnlockedRiskLabel: highestUnlockedRiskProfile?.riskLabel ?? "—",
    };
  }

  const nextProfile = getLocationProfile(nextLocation.code);

  return {
    nextLocationName: nextLocation.name,
    nextRequiredGuildLevel: nextLocation.requiredGuildLevel,
    statusLabel: `Открыто ${unlockedLocations.length}/${input.locations.length}`,
    nextGoalLabel: `Следующий PvE-маршрут — ${nextLocation.name} (${nextProfile.scenarioLabel}) на guild level ${nextLocation.requiredGuildLevel}. Фокус награды: ${nextProfile.rewardFocusLabel}.`,
    unlockedLocationCount: unlockedLocations.length,
    totalLocationCount: input.locations.length,
    unlockedSpecialScenarioCount: unlockedSpecialLocations.length,
    totalSpecialScenarioCount: specialLocations.length,
    highestUnlockedRiskLabel: highestUnlockedRiskProfile?.riskLabel ?? "—",
  };
}

function buildPveHorizonSnapshot(input: {
  guildLevel: number;
  locations: Array<{ code: string; name: string; requiredGuildLevel: number }>;
}): PveHorizonSnapshot {
  const unlockedLocations = input.locations.filter(
    (location) => location.requiredGuildLevel <= input.guildLevel,
  );
  const specialLocations = input.locations.filter(
    (location) => getLocationProfile(location.code).scenarioType !== "standard-route",
  );
  const unlockedSpecialLocations = specialLocations.filter(
    (location) => location.requiredGuildLevel <= input.guildLevel,
  );
  const nextLockedLocation =
    input.locations.find((location) => location.requiredGuildLevel > input.guildLevel) ?? null;
  const highestUnlockedRiskProfile = [...unlockedLocations]
    .map((location) => getLocationProfile(location.code))
    .sort((left, right) => right.riskScore - left.riskScore)[0] ?? null;

  return {
    unlockedLocationCount: unlockedLocations.length,
    totalLocationCount: input.locations.length,
    unlockedSpecialScenarioCount: unlockedSpecialLocations.length,
    totalSpecialScenarioCount: specialLocations.length,
    highestUnlockedRiskLabel: highestUnlockedRiskProfile?.riskLabel ?? "—",
    nextGoalLabel: nextLockedLocation
      ? `Следующий unlock — ${nextLockedLocation.name} на guild level ${nextLockedLocation.requiredGuildLevel}.`
      : "Все специальные PvE-сценарии уже открыты для текущего MVP-среза.",
    highlightedScenarios: specialLocations.map((location) => {
      const profile = getLocationProfile(location.code);
      const isUnlocked = input.guildLevel >= location.requiredGuildLevel;

      return {
        code: location.code,
        name: location.name,
        scenarioLabel: profile.scenarioLabel,
        riskLabel: profile.riskLabel,
        rewardFocusLabel: profile.rewardFocusLabel,
        summary: profile.scenarioSummary,
        statusLabel: isUnlocked ? "Открыт" : `Требует Lv.${location.requiredGuildLevel}`,
        progressSummary: isUnlocked
          ? profile.specialRules[0] ?? profile.rewardFocusLabel
          : `Guild Lv.${input.guildLevel}/${location.requiredGuildLevel}`,
        specialRules: profile.specialRules,
        isUnlocked,
        isElite: profile.isElite,
      };
    }),
  };
}

function getLocationRiskRewardSummary(code: string) {
  const profile = getLocationProfile(code);
  return `${profile.scenarioSummary} Фокус награды: ${profile.rewardFocusLabel}.`;
}

function randomInt(min: number, max: number) {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function readOptionalText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function toPositiveInt(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function getReservationLabel(value: ReservationType | null) {
  if (value === ReservationType.EXPEDITION) {
    return "В походном резерве";
  }

  if (value === ReservationType.MARKET) {
    return "На рынке";
  }

  if (value === ReservationType.TRADE) {
    return "В приватной сделке";
  }

  return null;
}

function splitCombatLog(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildExpeditionBaseline(input: {
  location: {
    code: string;
    recommendedPower: number;
  };
  party: Array<{
    hero: {
      name: string;
      heroClass: HeroClass;
      powerScore: number;
    };
  }>;
}) {
  const profile = getLocationProfile(input.location.code);
  const classCounts = {
    VANGUARD: 0,
    RANGER: 0,
    MYSTIC: 0,
  } satisfies Record<HeroClass, number>;
  const anchors = {
    VANGUARD: null,
    RANGER: null,
    MYSTIC: null,
  } as Record<HeroClass, string | null>;

  const partyPower = input.party.reduce((sum, entry) => {
    classCounts[entry.hero.heroClass] += 1;

    if (!anchors[entry.hero.heroClass]) {
      anchors[entry.hero.heroClass] = entry.hero.name;
    }

    return sum + entry.hero.powerScore;
  }, 0);

  const roleCoverage =
    (classCounts.VANGUARD > 0 ? 1 : 0) +
    (classCounts.RANGER > 0 ? 1 : 0) +
    (classCounts.MYSTIC > 0 ? 1 : 0);
  const uniqueClasses = Object.values(classCounts).filter((count) => count > 0).length;
  const preferredHits = profile.preferredClasses.reduce(
    (sum, heroClass) => sum + (classCounts[heroClass] > 0 ? 1 : 0),
    0,
  );
  const duplicatePenalty = Math.max(...Object.values(classCounts)) - 1;
  const tacticalBonus = uniqueClasses * 6 + roleCoverage * 3 + preferredHits * 5 - duplicatePenalty * 7;
  const tacticalPower = Math.max(12, partyPower + tacticalBonus);
  const threatScore = Math.max(20, Math.round(input.location.recommendedPower * profile.pressureMultiplier));

  return {
    profile,
    anchors,
    roleCoverage,
    tacticalPower,
    threatScore,
  };
}

function getBestAvailablePartyOption(input: {
  location: {
    code: string;
    recommendedPower: number;
  };
  heroes: Array<{
    name: string;
    heroClass: HeroClass;
    powerScore: number;
  }>;
}): BestAvailablePartyOption | null {
  if (input.heroes.length < EXPEDITION_PARTY_SIZE) {
    return null;
  }

  let bestOption: BestAvailablePartyOption | null = null;

  for (let first = 0; first < input.heroes.length - 2; first += 1) {
    for (let second = first + 1; second < input.heroes.length - 1; second += 1) {
      for (let third = second + 1; third < input.heroes.length; third += 1) {
        const party = [input.heroes[first], input.heroes[second], input.heroes[third]].map((hero) => ({
          hero,
        }));
        const baseline = buildExpeditionBaseline({
          location: input.location,
          party,
        });
        const margin = baseline.tacticalPower - baseline.threatScore;

        if (
          !bestOption ||
          margin > bestOption.margin ||
          (margin === bestOption.margin && baseline.tacticalPower > bestOption.tacticalPower)
        ) {
          bestOption = {
            partyNames: party.map((entry) => entry.hero.name),
            tacticalPower: baseline.tacticalPower,
            threatScore: baseline.threatScore,
            margin,
          };
        }
      }
    }
  }

  return bestOption;
}

function buildLocationBlockerSummary(input: {
  guildLevel: number;
  location: {
    requiredGuildLevel: number;
  };
  bestParty: BestAvailablePartyOption | null;
}) {
  if (input.guildLevel < input.location.requiredGuildLevel) {
    return `Требуется guild level ${input.location.requiredGuildLevel}, прежде чем маршрут вообще появится в ротации.`;
  }

  if (!input.bestParty) {
    return "Нужны 3 свободных героя, чтобы оценить текущий потолок партии против угрозы маршрута.";
  }

  if (input.bestParty.margin >= 0) {
    return `Лучший свободный trio уже перекрывает угрозу: ${input.bestParty.tacticalPower} против ${input.bestParty.threatScore} (+${input.bestParty.margin}).`;
  }

  return `Лучший свободный trio пока недобирает: ${input.bestParty.tacticalPower} против ${input.bestParty.threatScore} (${input.bestParty.margin}).`;
}

function getExpeditionHeroXpReward(input: {
  rewardGuildXp: number;
  resultTier: ExpeditionResultTier | null;
  locationCode: string;
}) {
  if (!input.resultTier) {
    return null;
  }

  const heroXpRewardBase = Math.max(6, Math.round(input.rewardGuildXp * 0.6));
  const resultMultiplier =
    input.resultTier === ExpeditionResultTier.TRIUMPH
      ? 1.25
      : input.resultTier === ExpeditionResultTier.SETBACK
        ? 0.8
        : input.resultTier === ExpeditionResultTier.FAILURE
          ? 0.5
          : 1;
  const scenarioMultiplier = getLocationProfile(input.locationCode).outcome.heroXpMultiplier;

  return Math.max(4, Math.round(heroXpRewardBase * resultMultiplier * scenarioMultiplier));
}

function summarizeExpeditionRewards(input: {
  rewardGold: number;
  rewardGuildXp: number;
  rewards: ExpeditionRewardView[];
  heroXpRewardPerHero?: number | null;
}) {
  const parts: string[] = [];

  if (input.rewardGold > 0) {
    parts.push(`${input.rewardGold} золота`);
  }

  if (input.rewardGuildXp > 0) {
    parts.push(`${input.rewardGuildXp} guild XP`);
  }

  if (input.heroXpRewardPerHero && input.heroXpRewardPerHero > 0) {
    parts.push(`по ${input.heroXpRewardPerHero} hero XP`);
  }

  input.rewards.forEach((reward) => {
    if (reward.rewardType === "RESOURCE" && reward.resourceType) {
      parts.push(`${reward.quantity} × ${getResourceLabel(reward.resourceType)}`);
      return;
    }

    if (reward.rewardType === "ITEM" && reward.itemDefinition) {
      const presentation = getItemPresentation(reward.itemDefinition);

      parts.push(`${reward.quantity} × ${reward.itemDefinition.name} (${presentation.detailLabel})`);
    }
  });

  return parts;
}

function summarizeTradeItems(
  items: Array<{
    side: TradeOfferSide;
    resourceType: ResourceType | null;
    quantity: number;
    inventoryItem: { itemDefinition: { name: string } } | null;
  }>,
  side: TradeOfferSide,
) {
  const parts = items
    .filter((item) => item.side === side)
    .map((item) => {
      if (item.resourceType) {
        return `${item.quantity} × ${getResourceLabel(item.resourceType)}`;
      }

      return `${item.quantity} × ${item.inventoryItem?.itemDefinition.name ?? "предмет"}`;
    });

  return parts.length > 0 ? parts.join(", ") : "—";
}

function getListingDisplayDetails(listing: {
  quantity: number;
  totalPriceGold: number;
  resourceType: ResourceType | null;
  itemDefinition: ItemPresentationInput | null;
}) {
  if (listing.itemDefinition) {
    const presentation = getItemPresentation(listing.itemDefinition);

    return {
      itemLabel: listing.itemDefinition.name,
      detailLabel: presentation.detailLabel,
      valueSummary: `Цена ${listing.totalPriceGold} зол. · ${presentation.valueSummary}`,
    };
  }

  if (listing.resourceType) {
    const resourceLabel = getResourceLabel(listing.resourceType);
    const pricePerUnit = Math.max(1, Math.round(listing.totalPriceGold / Math.max(1, listing.quantity)));

    return {
      itemLabel: resourceLabel,
      detailLabel: `${resourceLabel} · ${listing.quantity} шт.`,
      valueSummary: `Стек по ${pricePerUnit} зол./шт.`,
    };
  }

  return {
    itemLabel: "Товар",
    detailLabel: `${listing.quantity} шт.`,
    valueSummary: `Цена ${listing.totalPriceGold} зол.`,
  };
}

function getMarketClaimStatusLabel(status: MarketClaimStatus) {
  return status === MarketClaimStatus.PENDING ? "Ожидает claim" : "Забрано";
}

function isBuyOrderClaimSourceType(sourceType: MarketClaimSourceType) {
  return (
    sourceType === MarketClaimSourceType.FILLED_BUY_ORDER ||
    sourceType === MarketClaimSourceType.CANCELLED_BUY_ORDER ||
    sourceType === MarketClaimSourceType.EXPIRED_BUY_ORDER
  );
}

function getMarketClaimSourceLabel(sourceType: MarketClaimSourceType) {
  if (sourceType === MarketClaimSourceType.SOLD_LISTING) {
    return "Выплата за продажу";
  }

  if (sourceType === MarketClaimSourceType.CANCELLED_LISTING) {
    return "Возврат после отмены";
  }

  if (sourceType === MarketClaimSourceType.FILLED_BUY_ORDER) {
    return "Выплата за исполнение заявки";
  }

  if (sourceType === MarketClaimSourceType.CANCELLED_BUY_ORDER) {
    return "Возврат резерва заявки";
  }

  if (sourceType === MarketClaimSourceType.EXPIRED_BUY_ORDER) {
    return "Возврат по истёкшей заявке";
  }

  return "Возврат после истечения";
}

function getMarketClaimPayloadLabel(input: {
  goldAmount: number | null;
  resourceType: ResourceType | null;
  quantity: number;
  inventoryItem: { itemDefinition: { name: string } } | null;
}) {
  if (input.goldAmount !== null) {
    return `${input.goldAmount} золота`;
  }

  if (input.inventoryItem?.itemDefinition.name) {
    return input.inventoryItem.itemDefinition.name;
  }

  if (input.resourceType) {
    return `${input.quantity} × ${getResourceLabel(input.resourceType)}`;
  }

  return "Награда";
}

function getTradeTone(status: TradeOfferStatus): PresentationTone {
  if (status === TradeOfferStatus.PENDING) {
    return "accent";
  }

  if (status === TradeOfferStatus.ACCEPTED) {
    return "success";
  }

  if (status === TradeOfferStatus.CANCELLED) {
    return "neutral";
  }

  return "warning";
}

function getTradeOutcomeLabel(status: TradeOfferStatus, isIncoming: boolean) {
  if (status === TradeOfferStatus.PENDING) {
    return isIncoming ? "Нужен ответ" : "Ждёт решения";
  }

  if (status === TradeOfferStatus.ACCEPTED) {
    return "Обмен завершён";
  }

  if (status === TradeOfferStatus.REJECTED) {
    return isIncoming ? "Вы отклонили оффер" : "Оффер отклонён";
  }

  if (status === TradeOfferStatus.CANCELLED) {
    return isIncoming ? "Отправитель отменил оффер" : "Вы отменили оффер";
  }

  if (status === TradeOfferStatus.EXPIRED) {
    return "Время вышло";
  }

  if (status === TradeOfferStatus.INVALIDATED) {
    return "Оффер потерял валидность";
  }

  return getTradeStatusLabel(status);
}

function getTradeOutcomeSummary(status: TradeOfferStatus, isIncoming: boolean) {
  if (status === TradeOfferStatus.PENDING) {
    return isIncoming
      ? "Можно принять или отклонить, пока таймер не истёк."
      : "Контрагент ещё не ответил; ваш резерв остаётся заблокированным.";
  }

  if (status === TradeOfferStatus.ACCEPTED) {
    return "Обе стороны подтвердили обмен, и предметы/ресурсы уже переведены автоматически.";
  }

  if (status === TradeOfferStatus.REJECTED) {
    return isIncoming
      ? "Оффер отклонён без обмена; резерв отправителя снят автоматически."
      : "Контрагент отклонил предложение, и ваши зарезервированные assets возвращены.";
  }

  if (status === TradeOfferStatus.CANCELLED) {
    return isIncoming
      ? "Отправитель снял предложение до вашего ответа."
      : "Вы отменили оффер до ответа контрагента; резерв снят автоматически.";
  }

  if (status === TradeOfferStatus.EXPIRED) {
    return "Срок ответа истёк; оффер закрылся без обмена, резерв отправителя снят.";
  }

  if (status === TradeOfferStatus.INVALIDATED) {
    return "Оффер потерял валидность, потому что один из assets перестал быть доступен к обмену.";
  }

  return "Статус сделки обновлён.";
}

function buildTradeOfferView(
  offer: {
    id: string;
    status: TradeOfferStatus;
    message: string | null;
    createdAt: Date;
    expiresAt: Date;
    respondedAt: Date | null;
    senderGuildId: string;
    receiverGuildId: string;
    senderGuild: { name: string; tag: string };
    receiverGuild: { name: string; tag: string };
    items: Array<{
      side: TradeOfferSide;
      resourceType: ResourceType | null;
      quantity: number;
      inventoryItem: { itemDefinition: { name: string } } | null;
    }>;
  },
  guildId: string,
): TradeOfferView {
  const isIncoming = offer.receiverGuildId === guildId;
  const counterparty = isIncoming ? offer.senderGuild : offer.receiverGuild;

  return {
    id: offer.id,
    status: offer.status,
    tone: getTradeTone(offer.status),
    directionKey: isIncoming ? "incoming" : "outgoing",
    directionLabel: isIncoming ? "Входящая" : "Исходящая",
    counterpartyLabel: `${counterparty.name} [${counterparty.tag}]`,
    statusLabel: getTradeStatusLabel(offer.status),
    outcomeLabel: getTradeOutcomeLabel(offer.status, isIncoming),
    outcomeSummary: getTradeOutcomeSummary(offer.status, isIncoming),
    message: offer.message,
    createdAt: offer.createdAt,
    expiresAt: offer.expiresAt,
    respondedAt: offer.respondedAt,
    finalAt: offer.status === TradeOfferStatus.EXPIRED ? offer.expiresAt : offer.respondedAt ?? offer.expiresAt,
    offeredSummary: summarizeTradeItems(offer.items, TradeOfferSide.OFFERED),
    requestedSummary: summarizeTradeItems(offer.items, TradeOfferSide.REQUESTED),
    isPending: offer.status === TradeOfferStatus.PENDING,
    isIncoming,
  };
}

function buildMarketClaimView(claim: {
  id: string;
  claimType: MarketClaimType;
  sourceType: MarketClaimSourceType;
  resourceType: ResourceType | null;
  goldAmount: number | null;
  quantity: number;
  status: MarketClaimStatus;
  createdAt: Date;
  claimedAt: Date | null;
  inventoryItem: { itemDefinition: { name: string } } | null;
}): MarketClaimView {
  return {
    id: claim.id,
    claimTypeLabel: getClaimTypeLabel(claim.claimType),
    payloadLabel: getMarketClaimPayloadLabel(claim),
    sourceLabel: getMarketClaimSourceLabel(claim.sourceType),
    statusLabel: getMarketClaimStatusLabel(claim.status),
    createdAt: claim.createdAt,
    claimedAt: claim.claimedAt,
    isPending: claim.status === MarketClaimStatus.PENDING,
  };
}

function buildMarketHistoryEntry(
  listing: {
    id: string;
    sellerGuildId: string;
    buyerGuildId: string | null;
    listingType: ListingType;
    quantity: number;
    totalPriceGold: number;
    saleTaxGold: number | null;
    status: MarketListingStatus;
    createdAt: Date;
    expiresAt: Date;
    soldAt: Date | null;
    resourceType: ResourceType | null;
    itemDefinition: ItemPresentationInput | null;
    sellerGuild: { name: string; tag: string };
    buyerGuild: { name: string; tag: string } | null;
    claims: Array<{
      id: string;
      sourceType: MarketClaimSourceType;
      claimType: MarketClaimType;
      resourceType: ResourceType | null;
      goldAmount: number | null;
      quantity: number;
      status: MarketClaimStatus;
      createdAt: Date;
      claimedAt: Date | null;
      inventoryItem: { itemDefinition: { name: string } } | null;
    }>;
  },
  guildId: string,
): MarketHistoryEntry {
  const details = getListingDisplayDetails(listing);
  const claim = listing.claims[0] ?? null;
  const claimPayloadLabel = claim ? getMarketClaimPayloadLabel(claim) : null;
  const claimStatusLabel = claim ? getMarketClaimStatusLabel(claim.status) : null;
  const isBuyer = listing.buyerGuildId === guildId;
  const isSeller = listing.sellerGuildId === guildId;

  if (listing.status === MarketListingStatus.SOLD && isBuyer) {
    return {
      id: listing.id,
      outcomeKey: "bought",
      outcomeLabel: "Куплено",
      tone: "accent",
      listingTypeLabel: getListingTypeLabel(listing.listingType),
      itemLabel: details.itemLabel,
      quantity: listing.quantity,
      totalPriceGold: listing.totalPriceGold,
      detailLabel: details.detailLabel,
      counterpartyLabel: `${listing.sellerGuild.name} [${listing.sellerGuild.tag}]`,
      priceSummary: `Цена ${listing.totalPriceGold} зол.`,
      outcomeSummary: `Покупка у ${listing.sellerGuild.name} [${listing.sellerGuild.tag}] без claim box: товар доставлен сразу после оплаты.`,
      claimSummary:
        listing.listingType === ListingType.ITEM
          ? "Предмет уже перемещён в инвентарь гильдии."
          : `Ресурс сразу зачислен: ${listing.quantity} × ${getResourceLabel(listing.resourceType)}.`,
      claimStatusLabel: null,
      claimPending: false,
      eventAt: listing.soldAt ?? listing.createdAt,
    };
  }

  if (listing.status === MarketListingStatus.SOLD && isSeller) {
    const taxGold = listing.saleTaxGold ?? Math.ceil(listing.totalPriceGold * MARKET_SALE_TAX_RATE);
    const payoutGold = claim?.goldAmount ?? Math.max(0, listing.totalPriceGold - taxGold);

    return {
      id: listing.id,
      outcomeKey: "sold",
      outcomeLabel: "Продано",
      tone: "success",
      listingTypeLabel: getListingTypeLabel(listing.listingType),
      itemLabel: details.itemLabel,
      quantity: listing.quantity,
      totalPriceGold: listing.totalPriceGold,
      detailLabel: details.detailLabel,
      counterpartyLabel: listing.buyerGuild
        ? `${listing.buyerGuild.name} [${listing.buyerGuild.tag}]`
        : null,
      priceSummary: `Цена ${listing.totalPriceGold} зол. · налог ${taxGold} · выплата ${payoutGold}`,
      outcomeSummary: listing.buyerGuild
        ? `Лот куплен гильдией ${listing.buyerGuild.name} [${listing.buyerGuild.tag}].`
        : "Лот успешно куплен другой гильдией.",
      claimSummary: claimPayloadLabel
        ? `${claimPayloadLabel} · ${claimStatusLabel}`
        : `Ожидаемая выплата: ${payoutGold} золота.`,
      claimStatusLabel,
      claimPending: claim?.status === MarketClaimStatus.PENDING,
      eventAt: listing.soldAt ?? claim?.createdAt ?? listing.createdAt,
    };
  }

  if (listing.status === MarketListingStatus.CANCELLED) {
    return {
      id: listing.id,
      outcomeKey: "cancelled",
      outcomeLabel: "Отменено",
      tone: "neutral",
      listingTypeLabel: getListingTypeLabel(listing.listingType),
      itemLabel: details.itemLabel,
      quantity: listing.quantity,
      totalPriceGold: listing.totalPriceGold,
      detailLabel: details.detailLabel,
      counterpartyLabel: null,
      priceSummary: `Цена витрины ${listing.totalPriceGold} зол.`,
      outcomeSummary: "Лот снят вручную до продажи и переведён в возвратный flow.",
      claimSummary: claimPayloadLabel
        ? `Возврат: ${claimPayloadLabel} · ${claimStatusLabel}`
        : "Возврат уже оформлен сервером.",
      claimStatusLabel,
      claimPending: claim?.status === MarketClaimStatus.PENDING,
      eventAt: claim?.createdAt ?? listing.createdAt,
    };
  }

  return {
    id: listing.id,
    outcomeKey: "expired",
    outcomeLabel: "Истёк",
    tone: "warning",
    listingTypeLabel: getListingTypeLabel(listing.listingType),
    itemLabel: details.itemLabel,
    quantity: listing.quantity,
    totalPriceGold: listing.totalPriceGold,
    detailLabel: details.detailLabel,
    counterpartyLabel: null,
    priceSummary: `Цена витрины ${listing.totalPriceGold} зол.`,
    outcomeSummary: "Таймер истёк без покупателя; лот переведён в возвратный flow.",
    claimSummary: claimPayloadLabel
      ? `Возврат: ${claimPayloadLabel} · ${claimStatusLabel}`
      : "Возврат уже оформлен сервером.",
    claimStatusLabel,
    claimPending: claim?.status === MarketClaimStatus.PENDING,
    eventAt: listing.expiresAt,
  };
}

function buildBuyOrderView(
  order: {
    id: string;
    buyerGuildId: string;
    resourceType: ResourceType;
    quantity: number;
    totalPriceGold: number;
    status: BuyOrderStatus;
    createdAt: Date;
    expiresAt: Date;
    buyerGuild: { name: string; tag: string };
  },
  guildId: string,
  availableAmount: number,
): BuyOrderView {
  const resourceLabel = getResourceLabel(order.resourceType);
  const pricePerUnitGold = Math.max(1, Math.round(order.totalPriceGold / Math.max(1, order.quantity)));
  const isMine = order.buyerGuildId === guildId;
  const shortfall = Math.max(0, order.quantity - availableAmount);

  return {
    id: order.id,
    buyerGuildId: order.buyerGuildId,
    resourceType: order.resourceType,
    resourceLabel,
    quantity: order.quantity,
    totalPriceGold: order.totalPriceGold,
    pricePerUnitGold,
    statusLabel: getBuyOrderStatusLabel(order.status),
    buyerLabel: `${order.buyerGuild.name} [${order.buyerGuild.tag}]`,
    buyerGuildTag: order.buyerGuild.tag,
    isMine,
    canFulfill: !isMine && availableAmount >= order.quantity,
    availabilitySummary: isMine
      ? `Резерв: ${order.totalPriceGold} зол. удерживается до исполнения, отмены или истечения.`
      : shortfall === 0
        ? `Можно закрыть вручную: у вас есть ${availableAmount} × ${resourceLabel}.`
        : `Не хватает ${shortfall} × ${resourceLabel} (у вас ${availableAmount}).`,
    priceSummary: `${order.totalPriceGold} зол. суммой · ${pricePerUnitGold} зол./шт.`,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
  };
}

function buildBuyOrderHistoryEntry(
  order: {
    id: string;
    buyerGuildId: string;
    fulfillerGuildId: string | null;
    resourceType: ResourceType;
    quantity: number;
    totalPriceGold: number;
    status: BuyOrderStatus;
    createdAt: Date;
    expiresAt: Date;
    fulfilledAt: Date | null;
    buyerGuild: { name: string; tag: string };
    fulfillerGuild: { name: string; tag: string } | null;
    claims: Array<{
      id: string;
      sourceType: MarketClaimSourceType;
      claimType: MarketClaimType;
      resourceType: ResourceType | null;
      goldAmount: number | null;
      quantity: number;
      status: MarketClaimStatus;
      createdAt: Date;
      claimedAt: Date | null;
      inventoryItem: { itemDefinition: { name: string } } | null;
    }>;
  },
  guildId: string,
): BuyOrderHistoryEntry {
  const resourceLabel = getResourceLabel(order.resourceType);
  const pricePerUnitGold = Math.max(1, Math.round(order.totalPriceGold / Math.max(1, order.quantity)));
  const claim = order.claims[0] ?? null;
  const claimPayloadLabel = claim ? getMarketClaimPayloadLabel(claim) : null;
  const claimStatusLabel = claim ? getMarketClaimStatusLabel(claim.status) : null;
  const isBuyer = order.buyerGuildId === guildId;

  if (order.status === BuyOrderStatus.FULFILLED) {
    if (isBuyer) {
      return {
        id: order.id,
        outcomeKey: "fulfilled",
        outcomeLabel: "Заявка закрыта",
        tone: "accent",
        resourceLabel,
        quantity: order.quantity,
        totalPriceGold: order.totalPriceGold,
        priceSummary: `Цена ${order.totalPriceGold} зол. · ${pricePerUnitGold} зол./шт.`,
        outcomeSummary: order.fulfillerGuild
          ? `Ресурс доставлен гильдией ${order.fulfillerGuild.name} [${order.fulfillerGuild.tag}] прямо на склад покупателя.`
          : "Ресурс доставлен исполнителем заявки прямо на склад покупателя.",
        counterpartyLabel: order.fulfillerGuild
          ? `${order.fulfillerGuild.name} [${order.fulfillerGuild.tag}]`
          : null,
        claimSummary: null,
        claimStatusLabel: null,
        claimPending: false,
        eventAt: order.fulfilledAt ?? order.createdAt,
      };
    }

    return {
      id: order.id,
      outcomeKey: "fulfilled",
      outcomeLabel: "Заявка исполнена",
      tone: "success",
      resourceLabel,
      quantity: order.quantity,
      totalPriceGold: order.totalPriceGold,
      priceSummary: `Награда ${order.totalPriceGold} зол. · ${pricePerUnitGold} зол./шт.`,
      outcomeSummary: `Вы закрыли запрос на ${order.quantity} × ${resourceLabel} и отправили товар покупателю автоматически.`,
      counterpartyLabel: `${order.buyerGuild.name} [${order.buyerGuild.tag}]`,
      claimSummary: claimPayloadLabel
        ? `${claimPayloadLabel} · ${claimStatusLabel}`
        : `К выдаче ${order.totalPriceGold} золота.`,
      claimStatusLabel,
      claimPending: claim?.status === MarketClaimStatus.PENDING,
      eventAt: order.fulfilledAt ?? claim?.createdAt ?? order.createdAt,
    };
  }

  if (order.status === BuyOrderStatus.CANCELLED) {
    return {
      id: order.id,
      outcomeKey: "cancelled",
      outcomeLabel: "Заявка отменена",
      tone: "neutral",
      resourceLabel,
      quantity: order.quantity,
      totalPriceGold: order.totalPriceGold,
      priceSummary: `Резерв ${order.totalPriceGold} зол. · ${pricePerUnitGold} зол./шт.`,
      outcomeSummary: "Покупатель снял заявку вручную до исполнения, и резерв ушёл в refund-flow.",
      counterpartyLabel: null,
      claimSummary: claimPayloadLabel
        ? `${claimPayloadLabel} · ${claimStatusLabel}`
        : `К возврату ${order.totalPriceGold} золота.`,
      claimStatusLabel,
      claimPending: claim?.status === MarketClaimStatus.PENDING,
      eventAt: claim?.createdAt ?? order.createdAt,
    };
  }

  return {
    id: order.id,
    outcomeKey: "expired",
    outcomeLabel: "Заявка истекла",
    tone: "warning",
    resourceLabel,
    quantity: order.quantity,
    totalPriceGold: order.totalPriceGold,
    priceSummary: `Резерв ${order.totalPriceGold} зол. · ${pricePerUnitGold} зол./шт.`,
    outcomeSummary: "Таймер заявки истёк без исполнителя, и резерв золота ушёл в refund-flow.",
    counterpartyLabel: null,
    claimSummary: claimPayloadLabel
      ? `${claimPayloadLabel} · ${claimStatusLabel}`
      : `К возврату ${order.totalPriceGold} золота.`,
    claimStatusLabel,
    claimPending: claim?.status === MarketClaimStatus.PENDING,
    eventAt: order.expiresAt,
  };
}

function getResourceListingBounds(resourceType: ResourceType, quantity: number) {
  const bounds = {
    IRON_ORE: { min: 2, max: 8 },
    HERBS: { min: 2, max: 8 },
    LEATHER: { min: 3, max: 10 },
    ARCANE_DUST: { min: 5, max: 14 },
  } satisfies Record<ResourceType, { min: number; max: number }>;

  return {
    min: bounds[resourceType].min * quantity,
    max: bounds[resourceType].max * quantity,
  };
}

function validateListingPrice(input: {
  listingType: ListingType;
  totalPriceGold: number;
  quantity: number;
  resourceType?: ResourceType | null;
  vendorBasePrice?: number | null;
}) {
  if (input.totalPriceGold <= 0) {
    throw new Error("Цена должна быть больше нуля.");
  }

  if (input.listingType === ListingType.ITEM) {
    const bounds = getItemListingBounds(input.vendorBasePrice);

    if (input.totalPriceGold < bounds.min || input.totalPriceGold > bounds.max) {
      throw new Error(`Цена предмета должна быть в диапазоне ${bounds.min}–${bounds.max} золота.`);
    }

    return;
  }

  if (!input.resourceType) {
    throw new Error("Для resource-лота нужно указать тип ресурса.");
  }

  const bounds = getResourceListingBounds(input.resourceType, input.quantity);

  if (input.totalPriceGold < bounds.min || input.totalPriceGold > bounds.max) {
    throw new Error(`Цена ресурса должна быть в диапазоне ${bounds.min}–${bounds.max} золота.`);
  }
}

function validateBuyOrderPrice(input: {
  resourceType: ResourceType;
  totalPriceGold: number;
  quantity: number;
}) {
  if (input.totalPriceGold <= 0) {
    throw new Error("Цена заявки должна быть больше нуля.");
  }

  const bounds = getResourceListingBounds(input.resourceType, input.quantity);

  if (input.totalPriceGold < bounds.min || input.totalPriceGold > bounds.max) {
    throw new Error(`Цена заявки должна быть в диапазоне ${bounds.min}–${bounds.max} золота.`);
  }
}

function pickWeightedEntry<T extends { dropWeight: number }>(entries: T[]) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.dropWeight, 0);

  if (totalWeight <= 0) {
    return entries[0] ?? null;
  }

  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
    roll -= entry.dropWeight;

    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1] ?? null;
}

async function withGameQuery<T>(loader: () => Promise<T>): Promise<FoundationResult<T>> {
  try {
    return { ok: true, data: await loader() };
  } catch (error) {
    console.error("[game-query]", error);
    return { ok: false, error: describeFoundationError(error) };
  }
}

async function getFreshDemoGuild() {
  return getActiveGuildIdentity();
}

async function changeGuildGold(tx: TransactionClient, guildId: string, delta: number) {
  const guild = await tx.guild.findUnique({
    where: { id: guildId },
    select: { gold: true },
  });

  if (!guild) {
    throw new Error("Гильдия не найдена.");
  }

  if (guild.gold + delta < 0) {
    throw new Error("Недостаточно золота.");
  }

  await tx.guild.update({
    where: { id: guildId },
    data: { gold: { increment: delta } },
  });
}

async function syncGuildChannelUnlocksTx(tx: TransactionClient, guildId: string) {
  const guild = await tx.guild.findUnique({
    where: { id: guildId },
    select: {
      id: true,
      level: true,
      marketUnlockedAt: true,
      tradeUnlockedAt: true,
    },
  });

  if (!guild) {
    return;
  }

  const data: Prisma.GuildUpdateInput = {};

  if (!guild.marketUnlockedAt && guild.level >= MARKET_UNLOCK_LEVEL) {
    data.marketUnlockedAt = new Date();
  }

  if (!guild.tradeUnlockedAt && guild.level >= TRADE_UNLOCK_LEVEL) {
    data.tradeUnlockedAt = new Date();
  }

  if (Object.keys(data).length > 0) {
    await tx.guild.update({
      where: { id: guildId },
      data,
    });
  }
}

async function changeGuildXp(tx: TransactionClient, guildId: string, delta: number) {
  const guild = await tx.guild.findUnique({
    where: { id: guildId },
    select: { xp: true },
  });

  if (!guild) {
    throw new Error("Гильдия не найдена.");
  }

  const nextXp = guild.xp + delta;

  await tx.guild.update({
    where: { id: guildId },
    data: {
      xp: nextXp,
      level: getGuildLevelFromXp(nextXp),
    },
  });

  await syncGuildChannelUnlocksTx(tx, guildId);
}

async function changeHeroXp(tx: TransactionClient, heroId: string, delta: number) {
  const hero = await tx.hero.findUnique({
    where: { id: heroId },
    select: {
      id: true,
      name: true,
      heroXp: true,
      level: true,
    },
  });

  if (!hero) {
    throw new Error("Герой не найден.");
  }

  const nextXp = Math.max(0, hero.heroXp + delta);
  const nextLevel = getHeroLevelFromXp(nextXp);
  const levelGain = Math.max(0, nextLevel - hero.level);

  await tx.hero.update({
    where: { id: hero.id },
    data: {
      heroXp: nextXp,
      level: nextLevel,
      ...(levelGain > 0 ? { powerScore: { increment: levelGain * 4 } } : {}),
    },
  });

  return {
    name: hero.name,
    levelGain,
    nextLevel,
    nextXp,
  };
}

async function changeResourceBalance(
  tx: TransactionClient,
  guildId: string,
  resourceType: ResourceType,
  delta: number,
) {
  const balance = await tx.resourceBalance.findUnique({
    where: {
      guildId_resourceType: {
        guildId,
        resourceType,
      },
    },
    select: {
      id: true,
      amount: true,
    },
  });

  if (!balance) {
    if (delta < 0) {
      throw new Error(`Недостаточно ресурса ${getResourceLabel(resourceType)}.`);
    }

    await tx.resourceBalance.create({
      data: {
        guildId,
        resourceType,
        amount: delta,
      },
    });

    return;
  }

  if (balance.amount + delta < 0) {
    throw new Error(`Недостаточно ресурса ${getResourceLabel(resourceType)}.`);
  }

  await tx.resourceBalance.update({
    where: { id: balance.id },
    data: {
      amount: { increment: delta },
    },
  });
}

async function createLedgerEntry(
  tx: TransactionClient,
  data: Prisma.EconomyLedgerEntryUncheckedCreateInput,
) {
  await tx.economyLedgerEntry.create({ data });
}

async function releaseTradeOfferAssets(tx: TransactionClient, offer: TradeOfferForRelease) {
  for (const item of offer.items.filter((entry) => entry.side === TradeOfferSide.OFFERED)) {
    if (item.inventoryItemId) {
      await tx.inventoryItem.updateMany({
        where: {
          id: item.inventoryItemId,
          guildId: offer.senderGuildId,
          state: InventoryItemState.RESERVED,
          reservedByType: ReservationType.TRADE,
          reservedById: offer.id,
        },
        data: {
          state: InventoryItemState.AVAILABLE,
          reservedByType: null,
          reservedById: null,
        },
      });
    }

    if (item.resourceType) {
      await changeResourceBalance(tx, offer.senderGuildId, item.resourceType, item.quantity);
    }
  }
}

async function invalidateTradeOffer(tx: TransactionClient, offer: TradeOfferForRelease) {
  await releaseTradeOfferAssets(tx, offer);

  await tx.tradeOffer.update({
    where: { id: offer.id },
    data: {
      status: TradeOfferStatus.INVALIDATED,
      respondedAt: new Date(),
    },
  });
}

function buildExpeditionOutcome(expedition: {
  location: {
    code: string;
    requiredGuildLevel: number;
    recommendedPower: number;
    durationSeconds: number;
    lootTableEntries: Array<{
      rewardType: string;
      resourceType: ResourceType | null;
      itemDefinitionId: string | null;
      quantityMin: number;
      quantityMax: number;
      dropWeight: number;
    }>;
  };
  party: Array<{
    hero: {
      name: string;
      heroClass: HeroClass;
      powerScore: number;
    };
  }>;
}) {
  const baseline = buildExpeditionBaseline(expedition);
  const profile = baseline.profile;
  const strengthFactor = Math.max(0.55, Math.min(1.55, baseline.tacticalPower / baseline.threatScore));
  const volatility = randomInt(-profile.outcome.volatility, profile.outcome.volatility);
  const preferredRoleCoverage = baseline.profile.preferredClasses.reduce(
    (sum, heroClass) => sum + (baseline.anchors[heroClass] ? 1 : 0),
    0,
  );
  const outcomeScore =
    baseline.tacticalPower -
    baseline.threatScore +
    volatility +
    preferredRoleCoverage * profile.outcome.preferredRoleBonus -
    profile.outcome.outcomePenalty;

  let resultTier: ExpeditionResultTier;

  if (outcomeScore >= 20) {
    resultTier = ExpeditionResultTier.TRIUMPH;
  } else if (outcomeScore >= 0) {
    resultTier = ExpeditionResultTier.SUCCESS;
  } else if (outcomeScore >= -16) {
    resultTier = ExpeditionResultTier.SETBACK;
  } else {
    resultTier = ExpeditionResultTier.FAILURE;
  }

  const tierConfig = {
    [ExpeditionResultTier.TRIUMPH]: {
      goldMultiplier: 1.35,
      xpMultiplier: 1.25,
      quantityMultiplier: 1.2,
      extraRolls: 1,
      summary: "Партия продавила маршрут и вернулась с перевесом по темпу.",
      finale: "Экспедиция завершилась триумфом: давление зоны было полностью сломано.",
    },
    [ExpeditionResultTier.SUCCESS]: {
      goldMultiplier: 1,
      xpMultiplier: 1,
      quantityMultiplier: 1,
      extraRolls: 0,
      summary: "Маршрут закрыт чисто, без критического провала по темпу.",
      finale: "Экспедиция прошла уверенно и принесла ожидаемую добычу.",
    },
    [ExpeditionResultTier.SETBACK]: {
      goldMultiplier: 0.72,
      xpMultiplier: 0.8,
      quantityMultiplier: 0.8,
      extraRolls: -1,
      summary: "Партия добралась домой, но потеряла инициативу на части маршрута.",
      finale: "Экспедиция вернулась со срывом темпа и урезанной добычей.",
    },
    [ExpeditionResultTier.FAILURE]: {
      goldMultiplier: 0.25,
      xpMultiplier: 0.35,
      quantityMultiplier: 0.5,
      extraRolls: -2,
      summary: "Поход сорвался: группа вытащила только часть ценностей и опыт выживания.",
      finale: "Экспедиция была сорвана, и партия едва удержала минимальный возврат.",
    },
  } satisfies Record<
    ExpeditionResultTier,
    {
      goldMultiplier: number;
      xpMultiplier: number;
      quantityMultiplier: number;
      extraRolls: number;
      summary: string;
      finale: string;
    }
  >;

  const outcomeConfig = tierConfig[resultTier];

  const rewardGold = Math.max(
    resultTier === ExpeditionResultTier.FAILURE ? 6 : 18,
    Math.round(
      (18 + expedition.location.requiredGuildLevel * 14 + expedition.location.durationSeconds / 12) *
        strengthFactor *
        outcomeConfig.goldMultiplier *
        profile.outcome.goldMultiplier,
    ),
  );
  const rewardGuildXp = Math.max(
    resultTier === ExpeditionResultTier.FAILURE ? 4 : 10,
    Math.round(
      (12 + expedition.location.requiredGuildLevel * 7) *
        strengthFactor *
        outcomeConfig.xpMultiplier *
        profile.outcome.guildXpMultiplier,
    ),
  );

  const generatedRewards = new Map<
    string,
    {
      rewardType: "RESOURCE" | "ITEM";
      resourceType: ResourceType | null;
      itemDefinitionId: string | null;
      quantity: number;
    }
  >();
  const resourceEntries = expedition.location.lootTableEntries.filter(
    (entry) => entry.rewardType === "RESOURCE" && entry.resourceType,
  );
  const itemEntries = expedition.location.lootTableEntries.filter(
    (entry) => entry.rewardType === "ITEM" && entry.itemDefinitionId,
  );
  const drawRewardEntry = (rewardType?: "RESOURCE" | "ITEM") => {
    if (rewardType === "RESOURCE") {
      return pickWeightedEntry(resourceEntries);
    }

    if (rewardType === "ITEM") {
      return pickWeightedEntry(itemEntries);
    }

    return pickWeightedEntry(expedition.location.lootTableEntries);
  };
  const addGeneratedReward = (
    entry:
      | {
          rewardType: string;
          resourceType: ResourceType | null;
          itemDefinitionId: string | null;
          quantityMin: number;
          quantityMax: number;
          dropWeight: number;
        }
      | undefined,
  ) => {
    if (!entry) {
      return;
    }

    const scenarioQuantityMultiplier =
      entry.rewardType === "RESOURCE"
        ? profile.outcome.resourceMultiplier
        : profile.outcome.itemMultiplier;
    const quantity = Math.max(
      1,
      Math.round(
        randomInt(entry.quantityMin, entry.quantityMax) *
          outcomeConfig.quantityMultiplier *
          scenarioQuantityMultiplier,
      ),
    );

    if (entry.rewardType === "RESOURCE" && entry.resourceType) {
      const key = `resource:${entry.resourceType}`;
      const current = generatedRewards.get(key);

      generatedRewards.set(key, {
        rewardType: "RESOURCE",
        resourceType: entry.resourceType,
        itemDefinitionId: null,
        quantity: (current?.quantity ?? 0) + quantity,
      });
      return;
    }

    if (entry.rewardType === "ITEM" && entry.itemDefinitionId) {
      const key = `item:${entry.itemDefinitionId}`;
      const current = generatedRewards.get(key);

      generatedRewards.set(key, {
        rewardType: "ITEM",
        resourceType: null,
        itemDefinitionId: entry.itemDefinitionId,
        quantity: (current?.quantity ?? 0) + quantity,
      });
    }
  };
  const baseRollCount =
    expedition.location.requiredGuildLevel >= 4
      ? 3
      : expedition.location.requiredGuildLevel >= 2
        ? 2
        : 1;
  const rollCount = Math.max(
    0,
    baseRollCount + outcomeConfig.extraRolls + profile.outcome.extraRolls,
  );

  for (let index = 0; index < rollCount; index += 1) {
    addGeneratedReward(drawRewardEntry());
  }

  if (resultTier !== ExpeditionResultTier.FAILURE) {
    for (let index = 0; index < profile.outcome.guaranteedResourceRolls; index += 1) {
      addGeneratedReward(drawRewardEntry("RESOURCE"));
    }
  }

  if (
    resultTier === ExpeditionResultTier.SUCCESS ||
    resultTier === ExpeditionResultTier.TRIUMPH
  ) {
    for (let index = 0; index < profile.outcome.guaranteedItemRolls; index += 1) {
      addGeneratedReward(drawRewardEntry("ITEM"));
    }
  }

  if (resultTier === ExpeditionResultTier.TRIUMPH) {
    for (let index = 0; index < profile.outcome.triumphItemRolls; index += 1) {
      addGeneratedReward(drawRewardEntry("ITEM"));
    }
  }

  const preferredRolesLabel = baseline.profile.preferredClasses
    .map((heroClass) => getHeroClassLabel(heroClass))
    .join(" + ");
  const coverageLine =
    baseline.roleCoverage === 3
      ? "Все три ключевые роли партии были закрыты."
      : `Ролевое покрытие составило ${baseline.roleCoverage}/3, поэтому часть угроз пришлось гасить грубой силой.`;
  const combatLog = [
    `${baseline.profile.opener} Профиль зоны: ${baseline.profile.hazardLabel}.`,
    `${profile.scenarioLabel}: ${profile.scenarioSummary}`,
    baseline.anchors.VANGUARD
      ? `${baseline.anchors.VANGUARD} удержал фронт и погасил пики давления на линии контакта.`
      : "Без авангарда партия потеряла надёжный фронт и пропустила лишний урон по темпу.",
    baseline.anchors.RANGER
      ? `${baseline.anchors.RANGER} выбрал выгодные тропы и не дал маршруту расползтись по времени.`
      : "Без следопыта группа теряла минуты на лишних обходах и ненужных столкновениях.",
    baseline.anchors.MYSTIC
      ? `${baseline.anchors.MYSTIC} стабилизировал группу и сгладил провальные размены.`
      : "Без мистика запас устойчивости таял слишком быстро, и партия шла на нервах.",
    `${coverageLine} Предпочтительные роли для зоны: ${preferredRolesLabel}.`,
    `Фокус награды: ${profile.rewardFocusLabel}. ${profile.specialRules[0] ?? ""}`,
    outcomeConfig.finale,
  ];

  return {
    resultTier,
    resultSummary: `${getExpeditionResultLabel(resultTier)} · ${profile.scenarioLabel} · рейтинг ${baseline.tacticalPower} против угрозы ${baseline.threatScore}. ${outcomeConfig.summary} Фокус награды: ${profile.rewardFocusLabel}.`,
    combatLog,
    rewardGold,
    rewardGuildXp,
    rewards: Array.from(generatedRewards.values()),
    partyPowerSnapshot: baseline.tacticalPower,
    threatScoreSnapshot: baseline.threatScore,
  };
}

async function resolveCompletedExpeditionsTx(tx: TransactionClient, guildId: string) {
  const overdueExpeditions = await tx.expedition.findMany({
    where: {
      guildId,
      status: ExpeditionStatus.ACTIVE,
      endsAt: { lte: new Date() },
    },
    select: {
      id: true,
      location: {
        select: {
          code: true,
          requiredGuildLevel: true,
          recommendedPower: true,
          durationSeconds: true,
          lootTableEntries: {
            select: {
              rewardType: true,
              resourceType: true,
              itemDefinitionId: true,
              quantityMin: true,
              quantityMax: true,
              dropWeight: true,
            },
          },
        },
      },
      party: {
        select: {
          heroId: true,
          hero: {
            select: {
              name: true,
              heroClass: true,
              powerScore: true,
            },
          },
        },
      },
      rewards: { select: { id: true } },
    },
  });

  for (const expedition of overdueExpeditions) {
    const outcome = buildExpeditionOutcome(expedition);

    await tx.expedition.update({
      where: { id: expedition.id },
      data: {
        status: ExpeditionStatus.COMPLETED,
        resultTier: outcome.resultTier,
        resolvedAt: new Date(),
        resultSummary: outcome.resultSummary,
        combatLog: outcome.combatLog.join("\n"),
        rewardGold: outcome.rewardGold,
        rewardGuildXp: outcome.rewardGuildXp,
        partyPowerSnapshot: outcome.partyPowerSnapshot,
        threatScoreSnapshot: outcome.threatScoreSnapshot,
      },
    });

    if (expedition.rewards.length === 0 && outcome.rewards.length > 0) {
      await tx.expeditionReward.createMany({
        data: outcome.rewards.map((reward) => ({
          expeditionId: expedition.id,
          rewardType: reward.rewardType,
          resourceType: reward.resourceType,
          itemDefinitionId: reward.itemDefinitionId,
          quantity: reward.quantity,
        })),
      });
    }

    await tx.hero.updateMany({
      where: {
        id: { in: expedition.party.map((entry) => entry.heroId) },
      },
      data: { status: HeroStatus.AVAILABLE },
    });
  }
}

async function expireMarketListingsTx(tx: TransactionClient) {
  const expiredListings = await tx.marketListing.findMany({
    where: {
      status: MarketListingStatus.ACTIVE,
      expiresAt: { lte: new Date() },
    },
    select: {
      id: true,
      sellerGuildId: true,
      listingType: true,
      inventoryItemId: true,
      resourceType: true,
      quantity: true,
    },
  });

  for (const listing of expiredListings) {
    await tx.marketListing.update({
      where: { id: listing.id },
      data: { status: MarketListingStatus.EXPIRED },
    });

    if (listing.listingType === ListingType.ITEM && listing.inventoryItemId) {
      await tx.marketClaim.create({
        data: {
          guildId: listing.sellerGuildId,
          listingId: listing.id,
          sourceType: MarketClaimSourceType.EXPIRED_LISTING,
          claimType: MarketClaimType.ITEM,
          inventoryItemId: listing.inventoryItemId,
          quantity: 1,
        },
      });
      continue;
    }

    if (listing.resourceType) {
      await tx.marketClaim.create({
        data: {
          guildId: listing.sellerGuildId,
          listingId: listing.id,
          sourceType: MarketClaimSourceType.EXPIRED_LISTING,
          claimType: MarketClaimType.RESOURCE,
          resourceType: listing.resourceType,
          quantity: listing.quantity,
        },
      });
    }
  }
}

async function expireBuyOrdersTx(tx: TransactionClient) {
  const expiredOrders = await tx.buyOrder.findMany({
    where: {
      status: BuyOrderStatus.ACTIVE,
      expiresAt: { lte: new Date() },
    },
    select: {
      id: true,
      buyerGuildId: true,
      totalPriceGold: true,
    },
  });

  for (const order of expiredOrders) {
    await tx.buyOrder.update({
      where: { id: order.id },
      data: { status: BuyOrderStatus.EXPIRED },
    });

    await tx.marketClaim.create({
      data: {
        guildId: order.buyerGuildId,
        buyOrderId: order.id,
        sourceType: MarketClaimSourceType.EXPIRED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
        goldAmount: order.totalPriceGold,
      },
    });
  }
}

async function expireTradeOffersTx(tx: TransactionClient) {
  const expiredOffers = await tx.tradeOffer.findMany({
    where: {
      status: TradeOfferStatus.PENDING,
      expiresAt: { lte: new Date() },
    },
    select: {
      id: true,
      senderGuildId: true,
      items: {
        select: {
          side: true,
          inventoryItemId: true,
          resourceType: true,
          quantity: true,
        },
      },
    },
  });

  for (const offer of expiredOffers) {
    await releaseTradeOfferAssets(tx, offer);

    await tx.tradeOffer.update({
      where: { id: offer.id },
      data: {
        status: TradeOfferStatus.EXPIRED,
        respondedAt: new Date(),
      },
    });
  }
}

async function runLazyMaintenance(guildId: string) {
  await prisma.$transaction(async (tx) => {
    await resolveCompletedExpeditionsTx(tx, guildId);
    await syncGuildChannelUnlocksTx(tx, guildId);
    await expireMarketListingsTx(tx);
    await expireBuyOrdersTx(tx);
    await expireTradeOffersTx(tx);
  });
}

async function loadGuildUpgradeRuntimeStateTx(tx: TransactionClient, guildId: string) {
  const [guild, heroCount, activeListings, pendingOutgoingTrades, upgrades] = await Promise.all([
    tx.guild.findUnique({
      where: { id: guildId },
      select: {
        id: true,
        level: true,
        gold: true,
        marketUnlockedAt: true,
        tradeUnlockedAt: true,
        marketSlotsBase: true,
        activeHeroSlots: true,
      },
    }),
    tx.hero.count({ where: { guildId } }),
    tx.marketListing.count({
      where: { sellerGuildId: guildId, status: MarketListingStatus.ACTIVE },
    }),
    tx.tradeOffer.count({
      where: { senderGuildId: guildId, status: TradeOfferStatus.PENDING },
    }),
    tx.guildUpgrade.findMany({
      where: {
        guildId,
        upgradeType: { in: [...MANAGED_GUILD_UPGRADES] },
      },
      select: {
        upgradeType: true,
        level: true,
      },
    }),
  ]);

  if (!guild) {
    throw new Error("Гильдия не найдена.");
  }

  const upgradeLevels = mapManagedGuildUpgradeLevels(upgrades);

  return {
    guildId: guild.id,
    guildLevel: guild.level,
    gold: guild.gold,
    heroCount,
    activeListings,
    pendingOutgoingTrades,
    heroSlots: guild.activeHeroSlots,
    marketSlots: guild.marketSlotsBase,
    tradeSlots: getTradeSlotLimitFromUpgradeLevel(upgradeLevels[GuildUpgradeType.TRADE_SLOTS]),
    marketUnlocked: Boolean(guild.marketUnlockedAt),
    tradeUnlocked: Boolean(guild.tradeUnlockedAt),
    upgradeLevels,
  } satisfies GuildUpgradeRuntimeState;
}

function buildGuildContractBoardSnapshot(context: GuildContractRuntimeContext): ContractBoardSnapshot {
  const entries = GUILD_CONTRACT_DEFINITIONS.map((definition) => {
    const claimedAt = context.claimedContracts.get(definition.key) ?? null;
    const evaluation = definition.evaluate(context);
    const status: GuildContractStatus = claimedAt
      ? "claimed"
      : evaluation.completed
        ? "ready"
        : evaluation.unavailable
          ? "unavailable"
          : "in-progress";

    return {
      key: definition.key,
      title: definition.title,
      archetypeLabel: definition.archetypeLabel,
      summary: definition.summary,
      status,
      statusLabel: getGuildContractStatusLabel(status),
      tone: getGuildContractTone(status),
      progressLabel: evaluation.progressLabel,
      rewardLabels: formatGuildContractRewardLabels(definition.reward),
      blockers: status === "in-progress" || status === "unavailable" ? evaluation.blockers : [],
      href: definition.href,
      actionLabel:
        status === "ready"
          ? "Забрать контракт"
          : definition.href === "/inventory"
            ? "Открыть workshop"
            : definition.href === "/market"
              ? "Открыть рынок"
              : definition.href === "/expedition"
                ? "Открыть PvE"
                : "Открыть board",
      claimable: status === "ready",
      claimedAt,
      relatedRoutes: [...definition.relatedRoutes],
      relatedActionSummary: evaluation.relatedActionSummary,
    } satisfies GuildContractEntry;
  }).sort((left, right) => {
    const statusOrder: Record<GuildContractStatus, number> = {
      ready: 0,
      "in-progress": 1,
      unavailable: 2,
      claimed: 3,
    };

    return statusOrder[left.status] - statusOrder[right.status] || left.title.localeCompare(right.title, "ru");
  });

  const recentCompleted = [...context.claimedContracts.entries()]
    .sort((left, right) => right[1].getTime() - left[1].getTime())
    .map(([key, claimedAt]) => {
      const definition = GUILD_CONTRACT_DEFINITIONS.find((entry) => entry.key === key) ?? null;

      if (!definition) {
        return null;
      }

      return {
        key,
        title: definition.title,
        claimedAt,
        rewardLabels: formatGuildContractRewardLabels(definition.reward),
        summary: definition.summary,
        href: definition.href,
      } satisfies GuildContractRecentEntry;
    })
    .filter((entry): entry is GuildContractRecentEntry => Boolean(entry))
    .slice(0, 4);

  return {
    summary: {
      readyCount: entries.filter((entry) => entry.status === "ready").length,
      inProgressCount: entries.filter((entry) => entry.status === "in-progress").length,
      claimedCount: entries.filter((entry) => entry.status === "claimed").length,
      unavailableCount: entries.filter((entry) => entry.status === "unavailable").length,
    },
    entries,
    recentCompleted,
  } satisfies ContractBoardSnapshot;
}

type ContractQueryClient = typeof prisma | TransactionClient;

async function loadGuildContractRuntimeContext(client: ContractQueryClient, guildId: string) {
  const [guild, resourceBalances, storageUpgrade, inventoryItems, expeditions, soldListingsCount, activeListingsCount, activeForeignBuyOrders, filledBuyOrderClaims, contractRewardEntries] = await Promise.all([
    client.guild.findUnique({
      where: { id: guildId },
      select: {
        id: true,
        level: true,
        marketUnlockedAt: true,
      },
    }),
    client.resourceBalance.findMany({
      where: { guildId, amount: { gt: 0 } },
      select: {
        resourceType: true,
        amount: true,
      },
    }),
    client.guildUpgrade.findUnique({
      where: {
        guildId_upgradeType: {
          guildId,
          upgradeType: GuildUpgradeType.STORAGE,
        },
      },
      select: { level: true },
    }),
    client.inventoryItem.findMany({
      where: { guildId },
      select: { workshopLevel: true },
    }),
    client.expedition.findMany({
      where: {
        guildId,
        status: { in: [ExpeditionStatus.ACTIVE, ExpeditionStatus.COMPLETED, ExpeditionStatus.CLAIMED] },
      },
      select: {
        status: true,
        location: { select: { code: true } },
      },
    }),
    client.marketListing.count({
      where: { sellerGuildId: guildId, status: MarketListingStatus.SOLD },
    }),
    client.marketListing.count({
      where: { sellerGuildId: guildId, status: MarketListingStatus.ACTIVE },
    }),
    client.buyOrder.findMany({
      where: {
        buyerGuildId: { not: guildId },
        status: BuyOrderStatus.ACTIVE,
      },
      select: {
        resourceType: true,
        quantity: true,
      },
    }),
    client.marketClaim.findMany({
      where: {
        guildId,
        sourceType: MarketClaimSourceType.FILLED_BUY_ORDER,
      },
      select: { status: true },
    }),
    client.economyLedgerEntry.findMany({
      where: {
        guildId,
        eventType: EconomyEventType.CONTRACT_REWARD,
      },
      orderBy: { createdAt: "desc" },
      select: {
        referenceId: true,
        createdAt: true,
      },
    }),
  ]);

  if (!guild) {
    throw new Error("Гильдия не найдена.");
  }

  const resources = buildResourceAvailabilityMap(resourceBalances);
  const claimedContracts = new Map<GuildContractKey, Date>();

  contractRewardEntries.forEach((entry) => {
    const key = readGuildContractKeyFromReference(entry.referenceId);

    if (key && !claimedContracts.has(key)) {
      claimedContracts.set(key, entry.createdAt);
    }
  });

  return {
    guildId: guild.id,
    guildLevel: guild.level,
    marketUnlocked: Boolean(guild.marketUnlockedAt),
    storageLevel: storageUpgrade?.level ?? 0,
    resources,
    maxWorkshopLevel: inventoryItems.reduce((max, item) => Math.max(max, item.workshopLevel), 0),
    soldListingsCount,
    activeListingsCount,
    expeditions: expeditions.map((expedition) => ({
      status: expedition.status,
      locationCode: expedition.location.code,
    })),
    activeForeignBuyOrdersCount: activeForeignBuyOrders.length,
    fulfillableForeignBuyOrdersCount: activeForeignBuyOrders.filter(
      (order) => (resources[order.resourceType] ?? 0) >= order.quantity,
    ).length,
    claimedFilledBuyOrderClaims: filledBuyOrderClaims.filter((claim) => claim.status === MarketClaimStatus.CLAIMED).length,
    pendingFilledBuyOrderClaims: filledBuyOrderClaims.filter((claim) => claim.status === MarketClaimStatus.PENDING).length,
    claimedContracts,
  } satisfies GuildContractRuntimeContext;
}

async function loadGuildContractBoardSnapshot(guildId: string) {
  const context = await loadGuildContractRuntimeContext(prisma, guildId);
  return buildGuildContractBoardSnapshot(context);
}

async function loadPendingMarketClaims(guildId: string, take: number) {
  const claims = await prisma.marketClaim.findMany({
    where: { guildId, status: MarketClaimStatus.PENDING },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      claimType: true,
      sourceType: true,
      resourceType: true,
      goldAmount: true,
      quantity: true,
      status: true,
      createdAt: true,
      claimedAt: true,
      inventoryItem: { select: { itemDefinition: { select: { name: true } } } },
    },
  });

  return claims.map(buildMarketClaimView);
}

async function loadBuyOrderHistoryEntries(guildId: string, take: number) {
  const orders = await prisma.buyOrder.findMany({
    where: {
      OR: [{ buyerGuildId: guildId }, { fulfillerGuildId: guildId }],
      status: { in: [BuyOrderStatus.FULFILLED, BuyOrderStatus.CANCELLED, BuyOrderStatus.EXPIRED] },
    },
    take: Math.max(take * 3, 18),
    select: {
      id: true,
      buyerGuildId: true,
      fulfillerGuildId: true,
      resourceType: true,
      quantity: true,
      totalPriceGold: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      fulfilledAt: true,
      buyerGuild: { select: { name: true, tag: true } },
      fulfillerGuild: { select: { name: true, tag: true } },
      claims: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          sourceType: true,
          claimType: true,
          resourceType: true,
          goldAmount: true,
          quantity: true,
          status: true,
          createdAt: true,
          claimedAt: true,
          inventoryItem: { select: { itemDefinition: { select: { name: true } } } },
        },
      },
    },
  });

  return orders
    .map((order) => buildBuyOrderHistoryEntry(order, guildId))
    .sort((left, right) => right.eventAt.getTime() - left.eventAt.getTime())
    .slice(0, take);
}

async function loadMarketHistoryEntries(guildId: string, take: number) {
  const listings = await prisma.marketListing.findMany({
    where: {
      OR: [{ sellerGuildId: guildId }, { buyerGuildId: guildId }],
      status: { in: [MarketListingStatus.SOLD, MarketListingStatus.CANCELLED, MarketListingStatus.EXPIRED] },
    },
    take: Math.max(take * 3, 18),
    select: {
      id: true,
      sellerGuildId: true,
      buyerGuildId: true,
      listingType: true,
      quantity: true,
      totalPriceGold: true,
      saleTaxGold: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      soldAt: true,
      resourceType: true,
      itemDefinition: {
        select: {
          name: true,
          itemType: true,
          rarity: true,
          equipSlot: true,
          powerScore: true,
          vendorBasePrice: true,
        },
      },
      sellerGuild: { select: { name: true, tag: true } },
      buyerGuild: { select: { name: true, tag: true } },
      claims: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          sourceType: true,
          claimType: true,
          resourceType: true,
          goldAmount: true,
          quantity: true,
          status: true,
          createdAt: true,
          claimedAt: true,
          inventoryItem: { select: { itemDefinition: { select: { name: true } } } },
        },
      },
    },
  });

  return listings
    .map((listing) => buildMarketHistoryEntry(listing, guildId))
    .sort((left, right) => right.eventAt.getTime() - left.eventAt.getTime())
    .slice(0, take);
}

async function loadTradeOfferViews(guildId: string, take: number) {
  const offers = await prisma.tradeOffer.findMany({
    where: {
      OR: [{ senderGuildId: guildId }, { receiverGuildId: guildId }],
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(take * 2, 20),
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,
      expiresAt: true,
      respondedAt: true,
      senderGuildId: true,
      receiverGuildId: true,
      senderGuild: { select: { name: true, tag: true } },
      receiverGuild: { select: { name: true, tag: true } },
      items: {
        select: {
          side: true,
          resourceType: true,
          quantity: true,
          inventoryItem: { select: { itemDefinition: { select: { name: true } } } },
        },
      },
    },
  });

  return offers
    .map((offer) => buildTradeOfferView(offer, guildId))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, take);
}

export async function getDashboardPageData(): Promise<FoundationResult<DashboardPageData>> {
  return withGameQuery(async () => {
    const guild = await getFreshDemoGuild();
    await runLazyMaintenance(guild.id);
    const freshGuild = await getFreshDemoGuild();

    const [
      heroCount,
      inventoryCount,
      pendingClaimsCount,
      myActiveListingsCount,
      contractBoard,
      activeExpeditions,
      completedExpeditions,
      resources,
      recentLedger,
      guildUpgrades,
      heroProgression,
      availableHeroCount,
      pendingMarketClaims,
      tradeOffers,
      marketHistory,
      buyOrderHistory,
      locations,
      onboarding,
      worldEventBoard,
    ] = await Promise.all([
      prisma.hero.count({ where: { guildId: freshGuild.id } }),
      prisma.inventoryItem.count({ where: { guildId: freshGuild.id } }),
      prisma.marketClaim.count({
        where: { guildId: freshGuild.id, status: MarketClaimStatus.PENDING },
      }),
      prisma.marketListing.count({
        where: { sellerGuildId: freshGuild.id, status: MarketListingStatus.ACTIVE },
      }),
      loadGuildContractBoardSnapshot(freshGuild.id),
      prisma.expedition.findMany({
        where: { guildId: freshGuild.id, status: ExpeditionStatus.ACTIVE },
        orderBy: { endsAt: "asc" },
        select: {
          id: true,
          status: true,
          endsAt: true,
          partyPowerSnapshot: true,
          threatScoreSnapshot: true,
          location: { select: { name: true, code: true } },
          party: { select: { hero: { select: { name: true } } } },
        },
      }),
      prisma.expedition.findMany({
        where: { guildId: freshGuild.id, status: ExpeditionStatus.COMPLETED },
        orderBy: [{ resolvedAt: "desc" }, { endsAt: "desc" }],
        select: {
          id: true,
          rewardGold: true,
          rewardGuildXp: true,
          resolvedAt: true,
          resultTier: true,
          resultSummary: true,
          combatLog: true,
          partyPowerSnapshot: true,
          threatScoreSnapshot: true,
          location: { select: { name: true, code: true } },
          rewards: {
            select: {
              rewardType: true,
              quantity: true,
              resourceType: true,
              itemDefinition: {
                select: {
                  name: true,
                  itemType: true,
                  rarity: true,
                  equipSlot: true,
                  powerScore: true,
                  vendorBasePrice: true,
                },
              },
            },
          },
        },
      }),
      prisma.resourceBalance.findMany({
        where: { guildId: freshGuild.id, amount: { gt: 0 } },
        orderBy: { amount: "desc" },
        select: {
          resourceType: true,
          amount: true,
        },
      }),
      prisma.economyLedgerEntry.findMany({
        where: { guildId: freshGuild.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          eventType: true,
          goldDelta: true,
          resourceType: true,
          resourceDelta: true,
          isSuspicious: true,
          createdAt: true,
        },
      }),
      prisma.guildUpgrade.findMany({
        where: {
          guildId: freshGuild.id,
          upgradeType: { in: [...MANAGED_GUILD_UPGRADES] },
        },
        select: {
          upgradeType: true,
          level: true,
        },
      }),
      prisma.hero.findMany({
        where: { guildId: freshGuild.id },
        select: { level: true, heroXp: true },
      }),
      prisma.hero.count({
        where: { guildId: freshGuild.id, status: HeroStatus.AVAILABLE },
      }),
      loadPendingMarketClaims(freshGuild.id, 8),
      loadTradeOfferViews(freshGuild.id, 12),
      loadMarketHistoryEntries(freshGuild.id, 6),
      loadBuyOrderHistoryEntries(freshGuild.id, 6),
      prisma.location.findMany({
        where: { isEnabled: true },
        orderBy: { requiredGuildLevel: "asc" },
        select: {
          code: true,
          name: true,
          requiredGuildLevel: true,
        },
      }),
      loadOnboardingSnapshot(freshGuild.id),
      loadWorldEventBoardSnapshot({
        currentGuildTag: freshGuild.tag,
        focusGuildTag: freshGuild.tag,
      }),
    ]);
    const socialDashboard = await loadDashboardSocialSnapshot({
      currentGuildTag: freshGuild.tag,
      worldEventBoard,
    });
    const guildPrestige = socialDashboard.currentGuildPrestige;
    const guildIdentityEditor = buildGuildIdentityEditorSnapshot({
      guildName: freshGuild.name,
      guildTag: freshGuild.tag,
      state: freshGuild.identityState,
    });

    const upgradeLevels = mapManagedGuildUpgradeLevels(guildUpgrades);
    const nextUpgrade = getNextMarketUpgrade(upgradeLevels[GuildUpgradeType.MARKET_SLOTS]);
    const nextHeroSlotsUpgrade = getNextHeroSlotsUpgrade(upgradeLevels[GuildUpgradeType.HERO_SLOTS]);
    const recruitmentProgression = getRecruitmentProgression({
      guildLevel: freshGuild.level,
      heroSlotUpgradeLevel: upgradeLevels[GuildUpgradeType.HERO_SLOTS],
    });
    const nextLocation = locations.find((location) => location.requiredGuildLevel > freshGuild.level) ?? null;
    const freeHeroSlots = Math.max(0, freshGuild.activeHeroSlots - heroCount);
    const claimableExpeditions = completedExpeditions.map((expedition) => {
      const heroXpRewardPerHero = getExpeditionHeroXpReward({
        rewardGuildXp: expedition.rewardGuildXp,
        resultTier: expedition.resultTier,
        locationCode: expedition.location.code,
      });
      const profile = getLocationProfile(expedition.location.code);

      return {
        id: expedition.id,
        locationName: expedition.location.name,
        rewardGold: expedition.rewardGold,
        rewardGuildXp: expedition.rewardGuildXp,
        rewardSummary: summarizeExpeditionRewards({
          rewardGold: expedition.rewardGold,
          rewardGuildXp: expedition.rewardGuildXp,
          rewards: expedition.rewards,
          heroXpRewardPerHero,
        }),
        completedAt: expedition.resolvedAt,
        resultTier: expedition.resultTier,
        resultLabel: expedition.resultTier ? getExpeditionResultLabel(expedition.resultTier) : null,
        resultSummary: expedition.resultSummary,
        scenarioLabel: profile.scenarioLabel,
        riskLabel: profile.riskLabel,
        rewardFocusLabel: profile.rewardFocusLabel,
        riskRewardSummary: getLocationRiskRewardSummary(expedition.location.code),
        heroXpRewardPerHero,
        combatLog: splitCombatLog(expedition.combatLog),
        partyPowerSnapshot: expedition.partyPowerSnapshot,
        threatScoreSnapshot: expedition.threatScoreSnapshot,
      };
    });
    const pendingTradeInbox = tradeOffers
      .filter((offer) => offer.isPending && offer.isIncoming)
      .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());
    const pendingInbox = [
      ...worldEventBoard.events.flatMap<DashboardInboxEntry>((event) =>
        event.rewardTiers
          .filter((tier) => tier.status === "claimable")
          .map((tier) => ({
            id: `world-event-${event.key}-${tier.key}`,
            kind: "world-event-reward",
            title: `${event.title}: ${tier.label}`,
            summary: tier.rewardLabels.join(" • "),
            detail: event.focusGuild?.detail ?? event.objectiveLabel,
            actionLabel: "Забрать reward",
            href: "/dashboard",
            createdAt: event.focusGuild ? worldEventBoard.season.startsAt : new Date(),
            tone: event.tone,
          })),
      ),
      ...claimableExpeditions.map<DashboardInboxEntry>((expedition) => ({
        id: `expedition-${expedition.id}`,
        kind: "expedition-claim",
        title: `Готов claim экспедиции «${expedition.locationName}»`,
        summary: expedition.rewardSummary.join(" • "),
        detail: expedition.resultSummary ?? "Поход завершён и ждёт выдачи наград.",
        actionLabel: "Забрать на dashboard",
        href: "/dashboard",
        createdAt: expedition.completedAt ?? new Date(),
        tone:
          expedition.resultTier === ExpeditionResultTier.TRIUMPH
            ? "success"
            : expedition.resultTier === ExpeditionResultTier.FAILURE ||
                expedition.resultTier === ExpeditionResultTier.SETBACK
              ? "warning"
              : "accent",
      })),
      ...pendingMarketClaims.map<DashboardInboxEntry>((claim) => ({
        id: `market-claim-${claim.id}`,
        kind: "market-claim",
        title: claim.sourceLabel,
        summary: claim.payloadLabel,
        detail: claim.statusLabel,
        actionLabel: "Открыть рынок",
        href: "/market",
        createdAt: claim.createdAt,
        tone: claim.claimTypeLabel === "Золото" ? "success" : "accent",
      })),
      ...pendingTradeInbox.map<DashboardInboxEntry>((offer) => ({
        id: `trade-${offer.id}`,
        kind: "trade-offer",
        title: `Сделка от ${offer.counterpartyLabel}`,
        summary: `Отдаёт: ${offer.offeredSummary}`,
        detail: `Просит: ${offer.requestedSummary}`,
        actionLabel: "Ответить на сделку",
        href: "/deals",
        createdAt: offer.createdAt,
        tone: "accent",
      })),
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8);
    const recentActivity = [
      ...worldEventBoard.recentActivity.map<DashboardRecentActivityEntry>((entry) => ({
        id: `world-event-${entry.id}`,
        source: "world-event",
        title: `${entry.eventTitle}: ${entry.title}`,
        summary: entry.summary,
        detail: entry.detail,
        href: entry.href,
        createdAt: entry.at,
        tone: entry.tone,
      })),
      ...marketHistory.map<DashboardRecentActivityEntry>((entry) => ({
        id: `market-history-${entry.id}`,
        source: "market",
        title: `${entry.outcomeLabel}: ${entry.itemLabel}`,
        summary: entry.outcomeSummary,
        detail: entry.claimSummary ?? entry.priceSummary,
        href: "/market",
        createdAt: entry.eventAt,
        tone: entry.tone,
      })),
      ...buyOrderHistory.map<DashboardRecentActivityEntry>((entry) => ({
        id: `buy-order-history-${entry.id}`,
        source: "market",
        title: `${entry.outcomeLabel}: ${entry.resourceLabel}`,
        summary: entry.outcomeSummary,
        detail: entry.claimSummary ?? entry.priceSummary,
        href: "/market",
        createdAt: entry.eventAt,
        tone: entry.tone,
      })),
      ...tradeOffers
        .filter((offer) => !offer.isPending)
        .map<DashboardRecentActivityEntry>((offer) => ({
          id: `trade-history-${offer.id}`,
          source: "trade",
          title: `${offer.outcomeLabel}: ${offer.counterpartyLabel}`,
          summary: `Отдаёте ${offer.offeredSummary} · получаете ${offer.requestedSummary}`,
          detail: offer.outcomeSummary,
          href: "/deals",
          createdAt: offer.finalAt,
          tone: offer.tone,
        })),
    ]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 6);
    const pendingOutgoingTrades = tradeOffers.filter((offer) => offer.isPending && !offer.isIncoming).length;
    const metaprogression = buildGuildMetaprogressionSnapshot({
      state: {
        guildId: freshGuild.id,
        guildLevel: freshGuild.level,
        gold: freshGuild.gold,
        heroCount,
        activeListings: myActiveListingsCount,
        pendingOutgoingTrades,
        heroSlots: freshGuild.activeHeroSlots,
        marketSlots: freshGuild.marketSlotsBase,
        tradeSlots: getTradeSlotLimitFromUpgradeLevel(upgradeLevels[GuildUpgradeType.TRADE_SLOTS]),
        marketUnlocked: Boolean(freshGuild.marketUnlockedAt),
        tradeUnlocked: Boolean(freshGuild.tradeUnlockedAt),
        upgradeLevels,
      },
      recruitmentProgression,
      nextLocation,
    });
    const pveHorizon = buildPveHorizonSnapshot({
      guildLevel: freshGuild.level,
      locations,
    });

    return {
      guild: {
        id: freshGuild.id,
        name: freshGuild.name,
        tag: freshGuild.tag,
        level: freshGuild.level,
        xp: freshGuild.xp,
        gold: freshGuild.gold,
        marketUnlockedAt: freshGuild.marketUnlockedAt,
        tradeUnlockedAt: freshGuild.tradeUnlockedAt,
        marketSlotsBase: freshGuild.marketSlotsBase,
        activeHeroSlots: freshGuild.activeHeroSlots,
        user: freshGuild.user,
        counts: {
          heroes: heroCount,
          inventoryItems: inventoryCount,
          pendingClaims: pendingClaimsCount,
        },
        nextLevelXp: getNextLevelXp(freshGuild.level),
        identity: freshGuild.identity,
      },
      activeExpeditions: activeExpeditions.map((expedition) => {
        const profile = getLocationProfile(expedition.location.code);

        return {
          id: expedition.id,
          locationName: expedition.location.name,
          statusLabel: getExpeditionStatusLabel(expedition.status),
          scenarioLabel: profile.scenarioLabel,
          riskLabel: profile.riskLabel,
          rewardFocusLabel: profile.rewardFocusLabel,
          riskRewardSummary: getLocationRiskRewardSummary(expedition.location.code),
          endsAt: expedition.endsAt,
          partyNames: expedition.party.map((entry) => entry.hero.name),
          partyPowerSnapshot: expedition.partyPowerSnapshot,
          threatScoreSnapshot: expedition.threatScoreSnapshot,
        };
      }),
      claimableExpeditions,
      resources: resources.map((resource) => ({
        resourceType: resource.resourceType,
        label: getResourceLabel(resource.resourceType),
        amount: resource.amount,
      })),
      recentLedger: recentLedger.map((entry) => ({
        id: entry.id,
        eventLabel: getEconomyEventLabel(entry.eventType),
        goldDelta: entry.goldDelta,
        resourceLabel: entry.resourceType ? getResourceLabel(entry.resourceType) : null,
        resourceDelta: entry.resourceDelta,
        isSuspicious: entry.isSuspicious,
        createdAt: entry.createdAt,
      })),
      marketUpgrade: {
        nextCostGold: nextUpgrade.nextCostGold,
        nextLevel: nextUpgrade.nextLevel,
        canAfford: nextUpgrade.nextCostGold !== null && freshGuild.gold >= nextUpgrade.nextCostGold,
      },
      heroSlotsUpgrade: {
        currentLevel: upgradeLevels[GuildUpgradeType.HERO_SLOTS],
        nextCostGold: nextHeroSlotsUpgrade.nextCostGold,
        nextLevel: nextHeroSlotsUpgrade.nextLevel,
        nextSlotLimit: nextHeroSlotsUpgrade.nextLevel ? freshGuild.activeHeroSlots + 1 : null,
        canAfford:
          nextHeroSlotsUpgrade.nextCostGold !== null &&
          freshGuild.gold >= nextHeroSlotsUpgrade.nextCostGold,
        canPurchase:
          nextHeroSlotsUpgrade.nextCostGold !== null &&
          freshGuild.gold >= nextHeroSlotsUpgrade.nextCostGold,
      },
      contractBoard,
      metaprogression,
      pveHorizon,
      recruitmentProgression,
      rosterProgression: {
        heroCount,
        heroSlotLimit: freshGuild.activeHeroSlots,
        usedSlots: heroCount,
        freeSlots: freeHeroSlots,
        availableHeroes: availableHeroCount,
        activeHeroes: heroCount - availableHeroCount,
        reserveLoopTarget: SECOND_PARTY_TARGET,
        reserveLoopUnlocked: heroCount >= SECOND_PARTY_TARGET,
        reserveLoopShortfall: Math.max(0, SECOND_PARTY_TARGET - heroCount),
        recruitCostGold: HERO_RECRUITMENT_COST_GOLD,
        canRecruit: freeHeroSlots > 0 && freshGuild.gold >= HERO_RECRUITMENT_COST_GOLD,
      },
      heroProgression: {
        totalHeroXp: heroProgression.reduce((sum, hero) => sum + hero.heroXp, 0),
        highestHeroLevel: heroProgression.reduce((max, hero) => Math.max(max, hero.level), 1),
        averageHeroLevel:
          heroProgression.length > 0
            ? Number(
                (heroProgression.reduce((sum, hero) => sum + hero.level, 0) / heroProgression.length).toFixed(1),
              )
            : 1,
      },
      inbox: {
        pending: pendingInbox,
        recent: recentActivity,
      },
      onboarding,
      guildPrestige,
      guildIdentityEditor,
      watchlist: socialDashboard.watchlist,
      followedGuilds: socialDashboard.followedGuilds,
      suggestedGuilds: socialDashboard.suggestedGuilds,
      personalizedFeed: socialDashboard.personalizedFeed,
      worldEventBoard,
    };
  });
}

export async function getHeroesPageData(): Promise<FoundationResult<HeroesPageData>> {
  return withGameQuery(async () => {
    const guild = await getFreshDemoGuild();
    await runLazyMaintenance(guild.id);
    const freshGuild = await getFreshDemoGuild();

    const [heroes, equippableItems, guildUpgrades, resourceBalances, onboarding] = await Promise.all([
      prisma.hero.findMany({
        where: { guildId: freshGuild.id },
        orderBy: [{ level: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          heroClass: true,
          status: true,
          rarity: true,
          level: true,
          heroXp: true,
          powerScore: true,
          equippedItems: {
            orderBy: { acquiredAt: "asc" },
            select: {
              id: true,
              workshopLevel: true,
              boundToGuild: true,
              itemDefinition: {
                select: {
                  name: true,
                  itemType: true,
                  rarity: true,
                  equipSlot: true,
                  powerScore: true,
                  vendorBasePrice: true,
                },
              },
            },
          },
        },
      }),
      prisma.inventoryItem.findMany({
        where: {
          guildId: freshGuild.id,
          state: InventoryItemState.AVAILABLE,
          itemDefinition: {
            equipSlot: { not: null },
            requiredGuildLevel: { lte: freshGuild.level },
          },
        },
        orderBy: { acquiredAt: "desc" },
        select: {
          id: true,
          workshopLevel: true,
          itemDefinition: {
            select: {
              name: true,
              itemType: true,
              rarity: true,
              equipSlot: true,
              powerScore: true,
              vendorBasePrice: true,
            },
          },
        },
      }),
      prisma.guildUpgrade.findMany({
        where: {
          guildId: freshGuild.id,
          upgradeType: { in: [...MANAGED_GUILD_UPGRADES] },
        },
        select: {
          upgradeType: true,
          level: true,
        },
      }),
      prisma.resourceBalance.findMany({
        where: { guildId: freshGuild.id, amount: { gt: 0 } },
        select: {
          resourceType: true,
          amount: true,
        },
      }),
      loadOnboardingSnapshot(freshGuild.id),
    ]);

    const resourceAvailability = buildResourceAvailabilityMap(resourceBalances);
    const equippablePool = equippableItems
      .map((item) => {
        const ownedPresentation = buildWorkshopItemPresentation({
          name: item.itemDefinition.name,
          itemType: item.itemDefinition.itemType,
          rarity: item.itemDefinition.rarity,
          equipSlot: item.itemDefinition.equipSlot,
          powerScore: item.itemDefinition.powerScore,
          vendorBasePrice: item.itemDefinition.vendorBasePrice,
          workshopLevel: item.workshopLevel,
        });

        return {
          id: item.id,
          name: item.itemDefinition.name,
          slotKey: item.itemDefinition.equipSlot ?? "UTILITY",
          slotLabel: ownedPresentation.presentation.slotLabel,
          rarityLabel: ownedPresentation.presentation.rarityLabel,
          powerScore: ownedPresentation.effectivePowerScore,
          powerLabel: ownedPresentation.presentation.powerLabel,
          workshopLevelLabel: ownedPresentation.workshopLevelLabel,
          workshopSummary: ownedPresentation.workshopSummary,
          valueSummary: ownedPresentation.presentation.valueSummary,
          progressionLabel: ownedPresentation.presentation.progressionLabel,
        };
      })
      .sort((left, right) => right.powerScore - left.powerScore || left.name.localeCompare(right.name, "ru"));

    const usedSlots = heroes.length;
    const freeSlots = Math.max(0, freshGuild.activeHeroSlots - usedSlots);
    const availableHeroes = heroes.filter((hero) => hero.status === HeroStatus.AVAILABLE).length;
    const upgradeLevels = mapManagedGuildUpgradeLevels(guildUpgrades);
    const heroSlotUpgradeLevel = upgradeLevels[GuildUpgradeType.HERO_SLOTS];
    const nextHeroSlotsUpgrade = getNextHeroSlotsUpgrade(heroSlotUpgradeLevel);
    const recruitmentBoard = getRecruitmentBoard({
      heroCount: usedSlots,
      heroSlotUpgradeLevel,
      guildLevel: freshGuild.level,
    });
    const recruitmentProgression = getRecruitmentProgression({
      guildLevel: freshGuild.level,
      heroSlotUpgradeLevel,
    });
    const workshopFacilityLevel = upgradeLevels[GuildUpgradeType.STORAGE];
    const workshopView = buildWorkshopFacilityView(workshopFacilityLevel);
    const workshopProjects = heroes
      .flatMap((hero) =>
        hero.equippedItems.map((item) => {
          const ownedPresentation = buildWorkshopItemPresentation({
            name: item.itemDefinition.name,
            itemType: item.itemDefinition.itemType,
            rarity: item.itemDefinition.rarity,
            equipSlot: item.itemDefinition.equipSlot,
            powerScore: item.itemDefinition.powerScore,
            vendorBasePrice: item.itemDefinition.vendorBasePrice,
            workshopLevel: item.workshopLevel,
          });
          const plan = buildWorkshopPlan({
            workshopFacilityLevel,
            availableGold: freshGuild.gold,
            availableResources: resourceAvailability,
            workshopLevel: item.workshopLevel,
            state: InventoryItemState.EQUIPPED,
            heroStatus: hero.status,
            boundToGuild: item.boundToGuild,
            definition: {
              name: item.itemDefinition.name,
              itemType: item.itemDefinition.itemType,
              rarity: item.itemDefinition.rarity,
              equipSlot: item.itemDefinition.equipSlot,
              powerScore: item.itemDefinition.powerScore,
            },
          });

          return {
            itemId: item.id,
            heroName: hero.name,
            itemName: item.itemDefinition.name,
            slotLabel: ownedPresentation.presentation.slotLabel,
            workshopLevelLabel: ownedPresentation.workshopLevelLabel,
            currentPowerLabel: ownedPresentation.presentation.powerLabel,
            nextEffectSummary: plan.effectSummary,
            costSummary: plan.costSummary,
            limitationSummary: plan.limitationSummary,
            nextDeltaPower: plan.powerDelta,
            canUpgrade: plan.canUpgrade,
            sortPower: ownedPresentation.effectivePowerScore,
          };
        }),
      )
      .sort(
        (left, right) =>
          Number(right.canUpgrade) - Number(left.canUpgrade) ||
          right.nextDeltaPower - left.nextDeltaPower ||
          right.sortPower - left.sortPower ||
          left.itemName.localeCompare(right.itemName, "ru"),
      );

    return {
      guildName: freshGuild.name,
      guildGold: freshGuild.gold,
      workshop: {
        ...workshopView,
        projectCount: workshopProjects.filter((project) => project.canUpgrade).length,
        projects: workshopProjects.map((entry) => {
          const { sortPower, ...project } = entry;
          void sortPower;

          return project;
        }),
      },
      roster: {
        heroSlotLimit: freshGuild.activeHeroSlots,
        usedSlots,
        freeSlots,
        availableHeroes,
        activeHeroes: usedSlots - availableHeroes,
        reserveLoopTarget: SECOND_PARTY_TARGET,
        reserveLoopUnlocked: usedSlots >= SECOND_PARTY_TARGET,
        reserveLoopShortfall: Math.max(0, SECOND_PARTY_TARGET - usedSlots),
      },
      recruitment: {
        costGold: HERO_RECRUITMENT_COST_GOLD,
        canAfford: freshGuild.gold >= HERO_RECRUITMENT_COST_GOLD,
        hasOpenSlot: freeSlots > 0,
        candidates: recruitmentBoard.map((candidate) => ({
          key: candidate.key,
          name: candidate.name,
          heroClassLabel: candidate.heroClassLabel,
          tacticalRoleLabel: candidate.tacticalRoleLabel,
          rarityLabel: candidate.rarityLabel,
          level: candidate.level,
          heroXp: candidate.heroXp,
          powerScore: candidate.powerScore,
          recruitCostGold: candidate.recruitCostGold,
          zoneFocusLabel: candidate.zoneFocusLabel,
          summary: candidate.summary,
          canHire: freeSlots > 0 && freshGuild.gold >= candidate.recruitCostGold,
        })),
      },
      recruitmentProgression,
      heroSlotsUpgrade: {
        currentLevel: heroSlotUpgradeLevel,
        nextCostGold: nextHeroSlotsUpgrade.nextCostGold,
        nextLevel: nextHeroSlotsUpgrade.nextLevel,
        nextSlotLimit: nextHeroSlotsUpgrade.nextLevel ? freshGuild.activeHeroSlots + 1 : null,
        canAfford:
          nextHeroSlotsUpgrade.nextCostGold !== null &&
          freshGuild.gold >= nextHeroSlotsUpgrade.nextCostGold,
        canPurchase:
          nextHeroSlotsUpgrade.nextCostGold !== null &&
          freshGuild.gold >= nextHeroSlotsUpgrade.nextCostGold,
      },
      totalHeroXp: heroes.reduce((sum, hero) => sum + hero.heroXp, 0),
      highestHeroLevel: heroes.reduce((max, hero) => Math.max(max, hero.level), 1),
      heroes: heroes.map((hero) => {
        const equipment = hero.equippedItems.map((item) => {
          const ownedPresentation = buildWorkshopItemPresentation({
            name: item.itemDefinition.name,
            itemType: item.itemDefinition.itemType,
            rarity: item.itemDefinition.rarity,
            equipSlot: item.itemDefinition.equipSlot,
            powerScore: item.itemDefinition.powerScore,
            vendorBasePrice: item.itemDefinition.vendorBasePrice,
            workshopLevel: item.workshopLevel,
          });

          return {
            id: item.id,
            name: item.itemDefinition.name,
            rarityLabel: ownedPresentation.presentation.rarityLabel,
            slotKey: item.itemDefinition.equipSlot ?? "UTILITY",
            slotLabel: ownedPresentation.presentation.slotLabel,
            powerScore: ownedPresentation.effectivePowerScore,
            powerLabel: ownedPresentation.presentation.powerLabel,
            workshopLevelLabel: ownedPresentation.workshopLevelLabel,
            workshopSummary: ownedPresentation.workshopSummary,
            valueSummary: ownedPresentation.presentation.valueSummary,
          };
        });
        const equippedPowerBySlot = new Map(equipment.map((item) => [item.slotKey, item.powerScore]));
        const bestAvailableBySlot = new Map<string, (typeof equippablePool)[number]>();

        for (const item of equippablePool) {
          const currentBest = bestAvailableBySlot.get(item.slotKey);

          if (!currentBest || item.powerScore > currentBest.powerScore) {
            bestAvailableBySlot.set(item.slotKey, item);
          }
        }

        const slotUpgrades = Array.from(bestAvailableBySlot.values())
          .map((item) => {
            const currentPower = equippedPowerBySlot.get(item.slotKey) ?? 0;

            return {
              slotKey: item.slotKey,
              slotLabel: item.slotLabel,
              currentPower,
              bestAvailablePower: item.powerScore,
              delta: item.powerScore - currentPower,
            };
          })
          .filter((item) => item.delta > 0)
          .sort((left, right) => right.delta - left.delta || right.bestAvailablePower - left.bestAvailablePower);
        const equipOptions = equippablePool
          .map((item) => {
            const currentPower = equippedPowerBySlot.get(item.slotKey) ?? 0;
            const deltaVsEquipped = item.powerScore - currentPower;

            return {
              ...item,
              deltaVsEquipped,
              comparisonLabel:
                deltaVsEquipped > 0
                  ? `лучше текущего слота на +${deltaVsEquipped}`
                  : deltaVsEquipped === 0
                    ? "на уровне текущего слота"
                    : `слабее текущего слота на ${Math.abs(deltaVsEquipped)}`,
            };
          })
          .sort(
            (left, right) =>
              right.deltaVsEquipped - left.deltaVsEquipped ||
              right.powerScore - left.powerScore ||
              left.name.localeCompare(right.name, "ru"),
          );

        return {
          id: hero.id,
          name: hero.name,
          heroClassLabel: getHeroClassLabel(hero.heroClass),
          status: hero.status,
          statusLabel: getHeroStatusLabel(hero.status),
          rarityLabel: getRarityLabel(hero.rarity),
          level: hero.level,
          heroXp: hero.heroXp,
          nextLevelXp: getNextHeroLevelXp(hero.level),
          powerScore: hero.powerScore,
          equipmentPower: equipment.reduce((sum, item) => sum + item.powerScore, 0),
          equipment,
          slotUpgrades,
          equipOptions,
        };
      }),
      equippableItems: equippablePool,
      onboarding,
    };
  });
}

export async function getExpeditionPageData(): Promise<FoundationResult<ExpeditionPageData>> {
  return withGameQuery(async () => {
    const guild = await getFreshDemoGuild();
    await runLazyMaintenance(guild.id);
    const freshGuild = await getFreshDemoGuild();

    const [contractBoard, locations, availableHeroes, expeditions, heroCount, onboarding, worldEventBoard] = await Promise.all([
      loadGuildContractBoardSnapshot(freshGuild.id),
      prisma.location.findMany({
        where: { isEnabled: true },
        orderBy: [{ requiredGuildLevel: "asc" }, { durationSeconds: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          requiredGuildLevel: true,
          durationSeconds: true,
          recommendedPower: true,
          lootTableEntries: {
            orderBy: { dropWeight: "desc" },
            select: {
              rewardType: true,
              resourceType: true,
              itemDefinition: {
                select: {
                  name: true,
                  itemType: true,
                  rarity: true,
                  equipSlot: true,
                  powerScore: true,
                  vendorBasePrice: true,
                },
              },
            },
          },
        },
      }),
      prisma.hero.findMany({
        where: { guildId: freshGuild.id, status: HeroStatus.AVAILABLE },
        orderBy: [{ powerScore: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          heroClass: true,
          status: true,
          powerScore: true,
        },
      }),
      prisma.expedition.findMany({
        where: { guildId: freshGuild.id },
        orderBy: [{ startedAt: "desc" }, { endsAt: "desc" }],
        take: 8,
        select: {
          id: true,
          status: true,
          resultTier: true,
          resultSummary: true,
          startedAt: true,
          endsAt: true,
          resolvedAt: true,
          claimedAt: true,
          combatLog: true,
          partyPowerSnapshot: true,
          threatScoreSnapshot: true,
          rewardGold: true,
          rewardGuildXp: true,
          location: { select: { name: true, code: true } },
          party: { select: { hero: { select: { name: true } } } },
          rewards: {
            select: {
              rewardType: true,
              quantity: true,
              resourceType: true,
              itemDefinition: {
                select: {
                  name: true,
                  itemType: true,
                  rarity: true,
                  equipSlot: true,
                  powerScore: true,
                  vendorBasePrice: true,
                },
              },
            },
          },
        },
      }),
      prisma.hero.count({ where: { guildId: freshGuild.id } }),
      loadOnboardingSnapshot(freshGuild.id),
      loadWorldEventBoardSnapshot({
        currentGuildTag: freshGuild.tag,
        focusGuildTag: freshGuild.tag,
      }),
    ]);

    const bestPartyByLocation = new Map(
      locations.map((location) => [
        location.id,
        getBestAvailablePartyOption({
          location,
          heroes: availableHeroes,
        }),
      ]),
    );

    return {
      guildLevel: freshGuild.level,
      contractBoard,
      onboarding,
      worldEventBoard,
      rosterProgression: {
        totalHeroes: heroCount,
        heroSlotLimit: freshGuild.activeHeroSlots,
        openSlots: Math.max(0, freshGuild.activeHeroSlots - heroCount),
        reserveLoopTarget: SECOND_PARTY_TARGET,
        reserveLoopUnlocked: heroCount >= SECOND_PARTY_TARGET,
        reserveLoopShortfall: Math.max(0, SECOND_PARTY_TARGET - heroCount),
      },
      zoneProgression: buildZoneProgression({
        guildLevel: freshGuild.level,
        locations: locations.map((location) => ({
          name: location.name,
          requiredGuildLevel: location.requiredGuildLevel,
          code: location.code,
        })),
      }),
      locations: locations.map((location) => {
        const profile = getLocationProfile(location.code);
        const bestParty = bestPartyByLocation.get(location.id) ?? null;
        const itemLoot = location.lootTableEntries.flatMap((entry) =>
          entry.itemDefinition ? [entry.itemDefinition] : [],
        );
        const topLoot = [...itemLoot].sort(
          (left, right) =>
            (right.vendorBasePrice ?? 0) - (left.vendorBasePrice ?? 0) ||
            right.powerScore - left.powerScore ||
            left.name.localeCompare(right.name, "ru"),
        )[0] ?? null;

        return {
          id: location.id,
          code: location.code,
          name: location.name,
          requiredGuildLevel: location.requiredGuildLevel,
          durationSeconds: location.durationSeconds,
          recommendedPower: location.recommendedPower,
          isUnlocked: freshGuild.level >= location.requiredGuildLevel,
          hazardLabel: profile.hazardLabel,
          preferredRoles: profile.preferredClasses.map((heroClass) => getHeroClassLabel(heroClass)),
          scenarioLabel: profile.scenarioLabel,
          scenarioSummary: profile.scenarioSummary,
          riskLabel: profile.riskLabel,
          rewardFocusLabel: profile.rewardFocusLabel,
          rewardRules: profile.specialRules,
          blockerSummary: buildLocationBlockerSummary({
            guildLevel: freshGuild.level,
            location,
            bestParty,
          }),
          bestPartyNames: bestParty?.partyNames ?? [],
          bestPartyPower: bestParty?.tacticalPower ?? null,
          powerGap: bestParty?.margin ?? null,
          isElite: profile.isElite,
          lootPreview: location.lootTableEntries.slice(0, 4).map((entry) => getLootPreviewLabel(entry)),
          lootValueSummary: `${
            itemLoot.reduce((max, item) => Math.max(max, item.powerScore), 0) > 0
              ? `до +${itemLoot.reduce((max, item) => Math.max(max, item.powerScore), 0)} power`
              : "без боевых апгрейдов"
          } · база предметов до ${
            itemLoot.reduce((max, item) => Math.max(max, item.vendorBasePrice ?? 0), 0) > 0
              ? `${itemLoot.reduce((max, item) => Math.max(max, item.vendorBasePrice ?? 0), 0)} зол.`
              : "—"
          }`,
          topLootLabel: topLoot
            ? `${topLoot.name} · ${getItemPresentation(topLoot).detailLabel}`
            : location.lootTableEntries.find((entry) => entry.resourceType)?.resourceType
              ? getResourceLabel(
                  location.lootTableEntries.find((entry) => entry.resourceType)?.resourceType ?? null,
                )
              : "—",
        };
      }),
      availableHeroes: availableHeroes.map((hero) => ({
        id: hero.id,
        name: hero.name,
        heroClassLabel: getHeroClassLabel(hero.heroClass),
        tacticalRoleLabel: getHeroClassTacticLabel(hero.heroClass),
        powerScore: hero.powerScore,
      })),
      expeditions: expeditions.map((expedition) => {
        const profile = getLocationProfile(expedition.location.code);
        const heroXpRewardPerHero = getExpeditionHeroXpReward({
          rewardGuildXp: expedition.rewardGuildXp,
          resultTier: expedition.resultTier,
          locationCode: expedition.location.code,
        });

        return {
          id: expedition.id,
          status: expedition.status,
          statusLabel: getExpeditionStatusLabel(expedition.status),
          resultTier: expedition.resultTier,
          resultLabel: expedition.resultTier ? getExpeditionResultLabel(expedition.resultTier) : null,
          resultSummary: expedition.resultSummary,
          startedAt: expedition.startedAt,
          endsAt: expedition.endsAt,
          resolvedAt: expedition.resolvedAt,
          claimedAt: expedition.claimedAt,
          rewardGold: expedition.rewardGold,
          rewardGuildXp: expedition.rewardGuildXp,
          partyPowerSnapshot: expedition.partyPowerSnapshot,
          threatScoreSnapshot: expedition.threatScoreSnapshot,
          rewardSummary: summarizeExpeditionRewards({
            rewardGold: expedition.rewardGold,
            rewardGuildXp: expedition.rewardGuildXp,
            rewards: expedition.rewards,
            heroXpRewardPerHero,
          }),
          partyNames: expedition.party.map((entry) => entry.hero.name),
          locationName: expedition.location.name,
          scenarioLabel: profile.scenarioLabel,
          riskLabel: profile.riskLabel,
          rewardFocusLabel: profile.rewardFocusLabel,
          riskRewardSummary: getLocationRiskRewardSummary(expedition.location.code),
          heroXpRewardPerHero,
          combatLog: splitCombatLog(expedition.combatLog),
        };
      }),
    };
  });
}

export async function getInventoryPageData(): Promise<FoundationResult<InventoryPageData>> {
  return withGameQuery(async () => {
    const guild = await getFreshDemoGuild();
    await runLazyMaintenance(guild.id);
    const freshGuild = await getFreshDemoGuild();

    const [resources, items, guildUpgrades, onboarding] = await Promise.all([
      prisma.resourceBalance.findMany({
        where: { guildId: freshGuild.id, amount: { gt: 0 } },
        orderBy: { amount: "desc" },
      }),
      prisma.inventoryItem.findMany({
        where: { guildId: freshGuild.id },
        orderBy: { acquiredAt: "desc" },
        select: {
          id: true,
          state: true,
          boundToGuild: true,
          workshopLevel: true,
          reservedByType: true,
          acquiredAt: true,
          itemDefinition: {
            select: {
              name: true,
              itemType: true,
              rarity: true,
              equipSlot: true,
              powerScore: true,
              isTradable: true,
              isStarterLocked: true,
              vendorBasePrice: true,
            },
          },
          equippedHero: {
            select: { name: true, status: true },
          },
        },
      }),
      prisma.guildUpgrade.findMany({
        where: {
          guildId: freshGuild.id,
          upgradeType: { in: [...MANAGED_GUILD_UPGRADES] },
        },
        select: {
          upgradeType: true,
          level: true,
        },
      }),
      loadOnboardingSnapshot(freshGuild.id),
    ]);

    const resourceAvailability = buildResourceAvailabilityMap(
      resources.map((resource) => ({
        resourceType: resource.resourceType,
        amount: resource.amount,
      })),
    );
    const upgradeLevels = mapManagedGuildUpgradeLevels(guildUpgrades);
    const workshopFacilityLevel = upgradeLevels[GuildUpgradeType.STORAGE];
    const workshopView = buildWorkshopFacilityView(workshopFacilityLevel);
    const workshopCandidates = items
      .filter((item) => Boolean(item.itemDefinition.equipSlot))
      .map((item) => {
        const ownedPresentation = buildWorkshopItemPresentation({
          name: item.itemDefinition.name,
          itemType: item.itemDefinition.itemType,
          rarity: item.itemDefinition.rarity,
          equipSlot: item.itemDefinition.equipSlot,
          powerScore: item.itemDefinition.powerScore,
          vendorBasePrice: item.itemDefinition.vendorBasePrice,
          isStarterLocked: item.itemDefinition.isStarterLocked,
          workshopLevel: item.workshopLevel,
        });
        const plan = buildWorkshopPlan({
          workshopFacilityLevel,
          availableGold: freshGuild.gold,
          availableResources: resourceAvailability,
          workshopLevel: item.workshopLevel,
          state: item.state,
          reservedByType: item.reservedByType,
          heroStatus: item.equippedHero?.status ?? null,
          boundToGuild: item.boundToGuild,
          definition: {
            name: item.itemDefinition.name,
            itemType: item.itemDefinition.itemType,
            rarity: item.itemDefinition.rarity,
            equipSlot: item.itemDefinition.equipSlot,
            powerScore: item.itemDefinition.powerScore,
          },
        });

        return {
          id: item.id,
          name: item.itemDefinition.name,
          slotLabel: ownedPresentation.presentation.slotLabel,
          rarityLabel: ownedPresentation.presentation.rarityLabel,
          stateLabel: getInventoryStateLabel(item.state),
          equippedHeroName: item.equippedHero?.name ?? null,
          workshopLevelLabel: ownedPresentation.workshopLevelLabel,
          effectivePowerLabel: ownedPresentation.presentation.powerLabel,
          nextEffectSummary: plan.effectSummary,
          costSummary: plan.costSummary,
          limitationSummary: plan.limitationSummary,
          canUpgrade: plan.canUpgrade,
          nextDeltaPower: plan.powerDelta,
          effectivePowerScore: ownedPresentation.effectivePowerScore,
        };
      })
      .sort(
        (left, right) =>
          Number(right.canUpgrade) - Number(left.canUpgrade) ||
          right.nextDeltaPower - left.nextDeltaPower ||
          right.effectivePowerScore - left.effectivePowerScore ||
          left.name.localeCompare(right.name, "ru"),
      );

    return {
      gold: freshGuild.gold,
      resources: resources.map((resource) => ({
        id: resource.id,
        label: getResourceLabel(resource.resourceType),
        amount: resource.amount,
      })),
      workshop: {
        ...workshopView,
        candidateCount: workshopCandidates.filter((candidate) => candidate.canUpgrade).length,
        candidates: workshopCandidates.map((entry) => {
          const { nextDeltaPower, effectivePowerScore, ...candidate } = entry;
          void nextDeltaPower;
          void effectivePowerScore;

          return candidate;
        }),
      },
      onboarding,
      items: items.map((item) => {
        const tradable =
          !item.boundToGuild &&
          item.state === InventoryItemState.AVAILABLE &&
          item.itemDefinition.isTradable &&
          !item.itemDefinition.isStarterLocked;
        const ownedPresentation = buildWorkshopItemPresentation({
          name: item.itemDefinition.name,
          itemType: item.itemDefinition.itemType,
          rarity: item.itemDefinition.rarity,
          equipSlot: item.itemDefinition.equipSlot,
          powerScore: item.itemDefinition.powerScore,
          vendorBasePrice: item.itemDefinition.vendorBasePrice,
          isStarterLocked: item.itemDefinition.isStarterLocked,
          workshopLevel: item.workshopLevel,
        });

        return {
          id: item.id,
          name: item.itemDefinition.name,
          typeLabel: getItemTypeLabel(item.itemDefinition.itemType),
          slotLabel: ownedPresentation.presentation.slotLabel,
          rarityLabel: ownedPresentation.presentation.rarityLabel,
          powerScore: ownedPresentation.effectivePowerScore,
          powerLabel: ownedPresentation.presentation.powerLabel,
          workshopLevelLabel: ownedPresentation.workshopLevelLabel,
          workshopSummary: ownedPresentation.workshopSummary,
          state: item.state,
          stateLabel: getInventoryStateLabel(item.state),
          equippedHeroName: item.equippedHero?.name ?? null,
          boundToGuild: item.boundToGuild,
          tradable,
          vendorBasePrice: item.itemDefinition.vendorBasePrice,
          valueSummary: ownedPresentation.presentation.valueSummary,
          progressionLabel: ownedPresentation.presentation.progressionLabel,
          tradeLabel: item.boundToGuild
            ? "Привязан к гильдии"
            : getReservationLabel(item.reservedByType) ??
              (tradable
                ? "Готов к торговле"
                : item.itemDefinition.isStarterLocked
                  ? "Стартовый locked-предмет"
                  : "Недоступен для торговли"),
          reservationLabel: getReservationLabel(item.reservedByType),
          acquiredAt: item.acquiredAt,
        };
      }),
    };
  });
}

export async function getMarketPageData(
  highlightedGuildTag?: string | null,
): Promise<FoundationResult<MarketPageData>> {
  return withGameQuery(async () => {
    const guild = await getFreshDemoGuild();
    await runLazyMaintenance(guild.id);
    const freshGuild = await getFreshDemoGuild();
    const normalizedHighlightedGuildTag = highlightedGuildTag?.trim().toUpperCase() || null;

    const [
      contractBoard,
      onboarding,
      myActiveListingsCount,
      activeListings,
      myListings,
      claimBox,
      marketHistory,
      activeBuyOrders,
      myBuyOrders,
      buyOrderHistory,
      sellableItems,
      sellableResources,
      upgrade,
      highlightedGuild,
      prestigeSummaries,
      worldEventBoard,
    ] = await Promise.all([
        loadGuildContractBoardSnapshot(freshGuild.id),
        loadOnboardingSnapshot(freshGuild.id),
        prisma.marketListing.count({
          where: { sellerGuildId: freshGuild.id, status: MarketListingStatus.ACTIVE },
        }),
        prisma.marketListing.findMany({
          where: { status: MarketListingStatus.ACTIVE },
          orderBy: [{ totalPriceGold: "asc" }, { createdAt: "desc" }],
          take: 12,
          select: {
            id: true,
            sellerGuildId: true,
            listingType: true,
            quantity: true,
            totalPriceGold: true,
            status: true,
            expiresAt: true,
            resourceType: true,
            itemDefinition: {
              select: {
                name: true,
                itemType: true,
                rarity: true,
                equipSlot: true,
                powerScore: true,
                vendorBasePrice: true,
              },
            },
            sellerGuild: { select: { name: true, tag: true } },
          },
        }),
        prisma.marketListing.findMany({
          where: { sellerGuildId: freshGuild.id, status: MarketListingStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
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
                itemType: true,
                rarity: true,
                equipSlot: true,
                powerScore: true,
                vendorBasePrice: true,
              },
            },
          },
        }),
        loadPendingMarketClaims(freshGuild.id, 12),
        loadMarketHistoryEntries(freshGuild.id, 12),
        prisma.buyOrder.findMany({
          where: { status: BuyOrderStatus.ACTIVE },
          orderBy: [{ totalPriceGold: "desc" }, { createdAt: "desc" }],
          take: 12,
          select: {
            id: true,
            buyerGuildId: true,
            resourceType: true,
            quantity: true,
            totalPriceGold: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            buyerGuild: { select: { name: true, tag: true } },
          },
        }),
        prisma.buyOrder.findMany({
          where: { buyerGuildId: freshGuild.id, status: BuyOrderStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            buyerGuildId: true,
            resourceType: true,
            quantity: true,
            totalPriceGold: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            buyerGuild: { select: { name: true, tag: true } },
          },
        }),
        loadBuyOrderHistoryEntries(freshGuild.id, 12),
        prisma.inventoryItem.findMany({
          where: {
            guildId: freshGuild.id,
            state: InventoryItemState.AVAILABLE,
            boundToGuild: false,
            itemDefinition: {
              isTradable: true,
              isStarterLocked: false,
            },
          },
          orderBy: { acquiredAt: "desc" },
          take: 12,
          select: {
            id: true,
            itemDefinition: {
              select: {
                name: true,
                itemType: true,
                rarity: true,
                equipSlot: true,
                powerScore: true,
                vendorBasePrice: true,
              },
            },
          },
        }),
        prisma.resourceBalance.findMany({
          where: { guildId: freshGuild.id, amount: { gt: 0 } },
          orderBy: { amount: "desc" },
          select: {
            resourceType: true,
            amount: true,
          },
        }),
        prisma.guildUpgrade.findUnique({
          where: {
            guildId_upgradeType: {
              guildId: freshGuild.id,
              upgradeType: GuildUpgradeType.MARKET_SLOTS,
            },
          },
          select: { level: true },
        }),
        normalizedHighlightedGuildTag
          ? prisma.guild.findUnique({
              where: { tag: normalizedHighlightedGuildTag },
              select: { name: true, tag: true },
            })
          : Promise.resolve(null),
        loadGuildPrestigeSummaries(freshGuild.tag),
        loadWorldEventBoardSnapshot({
          currentGuildTag: freshGuild.tag,
          focusGuildTag: freshGuild.tag,
        }),
      ]);
    const guildPrestige = prestigeSummaries.find((entry) => entry.guildTag === freshGuild.tag) ?? null;
    const highlightedGuildSummary = highlightedGuild
      ? prestigeSummaries.find((entry) => entry.guildTag === highlightedGuild.tag) ?? null
      : null;

    const sellableItemLabels = sellableItems
      .map((item) => {
        const presentation = getItemPresentation(item.itemDefinition);

        return {
          id: item.id,
          label: `${item.itemDefinition.name} · ${presentation.detailLabel} · ${presentation.valueSummary}`,
          sortScore: item.itemDefinition.powerScore * 10 + (item.itemDefinition.vendorBasePrice ?? 0),
        };
      })
      .sort((left, right) => right.sortScore - left.sortScore || left.label.localeCompare(right.label, "ru"));

    const resourceAmounts = new Map(sellableResources.map((resource) => [resource.resourceType, resource.amount]));
    const activeBuyOrderViews = activeBuyOrders.map((order) =>
      buildBuyOrderView(order, freshGuild.id, resourceAmounts.get(order.resourceType) ?? 0),
    );
    const myBuyOrderViews = myBuyOrders.map((order) =>
      buildBuyOrderView(order, freshGuild.id, resourceAmounts.get(order.resourceType) ?? 0),
    );
    const highlightedGuildContext = highlightedGuild
      ? {
        tag: highlightedGuild.tag,
        name: highlightedGuild.name,
        activeListingsCount: activeListings.filter(
          (listing) => listing.sellerGuild.tag === highlightedGuild.tag,
        ).length,
        activeBuyOrdersCount: activeBuyOrderViews.filter(
          (order) => order.buyerGuildTag === highlightedGuild.tag,
        ).length,
        prestige: highlightedGuildSummary?.prestige ?? null,
        renown: highlightedGuildSummary?.renown ?? null,
        recurringSummary: highlightedGuildSummary?.recurringSummary ?? null,
        favoriteCounterparties: highlightedGuildSummary?.favoriteCounterparties ?? [],
        relationshipLabel:
          guildPrestige?.favoriteCounterparties.find((entry) => entry.guildTag === highlightedGuild.tag)?.relationshipLabel ?? null,
        profileHref: `/guilds/${encodeURIComponent(highlightedGuild.tag)}`,
        dealsHref: `/deals?to=${encodeURIComponent(highlightedGuild.tag)}`,
      }
      : null;

    return {
      guildName: freshGuild.name,
      guildTag: freshGuild.tag,
      guildPrestige,
      contractBoard,
      onboarding,
      worldEventBoard,
      marketUnlocked: Boolean(freshGuild.marketUnlockedAt),
      marketSlotsBase: freshGuild.marketSlotsBase,
      myActiveListingsCount,
      myListingLimit: freshGuild.marketSlotsBase,
      guildGold: freshGuild.gold,
      listingFeeGold: MARKET_LISTING_FEE_GOLD,
      saleTaxPercent: Math.round(MARKET_SALE_TAX_RATE * 100),
      activeListings: activeListings.map((listing) => {
        const details = getListingDisplayDetails(listing);

        return {
          id: listing.id,
          sellerGuildId: listing.sellerGuildId,
          sellerGuildTag: listing.sellerGuild.tag,
          isMine: listing.sellerGuildId === freshGuild.id,
          listingTypeLabel: getListingTypeLabel(listing.listingType),
          itemLabel: details.itemLabel,
          quantity: listing.quantity,
          totalPriceGold: listing.totalPriceGold,
          statusLabel: getMarketStatusLabel(listing.status),
          expiresAt: listing.expiresAt,
          sellerLabel: `${listing.sellerGuild.name} [${listing.sellerGuild.tag}]`,
          detailLabel: details.detailLabel,
          valueSummary: details.valueSummary,
        };
      }),
      myListings: myListings.map((listing) => {
        const details = getListingDisplayDetails(listing);

        return {
          id: listing.id,
          listingTypeLabel: getListingTypeLabel(listing.listingType),
          itemLabel: details.itemLabel,
          quantity: listing.quantity,
          totalPriceGold: listing.totalPriceGold,
          expiresAt: listing.expiresAt,
          detailLabel: details.detailLabel,
          valueSummary: details.valueSummary,
        };
      }),
      claimBox,
      marketHistory,
      activeBuyOrders: activeBuyOrderViews,
      myBuyOrders: myBuyOrderViews,
      fulfillableBuyOrders: activeBuyOrderViews.filter((order) => order.canFulfill),
      buyOrderHistory,
      sellableItems: sellableItemLabels.map((item) => ({
        id: item.id,
        label: item.label,
      })),
      sellableResources: sellableResources.map((resource) => ({
        resourceType: resource.resourceType,
        label: getResourceLabel(resource.resourceType),
        amount: resource.amount,
      })),
      requestableResources: Object.values(ResourceType).map((resourceType) => ({
        resourceType,
        label: getResourceLabel(resourceType),
        ownedAmount: resourceAmounts.get(resourceType) ?? 0,
      })),
      highlightedGuildContext,
      nextUpgradeCostGold: getNextMarketUpgrade(upgrade?.level ?? 0).nextCostGold,
      ruleSummary: MARKET_RULE_SUMMARY,
    };
  });
}

export async function getDealsPageData(
  prefillReceiverGuildTag?: string | null,
): Promise<FoundationResult<DealsPageData>> {
  return withGameQuery(async () => {
    const guild = await getFreshDemoGuild();
    await runLazyMaintenance(guild.id);
    const freshGuild = await getFreshDemoGuild();
    const normalizedPrefillReceiverGuildTag = prefillReceiverGuildTag?.trim().toUpperCase() || null;

    const [tradeOffers, counterparties, offerableItems, offerableResources, requestableItems, requestableResources, prestigeSummaries] =
      await Promise.all([
        loadTradeOfferViews(freshGuild.id, 18),
        prisma.guild.findMany({
          where: {
            id: { not: freshGuild.id },
            tradeUnlockedAt: { not: null },
          },
          orderBy: { tag: "asc" },
          select: {
            tag: true,
            name: true,
          },
        }),
        prisma.inventoryItem.findMany({
          where: {
            guildId: freshGuild.id,
            state: InventoryItemState.AVAILABLE,
            boundToGuild: false,
            itemDefinition: {
              isTradable: true,
              isStarterLocked: false,
            },
          },
          orderBy: { acquiredAt: "desc" },
          select: {
            id: true,
            itemDefinition: { select: { name: true } },
          },
        }),
        prisma.resourceBalance.findMany({
          where: { guildId: freshGuild.id, amount: { gt: 0 } },
          orderBy: { amount: "desc" },
          select: {
            resourceType: true,
            amount: true,
          },
        }),
        prisma.inventoryItem.findMany({
          where: {
            guildId: { not: freshGuild.id },
            state: InventoryItemState.AVAILABLE,
            boundToGuild: false,
            itemDefinition: {
              isTradable: true,
              isStarterLocked: false,
            },
          },
          orderBy: { acquiredAt: "desc" },
          select: {
            id: true,
            guild: { select: { tag: true } },
            itemDefinition: { select: { name: true } },
          },
        }),
        prisma.resourceBalance.findMany({
          where: {
            guildId: { not: freshGuild.id },
            amount: { gt: 0 },
          },
          orderBy: { amount: "desc" },
          select: {
            resourceType: true,
            amount: true,
            guild: { select: { tag: true } },
          },
        }),
        loadGuildPrestigeSummaries(freshGuild.tag),
      ]);
    const guildPrestige = prestigeSummaries.find((entry) => entry.guildTag === freshGuild.tag) ?? null;

    const pendingIncoming = tradeOffers
      .filter((offer) => offer.isPending && offer.isIncoming)
      .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());
    const pendingOutgoing = tradeOffers
      .filter((offer) => offer.isPending && !offer.isIncoming)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const resolvedOffers = tradeOffers
      .filter((offer) => !offer.isPending)
      .sort((left, right) => right.finalAt.getTime() - left.finalAt.getTime());
    const prefillCounterparty = normalizedPrefillReceiverGuildTag
      ? counterparties.find((counterparty) => counterparty.tag === normalizedPrefillReceiverGuildTag) ?? null
      : null;
    const favoriteTraderTags = new Set(guildPrestige?.favoriteCounterparties.map((entry) => entry.guildTag) ?? []);
    const orderedCounterparties = [...counterparties].sort((left, right) => {
      if (prefillCounterparty?.tag === left.tag) {
        return -1;
      }

      if (prefillCounterparty?.tag === right.tag) {
        return 1;
      }

       const leftFavorite = favoriteTraderTags.has(left.tag);
       const rightFavorite = favoriteTraderTags.has(right.tag);

       if (leftFavorite !== rightFavorite) {
         return leftFavorite ? -1 : 1;
       }

      return left.tag.localeCompare(right.tag, "ru");
    });

    return {
      guildName: freshGuild.name,
      guildTag: freshGuild.tag,
      guildPrestige,
      tradeUnlocked: Boolean(freshGuild.tradeUnlockedAt),
      pendingIncoming,
      pendingOutgoing,
      resolvedOffers,
      prefillReceiverGuildTag: prefillCounterparty?.tag ?? null,
      prefillReceiverLabel: prefillCounterparty
        ? `${prefillCounterparty.name} [${prefillCounterparty.tag}]`
        : null,
      prefillReceiverProfileHref: prefillCounterparty
        ? `/guilds/${encodeURIComponent(prefillCounterparty.tag)}`
        : null,
      counterparties: orderedCounterparties.map((counterparty) => ({
        guildTag: counterparty.tag,
        label: `${counterparty.name} [${counterparty.tag}]`,
        prestige: prestigeSummaries.find((entry) => entry.guildTag === counterparty.tag)?.prestige ?? null,
        renown: prestigeSummaries.find((entry) => entry.guildTag === counterparty.tag)?.renown ?? null,
        relationshipLabel:
          guildPrestige?.favoriteCounterparties.find((entry) => entry.guildTag === counterparty.tag)?.relationshipLabel ?? null,
        isFavoriteTrader: Boolean(
          guildPrestige?.favoriteCounterparties.some((entry) => entry.guildTag === counterparty.tag),
        ),
      })),
      offerableItems: offerableItems.map((item) => ({
        id: item.id,
        label: item.itemDefinition.name,
      })),
      offerableResources: offerableResources.map((resource) => ({
        resourceType: resource.resourceType,
        label: getResourceLabel(resource.resourceType),
        amount: resource.amount,
      })),
      requestableItems: requestableItems.map((item) => ({
        id: item.id,
        guildTag: item.guild.tag,
        label: `${item.itemDefinition.name} · ${item.guild.tag}`,
      })),
      requestableResources: requestableResources.map((resource) => ({
        guildTag: resource.guild.tag,
        resourceType: resource.resourceType,
        label: getResourceLabel(resource.resourceType),
        amount: resource.amount,
      })),
      ruleSummary: TRADE_RULE_SUMMARY,
    };
  });
}

export async function equipItemForDemoGuild(input: { heroId: string; itemId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const [hero, item] = await Promise.all([
      tx.hero.findFirst({
        where: { id: input.heroId, guildId: guild.id },
        select: { id: true, name: true, status: true, powerScore: true },
      }),
      tx.inventoryItem.findFirst({
        where: {
          id: input.itemId,
          guildId: guild.id,
          state: InventoryItemState.AVAILABLE,
        },
        select: {
          id: true,
          workshopLevel: true,
          itemDefinition: {
            select: {
              name: true,
              rarity: true,
              equipSlot: true,
              powerScore: true,
              requiredGuildLevel: true,
            },
          },
        },
      }),
    ]);

    if (!hero) {
      throw new Error("Герой не найден.");
    }

    if (hero.status !== HeroStatus.AVAILABLE) {
      throw new Error("Нельзя менять экипировку героя, пока он в экспедиции.");
    }

    if (!item || !item.itemDefinition.equipSlot) {
      throw new Error("Предмет недоступен для экипировки.");
    }

    if (item.itemDefinition.requiredGuildLevel > guild.level) {
      throw new Error("Уровень гильдии ещё недостаточен для этого предмета.");
    }

    const occupiedSlot = await tx.inventoryItem.findFirst({
      where: {
        guildId: guild.id,
        equippedHeroId: hero.id,
        state: InventoryItemState.EQUIPPED,
        itemDefinition: {
          equipSlot: item.itemDefinition.equipSlot,
        },
      },
      select: { id: true },
    });

    if (occupiedSlot) {
      throw new Error("Слот уже занят. Сначала снимите надетый предмет.");
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        state: InventoryItemState.EQUIPPED,
        equippedHeroId: hero.id,
      },
    });

    await tx.hero.update({
      where: { id: hero.id },
      data: {
        powerScore: {
          increment: getEffectiveItemPower({
            basePowerScore: item.itemDefinition.powerScore,
            rarity: item.itemDefinition.rarity,
            workshopLevel: item.workshopLevel,
          }),
        },
      },
    });

    return `${item.itemDefinition.name} экипирован на ${hero.name}.`;
  });
}

export async function unequipItemForDemoGuild(input: { itemId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: {
        id: input.itemId,
        guildId: guild.id,
        state: InventoryItemState.EQUIPPED,
      },
      select: {
        id: true,
        workshopLevel: true,
        itemDefinition: { select: { name: true, powerScore: true, rarity: true } },
        equippedHero: { select: { id: true, name: true, status: true } },
      },
    });

    if (!item || !item.equippedHero) {
      throw new Error("Экипированный предмет не найден.");
    }

    if (item.equippedHero.status !== HeroStatus.AVAILABLE) {
      throw new Error("Нельзя снять предмет с героя, пока он в экспедиции.");
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        state: InventoryItemState.AVAILABLE,
        equippedHeroId: null,
      },
    });

    await tx.hero.update({
      where: { id: item.equippedHero.id },
      data: {
        powerScore: {
          decrement: getEffectiveItemPower({
            basePowerScore: item.itemDefinition.powerScore,
            rarity: item.itemDefinition.rarity,
            workshopLevel: item.workshopLevel,
          }),
        },
      },
    });

    return `${item.itemDefinition.name} снят с ${item.equippedHero.name}.`;
  });
}

export async function upgradeInventoryItemForDemoGuild(input: { itemId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const [state, item, resourceBalances] = await Promise.all([
      loadGuildUpgradeRuntimeStateTx(tx, guild.id),
      tx.inventoryItem.findFirst({
        where: {
          id: input.itemId,
          guildId: guild.id,
        },
        select: {
          id: true,
          state: true,
          boundToGuild: true,
          workshopLevel: true,
          reservedByType: true,
          equippedHero: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          itemDefinition: {
            select: {
              name: true,
              itemType: true,
              rarity: true,
              equipSlot: true,
              powerScore: true,
            },
          },
        },
      }),
      tx.resourceBalance.findMany({
        where: { guildId: guild.id, amount: { gt: 0 } },
        select: {
          resourceType: true,
          amount: true,
        },
      }),
    ]);

    if (!item) {
      throw new Error("Предмет не найден.");
    }

    const plan = buildWorkshopPlan({
      workshopFacilityLevel: state.upgradeLevels[GuildUpgradeType.STORAGE],
      availableGold: state.gold,
      availableResources: buildResourceAvailabilityMap(resourceBalances),
      workshopLevel: item.workshopLevel,
      state: item.state,
      reservedByType: item.reservedByType,
      heroStatus: item.equippedHero?.status ?? null,
      boundToGuild: item.boundToGuild,
      definition: {
        name: item.itemDefinition.name,
        itemType: item.itemDefinition.itemType,
        rarity: item.itemDefinition.rarity,
        equipSlot: item.itemDefinition.equipSlot,
        powerScore: item.itemDefinition.powerScore,
      },
    });

    if (
      !plan.canUpgrade ||
      plan.nextLevel === null ||
      plan.costGold === null ||
      plan.primaryResource === null ||
      plan.resultPowerScore === null
    ) {
      throw new Error(plan.limitationSummary ?? "Workshop-усиление сейчас недоступно.");
    }

    await changeGuildGold(tx, guild.id, -plan.costGold);
    await changeResourceBalance(tx, guild.id, plan.primaryResource, -plan.primaryQuantity);

    if (plan.catalystResource && plan.catalystQuantity > 0) {
      await changeResourceBalance(tx, guild.id, plan.catalystResource, -plan.catalystQuantity);
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        workshopLevel: plan.nextLevel,
        boundToGuild: true,
      },
    });

    if (item.state === InventoryItemState.EQUIPPED && item.equippedHero) {
      await tx.hero.update({
        where: { id: item.equippedHero.id },
        data: {
          powerScore: { increment: plan.powerDelta },
        },
      });
    }

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.WORKSHOP_UPGRADE,
      referenceType: "GUILD",
      referenceId: `workshop:${item.id}:${plan.nextLevel}`,
      goldDelta: -plan.costGold,
      resourceType: plan.primaryResource,
      resourceDelta: -plan.primaryQuantity,
      inventoryItemId: item.id,
    });

    if (plan.catalystResource && plan.catalystQuantity > 0) {
      await createLedgerEntry(tx, {
        guildId: guild.id,
        eventType: EconomyEventType.WORKSHOP_UPGRADE,
        referenceType: "GUILD",
        referenceId: `workshop:${item.id}:${plan.nextLevel}:catalyst`,
        goldDelta: 0,
        resourceType: plan.catalystResource,
        resourceDelta: -plan.catalystQuantity,
        inventoryItemId: item.id,
      });
    }

    const heroSummary = item.equippedHero ? ` ${item.equippedHero.name} получает +${plan.powerDelta} power.` : "";

    return `${item.itemDefinition.name} усилен до ${getWorkshopLevelLabel(plan.nextLevel)}.${heroSummary}`;
  });
}

export async function startExpeditionForDemoGuild(input: {
  locationId: string;
  heroIds: string[];
}) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const heroIds = Array.from(new Set(input.heroIds.filter(Boolean)));

    if (heroIds.length !== EXPEDITION_PARTY_SIZE) {
      throw new Error(`Для запуска нужна партия ровно из ${EXPEDITION_PARTY_SIZE} героев.`);
    }

    const [location, heroes] = await Promise.all([
      tx.location.findFirst({
        where: { id: input.locationId, isEnabled: true },
        select: {
          id: true,
          code: true,
          name: true,
          durationSeconds: true,
          requiredGuildLevel: true,
          recommendedPower: true,
        },
      }),
      tx.hero.findMany({
        where: {
          id: { in: heroIds },
          guildId: guild.id,
          status: HeroStatus.AVAILABLE,
        },
        select: { id: true, name: true, heroClass: true, powerScore: true },
      }),
    ]);

    if (!location) {
      throw new Error("Локация не найдена.");
    }

    if (guild.level < location.requiredGuildLevel) {
      throw new Error("Уровень гильдии ещё недостаточен для этой зоны.");
    }

    if (heroes.length !== EXPEDITION_PARTY_SIZE) {
      throw new Error("Не все выбранные герои сейчас доступны.");
    }

    const baseline = buildExpeditionBaseline({
      location,
      party: heroes.map((hero) => ({ hero })),
    });
    const profile = getLocationProfile(location.code);

    await tx.expedition.create({
      data: {
        guildId: guild.id,
        locationId: location.id,
        status: ExpeditionStatus.ACTIVE,
        startedAt: new Date(),
        endsAt: new Date(Date.now() + location.durationSeconds * 1_000),
        partyPowerSnapshot: baseline.tacticalPower,
        threatScoreSnapshot: baseline.threatScore,
        party: {
          create: heroIds.map((heroId) => ({ heroId })),
        },
      },
    });

    await tx.hero.updateMany({
      where: { id: { in: heroIds } },
      data: { status: HeroStatus.ON_EXPEDITION },
    });

    return `Экспедиция в «${location.name}» (${profile.scenarioLabel}) запущена. Тактический рейтинг ${baseline.tacticalPower} против угрозы ${baseline.threatScore}. Фокус награды: ${profile.rewardFocusLabel}.`;
  });
}

export async function claimExpeditionForDemoGuild(input: { expeditionId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const expedition = await tx.expedition.findFirst({
      where: {
        id: input.expeditionId,
        guildId: guild.id,
        status: ExpeditionStatus.COMPLETED,
      },
      select: {
        id: true,
        rewardGold: true,
        rewardGuildXp: true,
        resultTier: true,
        location: { select: { name: true, code: true } },
        party: {
          select: {
            heroId: true,
            hero: { select: { name: true } },
          },
        },
        rewards: {
          select: {
            rewardType: true,
            quantity: true,
            resourceType: true,
            itemDefinitionId: true,
          },
        },
      },
    });

    if (!expedition) {
      throw new Error("Экспедиция уже не ждёт claim-а.");
    }

    if (expedition.rewardGold > 0) {
      await changeGuildGold(tx, guild.id, expedition.rewardGold);
    }

    if (expedition.rewardGuildXp > 0) {
      await changeGuildXp(tx, guild.id, expedition.rewardGuildXp);
    }

    const heroXpReward =
      getExpeditionHeroXpReward({
        rewardGuildXp: expedition.rewardGuildXp,
        resultTier: expedition.resultTier,
        locationCode: expedition.location.code,
      }) ?? 4;
    const heroProgress = [];

    for (const entry of expedition.party) {
      heroProgress.push(await changeHeroXp(tx, entry.heroId, heroXpReward));
    }

    for (const reward of expedition.rewards) {
      if (reward.rewardType === "RESOURCE" && reward.resourceType) {
        await changeResourceBalance(tx, guild.id, reward.resourceType, reward.quantity);
      }

      if (reward.rewardType === "ITEM" && reward.itemDefinitionId) {
        for (let index = 0; index < reward.quantity; index += 1) {
          await tx.inventoryItem.create({
            data: {
              guildId: guild.id,
              itemDefinitionId: reward.itemDefinitionId,
              state: InventoryItemState.AVAILABLE,
              boundToGuild: false,
            },
          });
        }
      }
    }

    await tx.expedition.update({
      where: { id: expedition.id },
      data: {
        status: ExpeditionStatus.CLAIMED,
        claimedAt: new Date(),
      },
    });

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.EXPEDITION_REWARD,
      referenceType: "EXPEDITION",
      referenceId: expedition.id,
      goldDelta: expedition.rewardGold,
      resourceType: expedition.rewards.find((reward) => reward.resourceType)?.resourceType ?? null,
      resourceDelta: expedition.rewards.find((reward) => reward.resourceType)?.quantity ?? null,
    });

    const levelUps = heroProgress.filter((hero) => hero.levelGain > 0);
    const levelUpSummary =
      levelUps.length > 0
        ? ` Level up: ${levelUps.map((hero) => `${hero.name} → Lv.${hero.nextLevel}`).join(", ")}.`
        : "";

    return `Награды экспедиции «${expedition.location.name}» зачислены. Герои получили по ${heroXpReward} XP. ${getLocationProfile(expedition.location.code).scenarioLabel}: ${getLocationProfile(expedition.location.code).rewardFocusLabel}.${levelUpSummary}`;
  });
}

export async function claimGuildContractRewardForDemoGuild(input: { contractKey: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    if (!isGuildContractKey(input.contractKey)) {
      throw new Error("Контракт не распознан.");
    }

    const definition = GUILD_CONTRACT_DEFINITIONS.find((entry) => entry.key === input.contractKey) ?? null;

    if (!definition) {
      throw new Error("Контракт не найден.");
    }

    const context = await loadGuildContractRuntimeContext(tx, guild.id);
    const contractBoard = buildGuildContractBoardSnapshot(context);
    const entry = contractBoard.entries.find((contract) => contract.key === input.contractKey) ?? null;

    if (!entry) {
      throw new Error("Контракт недоступен.");
    }

    if (entry.status === "claimed") {
      throw new Error("Награда по этому контракту уже забрана.");
    }

    if (entry.status !== "ready") {
      throw new Error(entry.blockers[0] ?? "Контракт ещё не готов к claim.");
    }

    if (definition.reward.gold > 0) {
      await changeGuildGold(tx, guild.id, definition.reward.gold);
    }

    if (definition.reward.guildXp > 0) {
      await changeGuildXp(tx, guild.id, definition.reward.guildXp);
    }

    if (definition.reward.resource) {
      await changeResourceBalance(
        tx,
        guild.id,
        definition.reward.resource.resourceType,
        definition.reward.resource.quantity,
      );
    }

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.CONTRACT_REWARD,
      referenceType: "SYSTEM",
      referenceId: getGuildContractReferenceId(definition.key),
      goldDelta: definition.reward.gold,
      resourceType: definition.reward.resource?.resourceType ?? null,
      resourceDelta: definition.reward.resource?.quantity ?? null,
    });

    return `Награда по контракту «${definition.title}» зачислена: ${formatGuildContractRewardLabels(definition.reward).join(" · ")}.`;
  });
}

export async function claimWorldEventRewardForDemoGuild(input: {
  eventKey: string;
  tierKey: string;
}) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    if (!isWorldEventKey(input.eventKey)) {
      throw new Error("World event не распознан.");
    }

    if (!isWorldEventRewardTierKey(input.tierKey)) {
      throw new Error("Тир seasonal reward не распознан.");
    }

    const tierDefinition = getWorldEventRewardTierDefinition(input.eventKey, input.tierKey);

    if (!tierDefinition) {
      throw new Error("Тир seasonal reward не найден.");
    }

    const claimState = await loadWorldEventClaimStateTx(tx, guild.id);
    const contribution = getWorldEventContributionForGuild(claimState, input.eventKey, guild.id);
    const existingClaim = getWorldEventClaimRecordForGuild(claimState, input.eventKey, guild.id, input.tierKey);

    if (existingClaim) {
      throw new Error("Награда по этому seasonal tier уже забрана.");
    }

    if (contribution.points < tierDefinition.thresholdPoints) {
      throw new Error(`Нужно ещё ${tierDefinition.thresholdPoints - contribution.points} очк. вклада в событие.`);
    }

    if (tierDefinition.reward.gold > 0) {
      await changeGuildGold(tx, guild.id, tierDefinition.reward.gold);
    }

    if (tierDefinition.reward.guildXp > 0) {
      await changeGuildXp(tx, guild.id, tierDefinition.reward.guildXp);
    }

    if (tierDefinition.reward.resource) {
      await changeResourceBalance(
        tx,
        guild.id,
        tierDefinition.reward.resource.resourceType,
        tierDefinition.reward.resource.quantity,
      );
    }

    const season = getCurrentWorldEventSeasonSnapshot();
    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.WORLD_EVENT_REWARD,
      referenceType: "SYSTEM",
      referenceId: buildWorldEventRewardReferenceId(season.key, input.eventKey, input.tierKey),
      goldDelta: tierDefinition.reward.gold,
      resourceType: tierDefinition.reward.resource?.resourceType ?? null,
      resourceDelta: tierDefinition.reward.resource?.quantity ?? null,
    });

    const eventLabel =
      input.eventKey === "frontier-surge"
        ? "Frontier Surge"
        : input.eventKey === "trade-convoy"
          ? "Trade Convoy"
          : "Forge Drive";

    return `Награда ${tierDefinition.label} по событию «${eventLabel}» зачислена: ${buildWorldEventRewardLabels(tierDefinition.reward).join(" · ")}.`;
  });
}

export async function recruitHeroForDemoGuild(input: { candidateKey: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const [freshGuild, heroCount, heroSlotsUpgrade] = await Promise.all([
      tx.guild.findUnique({
        where: { id: guild.id },
        select: { id: true, gold: true, level: true, activeHeroSlots: true },
      }),
      tx.hero.count({ where: { guildId: guild.id } }),
      tx.guildUpgrade.findUnique({
        where: {
          guildId_upgradeType: {
            guildId: guild.id,
            upgradeType: GuildUpgradeType.HERO_SLOTS,
          },
        },
        select: { level: true },
      }),
    ]);

    if (!freshGuild) {
      throw new Error("Гильдия не найдена.");
    }

    const candidates = getRecruitmentBoard({
      heroCount,
      heroSlotUpgradeLevel: heroSlotsUpgrade?.level ?? 0,
      guildLevel: freshGuild.level,
    });
    const candidate = candidates.find((entry) => entry.key === input.candidateKey);

    if (!candidate) {
      throw new Error("Этот рекрут уже ушёл с доски найма. Обновите экран таверны.");
    }

    if (heroCount >= freshGuild.activeHeroSlots) {
      throw new Error("Все hero slots заняты. Сначала купите апгрейд ростера.");
    }

    if (freshGuild.gold < HERO_RECRUITMENT_COST_GOLD) {
      throw new Error("Не хватает золота на найм героя.");
    }

    await changeGuildGold(tx, guild.id, -HERO_RECRUITMENT_COST_GOLD);

    await tx.hero.create({
      data: {
        guildId: guild.id,
        name: candidate.name,
        heroClass: candidate.heroClass,
        level: candidate.level,
        heroXp: candidate.heroXp,
        rarity: candidate.rarity,
        status: HeroStatus.AVAILABLE,
        powerScore: candidate.powerScore,
      },
    });

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.HERO_RECRUITMENT,
      referenceType: "GUILD",
      referenceId: `${guild.id}:recruit:${candidate.key}`,
      goldDelta: -HERO_RECRUITMENT_COST_GOLD,
    });

    return `Нанят ${candidate.name}. Ростер: ${heroCount + 1}/${freshGuild.activeHeroSlots}. Новый резерв закрывает профиль «${candidate.zoneFocusLabel}».`;
  });
}

export async function purchaseHeroSlotsUpgradeForDemoGuild() {
  return purchaseGuildUpgradeForDemoGuild(GuildUpgradeType.HERO_SLOTS);
}

function getGuildUpgradePurchaseSuccessMessage(
  upgradeType: ManagedGuildUpgradeType,
  state: GuildUpgradeRuntimeState,
) {
  if (upgradeType === GuildUpgradeType.HERO_SLOTS) {
    return `Куплено улучшение hero slots. Новый лимит ростера: ${state.heroSlots + 1}.`;
  }

  if (upgradeType === GuildUpgradeType.MARKET_SLOTS) {
    return `Куплено улучшение рынка. Новый лимит слотов: ${state.marketSlots + 1}.`;
  }

  if (upgradeType === GuildUpgradeType.STORAGE) {
    const nextLevel = state.upgradeLevels[GuildUpgradeType.STORAGE] + 1;

    return nextLevel === 1
      ? "Workshop открыт. Теперь можно усиливать экипировку до item tier 1."
      : `Workshop улучшен до tier ${nextLevel}. Новый лимит усиления предметов: tier ${nextLevel}.`;
  }

  return `Куплено улучшение trade slots. Новый лимит исходящих офферов: ${state.tradeSlots + 1}.`;
}

export async function purchaseGuildUpgradeForDemoGuild(upgradeType: ManagedGuildUpgradeType) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const state = await loadGuildUpgradeRuntimeStateTx(tx, guild.id);
    const nextTier = getNextGuildUpgradeTier(upgradeType, state.upgradeLevels[upgradeType]);

    if (!nextTier) {
      throw new Error(`Лимит ${GUILD_UPGRADE_DEFINITIONS[upgradeType].title.toLowerCase()} уже достигнут в рамках MVP.`);
    }

    const structuralBlockers = collectGuildUpgradeBlockers(upgradeType, state, nextTier);

    if (structuralBlockers.length > 0) {
      throw new Error(structuralBlockers[0] ?? "Апгрейд пока недоступен.");
    }

    if (state.gold < nextTier.costGold) {
      throw new Error("Не хватает золота на апгрейд гильдии.");
    }

    await changeGuildGold(tx, guild.id, -nextTier.costGold);

    if (upgradeType === GuildUpgradeType.HERO_SLOTS) {
      await tx.guild.update({
        where: { id: guild.id },
        data: { activeHeroSlots: { increment: 1 } },
      });
    }

    if (upgradeType === GuildUpgradeType.MARKET_SLOTS) {
      await tx.guild.update({
        where: { id: guild.id },
        data: { marketSlotsBase: { increment: 1 } },
      });
    }

    await tx.guildUpgrade.upsert({
      where: {
        guildId_upgradeType: {
          guildId: guild.id,
          upgradeType,
        },
      },
      update: {
        level: nextTier.level,
        purchasedAt: new Date(),
      },
      create: {
        guildId: guild.id,
        upgradeType,
        level: nextTier.level,
      },
    });

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.GUILD_UPGRADE_PURCHASE,
      referenceType: "GUILD_UPGRADE",
      referenceId: `${guild.id}:${upgradeType}:${nextTier.level}`,
      goldDelta: -nextTier.costGold,
    });

    return getGuildUpgradePurchaseSuccessMessage(upgradeType, state);
  });
}

export async function createMarketListingForDemoGuild(input: {
  listingType: ListingType;
  inventoryItemId?: string | null;
  resourceType?: ResourceType | null;
  quantity: number;
  totalPriceGold: number;
}) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    if (!guild.marketUnlockedAt) {
      throw new Error("Рынок ещё не открыт.");
    }

    const activeListings = await tx.marketListing.count({
      where: {
        sellerGuildId: guild.id,
        status: MarketListingStatus.ACTIVE,
      },
    });

    if (activeListings >= guild.marketSlotsBase) {
      throw new Error("Все слоты заняты. Отмените лот или купите апгрейд слотов.");
    }

    await changeGuildGold(tx, guild.id, -MARKET_LISTING_FEE_GOLD);

    if (input.listingType === ListingType.ITEM) {
      if (!input.inventoryItemId) {
        throw new Error("Выберите предмет для листинга.");
      }

      const item = await tx.inventoryItem.findFirst({
        where: {
          id: input.inventoryItemId,
          guildId: guild.id,
          state: InventoryItemState.AVAILABLE,
          boundToGuild: false,
          itemDefinition: {
            isTradable: true,
            isStarterLocked: false,
          },
        },
        select: {
          id: true,
          itemDefinitionId: true,
          itemDefinition: {
            select: {
              name: true,
              vendorBasePrice: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Предмет недоступен для продажи.");
      }

      validateListingPrice({
        listingType: ListingType.ITEM,
        totalPriceGold: input.totalPriceGold,
        quantity: 1,
        vendorBasePrice: item.itemDefinition.vendorBasePrice,
      });

      const listing = await tx.marketListing.create({
        data: {
          sellerGuildId: guild.id,
          listingType: ListingType.ITEM,
          inventoryItemId: item.id,
          itemDefinitionId: item.itemDefinitionId,
          quantity: 1,
          totalPriceGold: input.totalPriceGold,
          listingFeeGold: MARKET_LISTING_FEE_GOLD,
          expiresAt: new Date(Date.now() + MARKET_LISTING_DURATION_HOURS * 60 * 60 * 1_000),
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          state: InventoryItemState.RESERVED,
          reservedByType: ReservationType.MARKET,
          reservedById: listing.id,
        },
      });

      await createLedgerEntry(tx, {
        guildId: guild.id,
        eventType: EconomyEventType.MARKET_LISTING_FEE,
        referenceType: "MARKET_LISTING",
        referenceId: listing.id,
        goldDelta: -MARKET_LISTING_FEE_GOLD,
      });

      return `${item.itemDefinition.name} выставлен на рынок.`;
    }

    if (!input.resourceType) {
      throw new Error("Выберите ресурс для листинга.");
    }

    const quantity = toPositiveInt(input.quantity);

    if (quantity <= 0) {
      throw new Error("Количество ресурса должно быть больше нуля.");
    }

    validateListingPrice({
      listingType: ListingType.RESOURCE,
      totalPriceGold: input.totalPriceGold,
      quantity,
      resourceType: input.resourceType,
    });

    await changeResourceBalance(tx, guild.id, input.resourceType, -quantity);

    const listing = await tx.marketListing.create({
      data: {
        sellerGuildId: guild.id,
        listingType: ListingType.RESOURCE,
        resourceType: input.resourceType,
        quantity,
        totalPriceGold: input.totalPriceGold,
        listingFeeGold: MARKET_LISTING_FEE_GOLD,
        expiresAt: new Date(Date.now() + MARKET_LISTING_DURATION_HOURS * 60 * 60 * 1_000),
      },
    });

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.MARKET_LISTING_FEE,
      referenceType: "MARKET_LISTING",
      referenceId: listing.id,
      goldDelta: -MARKET_LISTING_FEE_GOLD,
      resourceType: input.resourceType,
      resourceDelta: -quantity,
    });

    return `${getResourceLabel(input.resourceType)} выставлен на рынок.`;
  });
}

export async function buyMarketListingForDemoGuild(input: { listingId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketListing.findFirst({
      where: {
        id: input.listingId,
        status: MarketListingStatus.ACTIVE,
      },
      select: {
        id: true,
        sellerGuildId: true,
        listingType: true,
        inventoryItemId: true,
        resourceType: true,
        quantity: true,
        totalPriceGold: true,
        itemDefinition: { select: { name: true } },
      },
    });

    if (!listing) {
      throw new Error("Лот уже недоступен.");
    }

    if (listing.sellerGuildId === guild.id) {
      throw new Error("Нельзя купить собственный лот.");
    }

    await changeGuildGold(tx, guild.id, -listing.totalPriceGold);

    const saleTaxGold = Math.ceil(listing.totalPriceGold * MARKET_SALE_TAX_RATE);
    const sellerPayout = listing.totalPriceGold - saleTaxGold;

    if (listing.listingType === ListingType.ITEM && listing.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: listing.inventoryItemId },
        data: {
          guildId: guild.id,
          state: InventoryItemState.AVAILABLE,
          reservedByType: null,
          reservedById: null,
        },
      });
    }

    if (listing.listingType === ListingType.RESOURCE && listing.resourceType) {
      await changeResourceBalance(tx, guild.id, listing.resourceType, listing.quantity);
    }

    await tx.marketListing.update({
      where: { id: listing.id },
      data: {
        buyerGuildId: guild.id,
        status: MarketListingStatus.SOLD,
        soldAt: new Date(),
        saleTaxGold,
      },
    });

    await tx.marketClaim.create({
      data: {
        guildId: listing.sellerGuildId,
        listingId: listing.id,
        sourceType: MarketClaimSourceType.SOLD_LISTING,
        claimType: MarketClaimType.GOLD,
        goldAmount: sellerPayout,
      },
    });

    return `${listing.itemDefinition?.name ?? getResourceLabel(listing.resourceType)} куплен.`;
  });
}

export async function cancelMarketListingForDemoGuild(input: { listingId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketListing.findFirst({
      where: {
        id: input.listingId,
        sellerGuildId: guild.id,
        status: MarketListingStatus.ACTIVE,
      },
      select: {
        id: true,
        listingType: true,
        inventoryItemId: true,
        resourceType: true,
        quantity: true,
        itemDefinition: { select: { name: true } },
      },
    });

    if (!listing) {
      throw new Error("Активный лот не найден.");
    }

    await tx.marketListing.update({
      where: { id: listing.id },
      data: { status: MarketListingStatus.CANCELLED },
    });

    if (listing.listingType === ListingType.ITEM && listing.inventoryItemId) {
      await tx.marketClaim.create({
        data: {
          guildId: guild.id,
          listingId: listing.id,
          sourceType: MarketClaimSourceType.CANCELLED_LISTING,
          claimType: MarketClaimType.ITEM,
          inventoryItemId: listing.inventoryItemId,
          quantity: 1,
        },
      });

      return `${listing.itemDefinition?.name ?? "Предмет"} отправлен в claim box.`;
    }

    if (!listing.resourceType) {
      throw new Error("У лота отсутствует payload.");
    }

    await tx.marketClaim.create({
      data: {
        guildId: guild.id,
        listingId: listing.id,
        sourceType: MarketClaimSourceType.CANCELLED_LISTING,
        claimType: MarketClaimType.RESOURCE,
        resourceType: listing.resourceType,
        quantity: listing.quantity,
      },
    });

    return `${getResourceLabel(listing.resourceType)} возвращён в claim box.`;
  });
}

export async function claimMarketClaimForDemoGuild(input: { claimId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const claim = await tx.marketClaim.findFirst({
      where: {
        id: input.claimId,
        guildId: guild.id,
        status: MarketClaimStatus.PENDING,
      },
      select: {
        id: true,
        sourceType: true,
        buyOrderId: true,
        claimType: true,
        goldAmount: true,
        resourceType: true,
        quantity: true,
        inventoryItemId: true,
        inventoryItem: { select: { itemDefinition: { select: { name: true } } } },
      },
    });

    if (!claim) {
      throw new Error("Claim уже недоступен.");
    }

    const eventType = isBuyOrderClaimSourceType(claim.sourceType)
      ? EconomyEventType.BUY_ORDER_CLAIM
      : EconomyEventType.MARKET_CLAIM;
    const referenceType = claim.buyOrderId ? "BUY_ORDER" : "MARKET_CLAIM";
    const referenceId = claim.buyOrderId ?? claim.id;

    if (claim.claimType === MarketClaimType.GOLD && claim.goldAmount) {
      await changeGuildGold(tx, guild.id, claim.goldAmount);
      await createLedgerEntry(tx, {
        guildId: guild.id,
        eventType,
        referenceType,
        referenceId,
        goldDelta: claim.goldAmount,
      });
    }

    if (claim.claimType === MarketClaimType.RESOURCE && claim.resourceType) {
      await changeResourceBalance(tx, guild.id, claim.resourceType, claim.quantity);
      await createLedgerEntry(tx, {
        guildId: guild.id,
        eventType,
        referenceType,
        referenceId,
        goldDelta: 0,
        resourceType: claim.resourceType,
        resourceDelta: claim.quantity,
      });
    }

    if (claim.claimType === MarketClaimType.ITEM && claim.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: claim.inventoryItemId },
        data: {
          guildId: guild.id,
          state: InventoryItemState.AVAILABLE,
          reservedByType: null,
          reservedById: null,
        },
      });
    }

    await tx.marketClaim.update({
      where: { id: claim.id },
      data: {
        status: MarketClaimStatus.CLAIMED,
        claimedAt: new Date(),
      },
    });

    return `${claim.inventoryItem?.itemDefinition.name ?? claim.goldAmount ?? claim.quantity} получено из claim box.`;
  });
}

export async function createBuyOrderForDemoGuild(input: {
  resourceType: ResourceType;
  quantity: number;
  totalPriceGold: number;
}) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    if (!guild.marketUnlockedAt) {
      throw new Error("Рынок ещё не открыт.");
    }

    const quantity = toPositiveInt(input.quantity);

    if (quantity <= 0) {
      throw new Error("Количество ресурса в заявке должно быть больше нуля.");
    }

    validateBuyOrderPrice({
      resourceType: input.resourceType,
      totalPriceGold: input.totalPriceGold,
      quantity,
    });

    await changeGuildGold(tx, guild.id, -input.totalPriceGold);

    const order = await tx.buyOrder.create({
      data: {
        buyerGuildId: guild.id,
        resourceType: input.resourceType,
        quantity,
        totalPriceGold: input.totalPriceGold,
        expiresAt: new Date(Date.now() + BUY_ORDER_DURATION_HOURS * 60 * 60 * 1_000),
      },
    });

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.BUY_ORDER_POSTED,
      referenceType: "BUY_ORDER",
      referenceId: order.id,
      goldDelta: -input.totalPriceGold,
      resourceType: input.resourceType,
    });

    return `Заявка на ${quantity} × ${getResourceLabel(input.resourceType)} опубликована.`;
  });
}

export async function fulfillBuyOrderForDemoGuild(input: { orderId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const order = await tx.buyOrder.findFirst({
      where: {
        id: input.orderId,
        status: BuyOrderStatus.ACTIVE,
      },
      select: {
        id: true,
        buyerGuildId: true,
        resourceType: true,
        quantity: true,
        totalPriceGold: true,
        buyerGuild: { select: { name: true, tag: true } },
      },
    });

    if (!order) {
      throw new Error("Заявка уже недоступна.");
    }

    if (order.buyerGuildId === guild.id) {
      throw new Error("Нельзя исполнить собственную заявку.");
    }

    await changeResourceBalance(tx, guild.id, order.resourceType, -order.quantity);
    await changeResourceBalance(tx, order.buyerGuildId, order.resourceType, order.quantity);

    await tx.buyOrder.update({
      where: { id: order.id },
      data: {
        status: BuyOrderStatus.FULFILLED,
        fulfillerGuildId: guild.id,
        fulfilledAt: new Date(),
      },
    });

    await tx.marketClaim.create({
      data: {
        guildId: guild.id,
        buyOrderId: order.id,
        sourceType: MarketClaimSourceType.FILLED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
        goldAmount: order.totalPriceGold,
      },
    });

    await createLedgerEntry(tx, {
      guildId: order.buyerGuildId,
      eventType: EconomyEventType.BUY_ORDER_FILLED,
      referenceType: "BUY_ORDER",
      referenceId: order.id,
      goldDelta: 0,
      resourceType: order.resourceType,
      resourceDelta: order.quantity,
      counterpartyGuildId: guild.id,
    });

    return `Заявка ${order.buyerGuild.name} [${order.buyerGuild.tag}] исполнена.`;
  });
}

export async function cancelBuyOrderForDemoGuild(input: { orderId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const order = await tx.buyOrder.findFirst({
      where: {
        id: input.orderId,
        buyerGuildId: guild.id,
        status: BuyOrderStatus.ACTIVE,
      },
      select: {
        id: true,
        resourceType: true,
        quantity: true,
        totalPriceGold: true,
      },
    });

    if (!order) {
      throw new Error("Активная заявка не найдена.");
    }

    await tx.buyOrder.update({
      where: { id: order.id },
      data: { status: BuyOrderStatus.CANCELLED },
    });

    await tx.marketClaim.create({
      data: {
        guildId: guild.id,
        buyOrderId: order.id,
        sourceType: MarketClaimSourceType.CANCELLED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
        goldAmount: order.totalPriceGold,
      },
    });

    return `Заявка на ${order.quantity} × ${getResourceLabel(order.resourceType)} отправлена в refund-flow.`;
  });
}

export async function createTradeOfferForDemoGuild(input: {
  receiverGuildTag: string;
  message?: string | null;
  offeredItemId?: string | null;
  offeredResourceType?: ResourceType | null;
  offeredQuantity?: number;
  requestedItemId?: string | null;
  requestedResourceType?: ResourceType | null;
  requestedQuantity?: number;
}) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    if (!guild.tradeUnlockedAt) {
      throw new Error("Приватные сделки ещё не открыты.");
    }

    const [activeOutgoingCount, tradeUpgrade, receiver] = await Promise.all([
      tx.tradeOffer.count({
        where: {
          senderGuildId: guild.id,
          status: TradeOfferStatus.PENDING,
        },
      }),
      tx.guildUpgrade.findUnique({
        where: {
          guildId_upgradeType: {
            guildId: guild.id,
            upgradeType: GuildUpgradeType.TRADE_SLOTS,
          },
        },
        select: { level: true },
      }),
      tx.guild.findFirst({
        where: { tag: input.receiverGuildTag },
        select: {
          id: true,
          name: true,
          tag: true,
          tradeUnlockedAt: true,
        },
      }),
    ]);

    const tradeSlotLimit = getTradeSlotLimitFromUpgradeLevel(tradeUpgrade?.level ?? 0);

    if (activeOutgoingCount >= tradeSlotLimit) {
      throw new Error(`Все trade slots заняты (${activeOutgoingCount}/${tradeSlotLimit}). Дождитесь ответа или купите апгрейд.`);
    }

    if (!receiver) {
      throw new Error("Контрагент не найден.");
    }

    if (receiver.id === guild.id) {
      throw new Error("Нельзя отправить сделку самому себе.");
    }

    if (!receiver.tradeUnlockedAt) {
      throw new Error("У выбранной гильдии сделки ещё не разблокированы.");
    }

    const hasOfferedItem = Boolean(input.offeredItemId);
    const hasOfferedResource = Boolean(input.offeredResourceType);
    const hasRequestedItem = Boolean(input.requestedItemId);
    const hasRequestedResource = Boolean(input.requestedResourceType);

    if (hasOfferedItem === hasOfferedResource) {
      throw new Error("Нужно выбрать ровно один тип того, что вы отдаёте.");
    }

    if (hasRequestedItem === hasRequestedResource) {
      throw new Error("Нужно выбрать ровно один тип того, что вы хотите получить.");
    }

    const offer = await tx.tradeOffer.create({
      data: {
        senderGuildId: guild.id,
        receiverGuildId: receiver.id,
        message: readOptionalText(input.message),
        expiresAt: new Date(Date.now() + TRADE_OFFER_DURATION_HOURS * 60 * 60 * 1_000),
      },
    });

    if (input.offeredItemId) {
      const item = await tx.inventoryItem.findFirst({
        where: {
          id: input.offeredItemId,
          guildId: guild.id,
          state: InventoryItemState.AVAILABLE,
          boundToGuild: false,
          itemDefinition: {
            isTradable: true,
            isStarterLocked: false,
          },
        },
        select: { id: true, itemDefinition: { select: { name: true } } },
      });

      if (!item) {
        throw new Error("Выбранный предмет уже нельзя отправить в сделке.");
      }

      await tx.tradeOfferItem.create({
        data: {
          tradeOfferId: offer.id,
          side: TradeOfferSide.OFFERED,
          inventoryItemId: item.id,
          quantity: 1,
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          state: InventoryItemState.RESERVED,
          reservedByType: ReservationType.TRADE,
          reservedById: offer.id,
        },
      });
    }

    if (input.offeredResourceType) {
      const quantity = toPositiveInt(input.offeredQuantity ?? 0);

      if (quantity <= 0) {
        throw new Error("Количество предлагаемого ресурса должно быть больше нуля.");
      }

      await changeResourceBalance(tx, guild.id, input.offeredResourceType, -quantity);

      await tx.tradeOfferItem.create({
        data: {
          tradeOfferId: offer.id,
          side: TradeOfferSide.OFFERED,
          resourceType: input.offeredResourceType,
          quantity,
        },
      });
    }

    if (input.requestedItemId) {
      const item = await tx.inventoryItem.findFirst({
        where: {
          id: input.requestedItemId,
          guildId: receiver.id,
          state: InventoryItemState.AVAILABLE,
          boundToGuild: false,
          itemDefinition: {
            isTradable: true,
            isStarterLocked: false,
          },
        },
        select: { id: true },
      });

      if (!item) {
        throw new Error("Контрагент уже не владеет выбранным предметом.");
      }

      await tx.tradeOfferItem.create({
        data: {
          tradeOfferId: offer.id,
          side: TradeOfferSide.REQUESTED,
          inventoryItemId: item.id,
          quantity: 1,
        },
      });
    }

    if (input.requestedResourceType) {
      const quantity = toPositiveInt(input.requestedQuantity ?? 0);

      if (quantity <= 0) {
        throw new Error("Количество запрашиваемого ресурса должно быть больше нуля.");
      }

      const balance = await tx.resourceBalance.findUnique({
        where: {
          guildId_resourceType: {
            guildId: receiver.id,
            resourceType: input.requestedResourceType,
          },
        },
        select: { amount: true },
      });

      if (!balance || balance.amount < quantity) {
        throw new Error("У контрагента уже не хватает выбранного ресурса.");
      }

      await tx.tradeOfferItem.create({
        data: {
          tradeOfferId: offer.id,
          side: TradeOfferSide.REQUESTED,
          resourceType: input.requestedResourceType,
          quantity,
        },
      });
    }

    return `Сделка отправлена в ${receiver.name} [${receiver.tag}].`;
  });
}

async function transferInventoryItem(
  tx: TransactionClient,
  itemId: string,
  expectedGuildId: string,
  nextGuildId: string,
  expectedState: InventoryItemState,
  reservationId?: string,
) {
  const item = await tx.inventoryItem.findFirst({
    where: {
      id: itemId,
      guildId: expectedGuildId,
      state: expectedState,
    },
    select: { id: true },
  });

  if (!item) {
    return false;
  }

  await tx.inventoryItem.update({
    where: { id: itemId },
    data: {
      guildId: nextGuildId,
      state: InventoryItemState.AVAILABLE,
      reservedByType: reservationId ? null : undefined,
      reservedById: reservationId ? null : undefined,
    },
  });

  return true;
}

export async function acceptTradeOfferForDemoGuild(input: { offerId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const offer = await tx.tradeOffer.findFirst({
      where: {
        id: input.offerId,
        receiverGuildId: guild.id,
        status: TradeOfferStatus.PENDING,
      },
      select: {
        id: true,
        senderGuildId: true,
        items: {
          select: {
            side: true,
            inventoryItemId: true,
            resourceType: true,
            quantity: true,
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Сделка уже недоступна.");
    }

    const offered = offer.items.filter((item) => item.side === TradeOfferSide.OFFERED);
    const requested = offer.items.filter((item) => item.side === TradeOfferSide.REQUESTED);

    for (const item of requested) {
      if (item.inventoryItemId) {
        const exists = await tx.inventoryItem.findFirst({
          where: {
            id: item.inventoryItemId,
            guildId: guild.id,
            state: InventoryItemState.AVAILABLE,
          },
          select: { id: true },
        });

        if (!exists) {
          await invalidateTradeOffer(tx, offer);
          return "Сделка была инвалидирована: у получателя больше нет запрошенного предмета.";
        }
      }

      if (item.resourceType) {
        const balance = await tx.resourceBalance.findUnique({
          where: {
            guildId_resourceType: {
              guildId: guild.id,
              resourceType: item.resourceType,
            },
          },
          select: { amount: true },
        });

        if (!balance || balance.amount < item.quantity) {
          await invalidateTradeOffer(tx, offer);
          return "Сделка была инвалидирована: у получателя больше не хватает запрошенного ресурса.";
        }
      }
    }

    for (const item of offered) {
      if (item.inventoryItemId) {
        const transferred = await transferInventoryItem(
          tx,
          item.inventoryItemId,
          offer.senderGuildId,
          guild.id,
          InventoryItemState.RESERVED,
          offer.id,
        );

        if (!transferred) {
          await invalidateTradeOffer(tx, offer);
          return "Сделка была инвалидирована: у отправителя больше нет предложенного предмета.";
        }
      }

      if (item.resourceType) {
        await changeResourceBalance(tx, guild.id, item.resourceType, item.quantity);
      }
    }

    for (const item of requested) {
      if (item.inventoryItemId) {
        const transferred = await transferInventoryItem(
          tx,
          item.inventoryItemId,
          guild.id,
          offer.senderGuildId,
          InventoryItemState.AVAILABLE,
        );

        if (!transferred) {
          await invalidateTradeOffer(tx, offer);
          return "Сделка была инвалидирована: запрошенный предмет стал недоступен.";
        }
      }

      if (item.resourceType) {
        await changeResourceBalance(tx, guild.id, item.resourceType, -item.quantity);
        await changeResourceBalance(tx, offer.senderGuildId, item.resourceType, item.quantity);
      }
    }

    await tx.tradeOffer.update({
      where: { id: offer.id },
      data: {
        status: TradeOfferStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    await createLedgerEntry(tx, {
      guildId: guild.id,
      eventType: EconomyEventType.TRADE_COMPLETED,
      referenceType: "TRADE_OFFER",
      referenceId: offer.id,
      goldDelta: 0,
      resourceType: offered.find((item) => item.resourceType)?.resourceType ?? null,
      resourceDelta: offered.find((item) => item.resourceType)?.quantity ?? null,
      counterpartyGuildId: offer.senderGuildId,
    });

    await createLedgerEntry(tx, {
      guildId: offer.senderGuildId,
      eventType: EconomyEventType.TRADE_COMPLETED,
      referenceType: "TRADE_OFFER",
      referenceId: offer.id,
      goldDelta: 0,
      resourceType: requested.find((item) => item.resourceType)?.resourceType ?? null,
      resourceDelta: requested.find((item) => item.resourceType)?.quantity ?? null,
      counterpartyGuildId: guild.id,
    });

    return "Сделка успешно завершена.";
  });
}

export async function rejectTradeOfferForDemoGuild(input: { offerId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const offer = await tx.tradeOffer.findFirst({
      where: {
        id: input.offerId,
        receiverGuildId: guild.id,
        status: TradeOfferStatus.PENDING,
      },
      select: {
        id: true,
        senderGuildId: true,
        items: {
          select: {
            side: true,
            inventoryItemId: true,
            resourceType: true,
            quantity: true,
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Сделка уже недоступна.");
    }

    await releaseTradeOfferAssets(tx, offer);

    await tx.tradeOffer.update({
      where: { id: offer.id },
      data: {
        status: TradeOfferStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    return "Сделка отклонена.";
  });
}

export async function cancelTradeOfferForDemoGuild(input: { offerId: string }) {
  const guild = await getFreshDemoGuild();
  await runLazyMaintenance(guild.id);

  return prisma.$transaction(async (tx) => {
    const offer = await tx.tradeOffer.findFirst({
      where: {
        id: input.offerId,
        senderGuildId: guild.id,
        status: TradeOfferStatus.PENDING,
      },
      select: {
        id: true,
        senderGuildId: true,
        items: {
          select: {
            side: true,
            inventoryItemId: true,
            resourceType: true,
            quantity: true,
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Исходящий оффер уже недоступен.");
    }

    await releaseTradeOfferAssets(tx, offer);

    await tx.tradeOffer.update({
      where: { id: offer.id },
      data: {
        status: TradeOfferStatus.CANCELLED,
        respondedAt: new Date(),
      },
    });

    return "Сделка отменена.";
  });
}

export async function purchaseMarketSlotsUpgradeForDemoGuild() {
  return purchaseGuildUpgradeForDemoGuild(GuildUpgradeType.MARKET_SLOTS);
}

export async function getGuildDirectoryPageData(): Promise<FoundationResult<GuildDirectoryPageData>> {
  return withGameQuery(async () => loadGuildDirectoryPageData());
}

export async function getGuildPublicProfilePageData(
  guildTag: string,
): Promise<FoundationResult<GuildPublicProfilePageData>> {
  return withGameQuery(async () => loadGuildPublicProfilePageData(guildTag));
}
