import "server-only";

import {
  EconomyEventType,
  GuildAidPackageStatus,
  GuildDiplomacyStance,
  Prisma,
  ReferenceType,
  ResourceType,
} from "@prisma/client";

import { getResourceLabel } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import type { GuildDiplomacyPairSnapshot } from "@/server/diplomacy";
import { getActiveGuildIdentity } from "@/server/foundation";

type Tone = "neutral" | "accent" | "success" | "warning";

export const GUILD_AID_COURIER_FEE_GOLD = 4;
export const GUILD_AID_MAX_RESOURCE_QUANTITY = 12;
export const GUILD_AID_NOTE_MAX_LENGTH = 160;
export const GUILD_AID_SINGLE_PENDING_LIMIT = 1;
export const GUILD_AID_MUTUAL_PENDING_LIMIT = 2;

export type GuildAidPackageView = {
  id: string;
  direction: "incoming" | "outgoing";
  directionLabel: string;
  counterpartyGuildName: string;
  counterpartyGuildTag: string;
  counterpartyProfileHref: string;
  resourceType: ResourceType;
  resourceLabel: string;
  quantity: number;
  payloadLabel: string;
  note: string | null;
  courierFeeGold: number;
  status: "pending" | "claimed" | "cancelled";
  statusLabel: string;
  createdAt: Date;
  claimedAt: Date | null;
  cancelledAt: Date | null;
  eventAt: Date;
  tone: Tone;
  isIncoming: boolean;
  canClaim: boolean;
  canCancel: boolean;
};

export type GuildAidEligibility = {
  canSend: boolean;
  isFriendlyRouteOpen: boolean;
  statusLabel: string;
  summary: string;
  pendingLimit: number;
  pendingOutgoingToTarget: number;
  courierFeeGold: number;
  maxQuantityPerPackage: number;
  noteMaxLength: number;
  resourceOptions: Array<{
    resourceType: ResourceType;
    label: string;
    availableAmount: number;
    maxSendable: number;
  }>;
};

export type GuildCourierSnapshot = {
  tone: Tone;
  statusLabel: string;
  summary: string;
  spotlight: string;
  incomingPendingCount: number;
  outgoingPendingCount: number;
  incoming: GuildAidPackageView[];
  outgoing: GuildAidPackageView[];
  recentHistory: GuildAidPackageView[];
  eligibility: GuildAidEligibility | null;
};

export type GuildAidMutationResult = {
  aidId: string;
  currentGuildTag: string;
  guildName: string;
  guildTag: string;
  resourceType: ResourceType;
  resourceLabel: string;
  quantity: number;
  status: "pending" | "claimed" | "cancelled";
};

const guildAidPackageSelect = {
  id: true,
  senderGuildId: true,
  receiverGuildId: true,
  resourceType: true,
  quantity: true,
  note: true,
  courierFeeGold: true,
  status: true,
  createdAt: true,
  claimedAt: true,
  cancelledAt: true,
  senderGuild: {
    select: {
      id: true,
      name: true,
      tag: true,
    },
  },
  receiverGuild: {
    select: {
      id: true,
      name: true,
      tag: true,
    },
  },
} satisfies Prisma.GuildAidPackageSelect;

type GuildAidPackageRow = Prisma.GuildAidPackageGetPayload<{
  select: typeof guildAidPackageSelect;
}>;

function buildGuildProfileHref(guildTag: string) {
  return `/guilds/${encodeURIComponent(guildTag)}`;
}

function createEmptyGuildCourierSnapshot(summary = "Courier packages появятся после первого дружеского маршрута помощи."): GuildCourierSnapshot {
  return {
    tone: "neutral",
    statusLabel: "Courier idle",
    summary,
    spotlight: "Один endorsement между домами откроет мягкий aid-loop без unrestricted gifting-экономики.",
    incomingPendingCount: 0,
    outgoingPendingCount: 0,
    incoming: [],
    outgoing: [],
    recentHistory: [],
    eligibility: null,
  };
}

function getGuildAidPendingLimit(viewerDiplomacy: GuildDiplomacyPairSnapshot | null) {
  return viewerDiplomacy?.hasMutualEndorsement
    ? GUILD_AID_MUTUAL_PENDING_LIMIT
    : GUILD_AID_SINGLE_PENDING_LIMIT;
}

function getGuildAidStatusLabel(status: GuildAidPackageStatus) {
  if (status === GuildAidPackageStatus.CLAIMED) {
    return "Claimed by receiver";
  }

  if (status === GuildAidPackageStatus.CANCELLED) {
    return "Cancelled before arrival";
  }

  return "In transit";
}

function getGuildAidTone(status: GuildAidPackageStatus): Tone {
  if (status === GuildAidPackageStatus.CLAIMED) {
    return "success";
  }

  if (status === GuildAidPackageStatus.CANCELLED) {
    return "neutral";
  }

  return "accent";
}

function mapGuildAidPackageToView(input: {
  row: GuildAidPackageRow;
  perspectiveGuildId: string;
  revealNote: boolean;
}): GuildAidPackageView {
  const isIncoming = input.row.receiverGuildId === input.perspectiveGuildId;
  const counterparty = isIncoming ? input.row.senderGuild : input.row.receiverGuild;

  return {
    id: input.row.id,
    direction: isIncoming ? "incoming" : "outgoing",
    directionLabel: isIncoming ? "Incoming aid" : "Outgoing aid",
    counterpartyGuildName: counterparty.name,
    counterpartyGuildTag: counterparty.tag,
    counterpartyProfileHref: buildGuildProfileHref(counterparty.tag),
    resourceType: input.row.resourceType,
    resourceLabel: getResourceLabel(input.row.resourceType),
    quantity: input.row.quantity,
    payloadLabel: `${input.row.quantity} × ${getResourceLabel(input.row.resourceType)}`,
    note: input.revealNote ? input.row.note ?? null : null,
    courierFeeGold: input.row.courierFeeGold,
    status:
      input.row.status === GuildAidPackageStatus.CLAIMED
        ? "claimed"
        : input.row.status === GuildAidPackageStatus.CANCELLED
          ? "cancelled"
          : "pending",
    statusLabel: getGuildAidStatusLabel(input.row.status),
    createdAt: input.row.createdAt,
    claimedAt: input.row.claimedAt,
    cancelledAt: input.row.cancelledAt,
    eventAt: input.row.claimedAt ?? input.row.cancelledAt ?? input.row.createdAt,
    tone: getGuildAidTone(input.row.status),
    isIncoming,
    canClaim: isIncoming && input.row.status === GuildAidPackageStatus.PENDING,
    canCancel: !isIncoming && input.row.status === GuildAidPackageStatus.PENDING,
  };
}

function buildGuildAidEligibility(input: {
  viewerDiplomacy: GuildDiplomacyPairSnapshot | null;
  senderGold: number;
  resourceBalances: Array<{ resourceType: ResourceType; amount: number }>;
  pendingOutgoingToTarget: number;
}) {
  if (!input.viewerDiplomacy) {
    return null;
  }

  const resourceOptions = [...input.resourceBalances]
    .filter((entry) => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount)
    .map((entry) => ({
      resourceType: entry.resourceType,
      label: getResourceLabel(entry.resourceType),
      availableAmount: entry.amount,
      maxSendable: Math.min(entry.amount, GUILD_AID_MAX_RESOURCE_QUANTITY),
    }));
  const pendingLimit = getGuildAidPendingLimit(input.viewerDiplomacy);

  if (!input.viewerDiplomacy.isFriendlyAidEligible) {
    return {
      canSend: false,
      isFriendlyRouteOpen: false,
      statusLabel: input.viewerDiplomacy.friendlyAidStatusLabel,
      summary: input.viewerDiplomacy.friendlyAidSummary,
      pendingLimit,
      pendingOutgoingToTarget: input.pendingOutgoingToTarget,
      courierFeeGold: GUILD_AID_COURIER_FEE_GOLD,
      maxQuantityPerPackage: GUILD_AID_MAX_RESOURCE_QUANTITY,
      noteMaxLength: GUILD_AID_NOTE_MAX_LENGTH,
      resourceOptions,
    } satisfies GuildAidEligibility;
  }

  if (input.senderGold < GUILD_AID_COURIER_FEE_GOLD) {
    return {
      canSend: false,
      isFriendlyRouteOpen: true,
      statusLabel: "Courier fee missing",
      summary: `Для friendly aid нужен courier fee ${GUILD_AID_COURIER_FEE_GOLD} зол., чтобы пакет не превращался в бесплатный экспортный канал.`,
      pendingLimit,
      pendingOutgoingToTarget: input.pendingOutgoingToTarget,
      courierFeeGold: GUILD_AID_COURIER_FEE_GOLD,
      maxQuantityPerPackage: GUILD_AID_MAX_RESOURCE_QUANTITY,
      noteMaxLength: GUILD_AID_NOTE_MAX_LENGTH,
      resourceOptions,
    } satisfies GuildAidEligibility;
  }

  if (resourceOptions.length === 0) {
    return {
      canSend: false,
      isFriendlyRouteOpen: true,
      statusLabel: "No spare supplies",
      summary: "На складе нет свободного ресурса для courier package: social route открыта, но payload пока пуст.",
      pendingLimit,
      pendingOutgoingToTarget: input.pendingOutgoingToTarget,
      courierFeeGold: GUILD_AID_COURIER_FEE_GOLD,
      maxQuantityPerPackage: GUILD_AID_MAX_RESOURCE_QUANTITY,
      noteMaxLength: GUILD_AID_NOTE_MAX_LENGTH,
      resourceOptions,
    } satisfies GuildAidEligibility;
  }

  if (input.pendingOutgoingToTarget >= pendingLimit) {
    return {
      canSend: false,
      isFriendlyRouteOpen: true,
      statusLabel: "Route already busy",
      summary: `На эту пару уже открыто ${input.pendingOutgoingToTarget}/${pendingLimit} courier package. Сначала дождитесь claim-а или отмените активный маршрут.`,
      pendingLimit,
      pendingOutgoingToTarget: input.pendingOutgoingToTarget,
      courierFeeGold: GUILD_AID_COURIER_FEE_GOLD,
      maxQuantityPerPackage: GUILD_AID_MAX_RESOURCE_QUANTITY,
      noteMaxLength: GUILD_AID_NOTE_MAX_LENGTH,
      resourceOptions,
    } satisfies GuildAidEligibility;
  }

  return {
    canSend: true,
    isFriendlyRouteOpen: true,
    statusLabel: pendingLimit > 1 ? "Mutual courier window open" : "Friendly courier open",
    summary: `Можно отправить мягкий пакет помощи: только ресурсы, до ${GUILD_AID_MAX_RESOURCE_QUANTITY} шт. в одном route и courier fee ${GUILD_AID_COURIER_FEE_GOLD} зол. удерживается сразу.`,
    pendingLimit,
    pendingOutgoingToTarget: input.pendingOutgoingToTarget,
    courierFeeGold: GUILD_AID_COURIER_FEE_GOLD,
    maxQuantityPerPackage: GUILD_AID_MAX_RESOURCE_QUANTITY,
    noteMaxLength: GUILD_AID_NOTE_MAX_LENGTH,
    resourceOptions,
  } satisfies GuildAidEligibility;
}

function buildGuildCourierSnapshot(input: {
  incoming: GuildAidPackageView[];
  outgoing: GuildAidPackageView[];
  recentHistory: GuildAidPackageView[];
  eligibility: GuildAidEligibility | null;
}): GuildCourierSnapshot {
  const incomingPendingCount = input.incoming.filter((entry) => entry.status === "pending").length;
  const outgoingPendingCount = input.outgoing.filter((entry) => entry.status === "pending").length;

  if (incomingPendingCount > 0) {
    return {
      tone: "success",
      statusLabel: "Aid ready to claim",
      summary: `${incomingPendingCount} courier package ждёт claim-а, а ${outgoingPendingCount} ещё идёт в путь.`,
      spotlight: "Friendly aid видна прямо на dashboard и не теряется между рынком, deals и diplomacy layer.",
      incomingPendingCount,
      outgoingPendingCount,
      incoming: input.incoming,
      outgoing: input.outgoing,
      recentHistory: input.recentHistory,
      eligibility: input.eligibility,
    };
  }

  if (outgoingPendingCount > 0) {
    return {
      tone: "accent",
      statusLabel: "Courier in transit",
      summary: `${outgoingPendingCount} пакет помощи уже в пути. Следующий social beat случится, когда получатель его claim-нет.`,
      spotlight: "Aid loop живёт как мягкий claim-flow, а не как мгновенная unrestricted передача.",
      incomingPendingCount,
      outgoingPendingCount,
      incoming: input.incoming,
      outgoing: input.outgoing,
      recentHistory: input.recentHistory,
      eligibility: input.eligibility,
    };
  }

  if (input.recentHistory.length > 0) {
    return {
      tone: "accent",
      statusLabel: "Friendly route remembered",
      summary: `${input.recentHistory.length} последних courier событий уже подпитывают social memory между домами.`,
      spotlight: "Даже без новых отправок история помощи остаётся читаемой и поддерживает familiar-house loop.",
      incomingPendingCount,
      outgoingPendingCount,
      incoming: input.incoming,
      outgoing: input.outgoing,
      recentHistory: input.recentHistory,
      eligibility: input.eligibility,
    };
  }

  return {
    ...createEmptyGuildCourierSnapshot(),
    eligibility: input.eligibility,
  };
}

export async function loadDashboardGuildCourierSnapshot(currentGuildId: string | null): Promise<GuildCourierSnapshot> {
  if (!currentGuildId) {
    return createEmptyGuildCourierSnapshot("Нужен активный guild context, чтобы courier loop ожил.");
  }

  const [incomingRows, outgoingRows, recentRows] = await Promise.all([
    prisma.guildAidPackage.findMany({
      where: {
        receiverGuildId: currentGuildId,
        status: GuildAidPackageStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: guildAidPackageSelect,
    }),
    prisma.guildAidPackage.findMany({
      where: {
        senderGuildId: currentGuildId,
        status: GuildAidPackageStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: guildAidPackageSelect,
    }),
    prisma.guildAidPackage.findMany({
      where: {
        OR: [{ senderGuildId: currentGuildId }, { receiverGuildId: currentGuildId }],
        status: { in: [GuildAidPackageStatus.CLAIMED, GuildAidPackageStatus.CANCELLED] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: guildAidPackageSelect,
    }),
  ]);

  const recentHistory = recentRows
    .map((row) => mapGuildAidPackageToView({ row, perspectiveGuildId: currentGuildId, revealNote: true }))
    .sort((left, right) => right.eventAt.getTime() - left.eventAt.getTime())
    .slice(0, 6);

  return buildGuildCourierSnapshot({
    incoming: incomingRows.map((row) => mapGuildAidPackageToView({ row, perspectiveGuildId: currentGuildId, revealNote: true })),
    outgoing: outgoingRows.map((row) => mapGuildAidPackageToView({ row, perspectiveGuildId: currentGuildId, revealNote: true })),
    recentHistory,
    eligibility: null,
  });
}

export async function loadProfileGuildCourierSnapshot(input: {
  currentGuildId: string | null;
  targetGuildId: string;
  viewerDiplomacy: GuildDiplomacyPairSnapshot | null;
}): Promise<GuildCourierSnapshot> {
  const revealNote = input.currentGuildId === input.targetGuildId;
  const [incomingRows, outgoingRows, recentRows, pendingOutgoingToTarget, senderState] = await Promise.all([
    prisma.guildAidPackage.findMany({
      where: { receiverGuildId: input.targetGuildId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: guildAidPackageSelect,
    }),
    prisma.guildAidPackage.findMany({
      where: { senderGuildId: input.targetGuildId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: guildAidPackageSelect,
    }),
    prisma.guildAidPackage.findMany({
      where: {
        OR: [{ senderGuildId: input.targetGuildId }, { receiverGuildId: input.targetGuildId }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: guildAidPackageSelect,
    }),
    input.currentGuildId && input.currentGuildId !== input.targetGuildId
      ? prisma.guildAidPackage.count({
          where: {
            senderGuildId: input.currentGuildId,
            receiverGuildId: input.targetGuildId,
            status: GuildAidPackageStatus.PENDING,
          },
        })
      : Promise.resolve(0),
    input.currentGuildId && input.currentGuildId !== input.targetGuildId
      ? prisma.guild.findUnique({
          where: { id: input.currentGuildId },
          select: {
            gold: true,
            resourceBalances: {
              where: { amount: { gt: 0 } },
              orderBy: { amount: "desc" },
              select: {
                resourceType: true,
                amount: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const eligibility = senderState
    ? buildGuildAidEligibility({
        viewerDiplomacy: input.viewerDiplomacy,
        senderGold: senderState.gold,
        resourceBalances: senderState.resourceBalances,
        pendingOutgoingToTarget,
      })
    : null;
  const recentHistory = recentRows
    .map((row) => mapGuildAidPackageToView({ row, perspectiveGuildId: input.targetGuildId, revealNote }))
    .sort((left, right) => right.eventAt.getTime() - left.eventAt.getTime())
    .slice(0, 6);

  return buildGuildCourierSnapshot({
    incoming: incomingRows.map((row) => mapGuildAidPackageToView({ row, perspectiveGuildId: input.targetGuildId, revealNote })),
    outgoing: outgoingRows.map((row) => mapGuildAidPackageToView({ row, perspectiveGuildId: input.targetGuildId, revealNote })),
    recentHistory,
    eligibility,
  });
}

async function changeGuildGoldTx(tx: Prisma.TransactionClient, guildId: string, delta: number) {
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

async function changeResourceBalanceTx(
  tx: Prisma.TransactionClient,
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

async function createGuildAidLedgerEntryTx(
  tx: Prisma.TransactionClient,
  input: {
    guildId: string;
    eventType: EconomyEventType;
    referenceId: string;
    goldDelta: number;
    resourceType: ResourceType;
    resourceDelta: number;
    counterpartyGuildId: string;
  },
) {
  await tx.economyLedgerEntry.create({
    data: {
      guildId: input.guildId,
      eventType: input.eventType,
      referenceType: ReferenceType.GUILD_AID,
      referenceId: input.referenceId,
      goldDelta: input.goldDelta,
      resourceType: input.resourceType,
      resourceDelta: input.resourceDelta,
      counterpartyGuildId: input.counterpartyGuildId,
    },
  });
}

async function resolveGuildAidContext(guildTag: string) {
  const currentGuild = await getActiveGuildIdentity();
  const normalizedGuildTag = guildTag.trim().toUpperCase();

  if (!currentGuild) {
    throw new Error("Активная гильдия недоступна для courier action.");
  }

  if (!normalizedGuildTag) {
    throw new Error("Укажите гильдию для courier action.");
  }

  if (currentGuild.tag === normalizedGuildTag) {
    throw new Error("Нельзя отправить friendly aid собственной гильдии.");
  }

  const targetGuild = await prisma.guild.findUnique({
    where: { tag: normalizedGuildTag },
    select: { id: true, name: true, tag: true },
  });

  if (!targetGuild) {
    throw new Error("Выбранная гильдия не найдена в public directory.");
  }

  const relations = await prisma.guildDiplomacyRelation.findMany({
    where: {
      OR: [
        {
          sourceGuildId: currentGuild.id,
          targetGuildId: targetGuild.id,
        },
        {
          sourceGuildId: targetGuild.id,
          targetGuildId: currentGuild.id,
        },
      ],
    },
    select: {
      sourceGuildId: true,
      stance: true,
    },
  });

  const outgoing = relations.find((entry) => entry.sourceGuildId === currentGuild.id) ?? null;
  const incoming = relations.find((entry) => entry.sourceGuildId === targetGuild.id) ?? null;
  const hasMutualEndorsement =
    outgoing?.stance === GuildDiplomacyStance.ENDORSEMENT && incoming?.stance === GuildDiplomacyStance.ENDORSEMENT;
  const hasFriendlyEndorsement =
    outgoing?.stance === GuildDiplomacyStance.ENDORSEMENT || incoming?.stance === GuildDiplomacyStance.ENDORSEMENT;
  const hasRivalry =
    outgoing?.stance === GuildDiplomacyStance.RIVALRY || incoming?.stance === GuildDiplomacyStance.RIVALRY;

  if (hasRivalry) {
    throw new Error("Rivalry relation блокирует friendly aid. Сначала верните связь к neutral или endorsement.");
  }

  if (!hasFriendlyEndorsement) {
    throw new Error("Courier aid открывается только между домами с хотя бы одним endorsement.");
  }

  return {
    currentGuild,
    targetGuild,
    pendingLimit: hasMutualEndorsement ? GUILD_AID_MUTUAL_PENDING_LIMIT : GUILD_AID_SINGLE_PENDING_LIMIT,
  };
}

export async function sendGuildAidForCurrentContext(input: {
  guildTag: string;
  resourceType: ResourceType;
  quantity: number;
  note?: string | null;
}): Promise<GuildAidMutationResult> {
  const context = await resolveGuildAidContext(input.guildTag);
  const quantity = Number.isFinite(input.quantity) ? Math.floor(input.quantity) : 0;
  const note = input.note?.trim() ?? "";

  if (quantity <= 0) {
    throw new Error("Количество aid package должно быть больше нуля.");
  }

  if (quantity > GUILD_AID_MAX_RESOURCE_QUANTITY) {
    throw new Error(`В одном courier package можно отправить максимум ${GUILD_AID_MAX_RESOURCE_QUANTITY} ед. ресурса.`);
  }

  if (note.length > GUILD_AID_NOTE_MAX_LENGTH) {
    throw new Error(`Сообщение для aid package должно быть не длиннее ${GUILD_AID_NOTE_MAX_LENGTH} символов.`);
  }

  return prisma.$transaction(async (tx) => {
    const pendingCount = await tx.guildAidPackage.count({
      where: {
        senderGuildId: context.currentGuild.id,
        receiverGuildId: context.targetGuild.id,
        status: GuildAidPackageStatus.PENDING,
      },
    });

    if (pendingCount >= context.pendingLimit) {
      throw new Error("На этот friendly route уже отправлен максимум активных courier package.");
    }

    await changeGuildGoldTx(tx, context.currentGuild.id, -GUILD_AID_COURIER_FEE_GOLD);
    await changeResourceBalanceTx(tx, context.currentGuild.id, input.resourceType, -quantity);

    const aid = await tx.guildAidPackage.create({
      data: {
        senderGuildId: context.currentGuild.id,
        receiverGuildId: context.targetGuild.id,
        resourceType: input.resourceType,
        quantity,
        note: note.length > 0 ? note : null,
        courierFeeGold: GUILD_AID_COURIER_FEE_GOLD,
      },
      select: { id: true },
    });

    await createGuildAidLedgerEntryTx(tx, {
      guildId: context.currentGuild.id,
      eventType: EconomyEventType.GUILD_AID_SENT,
      referenceId: aid.id,
      goldDelta: -GUILD_AID_COURIER_FEE_GOLD,
      resourceType: input.resourceType,
      resourceDelta: -quantity,
      counterpartyGuildId: context.targetGuild.id,
    });

    return {
      aidId: aid.id,
      currentGuildTag: context.currentGuild.tag,
      guildName: context.targetGuild.name,
      guildTag: context.targetGuild.tag,
      resourceType: input.resourceType,
      resourceLabel: getResourceLabel(input.resourceType),
      quantity,
      status: "pending",
    } satisfies GuildAidMutationResult;
  });
}

export async function claimIncomingGuildAidForCurrentContext(aidId: string): Promise<GuildAidMutationResult> {
  const currentGuild = await getActiveGuildIdentity();

  if (!currentGuild) {
    throw new Error("Активная гильдия недоступна для claim-а courier package.");
  }

  return prisma.$transaction(async (tx) => {
    const aid = await tx.guildAidPackage.findFirst({
      where: {
        id: aidId,
        receiverGuildId: currentGuild.id,
        status: GuildAidPackageStatus.PENDING,
      },
      select: {
        id: true,
        senderGuildId: true,
        resourceType: true,
        quantity: true,
        senderGuild: {
          select: {
            name: true,
            tag: true,
          },
        },
      },
    });

    if (!aid) {
      throw new Error("Courier package уже недоступен для claim-а.");
    }

    await changeResourceBalanceTx(tx, currentGuild.id, aid.resourceType, aid.quantity);
    await tx.guildAidPackage.update({
      where: { id: aid.id },
      data: {
        status: GuildAidPackageStatus.CLAIMED,
        claimedAt: new Date(),
      },
    });

    await createGuildAidLedgerEntryTx(tx, {
      guildId: currentGuild.id,
      eventType: EconomyEventType.GUILD_AID_RECEIVED,
      referenceId: aid.id,
      goldDelta: 0,
      resourceType: aid.resourceType,
      resourceDelta: aid.quantity,
      counterpartyGuildId: aid.senderGuildId,
    });

    return {
      aidId: aid.id,
      currentGuildTag: currentGuild.tag,
      guildName: aid.senderGuild.name,
      guildTag: aid.senderGuild.tag,
      resourceType: aid.resourceType,
      resourceLabel: getResourceLabel(aid.resourceType),
      quantity: aid.quantity,
      status: "claimed",
    } satisfies GuildAidMutationResult;
  });
}

export async function cancelOutgoingGuildAidForCurrentContext(aidId: string): Promise<GuildAidMutationResult> {
  const currentGuild = await getActiveGuildIdentity();

  if (!currentGuild) {
    throw new Error("Активная гильдия недоступна для отмены courier package.");
  }

  return prisma.$transaction(async (tx) => {
    const aid = await tx.guildAidPackage.findFirst({
      where: {
        id: aidId,
        senderGuildId: currentGuild.id,
        status: GuildAidPackageStatus.PENDING,
      },
      select: {
        id: true,
        receiverGuildId: true,
        resourceType: true,
        quantity: true,
        receiverGuild: {
          select: {
            name: true,
            tag: true,
          },
        },
      },
    });

    if (!aid) {
      throw new Error("Активный outgoing courier package уже недоступен.");
    }

    await changeResourceBalanceTx(tx, currentGuild.id, aid.resourceType, aid.quantity);
    await tx.guildAidPackage.update({
      where: { id: aid.id },
      data: {
        status: GuildAidPackageStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await createGuildAidLedgerEntryTx(tx, {
      guildId: currentGuild.id,
      eventType: EconomyEventType.GUILD_AID_CANCELLED,
      referenceId: aid.id,
      goldDelta: 0,
      resourceType: aid.resourceType,
      resourceDelta: aid.quantity,
      counterpartyGuildId: aid.receiverGuildId,
    });

    return {
      aidId: aid.id,
      currentGuildTag: currentGuild.tag,
      guildName: aid.receiverGuild.name,
      guildTag: aid.receiverGuild.tag,
      resourceType: aid.resourceType,
      resourceLabel: getResourceLabel(aid.resourceType),
      quantity: aid.quantity,
      status: "cancelled",
    } satisfies GuildAidMutationResult;
  });
}
