import {
  BuyOrderStatus,
  ExpeditionStatus,
  GuildUpgradeType,
  ListingType,
  MarketClaimSourceType,
  MarketClaimStatus,
  MarketClaimType,
  MarketListingStatus,
  ResourceType,
  TradeOfferStatus,
} from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  acceptTradeOfferForDemoGuild,
  buyMarketListingForDemoGuild,
  claimExpeditionForDemoGuild,
  claimGuildContractRewardForDemoGuild,
  claimMarketClaimForDemoGuild,
  claimWorldEventRewardForDemoGuild,
  createBuyOrderForDemoGuild,
  createMarketListingForDemoGuild,
  createTradeOfferForDemoGuild,
  fulfillBuyOrderForDemoGuild,
  getDashboardPageData,
  getDealsPageData,
  getGuildDirectoryPageData,
  getGuildPublicProfilePageData,
  getExpeditionPageData,
  getInventoryPageData,
  getMarketPageData,
  purchaseGuildUpgradeForDemoGuild,
  startExpeditionForDemoGuild,
  upgradeInventoryItemForDemoGuild,
} from "@/server/game";
import { setActiveDemoGuildTag, setActivePlayContext } from "@/server/foundation";
import { followGuildForCurrentContext, unfollowGuildForCurrentContext } from "@/server/social";
import { disconnectTestDatabase, resetTestDatabase } from "../helpers/test-db";
import { unwrapFoundationResult } from "../helpers/result";
import { resetMockCookies } from "../mocks/next-headers";

async function setDemoContext(guildTag: "DEMO" | "RIVL") {
  await setActiveDemoGuildTag(guildTag);
  await setActivePlayContext("demo");
}

async function requireGuildId(guildTag: "DEMO" | "RIVL") {
  const guild = await prisma.guild.findUnique({
    where: { tag: guildTag },
    select: { id: true },
  });

  if (!guild) {
    throw new Error(`Гильдия ${guildTag} не найдена в seed-данных.`);
  }

  return guild.id;
}

describe("gameplay/economy integration", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  beforeEach(() => {
    resetMockCookies();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  test("covers expedition, market, buy orders, workshop, deals and contracts loops", async () => {
    const demoGuildId = await requireGuildId("DEMO");
    const rivalGuildId = await requireGuildId("RIVL");

    await setDemoContext("DEMO");

    const expeditionPage = unwrapFoundationResult(await getExpeditionPageData());
    const location = expeditionPage.locations.find((entry) => entry.isUnlocked);

    if (!location) {
      throw new Error("Не удалось найти открытую локацию для expedition smoke-теста.");
    }

    const heroIds = expeditionPage.availableHeroes.slice(0, 3).map((hero) => hero.id);
    expect(heroIds).toHaveLength(3);

    const expeditionStartMessage = await startExpeditionForDemoGuild({
      locationId: location.id,
      heroIds,
    });
    expect(expeditionStartMessage).toContain("Экспедиция");

    const activeExpedition = await prisma.expedition.findFirst({
      where: {
        guildId: demoGuildId,
        status: ExpeditionStatus.ACTIVE,
      },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });

    if (!activeExpedition) {
      throw new Error("Запущенная экспедиция не найдена в БД.");
    }

    await prisma.expedition.update({
      where: { id: activeExpedition.id },
      data: { endsAt: new Date(Date.now() - 1_000) },
    });

    const expeditionAfterMaintenance = unwrapFoundationResult(await getExpeditionPageData());
    const completedExpedition = expeditionAfterMaintenance.expeditions.find(
      (entry) => entry.id === activeExpedition.id,
    );
    expect(completedExpedition?.status).toBe(ExpeditionStatus.COMPLETED);

    const expeditionClaimMessage = await claimExpeditionForDemoGuild({
      expeditionId: activeExpedition.id,
    });
    expect(expeditionClaimMessage.length).toBeGreaterThan(0);

    const claimedExpedition = await prisma.expedition.findUnique({
      where: { id: activeExpedition.id },
      select: { status: true },
    });
    expect(claimedExpedition?.status).toBe(ExpeditionStatus.CLAIMED);

    const listingMessage = await createMarketListingForDemoGuild({
      listingType: ListingType.RESOURCE,
      resourceType: ResourceType.LEATHER,
      quantity: 2,
      totalPriceGold: 14,
    });
    expect(listingMessage).toContain("выставлен");

    const createdListing = await prisma.marketListing.findFirst({
      where: {
        sellerGuildId: demoGuildId,
        status: MarketListingStatus.ACTIVE,
        listingType: ListingType.RESOURCE,
        resourceType: ResourceType.LEATHER,
        quantity: 2,
        totalPriceGold: 14,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!createdListing) {
      throw new Error("Созданный рыночный лот не найден.");
    }

    await setDemoContext("RIVL");
    const buyListingMessage = await buyMarketListingForDemoGuild({
      listingId: createdListing.id,
    });
    expect(buyListingMessage).toContain("куплен");

    await setDemoContext("DEMO");
    const sellerClaim = await prisma.marketClaim.findFirst({
      where: {
        listingId: createdListing.id,
        guildId: demoGuildId,
        status: MarketClaimStatus.PENDING,
        claimType: MarketClaimType.GOLD,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!sellerClaim) {
      throw new Error("Claim по продаже не найден.");
    }

    const sellerClaimMessage = await claimMarketClaimForDemoGuild({
      claimId: sellerClaim.id,
    });
    expect(sellerClaimMessage).toContain("получено");

    const sellerClaimStatus = await prisma.marketClaim.findUnique({
      where: { id: sellerClaim.id },
      select: { status: true },
    });
    expect(sellerClaimStatus?.status).toBe(MarketClaimStatus.CLAIMED);

    const buyOrderCreateMessage = await createBuyOrderForDemoGuild({
      resourceType: ResourceType.ARCANE_DUST,
      quantity: 2,
      totalPriceGold: 18,
    });
    expect(buyOrderCreateMessage).toContain("Заявка");

    const createdBuyOrder = await prisma.buyOrder.findFirst({
      where: {
        buyerGuildId: demoGuildId,
        status: BuyOrderStatus.ACTIVE,
        resourceType: ResourceType.ARCANE_DUST,
        quantity: 2,
        totalPriceGold: 18,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!createdBuyOrder) {
      throw new Error("Созданный buy order не найден.");
    }

    await setDemoContext("RIVL");
    const fulfillMessage = await fulfillBuyOrderForDemoGuild({
      orderId: createdBuyOrder.id,
    });
    expect(fulfillMessage).toContain("исполнена");

    const fulfillerClaim = await prisma.marketClaim.findFirst({
      where: {
        guildId: rivalGuildId,
        buyOrderId: createdBuyOrder.id,
        status: MarketClaimStatus.PENDING,
        sourceType: MarketClaimSourceType.FILLED_BUY_ORDER,
        claimType: MarketClaimType.GOLD,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!fulfillerClaim) {
      throw new Error("Payout claim для исполнителя buy order не найден.");
    }

    await claimMarketClaimForDemoGuild({ claimId: fulfillerClaim.id });

    const contractBoardSnapshot = unwrapFoundationResult(await getDashboardPageData());
    const brokeredDemand = contractBoardSnapshot.contractBoard.entries.find(
      (entry) => entry.key === "brokered-demand",
    );

    expect(brokeredDemand?.status).toBe("ready");

    const contractClaimMessage = await claimGuildContractRewardForDemoGuild({
      contractKey: "brokered-demand",
    });
    expect(contractClaimMessage).toContain("Награда");

    const contractBoardAfterClaim = unwrapFoundationResult(await getDashboardPageData());
    const brokeredDemandAfterClaim = contractBoardAfterClaim.contractBoard.entries.find(
      (entry) => entry.key === "brokered-demand",
    );
    expect(brokeredDemandAfterClaim?.status).toBe("claimed");

    await setDemoContext("DEMO");
    const tradeCreateMessage = await createTradeOfferForDemoGuild({
      receiverGuildTag: "RIVL",
      offeredResourceType: ResourceType.HERBS,
      offeredQuantity: 2,
      requestedResourceType: ResourceType.LEATHER,
      requestedQuantity: 2,
    });
    expect(tradeCreateMessage).toContain("Сделка отправлена");

    const createdTradeOffer = await prisma.tradeOffer.findFirst({
      where: {
        senderGuildId: demoGuildId,
        receiverGuildId: rivalGuildId,
        status: TradeOfferStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!createdTradeOffer) {
      throw new Error("Созданный trade offer не найден.");
    }

    await setDemoContext("RIVL");
    const acceptTradeMessage = await acceptTradeOfferForDemoGuild({
      offerId: createdTradeOffer.id,
    });
    expect(acceptTradeMessage).toContain("успешно");

    const acceptedTrade = await prisma.tradeOffer.findUnique({
      where: { id: createdTradeOffer.id },
      select: { status: true },
    });
    expect(acceptedTrade?.status).toBe(TradeOfferStatus.ACCEPTED);

    await setDemoContext("DEMO");
    let inventoryPage = unwrapFoundationResult(await getInventoryPageData());

    if (!inventoryPage.workshop.candidates.some((entry) => entry.canUpgrade)) {
      await purchaseGuildUpgradeForDemoGuild(GuildUpgradeType.STORAGE);
      inventoryPage = unwrapFoundationResult(await getInventoryPageData());
    }

    const workshopCandidate = inventoryPage.workshop.candidates.find((entry) => entry.canUpgrade);

    if (!workshopCandidate) {
      throw new Error("Не найден предмет для workshop upgrade в smoke-тесте.");
    }

    const workshopItemBefore = await prisma.inventoryItem.findUnique({
      where: { id: workshopCandidate.id },
      select: {
        workshopLevel: true,
        boundToGuild: true,
      },
    });

    if (!workshopItemBefore) {
      throw new Error("Предмет для workshop upgrade не найден в БД.");
    }

    const workshopUpgradeMessage = await upgradeInventoryItemForDemoGuild({
      itemId: workshopCandidate.id,
    });
    expect(workshopUpgradeMessage).toContain("усилен");

    const workshopItemAfter = await prisma.inventoryItem.findUnique({
      where: { id: workshopCandidate.id },
      select: {
        workshopLevel: true,
        boundToGuild: true,
      },
    });

    expect(workshopItemAfter?.workshopLevel).toBeGreaterThan(workshopItemBefore.workshopLevel);
    expect(workshopItemAfter?.boundToGuild).toBe(true);

    const worldEventRewardMessage = await claimWorldEventRewardForDemoGuild({
      eventKey: "forge-drive",
      tierKey: "bronze",
    });
    expect(worldEventRewardMessage).toContain("Forge Drive");

    const dashboardAfterWorldEventClaim = unwrapFoundationResult(await getDashboardPageData());
    const forgeDrive = dashboardAfterWorldEventClaim.worldEventBoard.events.find((event) => event.key === "forge-drive");
    expect(forgeDrive?.rewardTiers.find((tier) => tier.key === "bronze")?.status).toBe("claimed");
    expect(forgeDrive?.rewardTiers.some((tier) => tier.status === "claimable")).toBe(true);

    const followResult = await followGuildForCurrentContext("RIVL");
    expect(followResult.guildTag).toBe("RIVL");

    const marketPage = unwrapFoundationResult(await getMarketPageData());
    const dealsPage = unwrapFoundationResult(await getDealsPageData());
    const directoryPage = unwrapFoundationResult(await getGuildDirectoryPageData());
    const dashboardWithWatchlist = unwrapFoundationResult(await getDashboardPageData());
    const profilePage = unwrapFoundationResult(await getGuildPublicProfilePageData("DEMO"));
    expect(marketPage.ruleSummary.length).toBeGreaterThan(0);
    expect(dealsPage.ruleSummary.length).toBeGreaterThan(0);
    expect(marketPage.guildPrestige?.prestige.score ?? 0).toBeGreaterThan(0);
    expect(marketPage.guildPrestige?.renown.score ?? 0).toBeGreaterThan(0);
    expect(marketPage.guildPrestige?.favoriteCounterparties.length ?? 0).toBeGreaterThan(0);
    expect(marketPage.worldEventBoard.events.some((event) => event.relatedRoutes.includes("market"))).toBe(true);
    expect(dashboardAfterWorldEventClaim.worldEventBoard.summary.claimableRewardCount).toBeGreaterThanOrEqual(0);
    expect(dashboardAfterWorldEventClaim.guildPrestige?.renown.recurringCounterparties ?? 0).toBeGreaterThan(0);
    expect(directoryPage.leaderboards.some((leaderboard) => leaderboard.key === "prestige")).toBe(true);
    expect(directoryPage.leaderboards.some((leaderboard) => leaderboard.key === "renown")).toBe(true);
    expect(directoryPage.worldEventBoard.events).toHaveLength(3);
    expect(directoryPage.guilds.some((guild) => guild.prestige.badges.length > 0)).toBe(true);
    expect(directoryPage.guilds.some((guild) => guild.favoriteCounterparties.length > 0)).toBe(true);
    expect(directoryPage.watchlist.watchedGuildTags).toContain("RIVL");
    expect(directoryPage.guilds.find((guild) => guild.guildTag === "RIVL")?.isWatched).toBe(true);
    expect(dashboardWithWatchlist.watchlist.watchedGuildTags).toContain("RIVL");
    expect(dashboardWithWatchlist.followedGuilds.some((guild) => guild.guildTag === "RIVL")).toBe(true);
    expect(dashboardWithWatchlist.personalizedFeed.entries.some((entry) => entry.guildTag === "RIVL")).toBe(true);
    expect(profilePage.prestige.rankingContributions.length).toBe(5);
    expect(profilePage.renown.rankingContributions.length).toBe(4);
    expect(profilePage.favoriteTraders.length).toBeGreaterThan(0);
    expect(profilePage.socialMemory.length).toBeGreaterThan(0);
    expect(profilePage.recentActivity.length).toBeGreaterThan(0);
    expect(profilePage.worldEventBoard.events.some((event) => event.focusGuild?.guildTag === "DEMO")).toBe(true);

    await unfollowGuildForCurrentContext("RIVL");
    const dashboardWithoutWatchlist = unwrapFoundationResult(await getDashboardPageData());
    expect(dashboardWithoutWatchlist.watchlist.watchedGuildTags).not.toContain("RIVL");
  });
});
