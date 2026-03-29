"use server";

import { GuildUpgradeType, ListingType, ResourceType, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DEMO_GUILD_TAG } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import {
  acceptTradeOfferForDemoGuild,
  buyMarketListingForDemoGuild,
  cancelBuyOrderForDemoGuild,
  cancelMarketListingForDemoGuild,
  cancelTradeOfferForDemoGuild,
  claimExpeditionForDemoGuild,
  claimGuildContractRewardForDemoGuild,
  claimMarketClaimForDemoGuild,
  claimWorldEventRewardForDemoGuild,
  createBuyOrderForDemoGuild,
  createMarketListingForDemoGuild,
  createTradeOfferForDemoGuild,
  equipItemForDemoGuild,
  fulfillBuyOrderForDemoGuild,
  purchaseGuildUpgradeForDemoGuild,
  purchaseHeroSlotsUpgradeForDemoGuild,
  rejectTradeOfferForDemoGuild,
  recruitHeroForDemoGuild,
  startExpeditionForDemoGuild,
  unequipItemForDemoGuild,
  upgradeInventoryItemForDemoGuild,
} from "@/server/game";
import {
  createUserSession,
  deleteCurrentUserSession,
  getCurrentSessionViewer,
  normalizeCredentialsEmail,
  verifyPassword,
} from "@/server/auth";
import { createStarterAccount } from "@/server/bootstrap";
import {
  describeFoundationError,
  getActiveDemoGuildIdentity,
  setActivePlayContext,
  setActiveDemoGuildTag,
} from "@/server/foundation";

type StatusTone = "success" | "warning" | "danger";
type SupportedGuildUpgradeType =
  | "HERO_SLOTS"
  | "STORAGE"
  | "MARKET_SLOTS"
  | "TRADE_SLOTS";

const SAFE_REDIRECTS = new Set([
  "/",
  "/dashboard",
  "/heroes",
  "/heroes/party",
  "/expedition",
  "/inventory",
  "/market",
  "/deals",
  "/guilds",
]);

function isResourceType(value: string | null): value is ResourceType {
  return value !== null && Object.values(ResourceType).includes(value as ResourceType);
}

function isGuildUpgradeType(value: string | null): value is SupportedGuildUpgradeType {
  return (
    value === GuildUpgradeType.HERO_SLOTS ||
    value === GuildUpgradeType.STORAGE ||
    value === GuildUpgradeType.MARKET_SLOTS ||
    value === GuildUpgradeType.TRADE_SLOTS
  );
}

function getRedirectPath(formData: FormData, fallback: string) {
  const redirectTo = formData.get("redirectTo");

  if (typeof redirectTo === "string" && SAFE_REDIRECTS.has(redirectTo)) {
    return redirectTo;
  }

  return fallback;
}

function buildRedirectUrl(path: string, tone: StatusTone, message: string) {
  const params = new URLSearchParams();
  params.set("status", tone);
  params.set("message", message);
  return `${path}?${params.toString()}`;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readEmail(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? normalizeCredentialsEmail(value) : null;
}

function readPositiveInt(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function revalidateMany(paths: string[]) {
  paths.forEach((path) => {
    revalidatePath(path);
  });
}

function isValidEmail(value: string | null): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

function describeAuthFlowError(error: unknown) {
  const knownError = error as { code?: string };

  if (knownError?.code === "P2002") {
    return "Аккаунт с таким email уже существует.";
  }

  return describeFoundationError(error);
}

export async function signup(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const displayName = readString(formData, "displayName");
    const guildName = readString(formData, "guildName");
    const email = readEmail(formData, "email");
    const password = readString(formData, "password");

    if (!displayName || displayName.length < 2) {
      throw new Error("Укажите display name длиной минимум 2 символа.");
    }

    if (!guildName || guildName.length < 2) {
      throw new Error("Укажите название гильдии длиной минимум 2 символа.");
    }

    if (!isValidEmail(email)) {
      throw new Error("Укажите корректный email для локального аккаунта.");
    }

    if (!password || password.length < 8) {
      throw new Error("Пароль должен содержать минимум 8 символов.");
    }

    const account = await createStarterAccount({
      displayName,
      guildName,
      email,
      password,
    });

    await createUserSession(account.userId);
    await setActivePlayContext("user");
    revalidatePath("/", "layout");
    revalidateMany(["/", "/dashboard", "/heroes", "/heroes/party", "/expedition", "/inventory", "/market", "/deals"]);
    message = `Аккаунт создан: ${account.guildName} [${account.guildTag}] готова к игре.`;
  } catch (error) {
    tone = "danger";
    message = describeAuthFlowError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function login(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const email = readEmail(formData, "email");
    const password = readString(formData, "password");

    if (!isValidEmail(email)) {
      throw new Error("Укажите корректный email.");
    }

    if (!password || password.length < 8) {
      throw new Error("Введите пароль длиной минимум 8 символов.");
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        status: true,
        displayName: true,
        passwordHash: true,
        guild: {
          select: {
            name: true,
            tag: true,
          },
        },
      },
    });

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new Error("Неверный email или пароль.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error("Аккаунт временно отключён.");
    }

    if (!user.guild) {
      throw new Error("Для аккаунта не найдена стартовая гильдия.");
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    await createUserSession(user.id);
    await setActivePlayContext("user");
    revalidatePath("/", "layout");
    revalidateMany(["/", "/dashboard", "/heroes", "/heroes/party", "/expedition", "/inventory", "/market", "/deals"]);
    message = `Сессия открыта: ${user.guild.name} [${user.guild.tag}].`;
  } catch (error) {
    tone = "danger";
    message = describeAuthFlowError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function logout(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/");
  let tone: StatusTone = "success";
  let message = "Сессия завершена. Demo sandbox остаётся доступным локально.";

  try {
    await deleteCurrentUserSession();
    await setActivePlayContext("demo");
    revalidatePath("/", "layout");
  } catch (error) {
    tone = "danger";
    message = describeAuthFlowError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function openDemoSandbox(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const guildTag = readString(formData, "guildTag");
    const guild = guildTag ? await setActiveDemoGuildTag(guildTag) : await getActiveDemoGuildIdentity();

    await setActivePlayContext("demo");
    revalidatePath("/", "layout");
    revalidatePath(redirectPath);
    message = `Открыт demo sandbox: ${guild.name} [${guild.tag}].`;
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function returnToAuthenticatedGuild(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const viewer = await getCurrentSessionViewer();

    if (!viewer?.guild) {
      throw new Error("Активная account-сессия не найдена.");
    }

    await setActivePlayContext("user");
    revalidatePath("/", "layout");
    revalidatePath(redirectPath);
    message = `Возвращён личный контекст: ${viewer.guild.name} [${viewer.guild.tag}].`;
  } catch (error) {
    tone = "danger";
    message = describeAuthFlowError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function createAccount(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const guild = await getActiveDemoGuildIdentity();
    message = `Demo-flow уже активен: выбрана гильдия ${guild.name} [${guild.tag}].`;
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function createStarterGuild(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const guild = await setActiveDemoGuildTag(DEMO_GUILD_TAG);
    await setActivePlayContext("demo");
    revalidatePath("/", "layout");
    revalidatePath(redirectPath);
    message = `Активная demo-гильдия сброшена на ${guild.name} [${guild.tag}].`;
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function switchActiveGuild(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const guildTag = readString(formData, "guildTag");

    if (!guildTag) {
      throw new Error("Гильдия для переключения не передана.");
    }

    const currentGuild = await getActiveDemoGuildIdentity();

      if (currentGuild.tag === guildTag) {
        message = `Активная гильдия уже ${currentGuild.name} [${currentGuild.tag}].`;
      } else {
        const guild = await setActiveDemoGuildTag(guildTag);
        await setActivePlayContext("demo");
        revalidatePath("/", "layout");
        revalidatePath(redirectPath);
        message = `Активная гильдия переключена на ${guild.name} [${guild.tag}].`;
      }
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function equipItemToHero(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/heroes");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const heroId = readString(formData, "heroId");
    const itemId = readString(formData, "itemId");

    if (!heroId || !itemId) {
      throw new Error("Выберите героя и предмет для экипировки.");
    }

    message = await equipItemForDemoGuild({ heroId, itemId });
    revalidateMany(["/heroes", "/heroes/party", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function unequipItemFromHero(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/heroes");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const itemId = readString(formData, "itemId");

    if (!itemId) {
      throw new Error("Предмет для снятия не передан.");
    }

    message = await unequipItemForDemoGuild({ itemId });
    revalidateMany(["/heroes", "/heroes/party", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function upgradeInventoryItem(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/inventory");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const itemId = readString(formData, "itemId");

    if (!itemId) {
      throw new Error("Предмет для workshop-усиления не передан.");
    }

    message = await upgradeInventoryItemForDemoGuild({ itemId });
    revalidateMany(["/inventory", "/heroes", "/heroes/party", "/dashboard", "/market", "/deals"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function recruitHero(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/heroes");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const candidateKey = readString(formData, "candidateKey");

    if (!candidateKey) {
      throw new Error("Рекрут для найма не передан.");
    }

    message = await recruitHeroForDemoGuild({ candidateKey });
    revalidateMany(["/", "/dashboard", "/heroes", "/heroes/party", "/expedition"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function purchaseHeroSlotsUpgrade(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/heroes");
  let tone: StatusTone = "success";
  let message = "";

  try {
    message = await purchaseHeroSlotsUpgradeForDemoGuild();
    revalidateMany(["/", "/dashboard", "/heroes", "/heroes/party", "/expedition", "/market", "/deals"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function startExpedition(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/expedition");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const locationId = readString(formData, "locationId");
    const heroIds = formData
      .getAll("heroIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    if (!locationId) {
      throw new Error("Выберите локацию для экспедиции.");
    }

    message = await startExpeditionForDemoGuild({ locationId, heroIds });
    revalidateMany(["/dashboard", "/expedition", "/heroes"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function claimExpeditionRewards(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/expedition");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const expeditionId = readString(formData, "expeditionId");

    if (!expeditionId) {
      throw new Error("Экспедиция для claim не передана.");
    }

    message = await claimExpeditionForDemoGuild({ expeditionId });
    revalidateMany(["/dashboard", "/expedition", "/inventory"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function claimGuildContract(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const contractKey = readString(formData, "contractKey");

    if (!contractKey) {
      throw new Error("Контракт для claim не передан.");
    }

    message = await claimGuildContractRewardForDemoGuild({ contractKey });
    revalidateMany(["/dashboard", "/expedition", "/market", "/inventory", "/heroes"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function claimWorldEventReward(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const eventKey = readString(formData, "eventKey");
    const tierKey = readString(formData, "tierKey");

    if (!eventKey || !tierKey) {
      throw new Error("Параметры seasonal reward не переданы.");
    }

    message = await claimWorldEventRewardForDemoGuild({ eventKey, tierKey });
    revalidateMany(["/", "/dashboard", "/expedition", "/market", "/guilds"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function createMarketListing(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const listingType = readString(formData, "listingType");
    const totalPriceGold = readPositiveInt(formData, "totalPriceGold");

    if (listingType === ListingType.ITEM) {
      message = await createMarketListingForDemoGuild({
        listingType: ListingType.ITEM,
        inventoryItemId: readString(formData, "inventoryItemId"),
        quantity: 1,
        totalPriceGold,
      });
    } else if (listingType === ListingType.RESOURCE) {
      const resourceTypeRaw = readString(formData, "resourceType");

      if (!isResourceType(resourceTypeRaw)) {
        throw new Error("Выберите корректный ресурс для продажи.");
      }

      message = await createMarketListingForDemoGuild({
        listingType: ListingType.RESOURCE,
        resourceType: resourceTypeRaw,
        quantity: readPositiveInt(formData, "quantity"),
        totalPriceGold,
      });
    } else {
      throw new Error("Неподдерживаемый тип лота.");
    }

    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function buyMarketListing(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const listingId = readString(formData, "listingId");

    if (!listingId) {
      throw new Error("Лот не передан.");
    }

    message = await buyMarketListingForDemoGuild({ listingId });
    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function cancelMarketListing(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const listingId = readString(formData, "listingId");

    if (!listingId) {
      throw new Error("Лот не передан.");
    }

    message = await cancelMarketListingForDemoGuild({ listingId });
    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function createBuyOrder(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const resourceTypeRaw = readString(formData, "resourceType");

    if (!isResourceType(resourceTypeRaw)) {
      throw new Error("Выберите корректный ресурс для заявки.");
    }

    message = await createBuyOrderForDemoGuild({
      resourceType: resourceTypeRaw,
      quantity: readPositiveInt(formData, "quantity"),
      totalPriceGold: readPositiveInt(formData, "totalPriceGold"),
    });
    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function fulfillBuyOrder(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const orderId = readString(formData, "orderId");

    if (!orderId) {
      throw new Error("Заявка не передана.");
    }

    message = await fulfillBuyOrderForDemoGuild({ orderId });
    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function cancelBuyOrder(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const orderId = readString(formData, "orderId");

    if (!orderId) {
      throw new Error("Заявка не передана.");
    }

    message = await cancelBuyOrderForDemoGuild({ orderId });
    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function claimMarketClaim(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/market");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const claimId = readString(formData, "claimId");

    if (!claimId) {
      throw new Error("Claim не передан.");
    }

    message = await claimMarketClaimForDemoGuild({ claimId });
    revalidateMany(["/market", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function createTradeOffer(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/deals");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const offeredResourceRaw = readString(formData, "offeredResourceType");
    const requestedResourceRaw = readString(formData, "requestedResourceType");

    message = await createTradeOfferForDemoGuild({
      receiverGuildTag: readString(formData, "receiverGuildTag") ?? "",
      message: readString(formData, "message") ?? undefined,
      offeredItemId: readString(formData, "offeredItemId"),
      offeredResourceType: isResourceType(offeredResourceRaw) ? offeredResourceRaw : null,
      offeredQuantity: readPositiveInt(formData, "offeredQuantity"),
      requestedItemId: readString(formData, "requestedItemId"),
      requestedResourceType: isResourceType(requestedResourceRaw)
        ? requestedResourceRaw
        : null,
      requestedQuantity: readPositiveInt(formData, "requestedQuantity"),
    });
    revalidateMany(["/deals", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function acceptTradeOffer(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/deals");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const offerId = readString(formData, "offerId");

    if (!offerId) {
      throw new Error("Сделка не передана.");
    }

    message = await acceptTradeOfferForDemoGuild({ offerId });
    revalidateMany(["/deals", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function rejectTradeOffer(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/deals");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const offerId = readString(formData, "offerId");

    if (!offerId) {
      throw new Error("Сделка не передана.");
    }

    message = await rejectTradeOfferForDemoGuild({ offerId });
    revalidateMany(["/deals", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function cancelTradeOffer(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/deals");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const offerId = readString(formData, "offerId");

    if (!offerId) {
      throw new Error("Сделка не передана.");
    }

    message = await cancelTradeOfferForDemoGuild({ offerId });
    revalidateMany(["/deals", "/inventory", "/dashboard"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}

export async function purchaseGuildUpgrade(formData: FormData) {
  const redirectPath = getRedirectPath(formData, "/dashboard");
  let tone: StatusTone = "success";
  let message = "";

  try {
    const requestedUpgradeType = readString(formData, "upgradeType");
    const upgradeType: SupportedGuildUpgradeType = isGuildUpgradeType(requestedUpgradeType)
      ? requestedUpgradeType
      : "MARKET_SLOTS";

    message = await purchaseGuildUpgradeForDemoGuild(upgradeType);
    revalidateMany(["/", "/dashboard", "/heroes", "/heroes/party", "/expedition", "/market", "/deals"]);
  } catch (error) {
    tone = "danger";
    message = describeFoundationError(error);
  }

  redirect(buildRedirectUrl(redirectPath, tone, message));
}
