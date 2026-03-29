import {
  AuditFlagType,
  AuditSeverity,
  AuditSourceType,
  BuyOrderStatus,
  EconomyEventType,
  ExpeditionResultTier,
  EquipmentSlot,
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
  PrismaClient,
  ReferenceType,
  ReservationType,
  ResourceType,
  RewardType,
  TradeOfferSide,
  TradeOfferStatus,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.authSession.deleteMany();
  await prisma.auditFlag.deleteMany();
  await prisma.economyLedgerEntry.deleteMany();
  await prisma.tradeOfferItem.deleteMany();
  await prisma.tradeOffer.deleteMany();
  await prisma.marketClaim.deleteMany();
  await prisma.buyOrder.deleteMany();
  await prisma.marketListing.deleteMany();
  await prisma.expeditionReward.deleteMany();
  await prisma.expeditionPartyHero.deleteMany();
  await prisma.expedition.deleteMany();
  await prisma.guildUpgrade.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.resourceBalance.deleteMany();
  await prisma.lootTableEntry.deleteMany();
  await prisma.hero.deleteMany();
  await prisma.itemDefinition.deleteMany();
  await prisma.location.deleteMany();
  await prisma.guild.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const worldEventSeasonDurationMs = 1000 * 60 * 60 * 24 * 14;
  const worldEventSeasonAnchor = new Date("2026-01-05T00:00:00.000Z");
  const worldEventSeasonIndex = Math.max(
    0,
    Math.floor((now.getTime() - worldEventSeasonAnchor.getTime()) / worldEventSeasonDurationMs),
  );
  const worldEventSeasonKey = `season-${worldEventSeasonIndex + 1}`;
  const buildWorldEventReferenceId = (eventKey: string, tierKey: string) =>
    `world-event:${worldEventSeasonKey}:${eventKey}:${tierKey}`;

  const [
    bronzeSword,
    oakBow,
    apprenticeOrb,
    leatherVest,
    quarryPike,
    scoutBrigandine,
    travelerCharm,
    pathfinderCompass,
    goblinTrophy,
    ironHalberd,
    sunfireLongbow,
    tideglassFocus,
    quarryPlate,
    archiveMantle,
    archiveSigil,
    quarryCore,
    archiveSeal,
    ashenWarplate,
    phoenixLoop,
    embersteelGreatblade,
    emberBanner,
  ] = await Promise.all([
    prisma.itemDefinition.create({
      data: {
        code: "bronze-sword",
        name: "Бронзовый меч",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 10,
        requiredGuildLevel: 1,
        isTradable: false,
        isStarterLocked: true,
        vendorBasePrice: 6,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "oak-bow",
        name: "Дубовый лук",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 9,
        requiredGuildLevel: 1,
        isTradable: false,
        isStarterLocked: true,
        vendorBasePrice: 6,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "apprentice-orb",
        name: "Сфера ученика",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.COMMON,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 8,
        requiredGuildLevel: 1,
        isTradable: false,
        isStarterLocked: true,
        vendorBasePrice: 5,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "leather-vest",
        name: "Кожаный жилет",
        itemType: ItemType.ARMOR,
        rarity: ItemRarity.COMMON,
        equipSlot: EquipmentSlot.ARMOR,
        powerScore: 6,
        requiredGuildLevel: 1,
        isTradable: true,
        vendorBasePrice: 14,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "quarry-pike",
        name: "Карьерная пика",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.UNCOMMON,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 14,
        requiredGuildLevel: 2,
        isTradable: true,
        vendorBasePrice: 28,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "scout-brigandine",
        name: "Разведчичья бригантина",
        itemType: ItemType.ARMOR,
        rarity: ItemRarity.UNCOMMON,
        equipSlot: EquipmentSlot.ARMOR,
        powerScore: 10,
        requiredGuildLevel: 2,
        isTradable: true,
        vendorBasePrice: 26,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "traveler-charm",
        name: "Талисман путника",
        itemType: ItemType.ACCESSORY,
        rarity: ItemRarity.UNCOMMON,
        equipSlot: EquipmentSlot.ACCESSORY,
        powerScore: 5,
        requiredGuildLevel: 2,
        isTradable: true,
        vendorBasePrice: 22,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "pathfinder-compass",
        name: "Компас следопыта",
        itemType: ItemType.ACCESSORY,
        rarity: ItemRarity.UNCOMMON,
        equipSlot: EquipmentSlot.ACCESSORY,
        powerScore: 8,
        requiredGuildLevel: 2,
        isTradable: true,
        vendorBasePrice: 30,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "goblin-trophy",
        name: "Гоблинский трофей",
        itemType: ItemType.TROPHY,
        rarity: ItemRarity.UNCOMMON,
        powerScore: 0,
        requiredGuildLevel: 1,
        isTradable: true,
        vendorBasePrice: 18,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "iron-halberd",
        name: "Железная алебарда",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.RARE,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 18,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 60,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "sunfire-longbow",
        name: "Солнечный длинный лук",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.RARE,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 20,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 68,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "tideglass-focus",
        name: "Фокус из приливного стекла",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.RARE,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 19,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 66,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "quarry-plate",
        name: "Карьерный латный нагрудник",
        itemType: ItemType.ARMOR,
        rarity: ItemRarity.RARE,
        equipSlot: EquipmentSlot.ARMOR,
        powerScore: 15,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 54,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "archive-mantle",
        name: "Мантия архивариуса",
        itemType: ItemType.ARMOR,
        rarity: ItemRarity.RARE,
        equipSlot: EquipmentSlot.ARMOR,
        powerScore: 13,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 50,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "archive-sigil",
        name: "Архивная печать",
        itemType: ItemType.ACCESSORY,
        rarity: ItemRarity.RARE,
        equipSlot: EquipmentSlot.ACCESSORY,
        powerScore: 11,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 52,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "quarry-core",
        name: "Осколок карьерного ядра",
        itemType: ItemType.TROPHY,
        rarity: ItemRarity.RARE,
        powerScore: 0,
        requiredGuildLevel: 2,
        isTradable: true,
        vendorBasePrice: 34,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "archive-seal",
        name: "Печать утонувшего архива",
        itemType: ItemType.TROPHY,
        rarity: ItemRarity.RARE,
        powerScore: 0,
        requiredGuildLevel: 3,
        isTradable: true,
        vendorBasePrice: 42,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "ashen-warplate",
        name: "Пепельный боевой латник",
        itemType: ItemType.ARMOR,
        rarity: ItemRarity.EPIC,
        equipSlot: EquipmentSlot.ARMOR,
        powerScore: 22,
        requiredGuildLevel: 4,
        isTradable: true,
        vendorBasePrice: 98,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "phoenix-loop",
        name: "Кольцо феникса",
        itemType: ItemType.ACCESSORY,
        rarity: ItemRarity.EPIC,
        equipSlot: EquipmentSlot.ACCESSORY,
        powerScore: 15,
        requiredGuildLevel: 4,
        isTradable: true,
        vendorBasePrice: 88,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "embersteel-greatblade",
        name: "Углестальной клеймор",
        itemType: ItemType.WEAPON,
        rarity: ItemRarity.EPIC,
        equipSlot: EquipmentSlot.WEAPON,
        powerScore: 30,
        requiredGuildLevel: 4,
        isTradable: true,
        vendorBasePrice: 120,
      },
    }),
    prisma.itemDefinition.create({
      data: {
        code: "ember-banner",
        name: "Пепельное знамя",
        itemType: ItemType.TROPHY,
        rarity: ItemRarity.EPIC,
        powerScore: 0,
        requiredGuildLevel: 4,
        isTradable: true,
        vendorBasePrice: 80,
      },
    }),
  ]);

  const [greenGlen, greenGlenSupplyLine, oldQuarry, oldQuarrySmugglerCut, sunkenArchives, sunkenArchivesEliteBreach, ashenPass] = await Promise.all([
    prisma.location.create({
      data: {
        code: "green-glen",
        name: "Зелёная лощина",
        requiredGuildLevel: 1,
        durationSeconds: 1800,
        recommendedPower: 55,
        isEnabled: true,
      },
    }),
    prisma.location.create({
      data: {
        code: "green-glen-supply-line",
        name: "Интендантская тропа",
        requiredGuildLevel: 1,
        durationSeconds: 2100,
        recommendedPower: 58,
        isEnabled: true,
      },
    }),
    prisma.location.create({
      data: {
        code: "old-quarry",
        name: "Старый карьер",
        requiredGuildLevel: 2,
        durationSeconds: 3600,
        recommendedPower: 78,
        isEnabled: true,
      },
    }),
    prisma.location.create({
      data: {
        code: "old-quarry-smuggler-cut",
        name: "Чёрный обход",
        requiredGuildLevel: 2,
        durationSeconds: 3000,
        recommendedPower: 86,
        isEnabled: true,
      },
    }),
    prisma.location.create({
      data: {
        code: "sunken-archives",
        name: "Затопленные архивы",
        requiredGuildLevel: 3,
        durationSeconds: 7200,
        recommendedPower: 96,
        isEnabled: true,
      },
    }),
    prisma.location.create({
      data: {
        code: "sunken-archives-elite-breach",
        name: "Прорыв к архивариусу",
        requiredGuildLevel: 3,
        durationSeconds: 8400,
        recommendedPower: 112,
        isEnabled: true,
      },
    }),
    prisma.location.create({
      data: {
        code: "ashen-pass",
        name: "Пепельный перевал",
        requiredGuildLevel: 4,
        durationSeconds: 10800,
        recommendedPower: 122,
        isEnabled: true,
      },
    }),
  ]);

  await prisma.lootTableEntry.createMany({
    data: [
      {
        locationId: greenGlen.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.HERBS,
        quantityMin: 4,
        quantityMax: 7,
        dropWeight: 6,
      },
      {
        locationId: greenGlen.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.LEATHER,
        quantityMin: 2,
        quantityMax: 4,
        dropWeight: 3,
      },
      {
        locationId: greenGlen.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: leatherVest.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: greenGlen.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: pathfinderCompass.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: greenGlen.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: goblinTrophy.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 3,
      },
      {
        locationId: greenGlenSupplyLine.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.HERBS,
        quantityMin: 6,
        quantityMax: 10,
        dropWeight: 7,
      },
      {
        locationId: greenGlenSupplyLine.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.LEATHER,
        quantityMin: 4,
        quantityMax: 7,
        dropWeight: 5,
      },
      {
        locationId: greenGlenSupplyLine.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: travelerCharm.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: greenGlenSupplyLine.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: goblinTrophy.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: oldQuarry.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.IRON_ORE,
        quantityMin: 6,
        quantityMax: 11,
        dropWeight: 6,
      },
      {
        locationId: oldQuarry.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.LEATHER,
        quantityMin: 3,
        quantityMax: 6,
        dropWeight: 3,
      },
      {
        locationId: oldQuarry.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: quarryPike.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: oldQuarry.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: scoutBrigandine.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: oldQuarry.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: quarryCore.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: oldQuarrySmugglerCut.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.IRON_ORE,
        quantityMin: 4,
        quantityMax: 8,
        dropWeight: 2,
      },
      {
        locationId: oldQuarrySmugglerCut.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: quarryCore.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 3,
      },
      {
        locationId: oldQuarrySmugglerCut.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: travelerCharm.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: oldQuarrySmugglerCut.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: scoutBrigandine.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: oldQuarrySmugglerCut.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: goblinTrophy.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.ARCANE_DUST,
        quantityMin: 4,
        quantityMax: 8,
        dropWeight: 5,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.HERBS,
        quantityMin: 2,
        quantityMax: 4,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: tideglassFocus.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: quarryPlate.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: archiveMantle.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: archiveSigil.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchives.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: archiveSeal.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: sunkenArchivesEliteBreach.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.ARCANE_DUST,
        quantityMin: 3,
        quantityMax: 6,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchivesEliteBreach.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: tideglassFocus.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchivesEliteBreach.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: archiveMantle.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchivesEliteBreach.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: archiveSeal.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: sunkenArchivesEliteBreach.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: phoenixLoop.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.ARCANE_DUST,
        quantityMin: 6,
        quantityMax: 10,
        dropWeight: 4,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.IRON_ORE,
        quantityMin: 8,
        quantityMax: 13,
        dropWeight: 3,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: ironHalberd.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: sunfireLongbow.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 2,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: ashenWarplate.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: phoenixLoop.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: embersteelGreatblade.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
      {
        locationId: ashenPass.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: emberBanner.id,
        quantityMin: 1,
        quantityMax: 1,
        dropWeight: 1,
      },
    ],
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@guild.exchange",
      displayName: "Foundation Demo",
      status: UserStatus.ACTIVE,
      createdAt: daysAgo(14),
      lastSeenAt: hoursAgo(2),
    },
  });

  const rivalUser = await prisma.user.create({
    data: {
      email: "rival@guild.exchange",
      displayName: "Rival Merchant",
      status: UserStatus.ACTIVE,
      createdAt: daysAgo(21),
      lastSeenAt: hoursAgo(1),
    },
  });

  const demoGuild = await prisma.guild.create({
    data: {
      userId: demoUser.id,
      name: "Dawn Ledger",
      tag: "DEMO",
      level: 3,
      xp: 185,
      gold: 285,
      marketUnlockedAt: daysAgo(7),
      tradeUnlockedAt: daysAgo(4),
      marketSlotsBase: 2,
      activeHeroSlots: 5,
      createdAt: daysAgo(14),
    },
  });

  const rivalGuild = await prisma.guild.create({
    data: {
      userId: rivalUser.id,
      name: "Ashen Union",
      tag: "RIVL",
      level: 4,
      xp: 320,
      gold: 460,
      marketUnlockedAt: daysAgo(10),
      tradeUnlockedAt: daysAgo(8),
      marketSlotsBase: 3,
      activeHeroSlots: 4,
      createdAt: daysAgo(21),
    },
  });

  await prisma.guildUpgrade.createMany({
    data: [
      {
        guildId: demoGuild.id,
        upgradeType: GuildUpgradeType.HERO_SLOTS,
        level: 2,
        purchasedAt: daysAgo(12),
      },
      {
        guildId: demoGuild.id,
        upgradeType: GuildUpgradeType.MARKET_SLOTS,
        level: 1,
        purchasedAt: daysAgo(9),
      },
      {
        guildId: demoGuild.id,
        upgradeType: GuildUpgradeType.STORAGE,
        level: 1,
        purchasedAt: daysAgo(3),
      },
      {
        guildId: demoGuild.id,
        upgradeType: GuildUpgradeType.TRADE_SLOTS,
        level: 1,
        purchasedAt: daysAgo(5),
      },
      {
        guildId: rivalGuild.id,
        upgradeType: GuildUpgradeType.HERO_SLOTS,
        level: 1,
        purchasedAt: daysAgo(18),
      },
      {
        guildId: rivalGuild.id,
        upgradeType: GuildUpgradeType.MARKET_SLOTS,
        level: 2,
        purchasedAt: daysAgo(16),
      },
      {
        guildId: rivalGuild.id,
        upgradeType: GuildUpgradeType.STORAGE,
        level: 2,
        purchasedAt: daysAgo(11),
      },
      {
        guildId: rivalGuild.id,
        upgradeType: GuildUpgradeType.TRADE_SLOTS,
        level: 2,
        purchasedAt: daysAgo(12),
      },
    ],
  });

  const [brakka, sylva, mira] = await Promise.all([
    prisma.hero.create({
      data: {
        guildId: demoGuild.id,
        name: "Brakka Ironwall",
        heroClass: HeroClass.VANGUARD,
        level: 2,
        heroXp: 38,
        rarity: HeroRarity.COMMON,
        status: HeroStatus.ON_EXPEDITION,
        powerScore: 42,
        createdAt: daysAgo(14),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: demoGuild.id,
        name: "Sylva Reed",
        heroClass: HeroClass.RANGER,
        level: 2,
        heroXp: 34,
        rarity: HeroRarity.COMMON,
        status: HeroStatus.ON_EXPEDITION,
        powerScore: 39,
        createdAt: daysAgo(14),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: demoGuild.id,
        name: "Mira Vale",
        heroClass: HeroClass.MYSTIC,
        level: 2,
        heroXp: 41,
        rarity: HeroRarity.COMMON,
        status: HeroStatus.ON_EXPEDITION,
        powerScore: 41,
        createdAt: daysAgo(14),
      },
    }),
  ]);

  const [torren, kael] = await Promise.all([
    prisma.hero.create({
      data: {
        guildId: demoGuild.id,
        name: "Torren Pike",
        heroClass: HeroClass.VANGUARD,
        level: 1,
        heroXp: 18,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 51,
        createdAt: daysAgo(9),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: demoGuild.id,
        name: "Kael Quickstep",
        heroClass: HeroClass.RANGER,
        level: 1,
        heroXp: 21,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 51,
        createdAt: daysAgo(8),
      },
    }),
  ]);

  const [rivalVanguard, rivalRanger, rivalMystic, rivalQuartermaster] = await Promise.all([
    prisma.hero.create({
      data: {
        guildId: rivalGuild.id,
        name: "Veyra Coalbrand",
        heroClass: HeroClass.VANGUARD,
        level: 3,
        heroXp: 92,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 58,
        createdAt: daysAgo(20),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: rivalGuild.id,
        name: "Rook Fenstep",
        heroClass: HeroClass.RANGER,
        level: 2,
        heroXp: 46,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 54,
        createdAt: daysAgo(19),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: rivalGuild.id,
        name: "Ilya Embermark",
        heroClass: HeroClass.MYSTIC,
        level: 2,
        heroXp: 51,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 53,
        createdAt: daysAgo(18),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: rivalGuild.id,
        name: "Sera Cindergale",
        heroClass: HeroClass.RANGER,
        level: 1,
        heroXp: 24,
        rarity: HeroRarity.COMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 47,
        createdAt: daysAgo(12),
      },
    }),
  ]);

  const trophyItem = await prisma.inventoryItem.create({
    data: {
      guildId: demoGuild.id,
      itemDefinitionId: goblinTrophy.id,
      state: InventoryItemState.AVAILABLE,
      boundToGuild: false,
      acquiredAt: hoursAgo(5),
    },
  });

  const cancelledListingItem = await prisma.inventoryItem.create({
    data: {
      guildId: demoGuild.id,
      itemDefinitionId: archiveSigil.id,
      state: InventoryItemState.AVAILABLE,
      boundToGuild: false,
      acquiredAt: hoursAgo(26),
    },
  });

  const demoActiveListingItem = await prisma.inventoryItem.create({
    data: {
      guildId: demoGuild.id,
      itemDefinitionId: quarryCore.id,
      state: InventoryItemState.AVAILABLE,
      boundToGuild: false,
      acquiredAt: hoursAgo(7),
    },
  });

  const [rivalWarplateListingItem, rivalLoopListingItem] = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: ashenWarplate.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(15),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: phoenixLoop.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(13),
      },
    }),
  ]);

  await Promise.all([
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: bronzeSword.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: brakka.id,
        acquiredAt: daysAgo(14),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: oakBow.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: sylva.id,
        acquiredAt: daysAgo(14),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: apprenticeOrb.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: mira.id,
        acquiredAt: daysAgo(14),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: quarryPike.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: torren.id,
        acquiredAt: daysAgo(7),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: scoutBrigandine.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: torren.id,
        acquiredAt: daysAgo(7),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: travelerCharm.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        workshopLevel: 1,
        equippedHeroId: torren.id,
        acquiredAt: daysAgo(6),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: sunfireLongbow.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: kael.id,
        acquiredAt: daysAgo(6),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: pathfinderCompass.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: kael.id,
        acquiredAt: daysAgo(5),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: leatherVest.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(8),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: quarryPlate.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(14),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: tideglassFocus.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: true,
        workshopLevel: 1,
        acquiredAt: hoursAgo(12),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: archiveMantle.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(11),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: archiveSigil.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(10),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: demoGuild.id,
        itemDefinitionId: quarryCore.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(9),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: bronzeSword.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: rivalVanguard.id,
        acquiredAt: daysAgo(20),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: leatherVest.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalVanguard.id,
        acquiredAt: daysAgo(19),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: travelerCharm.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalVanguard.id,
        acquiredAt: daysAgo(18),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: oakBow.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: rivalRanger.id,
        acquiredAt: daysAgo(19),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: scoutBrigandine.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalRanger.id,
        acquiredAt: daysAgo(18),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: pathfinderCompass.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalRanger.id,
        acquiredAt: daysAgo(17),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: apprenticeOrb.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: rivalMystic.id,
        acquiredAt: daysAgo(18),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: archiveMantle.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalMystic.id,
        acquiredAt: daysAgo(17),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: archiveSigil.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalMystic.id,
        acquiredAt: daysAgo(16),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: sunfireLongbow.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalQuartermaster.id,
        acquiredAt: daysAgo(11),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: leatherVest.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalQuartermaster.id,
        acquiredAt: daysAgo(10),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: travelerCharm.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: rivalQuartermaster.id,
        acquiredAt: daysAgo(9),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: ironHalberd.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: daysAgo(2),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: ashenWarplate.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: daysAgo(1),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: phoenixLoop.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(22),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: embersteelGreatblade.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: true,
        workshopLevel: 2,
        acquiredAt: hoursAgo(18),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: rivalGuild.id,
        itemDefinitionId: emberBanner.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(16),
      },
    }),
  ]);

  await prisma.resourceBalance.createMany({
    data: [
      { guildId: demoGuild.id, resourceType: ResourceType.IRON_ORE, amount: 24 },
      { guildId: demoGuild.id, resourceType: ResourceType.HERBS, amount: 18 },
      { guildId: demoGuild.id, resourceType: ResourceType.LEATHER, amount: 12 },
      { guildId: demoGuild.id, resourceType: ResourceType.ARCANE_DUST, amount: 8 },
      { guildId: rivalGuild.id, resourceType: ResourceType.IRON_ORE, amount: 40 },
      { guildId: rivalGuild.id, resourceType: ResourceType.HERBS, amount: 25 },
      { guildId: rivalGuild.id, resourceType: ResourceType.LEATHER, amount: 28 },
      { guildId: rivalGuild.id, resourceType: ResourceType.ARCANE_DUST, amount: 10 },
    ],
  });

  const activeExpedition = await prisma.expedition.create({
    data: {
      guildId: demoGuild.id,
      locationId: oldQuarry.id,
      status: ExpeditionStatus.ACTIVE,
      startedAt: hoursAgo(1.5),
      endsAt: hoursAgo(0.25),
      rewardGold: 0,
      rewardGuildXp: 0,
      partyPowerSnapshot: 96,
      threatScoreSnapshot: 82,
    },
  });

  const completedExpedition = await prisma.expedition.create({
    data: {
      guildId: demoGuild.id,
      locationId: greenGlen.id,
      status: ExpeditionStatus.COMPLETED,
      resultTier: ExpeditionResultTier.SUCCESS,
      startedAt: hoursAgo(6),
      endsAt: hoursAgo(5),
      resolvedAt: hoursAgo(4.5),
      resultSummary: "Успех · рейтинг 102 против угрозы 56. Все три роли закрыты, и партия удержала темп на всём маршруте.",
      combatLog:
        "Следопыт быстро вывел группу на безопасную тропу среди чащи.\nBrakka Ironwall удержал фронт и не дал зверью развалить строй.\nSylva Reed нашла трофейный след и ускорила возврат.\nMira Vale стабилизировала группу и сгладила просадку по темпу.\nЭкспедиция вернулась уверенно, без критических потерь.",
      rewardGold: 64,
      rewardGuildXp: 18,
      partyPowerSnapshot: 102,
      threatScoreSnapshot: 56,
    },
  });

  const supplyExpedition = await prisma.expedition.create({
    data: {
      guildId: demoGuild.id,
      locationId: greenGlenSupplyLine.id,
      status: ExpeditionStatus.COMPLETED,
      resultTier: ExpeditionResultTier.SUCCESS,
      startedAt: hoursAgo(10),
      endsAt: hoursAgo(9),
      resolvedAt: hoursAgo(8.5),
      resultSummary: "Успех · снабженческий рейс удержал темп и вывез больше workshop-ресурсов, чем обычная вылазка, но с урезанным payout по золоту.",
      combatLog:
        "Рейс шёл по коротким окнам между звериными засадами и тайниками снабженцев.\nSylva Reed быстро собрала безопасный маршрут к кладовым.\nMira Vale стабилизировала группу и не дала сорвать темп при выносе грузов.\nПартия вернулась с подчёркнуто ресурсным профилем награды.",
      rewardGold: 36,
      rewardGuildXp: 14,
      partyPowerSnapshot: 99,
      threatScoreSnapshot: 61,
    },
  });

  const highRiskExpedition = await prisma.expedition.create({
    data: {
      guildId: demoGuild.id,
      locationId: oldQuarrySmugglerCut.id,
      status: ExpeditionStatus.COMPLETED,
      resultTier: ExpeditionResultTier.SETBACK,
      startedAt: hoursAgo(14),
      endsAt: hoursAgo(13),
      resolvedAt: hoursAgo(12.5),
      resultSummary: "Срыв темпа · high-risk обход дал дорогой payout, но партия потеряла часть окна и вернулась почти без сырья.",
      combatLog:
        "Контрабандный обход начался агрессивно и быстро дал ранний доступ к дорогим тайникам.\nBrakka Ironwall удержал фронт в обвале, но маршрут всё равно сорвало на последнем кармане.\nSylva Reed вытащила только часть contraband-трофеев, пока путь окончательно не закрылся.\nЭкспедиция окупилась по золоту, но явно показала цену высокого риска.",
      rewardGold: 94,
      rewardGuildXp: 26,
      partyPowerSnapshot: 104,
      threatScoreSnapshot: 92,
    },
  });

  const eliteExpedition = await prisma.expedition.create({
    data: {
      guildId: demoGuild.id,
      locationId: sunkenArchivesEliteBreach.id,
      status: ExpeditionStatus.COMPLETED,
      resultTier: ExpeditionResultTier.TRIUMPH,
      startedAt: hoursAgo(4.5),
      endsAt: hoursAgo(3.25),
      resolvedAt: hoursAgo(3),
      resultSummary: "Триумф · элитный breach дал редкие трофеи и заметно более жирный XP-профиль, чем обычные архивы.",
      combatLog:
        "Прорыв к архивариусу потребовал плотного фронта и короткого окна на добычу.\nMira Vale удержала магическое давление под контролем, пока Brakka Ironwall ломал первую линию стража.\nSylva Reed вскрыла редкий тайник до схлопывания breach-окна.\nМаршрут вернулся с item-jackpot профилем и выдающимся боевым опытом.",
      rewardGold: 58,
      rewardGuildXp: 34,
      partyPowerSnapshot: 110,
      threatScoreSnapshot: 108,
    },
  });

  await prisma.expeditionPartyHero.createMany({
    data: [
      { expeditionId: activeExpedition.id, heroId: brakka.id },
      { expeditionId: activeExpedition.id, heroId: sylva.id },
      { expeditionId: activeExpedition.id, heroId: mira.id },
      { expeditionId: completedExpedition.id, heroId: brakka.id },
      { expeditionId: completedExpedition.id, heroId: sylva.id },
      { expeditionId: completedExpedition.id, heroId: mira.id },
      { expeditionId: supplyExpedition.id, heroId: brakka.id },
      { expeditionId: supplyExpedition.id, heroId: sylva.id },
      { expeditionId: supplyExpedition.id, heroId: mira.id },
      { expeditionId: highRiskExpedition.id, heroId: brakka.id },
      { expeditionId: highRiskExpedition.id, heroId: sylva.id },
      { expeditionId: highRiskExpedition.id, heroId: mira.id },
      { expeditionId: eliteExpedition.id, heroId: brakka.id },
      { expeditionId: eliteExpedition.id, heroId: sylva.id },
      { expeditionId: eliteExpedition.id, heroId: mira.id },
    ],
  });

  await prisma.expeditionReward.createMany({
    data: [
      {
        expeditionId: completedExpedition.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.HERBS,
        quantity: 6,
      },
      {
        expeditionId: completedExpedition.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: pathfinderCompass.id,
        quantity: 1,
      },
      {
        expeditionId: completedExpedition.id,
        rewardType: RewardType.GUILD_XP,
        quantity: 18,
      },
      {
        expeditionId: supplyExpedition.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.HERBS,
        quantity: 12,
      },
      {
        expeditionId: supplyExpedition.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.LEATHER,
        quantity: 7,
      },
      {
        expeditionId: supplyExpedition.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: travelerCharm.id,
        quantity: 1,
      },
      {
        expeditionId: highRiskExpedition.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.IRON_ORE,
        quantity: 4,
      },
      {
        expeditionId: highRiskExpedition.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: quarryCore.id,
        quantity: 1,
      },
      {
        expeditionId: highRiskExpedition.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: goblinTrophy.id,
        quantity: 1,
      },
      {
        expeditionId: eliteExpedition.id,
        rewardType: RewardType.RESOURCE,
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 5,
      },
      {
        expeditionId: eliteExpedition.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: archiveSeal.id,
        quantity: 1,
      },
      {
        expeditionId: eliteExpedition.id,
        rewardType: RewardType.ITEM,
        itemDefinitionId: phoenixLoop.id,
        quantity: 1,
      },
    ],
  });

  const activeListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: demoGuild.id,
      listingType: ListingType.ITEM,
      inventoryItemId: demoActiveListingItem.id,
      itemDefinitionId: quarryCore.id,
      quantity: 1,
      totalPriceGold: 88,
      listingFeeGold: 3,
      status: MarketListingStatus.ACTIVE,
      createdAt: hoursAgo(1.25),
      expiresAt: hoursFromNow(11),
    },
  });

  const rivalHerbListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: rivalGuild.id,
      listingType: ListingType.RESOURCE,
      resourceType: ResourceType.HERBS,
      quantity: 20,
      totalPriceGold: 48,
      listingFeeGold: 3,
      status: MarketListingStatus.ACTIVE,
      createdAt: hoursAgo(2),
      expiresAt: hoursFromNow(10),
    },
  });

  const rivalWarplateListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: rivalGuild.id,
      listingType: ListingType.ITEM,
      inventoryItemId: rivalWarplateListingItem.id,
      itemDefinitionId: ashenWarplate.id,
      quantity: 1,
      totalPriceGold: 176,
      listingFeeGold: 3,
      status: MarketListingStatus.ACTIVE,
      createdAt: hoursAgo(4),
      expiresAt: hoursFromNow(8),
    },
  });

  const rivalLoopListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: rivalGuild.id,
      listingType: ListingType.ITEM,
      inventoryItemId: rivalLoopListingItem.id,
      itemDefinitionId: phoenixLoop.id,
      quantity: 1,
      totalPriceGold: 148,
      listingFeeGold: 3,
      status: MarketListingStatus.ACTIVE,
      createdAt: hoursAgo(3),
      expiresAt: hoursFromNow(9),
    },
  });

  await Promise.all([
    prisma.inventoryItem.update({
      where: { id: demoActiveListingItem.id },
      data: {
        state: InventoryItemState.RESERVED,
        reservedByType: ReservationType.MARKET,
        reservedById: activeListing.id,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: rivalWarplateListingItem.id },
      data: {
        state: InventoryItemState.RESERVED,
        reservedByType: ReservationType.MARKET,
        reservedById: rivalWarplateListing.id,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: rivalLoopListingItem.id },
      data: {
        state: InventoryItemState.RESERVED,
        reservedByType: ReservationType.MARKET,
        reservedById: rivalLoopListing.id,
      },
    }),
  ]);

  const soldListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: demoGuild.id,
      buyerGuildId: rivalGuild.id,
      listingType: ListingType.ITEM,
      itemDefinitionId: quarryPike.id,
      quantity: 1,
      totalPriceGold: 180,
      listingFeeGold: 3,
      saleTaxGold: 18,
      status: MarketListingStatus.SOLD,
      createdAt: hoursAgo(18),
      expiresAt: hoursAgo(6),
      soldAt: hoursAgo(8),
    },
  });

  const boughtListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: rivalGuild.id,
      buyerGuildId: demoGuild.id,
      listingType: ListingType.RESOURCE,
      resourceType: ResourceType.ARCANE_DUST,
      quantity: 5,
      totalPriceGold: 55,
      listingFeeGold: 3,
      saleTaxGold: 6,
      status: MarketListingStatus.SOLD,
      createdAt: hoursAgo(14),
      expiresAt: hoursAgo(2),
      soldAt: hoursAgo(11),
    },
  });

  const cancelledListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: demoGuild.id,
      listingType: ListingType.ITEM,
      inventoryItemId: cancelledListingItem.id,
      itemDefinitionId: archiveSigil.id,
      quantity: 1,
      totalPriceGold: 96,
      listingFeeGold: 3,
      status: MarketListingStatus.CANCELLED,
      createdAt: hoursAgo(24),
      expiresAt: hoursFromNow(2),
    },
  });

  await prisma.inventoryItem.update({
    where: { id: cancelledListingItem.id },
    data: {
      state: InventoryItemState.RESERVED,
      reservedByType: ReservationType.MARKET,
      reservedById: cancelledListing.id,
    },
  });

  const expiredListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: rivalGuild.id,
      listingType: ListingType.RESOURCE,
      resourceType: ResourceType.IRON_ORE,
      quantity: 12,
      totalPriceGold: 30,
      listingFeeGold: 1,
      status: MarketListingStatus.EXPIRED,
      createdAt: hoursAgo(30),
      expiresAt: hoursAgo(6),
    },
  });

  const demoExpiredListing = await prisma.marketListing.create({
    data: {
      sellerGuildId: demoGuild.id,
      listingType: ListingType.RESOURCE,
      resourceType: ResourceType.LEATHER,
      quantity: 6,
      totalPriceGold: 42,
      listingFeeGold: 3,
      status: MarketListingStatus.EXPIRED,
      createdAt: hoursAgo(32),
      expiresAt: hoursAgo(18),
    },
  });

  const demoActiveBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerGuildId: demoGuild.id,
      resourceType: ResourceType.LEATHER,
      quantity: 8,
      totalPriceGold: 56,
      status: BuyOrderStatus.ACTIVE,
      createdAt: hoursAgo(1.75),
      expiresAt: hoursFromNow(10.25),
    },
  });

  const rivalActiveBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerGuildId: rivalGuild.id,
      resourceType: ResourceType.ARCANE_DUST,
      quantity: 4,
      totalPriceGold: 36,
      status: BuyOrderStatus.ACTIVE,
      createdAt: hoursAgo(2.25),
      expiresAt: hoursFromNow(9.75),
    },
  });

  const fulfilledBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerGuildId: demoGuild.id,
      fulfillerGuildId: rivalGuild.id,
      resourceType: ResourceType.HERBS,
      quantity: 10,
      totalPriceGold: 70,
      status: BuyOrderStatus.FULFILLED,
      createdAt: hoursAgo(19),
      expiresAt: hoursAgo(7),
      fulfilledAt: hoursAgo(9),
    },
  });

  const cancelledBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerGuildId: rivalGuild.id,
      resourceType: ResourceType.IRON_ORE,
      quantity: 15,
      totalPriceGold: 60,
      status: BuyOrderStatus.CANCELLED,
      createdAt: hoursAgo(21),
      expiresAt: hoursAgo(9),
    },
  });

  const expiredBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerGuildId: demoGuild.id,
      resourceType: ResourceType.ARCANE_DUST,
      quantity: 6,
      totalPriceGold: 42,
      status: BuyOrderStatus.EXPIRED,
      createdAt: hoursAgo(28),
      expiresAt: hoursAgo(16),
    },
  });

  await Promise.all([
    prisma.guild.update({
      where: { id: demoGuild.id },
      data: { gold: { decrement: 126 } },
    }),
    prisma.guild.update({
      where: { id: rivalGuild.id },
      data: { gold: { decrement: 96 } },
    }),
    prisma.guild.update({
      where: { id: demoGuild.id },
      data: { gold: { increment: 34 } },
    }),
    prisma.guild.update({
      where: { id: rivalGuild.id },
      data: { gold: { increment: 30 } },
    }),
    prisma.resourceBalance.update({
      where: {
        guildId_resourceType: {
          guildId: demoGuild.id,
          resourceType: ResourceType.HERBS,
        },
      },
      data: {
        amount: { increment: 6 },
      },
    }),
    prisma.resourceBalance.update({
      where: {
        guildId_resourceType: {
          guildId: rivalGuild.id,
          resourceType: ResourceType.ARCANE_DUST,
        },
      },
      data: {
        amount: { increment: 2 },
      },
    }),
  ]);

  await prisma.marketClaim.createMany({
    data: [
      {
        guildId: demoGuild.id,
        listingId: soldListing.id,
        sourceType: MarketClaimSourceType.SOLD_LISTING,
        claimType: MarketClaimType.GOLD,
        goldAmount: 162,
        quantity: 1,
        status: MarketClaimStatus.PENDING,
        createdAt: hoursAgo(7.5),
      },
      {
        guildId: rivalGuild.id,
        listingId: expiredListing.id,
        sourceType: MarketClaimSourceType.EXPIRED_LISTING,
        claimType: MarketClaimType.RESOURCE,
        resourceType: ResourceType.IRON_ORE,
        quantity: 12,
        status: MarketClaimStatus.PENDING,
        createdAt: hoursAgo(5.5),
      },
      {
        guildId: demoGuild.id,
        listingId: cancelledListing.id,
        sourceType: MarketClaimSourceType.CANCELLED_LISTING,
        claimType: MarketClaimType.ITEM,
        inventoryItemId: cancelledListingItem.id,
        quantity: 1,
        status: MarketClaimStatus.PENDING,
        createdAt: hoursAgo(18.5),
      },
      {
        guildId: demoGuild.id,
        listingId: demoExpiredListing.id,
        sourceType: MarketClaimSourceType.EXPIRED_LISTING,
        claimType: MarketClaimType.RESOURCE,
        resourceType: ResourceType.LEATHER,
        quantity: 6,
        status: MarketClaimStatus.CLAIMED,
        createdAt: hoursAgo(17.5),
        claimedAt: hoursAgo(17),
      },
      {
        guildId: rivalGuild.id,
        buyOrderId: fulfilledBuyOrder.id,
        sourceType: MarketClaimSourceType.FILLED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
        goldAmount: 70,
        quantity: 1,
        status: MarketClaimStatus.PENDING,
        createdAt: hoursAgo(8.75),
      },
      {
        guildId: rivalGuild.id,
        buyOrderId: cancelledBuyOrder.id,
        sourceType: MarketClaimSourceType.CANCELLED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
        goldAmount: 60,
        quantity: 1,
        status: MarketClaimStatus.PENDING,
        createdAt: hoursAgo(12.5),
      },
      {
        guildId: demoGuild.id,
        buyOrderId: expiredBuyOrder.id,
        sourceType: MarketClaimSourceType.EXPIRED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
        goldAmount: 42,
        quantity: 1,
        status: MarketClaimStatus.CLAIMED,
        createdAt: hoursAgo(15.5),
        claimedAt: hoursAgo(15),
      },
    ],
  });

  const outgoingTrade = await prisma.tradeOffer.create({
    data: {
      senderGuildId: demoGuild.id,
      receiverGuildId: rivalGuild.id,
      status: TradeOfferStatus.PENDING,
      message: "Предлагаю обменять пыль на травы для следующей экспедиции.",
      createdAt: hoursAgo(3),
      expiresAt: hoursFromNow(21),
    },
  });

  const incomingTrade = await prisma.tradeOffer.create({
    data: {
      senderGuildId: rivalGuild.id,
      receiverGuildId: demoGuild.id,
      status: TradeOfferStatus.PENDING,
      message: "Готов отдать кожу за ваш трофей.",
      createdAt: hoursAgo(1.5),
      expiresAt: hoursFromNow(22),
    },
  });

  const acceptedTrade = await prisma.tradeOffer.create({
    data: {
      senderGuildId: demoGuild.id,
      receiverGuildId: rivalGuild.id,
      status: TradeOfferStatus.ACCEPTED,
      message: "Закрыли обмен под следующий выход в карьер.",
      createdAt: hoursAgo(20),
      expiresAt: hoursAgo(8),
      respondedAt: hoursAgo(17.5),
    },
  });

  const rejectedTrade = await prisma.tradeOffer.create({
    data: {
      senderGuildId: rivalGuild.id,
      receiverGuildId: demoGuild.id,
      status: TradeOfferStatus.REJECTED,
      message: "Слишком дорогой запрос для текущей ротации.",
      createdAt: hoursAgo(16),
      expiresAt: hoursAgo(4),
      respondedAt: hoursAgo(14.5),
    },
  });

  const cancelledTrade = await prisma.tradeOffer.create({
    data: {
      senderGuildId: demoGuild.id,
      receiverGuildId: rivalGuild.id,
      status: TradeOfferStatus.CANCELLED,
      message: "Отзываю оффер: ресурс понадобился на рынке.",
      createdAt: hoursAgo(12),
      expiresAt: hoursAgo(1),
      respondedAt: hoursAgo(9.5),
    },
  });

  const expiredTrade = await prisma.tradeOffer.create({
    data: {
      senderGuildId: rivalGuild.id,
      receiverGuildId: demoGuild.id,
      status: TradeOfferStatus.EXPIRED,
      message: "Проверим, нужен ли вам обмен без спешки.",
      createdAt: hoursAgo(10),
      expiresAt: hoursAgo(6),
      respondedAt: hoursAgo(6),
    },
  });

  await prisma.tradeOfferItem.createMany({
    data: [
      {
        tradeOfferId: outgoingTrade.id,
        side: TradeOfferSide.OFFERED,
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 4,
      },
      {
        tradeOfferId: outgoingTrade.id,
        side: TradeOfferSide.REQUESTED,
        resourceType: ResourceType.HERBS,
        quantity: 8,
      },
      {
        tradeOfferId: incomingTrade.id,
        side: TradeOfferSide.OFFERED,
        resourceType: ResourceType.LEATHER,
        quantity: 10,
      },
      {
        tradeOfferId: incomingTrade.id,
        side: TradeOfferSide.REQUESTED,
        inventoryItemId: trophyItem.id,
        quantity: 1,
      },
      {
        tradeOfferId: acceptedTrade.id,
        side: TradeOfferSide.OFFERED,
        resourceType: ResourceType.HERBS,
        quantity: 6,
      },
      {
        tradeOfferId: acceptedTrade.id,
        side: TradeOfferSide.REQUESTED,
        resourceType: ResourceType.IRON_ORE,
        quantity: 4,
      },
      {
        tradeOfferId: rejectedTrade.id,
        side: TradeOfferSide.OFFERED,
        resourceType: ResourceType.LEATHER,
        quantity: 7,
      },
      {
        tradeOfferId: rejectedTrade.id,
        side: TradeOfferSide.REQUESTED,
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 3,
      },
      {
        tradeOfferId: cancelledTrade.id,
        side: TradeOfferSide.OFFERED,
        resourceType: ResourceType.IRON_ORE,
        quantity: 5,
      },
      {
        tradeOfferId: cancelledTrade.id,
        side: TradeOfferSide.REQUESTED,
        resourceType: ResourceType.HERBS,
        quantity: 6,
      },
      {
        tradeOfferId: expiredTrade.id,
        side: TradeOfferSide.OFFERED,
        resourceType: ResourceType.LEATHER,
        quantity: 4,
      },
      {
        tradeOfferId: expiredTrade.id,
        side: TradeOfferSide.REQUESTED,
        resourceType: ResourceType.HERBS,
        quantity: 4,
      },
    ],
  });

  await prisma.economyLedgerEntry.createMany({
    data: [
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.SEED,
        referenceType: ReferenceType.SYSTEM,
        referenceId: "foundation-seed",
        goldDelta: 235,
        createdAt: daysAgo(14),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.EXPEDITION_REWARD,
        referenceType: ReferenceType.EXPEDITION,
        referenceId: completedExpedition.id,
        goldDelta: 64,
        resourceType: ResourceType.HERBS,
        resourceDelta: 6,
        createdAt: hoursAgo(4.5),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.MARKET_LISTING_FEE,
        referenceType: ReferenceType.MARKET_LISTING,
        referenceId: activeListing.id,
        goldDelta: -3,
        createdAt: hoursAgo(1.25),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.BUY_ORDER_POSTED,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: demoActiveBuyOrder.id,
        goldDelta: -56,
        resourceType: ResourceType.LEATHER,
        createdAt: hoursAgo(1.75),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.BUY_ORDER_FILLED,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: fulfilledBuyOrder.id,
        goldDelta: 0,
        resourceType: ResourceType.HERBS,
        resourceDelta: 10,
        counterpartyGuildId: rivalGuild.id,
        createdAt: hoursAgo(9),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.MARKET_SALE,
        referenceType: ReferenceType.MARKET_LISTING,
        referenceId: soldListing.id,
        goldDelta: 162,
        createdAt: hoursAgo(8),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.BUY_ORDER_CLAIM,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: expiredBuyOrder.id,
        goldDelta: 42,
        createdAt: hoursAgo(15),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.MARKET_CLAIM,
        referenceType: ReferenceType.MARKET_CLAIM,
        referenceId: `${demoExpiredListing.id}:claim`,
        goldDelta: 0,
        resourceType: ResourceType.LEATHER,
        resourceDelta: 6,
        createdAt: hoursAgo(17),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.TRADE_COMPLETED,
        referenceType: ReferenceType.TRADE_OFFER,
        referenceId: acceptedTrade.id,
        goldDelta: 0,
        resourceType: ResourceType.IRON_ORE,
        resourceDelta: 4,
        counterpartyGuildId: rivalGuild.id,
        createdAt: hoursAgo(17.5),
      },
      {
        guildId: demoGuild.id,
        eventType: EconomyEventType.CONTRACT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: "contract:market-showcase",
        goldDelta: 34,
        resourceType: ResourceType.HERBS,
        resourceDelta: 6,
        createdAt: hoursAgo(6.25),
      },
      {
        guildId: rivalGuild.id,
        eventType: EconomyEventType.MARKET_LISTING_FEE,
        referenceType: ReferenceType.MARKET_LISTING,
        referenceId: rivalHerbListing.id,
        goldDelta: -3,
        createdAt: hoursAgo(2),
      },
      {
        guildId: rivalGuild.id,
        eventType: EconomyEventType.BUY_ORDER_POSTED,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: rivalActiveBuyOrder.id,
        goldDelta: -36,
        resourceType: ResourceType.ARCANE_DUST,
        createdAt: hoursAgo(2.25),
      },
      {
        guildId: rivalGuild.id,
        eventType: EconomyEventType.MARKET_SALE,
        referenceType: ReferenceType.MARKET_LISTING,
        referenceId: boughtListing.id,
        goldDelta: 49,
        createdAt: hoursAgo(11),
      },
      {
        guildId: rivalGuild.id,
        eventType: EconomyEventType.BUY_ORDER_CLAIM,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: cancelledBuyOrder.id,
        goldDelta: 60,
        createdAt: hoursAgo(12.5),
      },
      {
        guildId: rivalGuild.id,
        eventType: EconomyEventType.CONTRACT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: "contract:frontline-refit",
        goldDelta: 30,
        resourceType: ResourceType.ARCANE_DUST,
        resourceDelta: 2,
        createdAt: hoursAgo(10.5),
      },
      {
        guildId: rivalGuild.id,
        eventType: EconomyEventType.WORLD_EVENT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: buildWorldEventReferenceId("trade-convoy", "bronze"),
        goldDelta: 24,
        resourceType: ResourceType.HERBS,
        resourceDelta: 4,
        createdAt: hoursAgo(1.5),
      },
    ],
  });

  await prisma.auditFlag.create({
    data: {
      guildId: demoGuild.id,
      relatedGuildId: rivalGuild.id,
      sourceType: AuditSourceType.MARKET,
      sourceId: soldListing.id,
      flagType: AuditFlagType.MANUAL_REVIEW,
      severity: AuditSeverity.LOW,
      note: "Сидовый флаг для будущего activity/audit UI.",
      createdAt: hoursAgo(7),
    },
  });

  const [cinderUser, mossUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "cinder@guild.exchange",
        displayName: "Cinder Broker",
        status: UserStatus.ACTIVE,
        createdAt: daysAgo(30),
        lastSeenAt: hoursAgo(4),
      },
    }),
    prisma.user.create({
      data: {
        email: "moss@guild.exchange",
        displayName: "Moss Pathfinder",
        status: UserStatus.ACTIVE,
        createdAt: daysAgo(11),
        lastSeenAt: hoursAgo(6),
      },
    }),
  ]);

  const [cinderGuild, mossGuild] = await Promise.all([
    prisma.guild.create({
      data: {
        userId: cinderUser.id,
        name: "Cinder Pact",
        tag: "CNDR",
        level: 5,
        xp: 540,
        gold: 620,
        marketUnlockedAt: daysAgo(20),
        tradeUnlockedAt: daysAgo(18),
        marketSlotsBase: 3,
        activeHeroSlots: 5,
        createdAt: daysAgo(30),
      },
    }),
    prisma.guild.create({
      data: {
        userId: mossUser.id,
        name: "Moss Lantern",
        tag: "MOSS",
        level: 2,
        xp: 118,
        gold: 190,
        marketUnlockedAt: daysAgo(6),
        tradeUnlockedAt: null,
        marketSlotsBase: 1,
        activeHeroSlots: 4,
        createdAt: daysAgo(11),
      },
    }),
  ]);

  await prisma.guildUpgrade.createMany({
    data: [
      {
        guildId: cinderGuild.id,
        upgradeType: GuildUpgradeType.HERO_SLOTS,
        level: 2,
        purchasedAt: daysAgo(24),
      },
      {
        guildId: cinderGuild.id,
        upgradeType: GuildUpgradeType.MARKET_SLOTS,
        level: 2,
        purchasedAt: daysAgo(22),
      },
      {
        guildId: cinderGuild.id,
        upgradeType: GuildUpgradeType.TRADE_SLOTS,
        level: 2,
        purchasedAt: daysAgo(19),
      },
      {
        guildId: mossGuild.id,
        upgradeType: GuildUpgradeType.HERO_SLOTS,
        level: 1,
        purchasedAt: daysAgo(8),
      },
      {
        guildId: mossGuild.id,
        upgradeType: GuildUpgradeType.MARKET_SLOTS,
        level: 1,
        purchasedAt: daysAgo(6),
      },
      {
        guildId: mossGuild.id,
        upgradeType: GuildUpgradeType.STORAGE,
        level: 1,
        purchasedAt: daysAgo(4),
      },
    ],
  });

  const [cinderVanguard, cinderRanger, cinderMystic, mossVanguard, mossRanger, mossMystic] = await Promise.all([
    prisma.hero.create({
      data: {
        guildId: cinderGuild.id,
        name: "Rhea Flintguard",
        heroClass: HeroClass.VANGUARD,
        level: 3,
        heroXp: 96,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 61,
        createdAt: daysAgo(28),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: cinderGuild.id,
        name: "Tal Sootstep",
        heroClass: HeroClass.RANGER,
        level: 3,
        heroXp: 82,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 59,
        createdAt: daysAgo(27),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: cinderGuild.id,
        name: "Vela Ashglass",
        heroClass: HeroClass.MYSTIC,
        level: 2,
        heroXp: 69,
        rarity: HeroRarity.RARE,
        status: HeroStatus.AVAILABLE,
        powerScore: 63,
        createdAt: daysAgo(25),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: mossGuild.id,
        name: "Perrin Reedwall",
        heroClass: HeroClass.VANGUARD,
        level: 2,
        heroXp: 31,
        rarity: HeroRarity.COMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 38,
        createdAt: daysAgo(10),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: mossGuild.id,
        name: "Nim Hollowpath",
        heroClass: HeroClass.RANGER,
        level: 2,
        heroXp: 29,
        rarity: HeroRarity.COMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 37,
        createdAt: daysAgo(9),
      },
    }),
    prisma.hero.create({
      data: {
        guildId: mossGuild.id,
        name: "Aster Fenbloom",
        heroClass: HeroClass.MYSTIC,
        level: 1,
        heroXp: 19,
        rarity: HeroRarity.UNCOMMON,
        status: HeroStatus.AVAILABLE,
        powerScore: 35,
        createdAt: daysAgo(8),
      },
    }),
  ]);

  const [cinderListingItem, mossListingItem] = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        guildId: cinderGuild.id,
        itemDefinitionId: phoenixLoop.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(20),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: mossGuild.id,
        itemDefinitionId: travelerCharm.id,
        state: InventoryItemState.AVAILABLE,
        boundToGuild: false,
        acquiredAt: hoursAgo(18),
      },
    }),
  ]);

  await Promise.all([
    prisma.inventoryItem.create({
      data: {
        guildId: cinderGuild.id,
        itemDefinitionId: ironHalberd.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: cinderVanguard.id,
        acquiredAt: daysAgo(21),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: cinderGuild.id,
        itemDefinitionId: sunfireLongbow.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: cinderRanger.id,
        acquiredAt: daysAgo(20),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: cinderGuild.id,
        itemDefinitionId: archiveSeal.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: cinderMystic.id,
        acquiredAt: daysAgo(18),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: mossGuild.id,
        itemDefinitionId: leatherVest.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: mossVanguard.id,
        acquiredAt: daysAgo(9),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: mossGuild.id,
        itemDefinitionId: pathfinderCompass.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: false,
        equippedHeroId: mossRanger.id,
        acquiredAt: daysAgo(8),
      },
    }),
    prisma.inventoryItem.create({
      data: {
        guildId: mossGuild.id,
        itemDefinitionId: apprenticeOrb.id,
        state: InventoryItemState.EQUIPPED,
        boundToGuild: true,
        equippedHeroId: mossMystic.id,
        acquiredAt: daysAgo(8),
      },
    }),
  ]);

  await prisma.resourceBalance.createMany({
    data: [
      { guildId: cinderGuild.id, resourceType: ResourceType.IRON_ORE, amount: 36 },
      { guildId: cinderGuild.id, resourceType: ResourceType.HERBS, amount: 14 },
      { guildId: cinderGuild.id, resourceType: ResourceType.LEATHER, amount: 24 },
      { guildId: cinderGuild.id, resourceType: ResourceType.ARCANE_DUST, amount: 17 },
      { guildId: mossGuild.id, resourceType: ResourceType.IRON_ORE, amount: 12 },
      { guildId: mossGuild.id, resourceType: ResourceType.HERBS, amount: 19 },
      { guildId: mossGuild.id, resourceType: ResourceType.LEATHER, amount: 11 },
      { guildId: mossGuild.id, resourceType: ResourceType.ARCANE_DUST, amount: 4 },
    ],
  });

  const [cinderListing, mossListing, cinderBuyOrder, mossBuyOrder, cinderExpedition, mossExpedition] = await Promise.all([
    prisma.marketListing.create({
      data: {
        sellerGuildId: cinderGuild.id,
        listingType: ListingType.ITEM,
        inventoryItemId: cinderListingItem.id,
        itemDefinitionId: phoenixLoop.id,
        quantity: 1,
        totalPriceGold: 166,
        listingFeeGold: 3,
        status: MarketListingStatus.ACTIVE,
        createdAt: hoursAgo(5),
        expiresAt: hoursFromNow(7),
      },
    }),
    prisma.marketListing.create({
      data: {
        sellerGuildId: mossGuild.id,
        listingType: ListingType.ITEM,
        inventoryItemId: mossListingItem.id,
        itemDefinitionId: travelerCharm.id,
        quantity: 1,
        totalPriceGold: 39,
        listingFeeGold: 3,
        status: MarketListingStatus.ACTIVE,
        createdAt: hoursAgo(3),
        expiresAt: hoursFromNow(9),
      },
    }),
    prisma.buyOrder.create({
      data: {
        buyerGuildId: cinderGuild.id,
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 7,
        totalPriceGold: 84,
        status: BuyOrderStatus.ACTIVE,
        createdAt: hoursAgo(4),
        expiresAt: hoursFromNow(8),
      },
    }),
    prisma.buyOrder.create({
      data: {
        buyerGuildId: mossGuild.id,
        resourceType: ResourceType.HERBS,
        quantity: 6,
        totalPriceGold: 30,
        status: BuyOrderStatus.ACTIVE,
        createdAt: hoursAgo(2),
        expiresAt: hoursFromNow(10),
      },
    }),
    prisma.expedition.create({
      data: {
        guildId: cinderGuild.id,
        locationId: ashenPass.id,
        status: ExpeditionStatus.CLAIMED,
        resultTier: ExpeditionResultTier.SUCCESS,
        startedAt: daysAgo(2),
        endsAt: daysAgo(2),
        resolvedAt: daysAgo(2),
        claimedAt: daysAgo(2),
        resultSummary: "Успешный дальний рейс закрепил за гильдией дорогой late-tier статус.",
        rewardGold: 96,
        rewardGuildXp: 28,
        partyPowerSnapshot: 173,
        threatScoreSnapshot: 128,
      },
    }),
    prisma.expedition.create({
      data: {
        guildId: mossGuild.id,
        locationId: greenGlen.id,
        status: ExpeditionStatus.CLAIMED,
        resultTier: ExpeditionResultTier.SUCCESS,
        startedAt: daysAgo(1),
        endsAt: daysAgo(1),
        resolvedAt: daysAgo(1),
        claimedAt: daysAgo(1),
        resultSummary: "Молодая гильдия уверенно держит ранний PvE-темп и подпитывает склад базовыми ресурсами.",
        rewardGold: 42,
        rewardGuildXp: 16,
        partyPowerSnapshot: 110,
        threatScoreSnapshot: 71,
      },
    }),
  ]);

  await Promise.all([
    prisma.inventoryItem.update({
      where: { id: cinderListingItem.id },
      data: {
        state: InventoryItemState.RESERVED,
        reservedByType: ReservationType.MARKET,
        reservedById: cinderListing.id,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: mossListingItem.id },
      data: {
        state: InventoryItemState.RESERVED,
        reservedByType: ReservationType.MARKET,
        reservedById: mossListing.id,
      },
    }),
  ]);

  await prisma.economyLedgerEntry.createMany({
    data: [
      {
        guildId: cinderGuild.id,
        eventType: EconomyEventType.CONTRACT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: "contract:cinder-showcase",
        goldDelta: 58,
        resourceType: ResourceType.ARCANE_DUST,
        resourceDelta: 3,
        createdAt: hoursAgo(26),
      },
      {
        guildId: cinderGuild.id,
        eventType: EconomyEventType.MARKET_LISTING_FEE,
        referenceType: ReferenceType.MARKET_LISTING,
        referenceId: cinderListing.id,
        goldDelta: -3,
        createdAt: hoursAgo(5),
      },
      {
        guildId: cinderGuild.id,
        eventType: EconomyEventType.BUY_ORDER_POSTED,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: cinderBuyOrder.id,
        goldDelta: -84,
        resourceType: ResourceType.ARCANE_DUST,
        createdAt: hoursAgo(4),
      },
      {
        guildId: cinderGuild.id,
        eventType: EconomyEventType.TRADE_COMPLETED,
        referenceType: ReferenceType.TRADE_OFFER,
        referenceId: "cinder-private-deal",
        goldDelta: 0,
        resourceType: ResourceType.LEATHER,
        resourceDelta: 5,
        counterpartyGuildId: rivalGuild.id,
        createdAt: hoursAgo(9),
      },
      {
        guildId: cinderGuild.id,
        eventType: EconomyEventType.EXPEDITION_REWARD,
        referenceType: ReferenceType.EXPEDITION,
        referenceId: cinderExpedition.id,
        goldDelta: 96,
        resourceType: ResourceType.IRON_ORE,
        resourceDelta: 8,
        createdAt: daysAgo(2),
      },
      {
        guildId: cinderGuild.id,
        eventType: EconomyEventType.WORLD_EVENT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: buildWorldEventReferenceId("frontier-surge", "bronze"),
        goldDelta: 26,
        resourceType: ResourceType.ARCANE_DUST,
        resourceDelta: 1,
        createdAt: hoursAgo(6.5),
      },
      {
        guildId: mossGuild.id,
        eventType: EconomyEventType.CONTRACT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: "contract:moss-scouting",
        goldDelta: 24,
        resourceType: ResourceType.HERBS,
        resourceDelta: 4,
        createdAt: hoursAgo(20),
      },
      {
        guildId: mossGuild.id,
        eventType: EconomyEventType.MARKET_LISTING_FEE,
        referenceType: ReferenceType.MARKET_LISTING,
        referenceId: mossListing.id,
        goldDelta: -3,
        createdAt: hoursAgo(3),
      },
      {
        guildId: mossGuild.id,
        eventType: EconomyEventType.BUY_ORDER_POSTED,
        referenceType: ReferenceType.BUY_ORDER,
        referenceId: mossBuyOrder.id,
        goldDelta: -30,
        resourceType: ResourceType.HERBS,
        createdAt: hoursAgo(2),
      },
      {
        guildId: mossGuild.id,
        eventType: EconomyEventType.TRADE_COMPLETED,
        referenceType: ReferenceType.TRADE_OFFER,
        referenceId: "moss-private-deal",
        goldDelta: 0,
        resourceType: ResourceType.ARCANE_DUST,
        resourceDelta: 2,
        counterpartyGuildId: demoGuild.id,
        createdAt: hoursAgo(12),
      },
      {
        guildId: mossGuild.id,
        eventType: EconomyEventType.EXPEDITION_REWARD,
        referenceType: ReferenceType.EXPEDITION,
        referenceId: mossExpedition.id,
        goldDelta: 42,
        resourceType: ResourceType.HERBS,
        resourceDelta: 6,
        createdAt: daysAgo(1),
      },
      {
        guildId: mossGuild.id,
        eventType: EconomyEventType.WORLD_EVENT_REWARD,
        referenceType: ReferenceType.SYSTEM,
        referenceId: buildWorldEventReferenceId("forge-drive", "bronze"),
        goldDelta: 20,
        resourceType: ResourceType.IRON_ORE,
        resourceDelta: 4,
        createdAt: hoursAgo(4.5),
      },
    ],
  });

  console.log("Foundation seed completed for Guild Exchange.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
