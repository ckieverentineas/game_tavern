export const APP_NAME = "Guild Exchange";
export const FOUNDATION_STAGE_LABEL = "Local alpha / demo sandbox";

export const DEMO_GUILD_NAME = "Dawn Ledger";
export const DEMO_GUILD_TAG = "DEMO";
export const DEMO_USER_EMAIL = "demo@guild.exchange";

export const RIVAL_GUILD_NAME = "Ashen Union";
export const RIVAL_GUILD_TAG = "RIVL";
export const RIVAL_USER_EMAIL = "rival@guild.exchange";

export const CINDER_GUILD_TAG = "CNDR";
export const MOSS_GUILD_TAG = "MOSS";

export const MANAGED_DEMO_GUILD_TAGS = [
  DEMO_GUILD_TAG,
  RIVAL_GUILD_TAG,
  CINDER_GUILD_TAG,
  MOSS_GUILD_TAG,
] as const;
export type ManagedDemoGuildTag = (typeof MANAGED_DEMO_GUILD_TAGS)[number];

export const MANAGED_DEMO_GUILD_FOCUS_LABELS: Record<ManagedDemoGuildTag, string> = {
  DEMO: "Trusted house baseline: рынок, контракты, courier aid, ally endorsements и rivalry-lite already readable.",
  RIVL: "Demand broker: плотный рынок, закрытие buy orders и мягкий rivalry pressure на соседей.",
  CNDR: "Elite explorers: high-risk PvE, public prestige, soft guild aid memory и status endorsements от знакомых домов.",
  MOSS: "Rising guild: молодой публичный профиль, mutual endorsements и friendly courier support от знакомых домов.",
};

export const APP_NAVIGATION = [
  {
    href: "/",
    label: "Обзор",
    description: "Signup/login, личная гильдия и demo sandbox в одной входной точке.",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Главный экран metaprogression: facilities, unlock-цепочки, sinks и ближайшие milestones.",
  },
  {
    href: "/guilds",
    label: "Гильдии",
    description: "Публичный каталог гильдий, каталог игроков и лидерборды поверх текущей экономики и PvE.",
  },
  {
    href: "/heroes",
    label: "Герои",
    description: "Ростер, hero slots, таверна найма и реальная экипировка поверх инвентаря.",
  },
  {
    href: "/expedition",
    label: "Экспедиции",
    description: "Запуск забегов, lazy resolution и claim наград.",
  },
  {
    href: "/inventory",
    label: "Инвентарь",
    description: "Ресурсы, предметы, статусы и пригодность к трейду.",
  },
  {
    href: "/market",
    label: "Рынок",
    description: "Fixed-price marketplace, покупка, отмена и claim box.",
  },
  {
    href: "/deals",
    label: "Сделки",
    description: "Адресные barter-сделки: create, accept, reject, cancel.",
  },
] as const;

export const STARTER_ARCHETYPES = [
  {
    heroClass: "VANGUARD",
    label: "Авангард",
    name: "Brakka Ironwall",
    role: "Фронтлайн и контроль риска группы.",
    description:
      "Служит опорой для всей партии и задаёт минимальный power floor для безопасных экспедиций.",
  },
  {
    heroClass: "RANGER",
    label: "Следопыт",
    name: "Sylva Reed",
    role: "Стабильный урон и трофейная добыча.",
    description:
      "Нужен для перехода к будущим loot-ориентированным маршрутам и нише торговца-фармера.",
  },
  {
    heroClass: "MYSTIC",
    label: "Мистик",
    name: "Mira Vale",
    role: "Поддержка, контроль рисков и редкие материалы.",
    description:
      "Закладывает основу для более дорогих зон, редких ресурсов и систем апгрейдов post-foundation.",
  },
] as const;

export const FOUNDATION_CHECKLIST = [
  "Есть локальный credentials auth: signup/login создают и восстанавливают реальную cookie-based session.",
  "Signup сразу поднимает личную стартовую гильдию с ростером, ресурсами, предметами и unlock-ами.",
  "Demo sandbox сохраняет managed guild switching для локальной отладки и двухсторонней проверки экономики.",
  "Экспедиции запускаются, лениво завершаются и выдают реальные награды.",
  "Инвентарь, экипировка, рынок и приватные сделки работают сквозным loop-ом.",
  "Claim box обслуживает рыночные возвраты и выручку без сложного inbox слоя.",
  "Рост гильдии собирается в общий metaprogression board через hero / market / trade slots.",
  "Unlock-цепочки связывают guild level, recruit quality, второй состав и social/economy каналы.",
] as const;

export const FOUNDATION_BOUNDARIES = [
  "Auth остаётся минимальным: без OAuth, email verification, password reset, RBAC и admin panel.",
  "Нет realtime, PvP, чата, аукциона со ставками и сложной боевой симуляции.",
  "Нет отдельного worker: timed-системы обслуживаются lazy-resolution логикой в рамках запросов.",
  "Нет post-MVP крафта и глубокой антифрод-админки сверх базового ledger / audit слоя.",
] as const;

export const MARKET_RULE_SUMMARY = [
  "Формат рынка для MVP — фиксированная цена без частичного выкупа стека.",
  "Лоты бывают ITEM и RESOURCE, а возвраты и выручка забираются через claim box.",
  "Request board в этом шаге поддерживает только resource buy orders: золото резервируется сразу, а выплата исполнителю или refund покупателю проходят через тот же claim box.",
  "Listing fee списывается сразу, а sale tax удерживается только при успешной продаже.",
  "Workshop-усиление привязывает предмет к гильдии, поэтому между продажей и вложением в power появляется реальный выбор.",
  "Нельзя купить свой лот, продать bound / starter / equipped предмет или превысить лимит слотов.",
] as const;

export const TRADE_RULE_SUMMARY = [
  "Приватные сделки в MVP задуманы как barter-канал без прямой передачи золота.",
  "Состав оффера моделируется по сторонам OFFERED и REQUESTED, а получатель решает одним действием.",
  "Workshop-усиленные предметы становятся bound и больше не участвуют в barter-экономике.",
  "Нельзя торговать bound- и starter-предметами, а ownership и балансы валидируются сервером.",
  "Истёкшие офферы лениво получают EXPIRED, а item-резервации снимаются автоматически.",
] as const;

export const FOUNDATION_ACTIONS = [
  "signup",
  "login",
  "logout",
  "openDemoSandbox",
  "returnToAuthenticatedGuild",
  "createStarterGuild",
  "switchActiveGuild",
  "saveGuildIdentity",
  "endorseGuild",
  "markGuildRival",
  "unmarkGuildRival",
  "clearGuildDiplomacy",
  "equipItemToHero",
  "unequipItemFromHero",
  "upgradeInventoryItem",
  "recruitHero",
  "purchaseHeroSlotsUpgrade",
  "startExpedition",
  "claimExpeditionRewards",
  "claimGuildContract",
  "createMarketListing",
  "buyMarketListing",
  "cancelMarketListing",
  "createBuyOrder",
  "fulfillBuyOrder",
  "cancelBuyOrder",
  "claimMarketClaim",
  "createTradeOffer",
  "acceptTradeOffer",
  "rejectTradeOffer",
  "cancelTradeOffer",
  "sendGuildAid",
  "claimGuildAid",
  "cancelGuildAid",
  "purchaseGuildUpgrade",
  "claimWorldEventReward",
] as const;

export const RESOURCE_LABELS = {
  IRON_ORE: "Железная руда",
  HERBS: "Травы",
  LEATHER: "Кожа",
  ARCANE_DUST: "Чародейская пыль",
} as const;

export const HERO_CLASS_LABELS = {
  VANGUARD: "Авангард",
  RANGER: "Следопыт",
  MYSTIC: "Мистик",
} as const;

export const HERO_CLASS_TACTIC_LABELS = {
  VANGUARD: "Держит фронт и режет входящий риск.",
  RANGER: "Ускоряет маршрут и повышает качество добычи.",
  MYSTIC: "Стабилизирует группу и сглаживает провалы.",
} as const;

export const HERO_STATUS_LABELS = {
  AVAILABLE: "Готов",
  ON_EXPEDITION: "В экспедиции",
} as const;

export const ITEM_TYPE_LABELS = {
  WEAPON: "Оружие",
  ARMOR: "Броня",
  ACCESSORY: "Аксессуар",
  TROPHY: "Трофей",
} as const;

export const RARITY_LABELS = {
  COMMON: "Обычный",
  UNCOMMON: "Необычный",
  RARE: "Редкий",
  EPIC: "Эпический",
} as const;

export const INVENTORY_STATE_LABELS = {
  AVAILABLE: "Свободен",
  EQUIPPED: "Надет",
  RESERVED: "Зарезервирован",
  CONSUMED: "Потрачен",
} as const;

export const EXPEDITION_STATUS_LABELS = {
  ACTIVE: "Активна",
  COMPLETED: "Завершена",
  CLAIMED: "Забрана",
  CANCELLED: "Отменена",
} as const;

export const EXPEDITION_RESULT_LABELS = {
  TRIUMPH: "Триумф",
  SUCCESS: "Успех",
  SETBACK: "Срыв темпа",
  FAILURE: "Провал",
} as const;

export const MARKET_STATUS_LABELS = {
  ACTIVE: "Активен",
  SOLD: "Продан",
  CANCELLED: "Отменён",
  EXPIRED: "Истёк",
} as const;

export const TRADE_STATUS_LABELS = {
  PENDING: "Ожидает ответа",
  ACCEPTED: "Принят",
  REJECTED: "Отклонён",
  CANCELLED: "Отменён",
  EXPIRED: "Истёк",
  INVALIDATED: "Инвалидирован",
} as const;

export const LISTING_TYPE_LABELS = {
  ITEM: "Предмет",
  RESOURCE: "Ресурс",
} as const;

export const CLAIM_TYPE_LABELS = {
  GOLD: "Золото",
  ITEM: "Предмет",
  RESOURCE: "Ресурс",
} as const;

export const BUY_ORDER_STATUS_LABELS = {
  ACTIVE: "Открыта",
  FULFILLED: "Исполнена",
  CANCELLED: "Отменена",
  EXPIRED: "Истекла",
} as const;

export const ECONOMY_EVENT_LABELS = {
  EXPEDITION_REWARD: "Награда экспедиции",
  HERO_RECRUITMENT: "Найм героя",
  MARKET_LISTING_FEE: "Комиссия за публикацию",
  MARKET_SALE: "Успешная продажа",
  MARKET_CLAIM: "Получение claim box",
  BUY_ORDER_POSTED: "Резерв под buy order",
  BUY_ORDER_FILLED: "Исполнение buy order",
  BUY_ORDER_CLAIM: "Выплата / refund по buy order",
  TRADE_COMPLETED: "Приватная сделка",
  GUILD_UPGRADE_PURCHASE: "Покупка улучшения",
  WORKSHOP_UPGRADE: "Усиление в workshop",
  CONTRACT_REWARD: "Награда по контракту",
  WORLD_EVENT_REWARD: "Награда world event",
  GUILD_AID_SENT: "Отправка friendly aid",
  GUILD_AID_RECEIVED: "Получение friendly aid",
  GUILD_AID_CANCELLED: "Отмена courier package",
  SEED: "Инициализация foundation",
} as const;

function readLabel<T extends Record<string, string>>(
  map: T,
  key: keyof T | null | undefined,
  fallback = "—",
) {
  return key ? map[key] : fallback;
}

export function getResourceLabel(key: keyof typeof RESOURCE_LABELS | null | undefined) {
  return readLabel(RESOURCE_LABELS, key, "Ресурс не задан");
}

export function getBuyOrderStatusLabel(key: keyof typeof BUY_ORDER_STATUS_LABELS) {
  return readLabel(BUY_ORDER_STATUS_LABELS, key);
}

export function getHeroClassLabel(key: keyof typeof HERO_CLASS_LABELS) {
  return readLabel(HERO_CLASS_LABELS, key);
}

export function getHeroStatusLabel(key: keyof typeof HERO_STATUS_LABELS) {
  return readLabel(HERO_STATUS_LABELS, key);
}

export function getHeroClassTacticLabel(key: keyof typeof HERO_CLASS_TACTIC_LABELS) {
  return readLabel(HERO_CLASS_TACTIC_LABELS, key);
}

export function getItemTypeLabel(key: keyof typeof ITEM_TYPE_LABELS) {
  return readLabel(ITEM_TYPE_LABELS, key);
}

export function getRarityLabel(key: keyof typeof RARITY_LABELS) {
  return readLabel(RARITY_LABELS, key);
}

export function getInventoryStateLabel(key: keyof typeof INVENTORY_STATE_LABELS) {
  return readLabel(INVENTORY_STATE_LABELS, key);
}

export function getExpeditionStatusLabel(key: keyof typeof EXPEDITION_STATUS_LABELS) {
  return readLabel(EXPEDITION_STATUS_LABELS, key);
}

export function getExpeditionResultLabel(key: keyof typeof EXPEDITION_RESULT_LABELS | null | undefined) {
  return readLabel(EXPEDITION_RESULT_LABELS, key, "Без отчёта");
}

export function getMarketStatusLabel(key: keyof typeof MARKET_STATUS_LABELS) {
  return readLabel(MARKET_STATUS_LABELS, key);
}

export function getTradeStatusLabel(key: keyof typeof TRADE_STATUS_LABELS) {
  return readLabel(TRADE_STATUS_LABELS, key);
}

export function getListingTypeLabel(key: keyof typeof LISTING_TYPE_LABELS) {
  return readLabel(LISTING_TYPE_LABELS, key);
}

export function getClaimTypeLabel(key: keyof typeof CLAIM_TYPE_LABELS) {
  return readLabel(CLAIM_TYPE_LABELS, key);
}

export function getEconomyEventLabel(key: keyof typeof ECONOMY_EVENT_LABELS) {
  return readLabel(ECONOMY_EVENT_LABELS, key);
}
