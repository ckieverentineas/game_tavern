export const GUILD_IDENTITY_MOTTO_MAX_LENGTH = 80;
export const GUILD_IDENTITY_BIO_MAX_LENGTH = 280;

const DEFAULT_MOTTO = "Contracts remembered, promises kept.";
const DEFAULT_BIO = "A house building its name through expeditions, contracts, and steady market discipline.";

export const GUILD_IDENTITY_TITLE_OPTIONS = [
  {
    key: "guild-house",
    label: "Guild House",
    description: "Универсальная public-рамка для дома, который хочет выглядеть собранно и уверенно на любом social surface.",
  },
  {
    key: "trade-league",
    label: "Trade League",
    description: "Подходит домам, которые хотят звучать как надёжные брокеры, фактории и market-makers мира.",
  },
  {
    key: "frontier-watch",
    label: "Frontier Watch",
    description: "Считывается как expeditions-first дом: защитники маршрутов, проводники и охотники за frontier status.",
  },
  {
    key: "lantern-court",
    label: "Lantern Court",
    description: "Мягкая social-подача для домов, которые строят знакомство, навигацию и тёплый public trust.",
  },
  {
    key: "archive-circle",
    label: "Archive Circle",
    description: "Формулирует дом как расчётливую силу контрактов, памяти мира и аккуратной организационной дисциплины.",
  },
  {
    key: "embersworn-hall",
    label: "Embersworn Hall",
    description: "Более жёсткая framing для домов с rivalry-pressure, ambition и high-risk характером.",
  },
] as const;

export const GUILD_IDENTITY_CREST_OPTIONS = [
  {
    key: "ledger",
    label: "Ledger seal",
    description: "Печать записей, расчёта и обещаний, которые не теряются после сделки.",
    mark: "LD",
  },
  {
    key: "compass",
    label: "Compass crest",
    description: "Знак маршрутов, разведки и домов, которые любят быть первыми на новой тропе.",
    mark: "CP",
  },
  {
    key: "scales",
    label: "Scales crest",
    description: "Символ обмена, спроса и контроля цены без громкой показной роскоши.",
    mark: "SC",
  },
  {
    key: "ember",
    label: "Ember sigil",
    description: "Огненная печать упрямых домов, которые любят pressure и reputational heat.",
    mark: "EM",
  },
  {
    key: "antlers",
    label: "Antler crown",
    description: "Дикое, frontier-ориентированное клеймо для охотников, проводников и разведчиков.",
    mark: "AN",
  },
  {
    key: "lantern",
    label: "Lantern crest",
    description: "Знак ориентиров, безопасных стоянок и домов, к которым хочется возвращаться.",
    mark: "LN",
  },
  {
    key: "crown",
    label: "Crown mark",
    description: "Статусный архетип для домов, которым важно выглядеть собранно, дорого и заметно.",
    mark: "CR",
  },
] as const;

export const GUILD_IDENTITY_COLOR_OPTIONS = [
  {
    key: "dawn",
    label: "Dawn cyan",
    description: "Свежий, торговый, открытый сигнал для витрин и каталогов.",
    accentHex: "#6ee7f9",
    accentSoft: "rgba(110, 231, 249, 0.18)",
    accentStrong: "rgba(110, 231, 249, 0.46)",
  },
  {
    key: "ember",
    label: "Ember scarlet",
    description: "Тёплый, напористый цвет rivalry-pressure и домов с сильным характером.",
    accentHex: "#f87171",
    accentSoft: "rgba(248, 113, 113, 0.18)",
    accentStrong: "rgba(248, 113, 113, 0.48)",
  },
  {
    key: "moss",
    label: "Moss green",
    description: "Спокойный, grounded сигнал для домов с long-game и растущей репутацией.",
    accentHex: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.18)",
    accentStrong: "rgba(52, 211, 153, 0.46)",
  },
  {
    key: "royal",
    label: "Royal violet",
    description: "Более статусная, court-like палитра для домов с явной претензией на prestige.",
    accentHex: "#a78bfa",
    accentSoft: "rgba(167, 139, 250, 0.18)",
    accentStrong: "rgba(167, 139, 250, 0.46)",
  },
  {
    key: "gilded",
    label: "Gilded amber",
    description: "Золото, витрина и public wealth without a premium cosmetics layer.",
    accentHex: "#fbbf24",
    accentSoft: "rgba(251, 191, 36, 0.18)",
    accentStrong: "rgba(251, 191, 36, 0.46)",
  },
  {
    key: "tide",
    label: "Tide blue",
    description: "Холодный, уверенный цвет домов, которые хотят выглядеть надёжно и технологично.",
    accentHex: "#60a5fa",
    accentSoft: "rgba(96, 165, 250, 0.18)",
    accentStrong: "rgba(96, 165, 250, 0.46)",
  },
] as const;

export type GuildIdentityTitleOption = (typeof GUILD_IDENTITY_TITLE_OPTIONS)[number];
export type GuildIdentityCrestOption = (typeof GUILD_IDENTITY_CREST_OPTIONS)[number];
export type GuildIdentityColorOption = (typeof GUILD_IDENTITY_COLOR_OPTIONS)[number];

export type GuildIdentityTitleKey = GuildIdentityTitleOption["key"];
export type GuildIdentityCrestKey = GuildIdentityCrestOption["key"];
export type GuildIdentityColorKey = GuildIdentityColorOption["key"];

type RawGuildIdentityState = {
  publicTitleKey?: string | null;
  crestKey?: string | null;
  signatureColorKey?: string | null;
  motto?: string | null;
  publicBio?: string | null;
};

export type GuildIdentityState = {
  publicTitleKey: GuildIdentityTitleKey;
  crestKey: GuildIdentityCrestKey;
  signatureColorKey: GuildIdentityColorKey;
  motto: string;
  publicBio: string;
};

export type GuildIdentitySnapshot = {
  titleKey: GuildIdentityTitleKey;
  titleLabel: string;
  titleDescription: string;
  crestKey: GuildIdentityCrestKey;
  crestLabel: string;
  crestDescription: string;
  crestMark: string;
  colorKey: GuildIdentityColorKey;
  colorLabel: string;
  colorDescription: string;
  accentHex: string;
  accentSoft: string;
  accentStrong: string;
  motto: string;
  publicBio: string;
  bannerLabel: string;
  signatureLabel: string;
  showcaseTitle: string;
  directorySummary: string;
};

export type GuildIdentityEditorSnapshot = {
  current: GuildIdentityState;
  preview: GuildIdentitySnapshot;
  constraints: {
    mottoMaxLength: number;
    publicBioMaxLength: number;
  };
  titleOptions: GuildIdentityTitleOption[];
  crestOptions: GuildIdentityCrestOption[];
  colorOptions: GuildIdentityColorOption[];
};

const STARTER_MOTTO_TEMPLATES = [
  "Steady hands, open books.",
  "Routes prepared, returns remembered.",
  "Trade with memory, not noise.",
  "Quiet lanterns, loud results.",
  "Every contract leaves a mark.",
  "What the house starts, it finishes.",
] as const;

function normalizeIdentityText(value: string | null | undefined, maxLength: number, fallback: string) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength).trim();
}

function hashSeed(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function pickOption<T>(options: readonly T[], seed: number) {
  return options[seed % options.length] ?? options[0]!;
}

function getTitleOption(value: string | null | undefined) {
  return GUILD_IDENTITY_TITLE_OPTIONS.find((entry) => entry.key === value) ?? GUILD_IDENTITY_TITLE_OPTIONS[0];
}

function getCrestOption(value: string | null | undefined) {
  return GUILD_IDENTITY_CREST_OPTIONS.find((entry) => entry.key === value) ?? GUILD_IDENTITY_CREST_OPTIONS[0];
}

function getColorOption(value: string | null | undefined) {
  return GUILD_IDENTITY_COLOR_OPTIONS.find((entry) => entry.key === value) ?? GUILD_IDENTITY_COLOR_OPTIONS[0];
}

export function isGuildIdentityTitleKey(value: string) {
  return GUILD_IDENTITY_TITLE_OPTIONS.some((entry) => entry.key === value);
}

export function isGuildIdentityCrestKey(value: string) {
  return GUILD_IDENTITY_CREST_OPTIONS.some((entry) => entry.key === value);
}

export function isGuildIdentityColorKey(value: string) {
  return GUILD_IDENTITY_COLOR_OPTIONS.some((entry) => entry.key === value);
}

export function sanitizeGuildIdentityMotto(value: string | null | undefined) {
  return normalizeIdentityText(value, GUILD_IDENTITY_MOTTO_MAX_LENGTH, DEFAULT_MOTTO);
}

export function sanitizeGuildIdentityBio(value: string | null | undefined) {
  return normalizeIdentityText(value, GUILD_IDENTITY_BIO_MAX_LENGTH, DEFAULT_BIO);
}

export function resolveGuildIdentityState(input: RawGuildIdentityState): GuildIdentityState {
  return {
    publicTitleKey: getTitleOption(input.publicTitleKey).key,
    crestKey: getCrestOption(input.crestKey).key,
    signatureColorKey: getColorOption(input.signatureColorKey).key,
    motto: sanitizeGuildIdentityMotto(input.motto),
    publicBio: sanitizeGuildIdentityBio(input.publicBio),
  };
}

export function pickStarterGuildIdentity(input: { guildName: string; guildTag: string }): GuildIdentityState {
  const normalizedGuildName = input.guildName.trim();
  const normalizedGuildTag = input.guildTag.trim().toUpperCase();
  const seed = hashSeed(`${normalizedGuildName}:${normalizedGuildTag}`);
  const title = pickOption(GUILD_IDENTITY_TITLE_OPTIONS, seed);
  const crest = pickOption(GUILD_IDENTITY_CREST_OPTIONS, seed + normalizedGuildName.length);
  const color = pickOption(GUILD_IDENTITY_COLOR_OPTIONS, seed + normalizedGuildTag.length);
  const motto = pickOption(STARTER_MOTTO_TEMPLATES, seed + title.label.length);
  const publicBio = pickOption(
    [
      `${normalizedGuildName} [${normalizedGuildTag}] turns expeditions, contracts, and market discipline into a recognizable public house.`,
      `${normalizedGuildName} [${normalizedGuildTag}] is building its name through steady trade, repeat business, and frontier work.`,
      `${normalizedGuildName} [${normalizedGuildTag}] wants to be remembered not as a random tag, but as a house worth returning to.`,
    ] as const,
    seed + crest.label.length,
  );

  return resolveGuildIdentityState({
    publicTitleKey: title.key,
    crestKey: crest.key,
    signatureColorKey: color.key,
    motto,
    publicBio,
  });
}

export function buildGuildIdentitySnapshot(input: {
  guildName: string;
  guildTag: string;
  state: GuildIdentityState;
}): GuildIdentitySnapshot {
  const state = resolveGuildIdentityState(input.state);
  const title = getTitleOption(state.publicTitleKey);
  const crest = getCrestOption(state.crestKey);
  const color = getColorOption(state.signatureColorKey);

  return {
    titleKey: title.key,
    titleLabel: title.label,
    titleDescription: title.description,
    crestKey: crest.key,
    crestLabel: crest.label,
    crestDescription: crest.description,
    crestMark: crest.mark,
    colorKey: color.key,
    colorLabel: color.label,
    colorDescription: color.description,
    accentHex: color.accentHex,
    accentSoft: color.accentSoft,
    accentStrong: color.accentStrong,
    motto: state.motto,
    publicBio: state.publicBio,
    bannerLabel: `${color.label} banner`,
    signatureLabel: `${crest.label} on ${color.label.toLowerCase()}`,
    showcaseTitle: `${input.guildName} · ${title.label}`,
    directorySummary: `${title.label} with the ${crest.label.toLowerCase()} under a ${color.label.toLowerCase()}.`,
  };
}

export function buildGuildIdentityEditorSnapshot(input: {
  guildName: string;
  guildTag: string;
  state: GuildIdentityState;
}): GuildIdentityEditorSnapshot {
  const current = resolveGuildIdentityState(input.state);

  return {
    current,
    preview: buildGuildIdentitySnapshot({
      guildName: input.guildName,
      guildTag: input.guildTag,
      state: current,
    }),
    constraints: {
      mottoMaxLength: GUILD_IDENTITY_MOTTO_MAX_LENGTH,
      publicBioMaxLength: GUILD_IDENTITY_BIO_MAX_LENGTH,
    },
    titleOptions: [...GUILD_IDENTITY_TITLE_OPTIONS],
    crestOptions: [...GUILD_IDENTITY_CREST_OPTIONS],
    colorOptions: [...GUILD_IDENTITY_COLOR_OPTIONS],
  };
}
