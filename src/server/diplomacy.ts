type Tone = "neutral" | "accent" | "success" | "warning";

type GuildDiplomacyStanceValue = "ENDORSEMENT" | "RIVALRY";

export type GuildDiplomacyRelation = "endorsement" | "rivalry" | "neutral";

export type GuildDiplomacyBadge = {
  key: "endorsed-house" | "alliance-circle" | "rival-board" | "bridge-builder" | "open-floor";
  label: string;
  description: string;
  tone: Tone;
};

export type GuildDiplomacyTarget = {
  guildId: string;
  guildName: string;
  guildTag: string;
  profileHref: string;
  marketHref: string;
  dealsHref: string;
  relation: Exclude<GuildDiplomacyRelation, "neutral">;
  relationLabel: string;
  reasonLabel: string;
  reasonDetail: string;
  interactionCount: number;
  recentInteractions: number;
  channelCount: number;
  updatedAt: Date | null;
  prestigeTierLabel: string;
  renownTierLabel: string;
  isCurrentContext: boolean;
};

export type GuildDiplomacyActivity = {
  id: string;
  kind: "endorsement" | "rivalry";
  title: string;
  summary: string;
  detail: string;
  at: Date;
  tone: Tone;
  guildTag: string;
  href: string;
};

export type GuildDiplomacySnapshot = {
  tone: Tone;
  statusLabel: string;
  summary: string;
  spotlight: string;
  endorsementCount: number;
  rivalryCount: number;
  outgoingEndorsementCount: number;
  outgoingRivalryCount: number;
  mutualEndorsementCount: number;
  mutualRivalryCount: number;
  badges: GuildDiplomacyBadge[];
  incomingEndorsements: GuildDiplomacyTarget[];
  outgoingEndorsements: GuildDiplomacyTarget[];
  incomingRivalries: GuildDiplomacyTarget[];
  outgoingRivalries: GuildDiplomacyTarget[];
  suggestedAllies: GuildDiplomacyTarget[];
  suggestedRivals: GuildDiplomacyTarget[];
  recentActivity: GuildDiplomacyActivity[];
};

export type GuildDiplomacyPairSnapshot = {
  relation: GuildDiplomacyRelation;
  relationLabel: string;
  summary: string;
  mutualHistorySummary: string;
  interactionCount: number;
  recentInteractions: number;
  channelCount: number;
  hasMutualEndorsement: boolean;
  hasMutualRivalry: boolean;
  isEndorsedByCurrentGuild: boolean;
  isRivalToCurrentGuild: boolean;
  isEndorsedByTarget: boolean;
  isTargetingCurrentGuild: boolean;
  suggestedActionLabel: string;
  rivalryPressureLabel: string | null;
  isFriendlyAidEligible: boolean;
  friendlyAidStatusLabel: string;
  friendlyAidSummary: string;
};

export type GuildDiplomacyState = {
  outgoingByTag: Map<string, GuildDiplomacyTarget>;
  incomingByTag: Map<string, GuildDiplomacyTarget>;
};

export type GuildDiplomacyRelationRow = {
  sourceGuildId: string;
  targetGuildId: string;
  stance: GuildDiplomacyStanceValue;
  createdAt: Date;
  updatedAt: Date;
};

export type DiplomacyCounterpartyHistory = {
  guildId: string;
  guildName: string;
  guildTag: string;
  profileHref: string;
  marketHref: string;
  dealsHref: string;
  interactionCount: number;
  recentInteractions: number;
  channelCount: number;
  relationshipLabel: string;
  summary: string;
  lastInteractionAt: Date | null;
  isCurrentContext: boolean;
};

export type DiplomacyGuild = {
  id: string;
  name: string;
  tag: string;
  createdAt: Date;
  profileHref: string;
  marketHref: string;
  dealsHref: string;
  isCurrentContext: boolean;
  socialSummary: string;
  metrics: {
    recentTrustActions: number;
  };
  renown: {
    score: number;
    rank: number;
    tierLabel: string;
    spotlight: string;
  };
  reputation: {
    score: number;
    rank: number;
    tierLabel: string;
    spotlight: string;
  };
  favoriteCounterparties: DiplomacyCounterpartyHistory[];
};

export type DiplomacyOverlayGuild<TBase extends DiplomacyGuild = DiplomacyGuild> = TBase & {
  diplomacy: GuildDiplomacySnapshot;
  diplomacyState: GuildDiplomacyState;
};

export function createEmptyGuildDiplomacyState(): GuildDiplomacyState {
  return {
    outgoingByTag: new Map<string, GuildDiplomacyTarget>(),
    incomingByTag: new Map<string, GuildDiplomacyTarget>(),
  };
}

export function createEmptyGuildDiplomacySnapshot(): GuildDiplomacySnapshot {
  return {
    tone: "neutral",
    statusLabel: "Open diplomacy",
    summary: "Endorsements и rivalry tags ещё не заданы, поэтому дом пока живёт только на natural social memory и public prestige.",
    spotlight: "Первый endorsement или мягкий rival tag быстро превратит публичный профиль из нейтрального в relational.",
    endorsementCount: 0,
    rivalryCount: 0,
    outgoingEndorsementCount: 0,
    outgoingRivalryCount: 0,
    mutualEndorsementCount: 0,
    mutualRivalryCount: 0,
    badges: [
      {
        key: "open-floor",
        label: "Open diplomacy",
        description: "Гильдия ещё не расставила endorsements или rivalry tags и остаётся открытой для первых social связей.",
        tone: "neutral",
      },
    ],
    incomingEndorsements: [],
    outgoingEndorsements: [],
    incomingRivalries: [],
    outgoingRivalries: [],
    suggestedAllies: [],
    suggestedRivals: [],
    recentActivity: [],
  };
}

function normalizeRelation(stance: GuildDiplomacyStanceValue): Exclude<GuildDiplomacyRelation, "neutral"> {
  return stance === "ENDORSEMENT" ? "endorsement" : "rivalry";
}

function sortTargets(left: GuildDiplomacyTarget, right: GuildDiplomacyTarget) {
  return (
    (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0) ||
    right.interactionCount - left.interactionCount ||
    right.channelCount - left.channelCount ||
    left.guildTag.localeCompare(right.guildTag, "ru")
  );
}

function findPairHistory(sourceGuild: DiplomacyGuild, targetGuild: DiplomacyGuild) {
  return sourceGuild.favoriteCounterparties.find((entry) => entry.guildTag === targetGuild.tag)
    ?? targetGuild.favoriteCounterparties.find((entry) => entry.guildTag === sourceGuild.tag)
    ?? null;
}

function buildAllyReason(input: {
  sourceGuild: DiplomacyGuild;
  targetGuild: DiplomacyGuild;
  incomingEndorsement: boolean;
  pairHistory: DiplomacyCounterpartyHistory | null;
}) {
  let score = 0;
  let label = "Potential ally";
  let detail = input.targetGuild.socialSummary;

  if (input.incomingEndorsement) {
    label = "They already endorse you";
    detail = `${input.targetGuild.name} [${input.targetGuild.tag}] уже дала вашему дому публичный endorsement. ${input.pairHistory ? input.pairHistory.summary : input.targetGuild.renown.spotlight}`;
    score += 65;
  }

  if (input.pairHistory) {
    score += input.pairHistory.interactionCount * 10 + input.pairHistory.channelCount * 8 + input.pairHistory.recentInteractions * 6;

    if (!input.incomingEndorsement) {
      label = input.pairHistory.channelCount >= 2 ? "Cross-channel trust" : input.pairHistory.relationshipLabel;
      detail = `${input.pairHistory.summary}. ${input.targetGuild.renown.spotlight}`;
    }
  }

  if (input.targetGuild.favoriteCounterparties.some((entry) => entry.guildTag === input.sourceGuild.tag)) {
    score += 18;

    if (!input.incomingEndorsement && !input.pairHistory) {
      label = "Mutual memory";
      detail = `${input.targetGuild.name} [${input.targetGuild.tag}] тоже считает ваш дом знакомым и стоящим повторного визита.`;
    }
  }

  if (input.targetGuild.renown.score >= 36) {
    score += 10;
  }

  if (input.targetGuild.reputation.score >= 45) {
    score += 6;
  }

  return { label, detail, score };
}

function buildRivalReason(input: {
  sourceGuild: DiplomacyGuild;
  targetGuild: DiplomacyGuild;
  incomingRivalry: boolean;
  pairHistory: DiplomacyCounterpartyHistory | null;
}) {
  let score = 0;
  let label = "Soft rivalry target";
  let detail = input.targetGuild.socialSummary;
  let pressureLabel: string | null = null;
  const prestigeRankGap = Math.abs(input.sourceGuild.reputation.rank - input.targetGuild.reputation.rank);
  const renownRankGap = Math.abs(input.sourceGuild.renown.rank - input.targetGuild.renown.rank);
  const prestigeScoreGap = Math.abs(input.sourceGuild.reputation.score - input.targetGuild.reputation.score);

  if (input.incomingRivalry) {
    label = "They tagged you first";
    detail = `${input.targetGuild.name} [${input.targetGuild.tag}] уже держит вашу гильдию в rivalry-lite радаре.`;
    pressureLabel = "Incoming rival tag";
    score += 70;
  }

  if (prestigeRankGap <= 2) {
    score += 24;

    if (!input.incomingRivalry) {
      label = "Prestige ladder neighbor";
      detail = `Prestige rank #${input.sourceGuild.reputation.rank} vs #${input.targetGuild.reputation.rank}. ${input.targetGuild.reputation.spotlight}`;
      pressureLabel = `Prestige gap #${prestigeRankGap}`;
    }
  } else if (prestigeScoreGap <= 18) {
    score += 14;

    if (!input.incomingRivalry) {
      label = "Close prestige bracket";
      detail = `${input.targetGuild.name} идёт рядом по public trust и хорошо работает как мягкий соперник без PvP-войны.`;
      pressureLabel = `Δ prestige ${prestigeScoreGap}`;
    }
  }

  if (renownRankGap <= 2) {
    score += 12;

    if (!input.incomingRivalry && prestigeRankGap > 2) {
      label = "Renown ladder neighbor";
      detail = `Renown rank #${input.sourceGuild.renown.rank} vs #${input.targetGuild.renown.rank}. ${input.targetGuild.renown.spotlight}`;
      pressureLabel = `Renown gap #${renownRankGap}`;
    }
  }

  if (input.pairHistory) {
    score += input.pairHistory.recentInteractions * 4 + Math.max(0, input.pairHistory.interactionCount - 1) * 3;

    if (!input.incomingRivalry && prestigeRankGap > 2 && renownRankGap > 2) {
      label = "Recurring competitor";
      detail = `${input.pairHistory.summary}. Эта связь уже заметна и может работать как rivalry-lite target.`;
    }
  }

  if (input.targetGuild.metrics.recentTrustActions > 0) {
    score += Math.min(8, input.targetGuild.metrics.recentTrustActions * 2);
  }

  return { label, detail, score, pressureLabel };
}

function buildManualTarget(input: {
  ownerGuild: DiplomacyGuild;
  relatedGuild: DiplomacyGuild;
  relation: Exclude<GuildDiplomacyRelation, "neutral">;
  direction: "outgoing" | "incoming";
  updatedAt: Date;
}) {
  const pairHistory = findPairHistory(input.ownerGuild, input.relatedGuild);
  const allyReason = input.relation === "endorsement"
    ? buildAllyReason({
      sourceGuild: input.ownerGuild,
      targetGuild: input.relatedGuild,
      incomingEndorsement: input.direction === "incoming",
      pairHistory,
    })
    : null;
  const rivalReason = input.relation === "rivalry"
    ? buildRivalReason({
      sourceGuild: input.ownerGuild,
      targetGuild: input.relatedGuild,
      incomingRivalry: input.direction === "incoming",
      pairHistory,
    })
    : null;

  return {
    guildId: input.relatedGuild.id,
    guildName: input.relatedGuild.name,
    guildTag: input.relatedGuild.tag,
    profileHref: input.relatedGuild.profileHref,
    marketHref: input.relatedGuild.marketHref,
    dealsHref: input.relatedGuild.dealsHref,
    relation: input.relation,
    relationLabel:
      input.relation === "endorsement"
        ? input.direction === "outgoing"
          ? "Endorsed ally"
          : "Endorses your house"
        : input.direction === "outgoing"
          ? "Rival tag"
          : "Tagged you as rival",
    reasonLabel: input.relation === "endorsement"
      ? allyReason?.label ?? "Public trust"
      : rivalReason?.label ?? "Soft rivalry",
    reasonDetail: input.relation === "endorsement"
      ? allyReason?.detail ?? input.relatedGuild.socialSummary
      : rivalReason?.detail ?? input.relatedGuild.socialSummary,
    interactionCount: pairHistory?.interactionCount ?? 0,
    recentInteractions: pairHistory?.recentInteractions ?? 0,
    channelCount: pairHistory?.channelCount ?? 0,
    updatedAt: input.updatedAt,
    prestigeTierLabel: input.relatedGuild.reputation.tierLabel,
    renownTierLabel: input.relatedGuild.renown.tierLabel,
    isCurrentContext: input.relatedGuild.isCurrentContext,
  } satisfies GuildDiplomacyTarget;
}

function buildSuggestedTarget(input: {
  ownerGuild: DiplomacyGuild;
  targetGuild: DiplomacyGuild;
  relation: Exclude<GuildDiplomacyRelation, "neutral">;
  reasonLabel: string;
  reasonDetail: string;
}) {
  const pairHistory = findPairHistory(input.ownerGuild, input.targetGuild);

  return {
    guildId: input.targetGuild.id,
    guildName: input.targetGuild.name,
    guildTag: input.targetGuild.tag,
    profileHref: input.targetGuild.profileHref,
    marketHref: input.targetGuild.marketHref,
    dealsHref: input.targetGuild.dealsHref,
    relation: input.relation,
    relationLabel: input.relation === "endorsement" ? "Suggested ally" : "Suggested rival",
    reasonLabel: input.reasonLabel,
    reasonDetail: input.reasonDetail,
    interactionCount: pairHistory?.interactionCount ?? 0,
    recentInteractions: pairHistory?.recentInteractions ?? 0,
    channelCount: pairHistory?.channelCount ?? 0,
    updatedAt: pairHistory?.lastInteractionAt ?? null,
    prestigeTierLabel: input.targetGuild.reputation.tierLabel,
    renownTierLabel: input.targetGuild.renown.tierLabel,
    isCurrentContext: input.targetGuild.isCurrentContext,
  } satisfies GuildDiplomacyTarget;
}

function buildSuggestedAllies(input: {
  guild: DiplomacyGuild;
  guilds: DiplomacyGuild[];
  outgoingByTag: Map<string, GuildDiplomacyTarget>;
  incomingByTag: Map<string, GuildDiplomacyTarget>;
}) {
  return input.guilds
    .filter((targetGuild) => targetGuild.id !== input.guild.id)
    .map((targetGuild) => {
      if (input.outgoingByTag.has(targetGuild.tag)) {
        return null;
      }

      const incoming = input.incomingByTag.get(targetGuild.tag) ?? null;

      if (incoming?.relation === "rivalry") {
        return null;
      }

      const pairHistory = findPairHistory(input.guild, targetGuild);
      const reason = buildAllyReason({
        sourceGuild: input.guild,
        targetGuild,
        incomingEndorsement: incoming?.relation === "endorsement",
        pairHistory,
      });

      if (reason.score < 18) {
        return null;
      }

      return {
        score: reason.score,
        target: buildSuggestedTarget({
          ownerGuild: input.guild,
          targetGuild,
          relation: "endorsement",
          reasonLabel: reason.label,
          reasonDetail: reason.detail,
        }),
      };
    })
    .filter((entry): entry is { score: number; target: GuildDiplomacyTarget } => Boolean(entry))
    .sort((left, right) => right.score - left.score || sortTargets(left.target, right.target))
    .slice(0, 3)
    .map((entry) => entry.target);
}

function buildSuggestedRivals(input: {
  guild: DiplomacyGuild;
  guilds: DiplomacyGuild[];
  outgoingByTag: Map<string, GuildDiplomacyTarget>;
  incomingByTag: Map<string, GuildDiplomacyTarget>;
}) {
  return input.guilds
    .filter((targetGuild) => targetGuild.id !== input.guild.id)
    .map((targetGuild) => {
      if (input.outgoingByTag.has(targetGuild.tag)) {
        return null;
      }

      const incoming = input.incomingByTag.get(targetGuild.tag) ?? null;

      if (incoming?.relation === "endorsement") {
        return null;
      }

      const pairHistory = findPairHistory(input.guild, targetGuild);
      const reason = buildRivalReason({
        sourceGuild: input.guild,
        targetGuild,
        incomingRivalry: incoming?.relation === "rivalry",
        pairHistory,
      });

      if (reason.score < 18) {
        return null;
      }

      return {
        score: reason.score,
        target: buildSuggestedTarget({
          ownerGuild: input.guild,
          targetGuild,
          relation: "rivalry",
          reasonLabel: reason.label,
          reasonDetail: reason.detail,
        }),
      };
    })
    .filter((entry): entry is { score: number; target: GuildDiplomacyTarget } => Boolean(entry))
    .sort((left, right) => right.score - left.score || sortTargets(left.target, right.target))
    .slice(0, 3)
    .map((entry) => entry.target);
}

function buildBadges(input: {
  endorsementCount: number;
  rivalryCount: number;
  outgoingEndorsementCount: number;
  outgoingRivalryCount: number;
  mutualEndorsementCount: number;
  mutualRivalryCount: number;
}) {
  const badges: GuildDiplomacyBadge[] = [];

  if (input.endorsementCount >= 1) {
    badges.push({
      key: "endorsed-house",
      label: "Endorsed house",
      description: `${input.endorsementCount} домов публично отметили гильдию знакомым и достойным доверия домом.`,
      tone: "success",
    });
  }

  if (input.mutualEndorsementCount >= 1) {
    badges.push({
      key: "alliance-circle",
      label: "Alliance circle",
      description: `${input.mutualEndorsementCount} взаимных endorsement-связей уже формируют лёгкий ally loop без тяжёлой политики.`,
      tone: "success",
    });
  }

  if (input.rivalryCount + input.outgoingRivalryCount >= 1) {
    badges.push({
      key: "rival-board",
      label: "Rival board",
      description: `${input.rivalryCount + input.outgoingRivalryCount} rivalry-lite меток создают мягкую соревновательную динамику вокруг дома.`,
      tone: "accent",
    });
  }

  if (input.outgoingEndorsementCount >= 2) {
    badges.push({
      key: "bridge-builder",
      label: "Bridge builder",
      description: "Гильдия сама собирает сеть знакомых домов и подталкивает каталог к повторным визитам.",
      tone: "accent",
    });
  }

  if (badges.length === 0) {
    badges.push({
      key: "open-floor",
      label: "Open diplomacy",
      description: "У дома ещё нет явных endorsements или rivalry tags, так что дипломатический слой только начинает собираться.",
      tone: "neutral",
    });
  }

  return badges.slice(0, 3);
}

function buildRecentActivity(input: {
  guild: DiplomacyGuild;
  outgoingEndorsements: GuildDiplomacyTarget[];
  outgoingRivalries: GuildDiplomacyTarget[];
  incomingEndorsements: GuildDiplomacyTarget[];
  incomingRivalries: GuildDiplomacyTarget[];
}) {
  return [
    ...input.outgoingEndorsements.map((target) => ({
      id: `outgoing-endorsement-${input.guild.id}-${target.guildTag}`,
      kind: "endorsement" as const,
      title: "Endorsement sent",
      summary: `${input.guild.tag} публично поддержала ${target.guildName} [${target.guildTag}].`,
      detail: target.reasonDetail,
      at: target.updatedAt ?? input.guild.createdAt,
      tone: "success" as const,
      guildTag: target.guildTag,
      href: target.profileHref,
    })),
    ...input.incomingEndorsements.map((target) => ({
      id: `incoming-endorsement-${input.guild.id}-${target.guildTag}`,
      kind: "endorsement" as const,
      title: "Received endorsement",
      summary: `${target.guildName} [${target.guildTag}] публично отметила этот дом как знакомый и достойный доверия.`,
      detail: target.reasonDetail,
      at: target.updatedAt ?? input.guild.createdAt,
      tone: "success" as const,
      guildTag: target.guildTag,
      href: target.profileHref,
    })),
    ...input.outgoingRivalries.map((target) => ({
      id: `outgoing-rivalry-${input.guild.id}-${target.guildTag}`,
      kind: "rivalry" as const,
      title: "Rival tag set",
      summary: `${input.guild.tag} добавила ${target.guildName} [${target.guildTag}] в soft rivalry board.`,
      detail: target.reasonDetail,
      at: target.updatedAt ?? input.guild.createdAt,
      tone: "accent" as const,
      guildTag: target.guildTag,
      href: target.profileHref,
    })),
    ...input.incomingRivalries.map((target) => ({
      id: `incoming-rivalry-${input.guild.id}-${target.guildTag}`,
      kind: "rivalry" as const,
      title: "Incoming rivalry",
      summary: `${target.guildName} [${target.guildTag}] держит этот дом в своём rivalry-lite радаре.`,
      detail: target.reasonDetail,
      at: target.updatedAt ?? input.guild.createdAt,
      tone: "accent" as const,
      guildTag: target.guildTag,
      href: target.profileHref,
    })),
  ]
    .sort((left, right) => right.at.getTime() - left.at.getTime() || left.guildTag.localeCompare(right.guildTag, "ru"))
    .slice(0, 6);
}

function buildSnapshot(input: {
  guild: DiplomacyGuild;
  outgoingEndorsements: GuildDiplomacyTarget[];
  outgoingRivalries: GuildDiplomacyTarget[];
  incomingEndorsements: GuildDiplomacyTarget[];
  incomingRivalries: GuildDiplomacyTarget[];
  suggestedAllies: GuildDiplomacyTarget[];
  suggestedRivals: GuildDiplomacyTarget[];
  recentActivity: GuildDiplomacyActivity[];
  mutualEndorsementCount: number;
  mutualRivalryCount: number;
}) {
  const endorsementCount = input.incomingEndorsements.length;
  const rivalryCount = input.incomingRivalries.length;
  const outgoingEndorsementCount = input.outgoingEndorsements.length;
  const outgoingRivalryCount = input.outgoingRivalries.length;
  const badges = buildBadges({
    endorsementCount,
    rivalryCount,
    outgoingEndorsementCount,
    outgoingRivalryCount,
    mutualEndorsementCount: input.mutualEndorsementCount,
    mutualRivalryCount: input.mutualRivalryCount,
  });
  const mutualAlly = input.outgoingEndorsements.find((target) =>
    input.incomingEndorsements.some((entry) => entry.guildTag === target.guildTag),
  ) ?? null;
  const incomingEndorsement = input.incomingEndorsements[0] ?? null;
  const incomingRivalry = input.incomingRivalries[0] ?? null;
  const suggestedAlly = input.suggestedAllies[0] ?? null;
  const suggestedRival = input.suggestedRivals[0] ?? null;

  let tone: Tone = "neutral";
  let statusLabel = "Open diplomacy";

  if (input.mutualEndorsementCount > 0) {
    tone = "success";
    statusLabel = "Mutual ally circle";
  } else if (endorsementCount > 0) {
    tone = "success";
    statusLabel = "Endorsed house";
  } else if (rivalryCount + outgoingRivalryCount > 0) {
    tone = "accent";
    statusLabel = rivalryCount > 0 ? "Rival spotlight" : "Marked rival";
  } else if (outgoingEndorsementCount > 0) {
    tone = "accent";
    statusLabel = "Alliance scout";
  }

  const summary = endorsementCount + rivalryCount + outgoingEndorsementCount + outgoingRivalryCount > 0
    ? `${endorsementCount} входящих endorsements · ${outgoingEndorsementCount} исходящих endorsements · ${rivalryCount} входящих rivalry tags · ${outgoingRivalryCount} исходящих rivalry tags.`
    : "Diplomacy board пока пуст: дом ещё не собрал ручные endorsements или rivalry tags.";
  const spotlight = mutualAlly
    ? `${mutualAlly.guildName} [${mutualAlly.guildTag}] уже образует с этой гильдией взаимный ally loop и усиливает ощущение знакомого доверенного дома.`
    : incomingEndorsement
      ? `${incomingEndorsement.guildName} [${incomingEndorsement.guildTag}] уже публично подтверждает знакомство и доверие к этому дому.`
      : incomingRivalry
        ? `${incomingRivalry.guildName} [${incomingRivalry.guildTag}] держит эту гильдию в rivalry-lite радаре, добавляя мягкую соревновательную динамику.`
        : suggestedAlly
          ? `${suggestedAlly.guildName} [${suggestedAlly.guildTag}] выглядит естественным endorsement-target: social memory уже созрела.`
          : suggestedRival
            ? `${suggestedRival.guildName} [${suggestedRival.guildTag}] сидит достаточно близко по статусу, чтобы работать как мягкий соперник без PvP-войны.`
            : "Первый endorsement или мягкий rival tag быстро сделает профиль relational, а не просто публичным.";

  return {
    tone,
    statusLabel,
    summary,
    spotlight,
    endorsementCount,
    rivalryCount,
    outgoingEndorsementCount,
    outgoingRivalryCount,
    mutualEndorsementCount: input.mutualEndorsementCount,
    mutualRivalryCount: input.mutualRivalryCount,
    badges,
    incomingEndorsements: input.incomingEndorsements,
    outgoingEndorsements: input.outgoingEndorsements,
    incomingRivalries: input.incomingRivalries,
    outgoingRivalries: input.outgoingRivalries,
    suggestedAllies: input.suggestedAllies,
    suggestedRivals: input.suggestedRivals,
    recentActivity: input.recentActivity,
  } satisfies GuildDiplomacySnapshot;
}

export function applyDiplomacyOverlay<TBase extends DiplomacyGuild>(
  guilds: TBase[],
  diplomacyRows: GuildDiplomacyRelationRow[],
): DiplomacyOverlayGuild<TBase>[] {
  const guildsById = new Map(guilds.map((guild) => [guild.id, guild]));
  const outgoingRows = new Map<string, GuildDiplomacyRelationRow[]>();
  const incomingRows = new Map<string, GuildDiplomacyRelationRow[]>();

  for (const row of diplomacyRows) {
    outgoingRows.set(row.sourceGuildId, [...(outgoingRows.get(row.sourceGuildId) ?? []), row]);
    incomingRows.set(row.targetGuildId, [...(incomingRows.get(row.targetGuildId) ?? []), row]);
  }

  return guilds.map((guild) => {
    const outgoingTargets: GuildDiplomacyTarget[] = (outgoingRows.get(guild.id) ?? [])
      .map((row): GuildDiplomacyTarget | null => {
        const relatedGuild = guildsById.get(row.targetGuildId) ?? null;

        return relatedGuild
          ? buildManualTarget({
            ownerGuild: guild,
            relatedGuild,
            relation: normalizeRelation(row.stance),
            direction: "outgoing",
            updatedAt: row.updatedAt,
          })
          : null;
      })
      .filter((entry): entry is GuildDiplomacyTarget => Boolean(entry))
      .sort(sortTargets);
    const incomingTargets: GuildDiplomacyTarget[] = (incomingRows.get(guild.id) ?? [])
      .map((row): GuildDiplomacyTarget | null => {
        const relatedGuild = guildsById.get(row.sourceGuildId) ?? null;

        return relatedGuild
          ? buildManualTarget({
            ownerGuild: guild,
            relatedGuild,
            relation: normalizeRelation(row.stance),
            direction: "incoming",
            updatedAt: row.updatedAt,
          })
          : null;
      })
      .filter((entry): entry is GuildDiplomacyTarget => Boolean(entry))
      .sort(sortTargets);
    const outgoingByTag = new Map<string, GuildDiplomacyTarget>(
      outgoingTargets.map((entry) => [entry.guildTag, entry]),
    );
    const incomingByTag = new Map<string, GuildDiplomacyTarget>(
      incomingTargets.map((entry) => [entry.guildTag, entry]),
    );
    const outgoingEndorsements = outgoingTargets.filter((entry) => entry.relation === "endorsement");
    const outgoingRivalries = outgoingTargets.filter((entry) => entry.relation === "rivalry");
    const incomingEndorsements = incomingTargets.filter((entry) => entry.relation === "endorsement");
    const incomingRivalries = incomingTargets.filter((entry) => entry.relation === "rivalry");
    const suggestedAllies = buildSuggestedAllies({
      guild,
      guilds,
      outgoingByTag,
      incomingByTag,
    });
    const suggestedAllyTags = new Set(suggestedAllies.map((entry) => entry.guildTag));
    const suggestedRivals = buildSuggestedRivals({
      guild,
      guilds,
      outgoingByTag,
      incomingByTag,
    }).filter((entry) => !suggestedAllyTags.has(entry.guildTag));
    const mutualEndorsementCount = outgoingEndorsements.filter(
      (entry) => incomingByTag.get(entry.guildTag)?.relation === "endorsement",
    ).length;
    const mutualRivalryCount = outgoingRivalries.filter(
      (entry) => incomingByTag.get(entry.guildTag)?.relation === "rivalry",
    ).length;
    const recentActivity = buildRecentActivity({
      guild,
      outgoingEndorsements,
      outgoingRivalries,
      incomingEndorsements,
      incomingRivalries,
    });

    return {
      ...guild,
      diplomacy: buildSnapshot({
        guild,
        outgoingEndorsements,
        outgoingRivalries,
        incomingEndorsements,
        incomingRivalries,
        suggestedAllies,
        suggestedRivals,
        recentActivity,
        mutualEndorsementCount,
        mutualRivalryCount,
      }),
      diplomacyState: {
        outgoingByTag,
        incomingByTag,
      },
    } as DiplomacyOverlayGuild<TBase>;
  });
}

export function buildViewerGuildDiplomacy(input: {
  currentGuild: DiplomacyOverlayGuild | null;
  targetGuild: DiplomacyOverlayGuild;
}): GuildDiplomacyPairSnapshot | null {
  if (!input.currentGuild || input.currentGuild.id === input.targetGuild.id) {
    return null;
  }

  const outgoing = input.currentGuild.diplomacyState.outgoingByTag.get(input.targetGuild.tag) ?? null;
  const incoming = input.targetGuild.diplomacyState.outgoingByTag.get(input.currentGuild.tag) ?? null;
  const pairHistory = findPairHistory(input.currentGuild, input.targetGuild);
  const suggestedAlly = input.currentGuild.diplomacy.suggestedAllies.find(
    (entry) => entry.guildTag === input.targetGuild.tag,
  ) ?? null;
  const suggestedRival = input.currentGuild.diplomacy.suggestedRivals.find(
    (entry) => entry.guildTag === input.targetGuild.tag,
  ) ?? null;
  const relation = outgoing?.relation ?? "neutral";
  const hasMutualEndorsement = outgoing?.relation === "endorsement" && incoming?.relation === "endorsement";
  const hasMutualRivalry = outgoing?.relation === "rivalry" && incoming?.relation === "rivalry";
  const mutualHistorySummary = pairHistory
    ? `${pairHistory.interactionCount} interactions · ${pairHistory.channelCount} channels · ${pairHistory.recentInteractions} recent. ${pairHistory.summary}`
    : "Прямой общей истории пока немного — первое diplomacy-действие задаст тон этой связи.";

  if (relation === "endorsement") {
    return {
      relation,
      relationLabel: hasMutualEndorsement ? "Mutual endorsement" : "Endorsed ally",
      summary: hasMutualEndorsement
        ? `${input.currentGuild.tag} и ${input.targetGuild.tag} уже отметили друг друга как знакомые дома, к которым хочется возвращаться.`
        : outgoing?.reasonDetail ?? "Вы уже поддержали этот дом endorsement-меткой.",
      mutualHistorySummary,
      interactionCount: pairHistory?.interactionCount ?? 0,
      recentInteractions: pairHistory?.recentInteractions ?? 0,
      channelCount: pairHistory?.channelCount ?? 0,
      hasMutualEndorsement,
      hasMutualRivalry,
      isEndorsedByCurrentGuild: true,
      isRivalToCurrentGuild: false,
      isEndorsedByTarget: incoming?.relation === "endorsement",
      isTargetingCurrentGuild: incoming?.relation === "rivalry",
      suggestedActionLabel: "Можно убрать endorsement и вернуть neutral stance.",
      rivalryPressureLabel: incoming?.relation === "rivalry" ? incoming.reasonLabel : null,
      isFriendlyAidEligible: true,
      friendlyAidStatusLabel: hasMutualEndorsement ? "Mutual courier route" : "Friendly courier open",
      friendlyAidSummary: hasMutualEndorsement
        ? "Взаимный endorsement уже открыл тёплый courier loop помощи между домами."
        : "Ваш endorsement даёт этой связи friendly статус, достаточный для courier package.",
    };
  }

  if (relation === "rivalry") {
    return {
      relation,
      relationLabel: hasMutualRivalry ? "Mutual rivalry" : "Rival tag",
      summary: hasMutualRivalry
        ? `${input.currentGuild.tag} и ${input.targetGuild.tag} держат друг друга в rivalry-lite борде и создают мягкое соревновательное напряжение.`
        : outgoing?.reasonDetail ?? "Эта гильдия помечена как мягкий rival target.",
      mutualHistorySummary,
      interactionCount: pairHistory?.interactionCount ?? 0,
      recentInteractions: pairHistory?.recentInteractions ?? 0,
      channelCount: pairHistory?.channelCount ?? 0,
      hasMutualEndorsement,
      hasMutualRivalry,
      isEndorsedByCurrentGuild: false,
      isRivalToCurrentGuild: true,
      isEndorsedByTarget: incoming?.relation === "endorsement",
      isTargetingCurrentGuild: incoming?.relation === "rivalry",
      suggestedActionLabel: "Можно снять rival tag и вернуть neutral stance.",
      rivalryPressureLabel: outgoing?.reasonLabel ?? incoming?.reasonLabel ?? null,
      isFriendlyAidEligible: false,
      friendlyAidStatusLabel: "Courier blocked",
      friendlyAidSummary: "Rivalry-lite связь блокирует friendly aid, пока дом не вернётся к neutral или endorsement relation.",
    };
  }

  if (incoming?.relation === "endorsement") {
    return {
      relation,
      relationLabel: "Endorses your house",
      summary: incoming.reasonDetail,
      mutualHistorySummary,
      interactionCount: pairHistory?.interactionCount ?? 0,
      recentInteractions: pairHistory?.recentInteractions ?? 0,
      channelCount: pairHistory?.channelCount ?? 0,
      hasMutualEndorsement,
      hasMutualRivalry,
      isEndorsedByCurrentGuild: false,
      isRivalToCurrentGuild: false,
      isEndorsedByTarget: true,
      isTargetingCurrentGuild: false,
      suggestedActionLabel: "Можно ответить взаимным endorsement-ом.",
      rivalryPressureLabel: suggestedRival?.reasonLabel ?? null,
      isFriendlyAidEligible: true,
      friendlyAidStatusLabel: "Friendly courier open",
      friendlyAidSummary: "Их endorsement уже помечает связь как дружелюбную и открывает мягкий courier route помощи.",
    };
  }

  if (incoming?.relation === "rivalry") {
    return {
      relation,
      relationLabel: "They tagged you as rival",
      summary: incoming.reasonDetail,
      mutualHistorySummary,
      interactionCount: pairHistory?.interactionCount ?? 0,
      recentInteractions: pairHistory?.recentInteractions ?? 0,
      channelCount: pairHistory?.channelCount ?? 0,
      hasMutualEndorsement,
      hasMutualRivalry,
      isEndorsedByCurrentGuild: false,
      isRivalToCurrentGuild: false,
      isEndorsedByTarget: false,
      isTargetingCurrentGuild: true,
      suggestedActionLabel: suggestedAlly ? "Можно проигнорировать rival tag или ответить endorsement-ом." : "Можно ответить rival tag-ом или оставить tension односторонним.",
      rivalryPressureLabel: incoming.reasonLabel,
      isFriendlyAidEligible: false,
      friendlyAidStatusLabel: "Courier blocked",
      friendlyAidSummary: "Односторонний rival tag не даёт открыть friendly aid, даже если social memory уже появилась.",
    };
  }

  if (suggestedAlly) {
    return {
      relation,
      relationLabel: "Suggested ally",
      summary: suggestedAlly.reasonDetail,
      mutualHistorySummary,
      interactionCount: pairHistory?.interactionCount ?? 0,
      recentInteractions: pairHistory?.recentInteractions ?? 0,
      channelCount: pairHistory?.channelCount ?? 0,
      hasMutualEndorsement,
      hasMutualRivalry,
      isEndorsedByCurrentGuild: false,
      isRivalToCurrentGuild: false,
      isEndorsedByTarget: false,
      isTargetingCurrentGuild: false,
      suggestedActionLabel: "Стоит дать endorsement как знакомому дому.",
      rivalryPressureLabel: suggestedRival?.reasonLabel ?? null,
      isFriendlyAidEligible: false,
      friendlyAidStatusLabel: "Need endorsement",
      friendlyAidSummary: "Social memory уже тёплая, но courier packages открываются только после хотя бы одного endorsement.",
    };
  }

  if (suggestedRival) {
    return {
      relation,
      relationLabel: "Suggested rival",
      summary: suggestedRival.reasonDetail,
      mutualHistorySummary,
      interactionCount: pairHistory?.interactionCount ?? 0,
      recentInteractions: pairHistory?.recentInteractions ?? 0,
      channelCount: pairHistory?.channelCount ?? 0,
      hasMutualEndorsement,
      hasMutualRivalry,
      isEndorsedByCurrentGuild: false,
      isRivalToCurrentGuild: false,
      isEndorsedByTarget: false,
      isTargetingCurrentGuild: false,
      suggestedActionLabel: "Можно отметить дом мягким rival tag-ом.",
      rivalryPressureLabel: suggestedRival.reasonLabel,
      isFriendlyAidEligible: false,
      friendlyAidStatusLabel: "Courier unavailable",
      friendlyAidSummary: "Suggested rival статус держит связь соревновательной, а не дружеской: courier aid здесь не открывается.",
    };
  }

  return {
    relation,
    relationLabel: pairHistory ? pairHistory.relationshipLabel : "Neutral contact",
    summary: pairHistory
      ? `${pairHistory.summary}. Связь пока neutral, но social memory уже заметна.`
      : "Между гильдиями пока нет ручной diplomacy relation: дом остаётся нейтральным контактом.",
    mutualHistorySummary,
    interactionCount: pairHistory?.interactionCount ?? 0,
    recentInteractions: pairHistory?.recentInteractions ?? 0,
    channelCount: pairHistory?.channelCount ?? 0,
    hasMutualEndorsement,
    hasMutualRivalry,
    isEndorsedByCurrentGuild: false,
    isRivalToCurrentGuild: false,
    isEndorsedByTarget: false,
    isTargetingCurrentGuild: false,
    suggestedActionLabel: "Можно оставить neutral или задать первый endorsement / rival tag.",
    rivalryPressureLabel: null,
    isFriendlyAidEligible: false,
    friendlyAidStatusLabel: "Neutral contact",
    friendlyAidSummary: "Friendly courier aid появится после первого endorsement и не работает на чисто neutral связи.",
  };
}
