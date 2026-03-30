import "server-only";

import { randomBytes } from "node:crypto";

import {
  EconomyEventType,
  GuildUpgradeType,
  HeroClass,
  HeroRarity,
  HeroStatus,
  InventoryItemState,
  type Prisma,
  ReferenceType,
  ResourceType,
  UserStatus,
} from "@prisma/client";

import { STARTER_ARCHETYPES } from "@/lib/domain";
import { pickStarterGuildIdentity } from "@/lib/guild-identity";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeCredentialsEmail } from "@/server/auth";

type TransactionClient = Prisma.TransactionClient;

type StarterAccountInput = {
  email: string;
  displayName: string;
  password: string;
  guildName: string;
};

const STARTER_GUILD_SETUP = {
  level: 3,
  xp: 185,
  gold: 160,
  marketSlotsBase: 1,
  activeHeroSlots: 3,
} as const;

const STARTER_HERO_STATS: Record<HeroClass, { level: number; heroXp: number; powerScore: number }> = {
  VANGUARD: { level: 2, heroXp: 22, powerScore: 36 },
  RANGER: { level: 2, heroXp: 20, powerScore: 34 },
  MYSTIC: { level: 2, heroXp: 24, powerScore: 35 },
};

const STARTER_WEAPON_CODES: Record<HeroClass, string> = {
  VANGUARD: "bronze-sword",
  RANGER: "oak-bow",
  MYSTIC: "apprentice-orb",
};

const EXTRA_STARTER_ITEM_CODES = ["leather-vest", "traveler-charm", "goblin-trophy"] as const;

const STARTER_RESOURCE_BALANCES: Record<ResourceType, number> = {
  IRON_ORE: 14,
  HERBS: 12,
  LEATHER: 10,
  ARCANE_DUST: 4,
};

function buildGuildTagStem(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

async function ensureStarterItemDefinitionsTx(tx: TransactionClient) {
  const requiredCodes = [...Object.values(STARTER_WEAPON_CODES), ...EXTRA_STARTER_ITEM_CODES];
  const definitions = await tx.itemDefinition.findMany({
    where: {
      code: {
        in: requiredCodes,
      },
    },
    select: {
      id: true,
      code: true,
    },
  });

  const definitionsByCode = new Map(definitions.map((definition) => [definition.code, definition.id]));

  for (const code of requiredCodes) {
    if (!definitionsByCode.has(code)) {
      throw new Error(
        "Стартовый bootstrap не может найти обязательные item definitions. Выполните `npm run db:setup`.",
      );
    }
  }

  return definitionsByCode;
}

async function allocateGuildTagTx(tx: TransactionClient, guildName: string, email: string) {
  const localPart = email.split("@")[0] ?? "";
  const stems = [buildGuildTagStem(guildName), buildGuildTagStem(localPart), "GUILD"].filter(
    (value) => value.length > 0,
  );

  const candidates = new Set<string>();

  for (const stem of stems) {
    candidates.add(`${stem}XXXX`.slice(0, 4));
    const prefix = `${stem}XXX`.slice(0, 3);

    for (let index = 1; index <= 9; index += 1) {
      candidates.add(`${prefix}${index}`.slice(0, 4));
    }
  }

  for (const candidate of candidates) {
    const existingGuild = await tx.guild.findUnique({
      where: {
        tag: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingGuild) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const randomCandidate = `G${randomBytes(2).toString("hex").toUpperCase()}`.slice(0, 4);
    const existingGuild = await tx.guild.findUnique({
      where: {
        tag: randomCandidate,
      },
      select: {
        id: true,
      },
    });

    if (!existingGuild) {
      return randomCandidate;
    }
  }

  throw new Error("Не удалось подобрать уникальный tag для новой гильдии.");
}

export async function createStarterAccount(input: StarterAccountInput) {
  const email = normalizeCredentialsEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new Error("Аккаунт с таким email уже существует.");
    }

    const guildName = input.guildName.trim();
    const [itemDefinitions, guildTag] = await Promise.all([
      ensureStarterItemDefinitionsTx(tx),
      allocateGuildTagTx(tx, input.guildName, email),
    ]);
    const starterIdentity = pickStarterGuildIdentity({ guildName, guildTag });

    const now = new Date();
    const user = await tx.user.create({
      data: {
        email,
        displayName: input.displayName.trim(),
        passwordHash,
        status: UserStatus.ACTIVE,
        lastSeenAt: now,
      },
    });

    const guild = await tx.guild.create({
      data: {
        userId: user.id,
        name: guildName,
        tag: guildTag,
        level: STARTER_GUILD_SETUP.level,
        xp: STARTER_GUILD_SETUP.xp,
        gold: STARTER_GUILD_SETUP.gold,
        marketUnlockedAt: now,
        tradeUnlockedAt: now,
        marketSlotsBase: STARTER_GUILD_SETUP.marketSlotsBase,
        activeHeroSlots: STARTER_GUILD_SETUP.activeHeroSlots,
        publicTitleKey: starterIdentity.publicTitleKey,
        crestKey: starterIdentity.crestKey,
        signatureColorKey: starterIdentity.signatureColorKey,
        motto: starterIdentity.motto,
        publicBio: starterIdentity.publicBio,
      },
    });

    await tx.guildUpgrade.create({
      data: {
        guildId: guild.id,
        upgradeType: GuildUpgradeType.STORAGE,
        level: 1,
        purchasedAt: now,
      },
    });

    const heroes = await Promise.all(
      STARTER_ARCHETYPES.map((archetype) => {
        const heroClass = archetype.heroClass as HeroClass;
        const stats = STARTER_HERO_STATS[heroClass];

        return tx.hero.create({
          data: {
            guildId: guild.id,
            name: archetype.name,
            heroClass,
            level: stats.level,
            heroXp: stats.heroXp,
            rarity: HeroRarity.COMMON,
            status: HeroStatus.AVAILABLE,
            powerScore: stats.powerScore,
          },
        });
      }),
    );

    const heroesByClass = new Map(heroes.map((hero) => [hero.heroClass, hero]));
    const vanguard = heroesByClass.get(HeroClass.VANGUARD);
    const ranger = heroesByClass.get(HeroClass.RANGER);
    const mystic = heroesByClass.get(HeroClass.MYSTIC);

    if (!vanguard || !ranger || !mystic) {
      throw new Error("Не удалось собрать стартовую партию для новой гильдии.");
    }

    await tx.inventoryItem.createMany({
      data: [
        {
          guildId: guild.id,
          itemDefinitionId: itemDefinitions.get(STARTER_WEAPON_CODES.VANGUARD)!,
          state: InventoryItemState.EQUIPPED,
          boundToGuild: true,
          equippedHeroId: vanguard.id,
          acquiredAt: now,
        },
        {
          guildId: guild.id,
          itemDefinitionId: itemDefinitions.get(STARTER_WEAPON_CODES.RANGER)!,
          state: InventoryItemState.EQUIPPED,
          boundToGuild: true,
          equippedHeroId: ranger.id,
          acquiredAt: now,
        },
        {
          guildId: guild.id,
          itemDefinitionId: itemDefinitions.get(STARTER_WEAPON_CODES.MYSTIC)!,
          state: InventoryItemState.EQUIPPED,
          boundToGuild: true,
          equippedHeroId: mystic.id,
          acquiredAt: now,
        },
        {
          guildId: guild.id,
          itemDefinitionId: itemDefinitions.get("leather-vest")!,
          state: InventoryItemState.AVAILABLE,
          boundToGuild: false,
          acquiredAt: now,
        },
        {
          guildId: guild.id,
          itemDefinitionId: itemDefinitions.get("traveler-charm")!,
          state: InventoryItemState.AVAILABLE,
          boundToGuild: false,
          acquiredAt: now,
        },
        {
          guildId: guild.id,
          itemDefinitionId: itemDefinitions.get("goblin-trophy")!,
          state: InventoryItemState.AVAILABLE,
          boundToGuild: false,
          acquiredAt: now,
        },
      ],
    });

    await tx.resourceBalance.createMany({
      data: Object.entries(STARTER_RESOURCE_BALANCES).map(([resourceType, amount]) => ({
        guildId: guild.id,
        resourceType: resourceType as ResourceType,
        amount,
      })),
    });

    await tx.economyLedgerEntry.createMany({
      data: [
        {
          guildId: guild.id,
          eventType: EconomyEventType.SEED,
          referenceType: ReferenceType.SYSTEM,
          referenceId: `starter:${guild.id}:gold`,
          goldDelta: STARTER_GUILD_SETUP.gold,
        },
        ...Object.entries(STARTER_RESOURCE_BALANCES).map(([resourceType, amount]) => ({
          guildId: guild.id,
          eventType: EconomyEventType.SEED,
          referenceType: ReferenceType.SYSTEM,
          referenceId: `starter:${guild.id}:resource:${resourceType}`,
          goldDelta: 0,
          resourceType: resourceType as ResourceType,
          resourceDelta: amount,
        })),
      ],
    });

    return {
      userId: user.id,
      guildId: guild.id,
      guildName: guild.name,
      guildTag: guild.tag,
      displayName: user.displayName,
      email: user.email,
    };
  });
}
