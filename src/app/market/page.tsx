import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import {
  type PageSearchParams,
  formatDateTime,
  formatNumber,
  readActionFeedback,
  readSearchParam,
} from "@/lib/format";
import {
  buyMarketListing,
  cancelBuyOrder,
  cancelMarketListing,
  claimGuildContract,
  claimMarketClaim,
  claimWorldEventReward,
  createBuyOrder,
  createMarketListing,
  fulfillBuyOrder,
} from "@/server/actions/foundation";
import { getMarketPageData } from "@/server/game";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const params = await searchParams;
  const spotlightGuildTag = readSearchParam(params, "guild");
  const snapshot = await getMarketPageData(spotlightGuildTag);
  const feedback = readActionFeedback(params);

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Marketplace"
          title="Рынок временно недоступен"
          description="Экран fixed-price рынка не может загрузить локальные игровые данные."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Инициализируйте базу через `npm run db:setup`, чтобы увидеть лоты, request board и claim box.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;
  const recommendedAction = data.onboarding.recommendedAction;
  const listingMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "list-market-lot") ?? null;
  const marketContracts = data.contractBoard.entries.filter((contract) =>
    contract.relatedRoutes.includes("market"),
  );
  const marketSeasonEvents = data.worldEventBoard.events.filter((event) => event.relatedRoutes.includes("market"));
  const activeItemListings = data.activeListings.filter((listing) => listing.listingTypeLabel === "Предмет").length;
  const highlightedListingsCount = data.highlightedGuildContext
    ? data.activeListings.filter((listing) => listing.sellerGuildTag === data.highlightedGuildContext?.tag).length
    : 0;
  const highlightedBuyOrdersCount = data.highlightedGuildContext
    ? data.activeBuyOrders.filter((order) => order.buyerGuildTag === data.highlightedGuildContext?.tag).length
    : 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Marketplace"
        title={`${data.guildName} [${data.guildTag}] · market + request board`}
        description="Экран читается из перспективы активной гильдии: свои fixed-price лоты, resource buy orders, claim box и обе history-ленты переключаются вместе с guild context."
        badges={
          <>
            <Pill tone={data.marketUnlocked ? "success" : "warning"}>{data.marketUnlocked ? "Market open" : "Market locked"}</Pill>
            <Pill tone={data.claimBox.length > 0 ? "success" : "accent"}>{`${data.claimBox.length} claim`}</Pill>
            {data.highlightedGuildContext ? <Pill tone="accent">Spotlight {data.highlightedGuildContext.tag}</Pill> : null}
          </>
        }
        meta={
          <>
            <span>{data.activeListings.length} активных лотов</span>
            <span>• {data.activeBuyOrders.length} buy orders</span>
            <span>• {data.fulfillableBuyOrders.length} можно закрыть прямо сейчас</span>
          </>
        }
        actions={
          <>
            <Link className="button button--primary" href="/inventory">
              Открыть инвентарь
            </Link>
            {data.highlightedGuildContext ? (
              <Link className="button button--ghost" href={data.highlightedGuildContext.profileHref}>
                Профиль {data.highlightedGuildContext.tag}
              </Link>
            ) : null}
            <Link className="button button--ghost" href="/dashboard">
              На dashboard
            </Link>
          </>
        }
      />

      {feedback ? <Notice title="Результат действия" tone={feedback.tone}>{feedback.message}</Notice> : null}

      <Notice title="Текущая перспектива" tone="accent">
        Активная перспектива: {data.guildName} [{data.guildTag}]. Метка «Ваш лот» и весь claim box
        относятся только к этой гильдии. В account-режиме это ваши реальные данные, а в demo sandbox
        shell позволяет быстро переключать встречную сторону тех же sell / request scenarios.
      </Notice>

      {data.guildPrestige ? (
        <Notice title="Prestige" tone={data.guildPrestige.prestige.tone}>
          <strong>{data.guildPrestige.prestige.tierLabel}.</strong> {data.guildPrestige.prestige.spotlight}
        </Notice>
      ) : null}

      {data.guildPrestige ? (
        <Notice title="Renown" tone={data.guildPrestige.renown.tone}>
          <strong>{data.guildPrestige.renown.tierLabel}.</strong> {data.guildPrestige.renown.spotlight}
        </Notice>
      ) : null}

      {data.highlightedGuildContext ? (
        <Notice title="Guild in focus" tone="success">
          Публичный контекст {data.highlightedGuildContext.name} [{data.highlightedGuildContext.tag}] уже
          подмешан в рынок: в фокусе {highlightedListingsCount} лотов и {highlightedBuyOrdersCount} buy
          orders этой гильдии. Это мягкий social bridge от public profile к реальному взаимодействию.
          {data.highlightedGuildContext.prestige
            ? ` ${data.highlightedGuildContext.prestige.tierLabel} · ${data.highlightedGuildContext.prestige.primaryBadgeLabel ?? data.highlightedGuildContext.prestige.descriptor}.`
            : ""}
          {data.highlightedGuildContext.renown
            ? ` ${data.highlightedGuildContext.renown.tierLabel} · ${data.highlightedGuildContext.relationshipLabel ?? data.highlightedGuildContext.renown.primaryPerkLabel ?? data.highlightedGuildContext.renown.recurringLabel}.`
            : ""}
        </Notice>
      ) : null}

      {recommendedAction?.href === "/market" ? (
        <Notice title="Market objective" tone={recommendedAction.tone}>
          <strong>{recommendedAction.title}.</strong> {recommendedAction.summary} {recommendedAction.reason}
        </Notice>
      ) : listingMilestone && listingMilestone.status !== "completed" ? (
        <Notice title="Первый лот" tone={listingMilestone.tone}>
          <strong>{listingMilestone.title}.</strong> {listingMilestone.summary} {listingMilestone.blockers[0] ?? "Рынок уже готов к первому лоту."}
        </Notice>
      ) : null}

      {marketSeasonEvents[0] ? (
        <Notice title="Seasonal pressure" tone={marketSeasonEvents[0].tone}>
          <strong>{marketSeasonEvents[0].title}.</strong> Каждая продажа на витрине и закрытый чужой buy order
          теперь двигают seasonal convoy board, а не только локальный кошелёк.
        </Notice>
      ) : null}

      <SectionCard
        title="Market seasonal board"
        description={`Публичный рынок теперь работает как массовый social loop для ${data.worldEventBoard.season.label}: видно общий прогресс, вклад вашей гильдии и standings соперников.`}
        aside={<Pill tone={marketSeasonEvents.some((event) => event.rewardTiers.some((tier) => tier.status === "claimable")) ? "success" : "accent"}>{`${marketSeasonEvents.length} event`}</Pill>}
        actions={
          <Link className="button button--ghost" href="/guilds">
            Смотреть полный board
          </Link>
        }
        tone="accent"
      >
        <div className="stack-sm">
          {marketSeasonEvents.map((event) => {
            const claimableTiers = event.rewardTiers.filter((tier) => tier.status === "claimable");

            return (
              <article key={event.key} className="row-card">
                <div>
                  <div className="row-card__title">{event.title}</div>
                  <p className="row-card__description">
                    {event.description}
                    <br />
                    {event.progressLabel} · {event.statusLabel}
                    <br />
                    {event.focusGuild
                      ? `Ваш market-вклад: ${event.focusGuild.points} очк. · rank #${event.focusGuild.rank}/${event.focusGuild.total} · ${event.focusGuild.detail}`
                      : event.objectiveLabel}
                    <br />
                    {event.focusGuild?.highlight ?? event.objectiveLabel}
                    <br />
                    Reward tiers: {event.rewardTiers.map((tier) => `${tier.label} — ${tier.statusLabel}`).join(" • ")}
                    <br />
                    Лидеры convoy: {event.standings.slice(0, 3).map((entry) => `#${entry.rank} ${entry.guildTag} (${entry.points})`).join(" • ")}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={event.tone}>{event.progressPercent}% world</Pill>
                  {event.focusGuild ? <Pill tone={claimableTiers.length > 0 ? "success" : "accent"}>{event.focusGuild.nextThresholdLabel ?? "Все tier-цели закрыты"}</Pill> : null}
                  {claimableTiers.map((tier) => (
                    <form key={`${event.key}-${tier.key}`} action={claimWorldEventReward} className="inline-form">
                      <input type="hidden" name="eventKey" value={event.key} />
                      <input type="hidden" name="tierKey" value={tier.key} />
                      <input type="hidden" name="redirectTo" value="/market" />
                      <button className="button button--primary" type="submit">
                        Забрать {tier.label}
                      </button>
                    </form>
                  ))}
                  <Link className="button button--ghost" href={event.primaryHref}>
                    {event.primaryActionLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Market-linked contracts"
        description="Эти контракты читают рынок как часть objective board: продажа, supply delivery и request fulfillment двигаются теми же действиями, что уже живут на этой странице."
        aside={<Pill tone={marketContracts.some((contract) => contract.claimable) ? "success" : "accent"}>{`${marketContracts.length} linked`}</Pill>}
        tone={marketContracts.some((contract) => contract.claimable) ? "success" : "accent"}
      >
        <div className="stack-sm">
          {marketContracts.map((contract) => (
            <article key={contract.key} className="row-card">
              <div>
                <div className="row-card__title">{contract.title}</div>
                <p className="row-card__description">
                  {contract.archetypeLabel} · {contract.summary}
                  <br />
                  {contract.progressLabel}
                  <br />
                  Награда: {contract.rewardLabels.join(" • ")}
                  <br />
                  {contract.relatedActionSummary}
                  {contract.blockers.length > 0 ? (
                    <>
                      <br />
                      Блокеры: {contract.blockers.join(" • ")}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={contract.tone}>{contract.statusLabel}</Pill>
                {contract.claimedAt ? <span className="muted">{formatDateTime(contract.claimedAt)}</span> : null}
                {contract.claimable ? (
                  <form action={claimGuildContract} className="inline-form">
                    <input type="hidden" name="contractKey" value={contract.key} />
                    <input type="hidden" name="redirectTo" value="/market" />
                    <button className="button button--primary" type="submit">
                      Забрать контракт
                    </button>
                  </form>
                ) : (
                  <Link className="button button--ghost" href={contract.href}>
                    {contract.actionLabel}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="stats-grid stats-grid--4">
        <InfoCard title="Market access" value={data.marketUnlocked ? "Open" : "Locked"} detail="Доступ определяется прогрессией активной гильдии." tone="accent" />
        <InfoCard title="Active listings" value={data.activeListings.length} detail={`${activeItemListings} item-лотов и ${data.activeListings.length - activeItemListings} resource-лотов в витрине.`} />
        <InfoCard title="Request board" value={data.activeBuyOrders.length} detail={`${data.fulfillableBuyOrders.length} заявок можно закрыть из текущей активной гильдии.`} tone="success" />
        <InfoCard title="Claim box" value={data.claimBox.length} detail={data.guildPrestige ? `${data.guildPrestige.renown.recentInteractionLabel} ${data.guildPrestige.renown.favoriteCounterpartyLabel ? `Favorite trader: ${data.guildPrestige.renown.favoriteCounterpartyLabel}.` : ""}` : "Здесь сходятся продажи, возвраты лотов, buy-order payouts и gold refunds."} />
      </div>

      {data.guildPrestige?.favoriteCounterparties.length ? (
        <SectionCard
          title="Favorite traders on this market"
          description="Мягкий retention hook: знакомые дома уже собраны из повторных market/deal/request interactions и подсвечиваются прямо перед торговлей."
          aside={<Pill tone={data.guildPrestige.renown.tone}>{data.guildPrestige.renown.tierLabel}</Pill>}
          tone="success"
        >
          <div className="stack-sm">
            {data.guildPrestige.favoriteCounterparties.map((counterparty) => (
              <article key={counterparty.guildId} className="row-card">
                <div>
                  <div className="row-card__title">
                    {counterparty.guildName} [{counterparty.guildTag}]
                  </div>
                  <p className="row-card__description">
                    {counterparty.relationshipLabel} · {counterparty.summary}
                    <br />
                    {counterparty.interactionCount} interactions · {counterparty.channelCount} channels · {counterparty.recentInteractions} recent
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={counterparty.isCurrentContext ? "success" : "accent"}>{counterparty.relationshipLabel}</Pill>
                  <Link className="button button--ghost" href={counterparty.profileHref}>
                    Профиль
                  </Link>
                  <Link className="button button--ghost" href={counterparty.dealsHref}>
                    Deal CTA
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Выставить предмет" description="Лот создаётся с мгновенной оплатой listing fee и блокировкой экземпляра предмета." tone="accent">
          <form action={createMarketListing} className="card-form">
            <input type="hidden" name="listingType" value="ITEM" />
            <input type="hidden" name="redirectTo" value="/market" />
            <label className="form-field">
              <span className="form-field__label">Предмет</span>
              <select name="inventoryItemId" defaultValue="">
                <option value="">Выберите предмет</option>
                {data.sellableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="form-help">В списке уже видны редкость, слот, power и vendor base. Сервер отдельно валидирует коридор допустимой цены.</span>
            <label className="form-field">
              <span className="form-field__label">Цена в золоте</span>
              <input min={1} name="totalPriceGold" step={1} type="number" />
            </label>
            <button className="button button--primary" type="submit">
              Создать item-лот
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Выставить ресурс" description="Стек продаётся целиком и не поддерживает частичный выкуп в MVP." tone="accent">
          <form action={createMarketListing} className="card-form">
            <input type="hidden" name="listingType" value="RESOURCE" />
            <input type="hidden" name="redirectTo" value="/market" />
            <label className="form-field">
              <span className="form-field__label">Ресурс</span>
              <select name="resourceType" defaultValue="">
                <option value="">Выберите ресурс</option>
                {data.sellableResources.map((resource) => (
                  <option key={resource.resourceType} value={resource.resourceType}>
                    {resource.label} · доступно {resource.amount}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span className="form-field__label">Количество</span>
                <input min={1} name="quantity" step={1} type="number" />
              </label>
              <label className="form-field">
                <span className="form-field__label">Цена в золоте</span>
                <input min={1} name="totalPriceGold" step={1} type="number" />
              </label>
            </div>
            <button className="button button--primary" type="submit">
              Создать resource-лот
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Разместить buy order / resource request"
          description="Этот MVP-слой поддерживает только resource-заявки: золото резервируется сразу и возвращается через claim box, если заявка отменена или истекает."
          tone="accent"
        >
          <form action={createBuyOrder} className="card-form">
            <input type="hidden" name="redirectTo" value="/market" />
            <label className="form-field">
              <span className="form-field__label">Ресурс</span>
              <select name="resourceType" defaultValue="">
                <option value="">Выберите ресурс</option>
                {data.requestableResources.map((resource) => (
                  <option key={resource.resourceType} value={resource.resourceType}>
                    {resource.label} · сейчас на складе {resource.ownedAmount}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span className="form-field__label">Количество</span>
                <input min={1} name="quantity" step={1} type="number" />
              </label>
              <label className="form-field">
                <span className="form-field__label">Цена в золоте</span>
                <input min={1} name="totalPriceGold" step={1} type="number" />
              </label>
            </div>
            <span className="form-help">
              Заявка висит до ручного исполнения, отмены или истечения. Partial matching и автоматический matcher не поддерживаются.
            </span>
            <button className="button button--primary" type="submit">
              Создать buy order
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Можно исполнить прямо сейчас" description="Сервер заранее отмечает, где у текущей гильдии уже хватает ресурса для ручного закрытия чужого спроса." tone="success">
          {data.fulfillableBuyOrders.length > 0 ? (
            <div className="stack-sm">
              {data.fulfillableBuyOrders.map((order) => (
                <article key={order.id} className="row-card">
                  <div>
                    <div className="row-card__title">{order.resourceLabel}</div>
                    <p className="row-card__description">
                      Нужно {order.quantity} шт. · {formatNumber(order.totalPriceGold)} зол.
                      <br />
                      Покупатель: {order.buyerLabel}
                      <br />
                      {order.priceSummary}
                      <br />
                      {order.availabilitySummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone="success">Можно исполнить</Pill>
                    <span className="muted">До {formatDateTime(order.expiresAt)}</span>
                    <form action={fulfillBuyOrder} className="inline-form">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="redirectTo" value="/market" />
                      <button className="button button--primary" type="submit">
                        Исполнить заявку
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Подходящих заявок нет"
              description="Когда другая гильдия запросит ресурс, который уже лежит у вас на складе, он появится здесь как готовый ручной action."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Лента активных лотов" description="Можно купить чужой лот мгновенно или отменить собственный до продажи." tone="accent">
        {data.activeListings.length > 0 ? (
          <div className="stack-sm">
            {data.activeListings.map((listing) => (
              <article key={listing.id} className="row-card">
                <div>
                  <div className="row-card__title">{listing.itemLabel}</div>
                  <p className="row-card__description">
                    {listing.listingTypeLabel} · {listing.quantity} шт. · {formatNumber(listing.totalPriceGold)} зол.
                    <br />
                    {listing.detailLabel}
                    <br />
                    {listing.valueSummary}
                  </p>
                </div>
                  <div className="row-card__aside">
                    <Pill tone={listing.isMine ? "accent" : "success"}>
                      {listing.isMine ? "Ваш лот" : listing.sellerLabel}
                    </Pill>
                    {data.guildPrestige?.favoriteCounterparties.some((entry) => entry.guildTag === listing.sellerGuildTag) ? (
                      <Pill tone="success">Familiar trader</Pill>
                    ) : null}
                    {data.highlightedGuildContext && listing.sellerGuildTag === data.highlightedGuildContext.tag ? (
                      <Pill tone="accent">В фокусе</Pill>
                    ) : null}
                  <span className="muted">До {formatDateTime(listing.expiresAt)}</span>
                  {listing.isMine ? (
                    <form action={cancelMarketListing} className="inline-form">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="redirectTo" value="/market" />
                      <button className="button button--ghost" type="submit">
                        Отменить
                      </button>
                    </form>
                  ) : (
                    <form action={buyMarketListing} className="inline-form">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="redirectTo" value="/market" />
                      <button className="button button--primary" type="submit">
                        Купить
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Лотов нет"
            description={listingMilestone?.summary ?? "Структура экрана уже готова, но foundation-данные не содержат активных объявлений."}
          />
        )}
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Claim box" description="Продажи, возвраты лотов, buy-order payouts и gold refunds не падают напрямую в инвентарь / кошелёк — их нужно забрать отдельным действием." tone="success">
          {data.claimBox.length > 0 ? (
            <div className="stack-sm">
              {data.claimBox.map((claim) => (
                <article key={claim.id} className="row-card">
                  <div>
                    <div className="row-card__title">{claim.sourceLabel}</div>
                    <p className="row-card__description">
                      {claim.claimTypeLabel} · {claim.payloadLabel}
                      <br />
                      {claim.statusLabel}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone="success">Claim pending</Pill>
                    <span className="muted">{formatDateTime(claim.createdAt)}</span>
                    <form action={claimMarketClaim} className="inline-form">
                      <input type="hidden" name="claimId" value={claim.id} />
                      <input type="hidden" name="redirectTo" value="/market" />
                      <button className="button button--primary" type="submit">
                        Забрать
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Claim box пуст" description="После продажи, отмены или закрытия request board сюда попадёт золото, ресурс или возвращённый предмет." />
          )}
        </SectionCard>

        <SectionCard title="Мои активные лоты и правила" description="Здесь видны ваш текущий лимит лотов, налоги и базовые ограничения торговли." tone="neutral">
          {data.myListings.length > 0 ? (
            <div className="stack-sm">
              {data.myListings.map((listing) => (
                <article key={listing.id} className="row-card">
                  <div>
                    <div className="row-card__title">{listing.itemLabel}</div>
                    <p className="row-card__description">
                      {listing.listingTypeLabel} · {listing.quantity} шт. · {formatNumber(listing.totalPriceGold)} зол.
                      <br />
                      {listing.detailLabel}
                      <br />
                      {listing.valueSummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <span className="muted">До {formatDateTime(listing.expiresAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Активных собственных лотов нет"
              description={
                listingMilestone?.status === "blocked"
                  ? listingMilestone.blockers[0] ?? "Создайте первый лот через одну из форм выше."
                  : "Создайте первый лот через одну из форм выше."
              }
            />
          )}

          <p className="form-help">
            Listing fee: {formatNumber(data.listingFeeGold)} золота · Sale tax: {data.saleTaxPercent}%.
            {data.nextUpgradeCostGold
              ? ` Следующий апгрейд рыночных слотов стоит ${formatNumber(data.nextUpgradeCostGold)} золота.`
              : " Лимит слотов в MVP уже достигнут."}
          </p>
          <ul className="bullet-list bullet-list--muted">
            {data.ruleSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Лента request board" description="Открытый спрос других гильдий: свой заказ можно отменить, чужой — исполнить, если ресурс реально лежит на складе." tone="accent">
          {data.activeBuyOrders.length > 0 ? (
            <div className="stack-sm">
              {data.activeBuyOrders.map((order) => (
                <article key={order.id} className="row-card">
                  <div>
                    <div className="row-card__title">{order.resourceLabel}</div>
                    <p className="row-card__description">
                      {order.quantity} шт. · {formatNumber(order.totalPriceGold)} зол.
                      <br />
                      {order.buyerLabel}
                      <br />
                      {order.priceSummary}
                      <br />
                      {order.availabilitySummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={order.isMine ? "accent" : order.canFulfill ? "success" : "warning"}>
                      {order.isMine ? "Ваша заявка" : order.canFulfill ? "Можно исполнить" : "Нужен ресурс"}
                    </Pill>
                    {data.guildPrestige?.favoriteCounterparties.some((entry) => entry.guildTag === order.buyerGuildTag) ? (
                      <Pill tone="success">Known house</Pill>
                    ) : null}
                    <span className="muted">До {formatDateTime(order.expiresAt)}</span>
                    {order.isMine ? (
                      <form action={cancelBuyOrder} className="inline-form">
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="redirectTo" value="/market" />
                        <button className="button button--ghost" type="submit">
                          Отменить
                        </button>
                      </form>
                    ) : (
                      <form action={fulfillBuyOrder} className="inline-form">
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="redirectTo" value="/market" />
                        <button className="button button--primary" type="submit" disabled={!order.canFulfill}>
                          Исполнить
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Заявок нет" description="После первых buy orders здесь появится открытый спрос между доступными гильдиями." />
          )}
        </SectionCard>

        <SectionCard title="Мои активные заявки" description="Здесь видно, какой ресурс вы сейчас ищете и сколько золота удерживается в резерве до закрытия заявки." tone="neutral">
          {data.myBuyOrders.length > 0 ? (
            <div className="stack-sm">
              {data.myBuyOrders.map((order) => (
                <article key={order.id} className="row-card">
                  <div>
                    <div className="row-card__title">{order.resourceLabel}</div>
                    <p className="row-card__description">
                      {order.quantity} шт. · {formatNumber(order.totalPriceGold)} зол.
                      <br />
                      {order.priceSummary}
                      <br />
                      {order.availabilitySummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone="accent">Открыта</Pill>
                    <span className="muted">До {formatDateTime(order.expiresAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Активных заявок нет" description="Создайте первую resource-заявку через форму request board выше." />
          )}
        </SectionCard>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="История fixed-price market"
          description="Каждый resolved lot теперь показывает, что именно произошло: товар, цена, налог/выплата/возврат, контрагент и время события."
          tone="neutral"
        >
          {data.marketHistory.length > 0 ? (
            <div className="stack-sm">
              {data.marketHistory.map((entry) => (
                <article key={entry.id} className="row-card">
                  <div>
                    <div className="row-card__title">{entry.outcomeLabel} · {entry.itemLabel}</div>
                    <p className="row-card__description">
                      {entry.listingTypeLabel} · {entry.quantity} шт. · {formatNumber(entry.totalPriceGold)} зол.
                      <br />
                      {entry.detailLabel}
                      <br />
                      {entry.priceSummary}
                      <br />
                      {entry.outcomeSummary}
                      {entry.claimSummary ? (
                        <>
                          <br />
                          {entry.claimSummary}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={entry.tone}>{entry.outcomeLabel}</Pill>
                    <span className="muted">{entry.counterpartyLabel ?? "Без контрагента"}</span>
                    <span className="muted">{formatDateTime(entry.eventAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="История рынка пока пуста"
              description="После первых продаж, покупок, отмен и истечения лотов здесь появится насыщенная market history."
            />
          )}
        </SectionCard>

        <SectionCard
          title="История request board"
          description="Buy orders показывают ручное закрытие спроса, возвраты резерва и истечения так же прозрачно, как обычные sell listings."
          tone="neutral"
        >
          {data.buyOrderHistory.length > 0 ? (
            <div className="stack-sm">
              {data.buyOrderHistory.map((entry) => (
                <article key={entry.id} className="row-card">
                  <div>
                    <div className="row-card__title">{entry.outcomeLabel} · {entry.resourceLabel}</div>
                    <p className="row-card__description">
                      {entry.quantity} шт. · {formatNumber(entry.totalPriceGold)} зол.
                      <br />
                      {entry.priceSummary}
                      <br />
                      {entry.outcomeSummary}
                      {entry.claimSummary ? (
                        <>
                          <br />
                          {entry.claimSummary}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={entry.tone}>{entry.outcomeLabel}</Pill>
                    <span className="muted">{entry.counterpartyLabel ?? "Без контрагента"}</span>
                    <span className="muted">{formatDateTime(entry.eventAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="История request board пока пуста"
              description="После первого исполнения, отмены или истечения заявки здесь появится отдельная прозрачная лента outcomes."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
