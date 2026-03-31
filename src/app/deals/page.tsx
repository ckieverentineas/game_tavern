import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import {
  type PageSearchParams,
  formatDateTime,
  readActionFeedback,
  readSearchParam,
} from "@/lib/format";
import {
  acceptTradeOffer,
  cancelTradeOffer,
  createTradeOffer,
  rejectTradeOffer,
} from "@/server/actions/foundation";
import { getDealsPageData } from "@/server/game";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const params = await searchParams;
  const prefillGuildTag = readSearchParam(params, "to");
  const snapshot = await getDealsPageData(prefillGuildTag);
  const feedback = readActionFeedback(params);

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Deals"
          title="Экран приватных сделок недоступен"
          description="Barter-экран не может прочитать данные из локальной SQLite."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Выполните `npm run db:setup`, чтобы увидеть incoming/outgoing trade offers.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Deals"
        title={`${data.guildName} [${data.guildTag}] · приватные barter-сделки`}
        description="Inbox, outbox и история сделки показываются строго от лица активной гильдии, чтобы проверять social/economy loop с обеих сторон без путаницы."
        badges={
          <>
            <Pill tone={data.tradeUnlocked ? "success" : "warning"}>{data.tradeUnlocked ? "Deals open" : "Deals locked"}</Pill>
            <Pill tone={data.pendingIncoming.length > 0 ? "success" : "accent"}>{`${data.pendingIncoming.length} incoming`}</Pill>
            {data.prefillReceiverLabel ? <Pill tone="accent">Target prefilled</Pill> : null}
          </>
        }
        meta={
          <>
            <span>{data.pendingOutgoing.length} исходящих</span>
            <span>• {data.resolvedOffers.length} resolved</span>
            <span>• {data.counterparties.length} доступных контрагентов</span>
          </>
        }
        actions={
          <>
            <Link className="button button--primary" href="/inventory">
              Открыть инвентарь
            </Link>
            {data.prefillReceiverProfileHref ? (
              <Link className="button button--ghost" href={data.prefillReceiverProfileHref}>
                Профиль цели
              </Link>
            ) : null}
            <Link className="button button--ghost" href="/market">
              Перейти на рынок
            </Link>
          </>
        }
      />

      {feedback ? <Notice title="Результат действия" tone={feedback.tone}>{feedback.message}</Notice> : null}

      <Notice title="Текущая перспектива" tone="accent">
        Активная перспектива: {data.guildName} [{data.guildTag}]. Входящие, исходящие и доступные
        контрагенты пересчитываются для выбранной гильдии. В demo sandbox shell позволяет принять тот
        же оффер глазами второй стороны, а в account-режиме экран остаётся строго вашим личным контекстом.
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

      {data.prefillReceiverLabel ? (
        <Notice title="Social CTA" tone="success">
          Social CTA подхватил публичную гильдию {data.prefillReceiverLabel}: форма ниже уже готова к
          созданию private deal именно с ней.
        </Notice>
      ) : null}

      <div className="stats-grid stats-grid--4">
        <InfoCard title="Trade access" value={data.tradeUnlocked ? "Open" : "Locked"} detail="Trade unlock уже хранится в активной гильдии." tone="accent" />
        <InfoCard title="Pending incoming" value={data.pendingIncoming.length} detail="Те офферы, на которые активная гильдия может ответить прямо сейчас." />
        <InfoCard title="Pending outgoing" value={data.pendingOutgoing.length} detail="Ваши исходящие офферы, которые всё ещё ждут ответа." />
        <InfoCard title="Resolved history" value={data.resolvedOffers.length} detail={data.guildPrestige ? `${data.guildPrestige.renown.recurringLabel} ${data.guildPrestige.renown.favoriteCounterpartyLabel ? `Favorite trader: ${data.guildPrestige.renown.favoriteCounterpartyLabel}.` : ""}` : "Accepted / rejected / cancelled / expired outcomes видны как отдельная история."} tone="success" />
      </div>

      {data.guildPrestige?.favoriteCounterparties.length ? (
        <SectionCard
          title="Favorite traders for private deals"
          description="Здесь сначала вспоминаются знакомые дома, с которыми уже сложилась социальная история. Это превращает deals в серию отношений, а не в одноразовый barter."
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
                    {counterparty.interactionCount} interactions · deals {counterparty.acceptedDeals} · requests {counterparty.buyOrderSupplied + counterparty.buyOrderReceived}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={counterparty.isCurrentContext ? "success" : "accent"}>{counterparty.relationshipLabel}</Pill>
                  <Link className="button button--ghost" href={counterparty.profileHref}>
                    Профиль
                  </Link>
                  <Link className="button button--ghost" href={counterparty.marketHref}>
                    Market CTA
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Создать новый оффер"
          description="Заполните только один блок отдачи и один блок запроса: предмет или ресурс с количеством."
          tone="accent"
        >
          <form action={createTradeOffer} className="card-form">
            <input type="hidden" name="redirectTo" value="/deals" />
            <label className="form-field">
              <span className="form-field__label">Контрагент</span>
                <select name="receiverGuildTag" defaultValue={data.prefillReceiverGuildTag ?? ""}>
<option value="">Выберите гильдию</option>
                {data.counterparties.map((counterparty) => (
                  <option key={counterparty.guildTag} value={counterparty.guildTag}>
                    {counterparty.label}
                    {counterparty.prestige ? ` · ${counterparty.prestige.tierLabel}` : ""}
                    {counterparty.renown ? ` · ${counterparty.renown.tierLabel}` : ""}
                    {counterparty.isFavoriteTrader ? ` · ${counterparty.relationshipLabel ?? "Favorite trader"}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid form-grid--2">
              <div className="form-field">
                <span className="form-field__label">Что вы отдаёте</span>
                <select name="offeredItemId" defaultValue="">
                  <option value="">Предмет не выбран</option>
                  {data.offerableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select name="offeredResourceType" defaultValue="">
                  <option value="">Ресурс не выбран</option>
                  {data.offerableResources.map((resource) => (
                    <option key={resource.resourceType} value={resource.resourceType}>
                      {resource.label} · доступно {resource.amount}
                    </option>
                  ))}
                </select>
                <input min={1} name="offeredQuantity" step={1} type="number" placeholder="Количество ресурса" />
              </div>

              <div className="form-field">
                <span className="form-field__label">Что вы хотите получить</span>
                <select name="requestedItemId" defaultValue="">
                  <option value="">Предмет не выбран</option>
                  {data.requestableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select name="requestedResourceType" defaultValue="">
                  <option value="">Ресурс не выбран</option>
                  {data.requestableResources.map((resource) => (
                    <option
                      key={`${resource.guildTag}-${resource.resourceType}`}
                      value={resource.resourceType}
                    >
                      {resource.label} · у {resource.guildTag} есть {resource.amount}
                    </option>
                  ))}
                </select>
                <input min={1} name="requestedQuantity" step={1} type="number" placeholder="Количество ресурса" />
              </div>
            </div>

            <label className="form-field">
              <span className="form-field__label">Сообщение</span>
              <textarea name="message" placeholder="Например: обменяю трофей на кожу для следующего похода" />
            </label>

            <span className="form-help">
              Если выбираете предмет, оставьте поле ресурса пустым. Если выбираете ресурс, укажите количество и не выбирайте предмет.
            </span>

            <button className="button button--primary" type="submit">
              Отправить оффер
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Pending incoming deals" description="Inbox адресных офферов, на которые нужно принять решение до истечения таймера." tone="success">
          {data.pendingIncoming.length > 0 ? (
            <div className="stack-sm">
              {data.pendingIncoming.map((offer) => (
                <article key={offer.id} className="row-card">
                  <div>
                    <div className="row-card__title">{offer.counterpartyLabel}</div>
                    <p className="row-card__description">
                      Отдаёт: {offer.offeredSummary}
                      <br />
                      Просит: {offer.requestedSummary}
                      <br />
                      {offer.message ?? "Без сообщения"}
                      <br />
                      {offer.outcomeSummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={offer.tone}>{offer.outcomeLabel}</Pill>
                    {data.counterparties.find((entry) => entry.label === offer.counterpartyLabel)?.isFavoriteTrader ? <Pill tone="success">Known house</Pill> : null}
                    <span className="muted">Создана: {formatDateTime(offer.createdAt)}</span>
                    <span className="muted">До {formatDateTime(offer.expiresAt)}</span>
                    <div className="actions-inline">
                      <form action={acceptTradeOffer} className="inline-form">
                        <input type="hidden" name="offerId" value={offer.id} />
                        <input type="hidden" name="redirectTo" value="/deals" />
                        <button className="button button--primary" type="submit">
                          Принять
                        </button>
                      </form>
                      <form action={rejectTradeOffer} className="inline-form">
                        <input type="hidden" name="offerId" value={offer.id} />
                        <input type="hidden" name="redirectTo" value="/deals" />
                        <button className="button button--ghost" type="submit">
                          Отклонить
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Нет входящих офферов" description="Как только другая гильдия отправит barter-предложение, оно появится здесь как actionable inbox item." />
          )}
        </SectionCard>

        <SectionCard title="Pending outgoing deals" description="Outbox показывает, какие ваши офферы ещё ждут ответа и могут быть отменены вручную." tone="accent">
          {data.pendingOutgoing.length > 0 ? (
            <div className="stack-sm">
              {data.pendingOutgoing.map((offer) => (
                <article key={offer.id} className="row-card">
                  <div>
                    <div className="row-card__title">{offer.counterpartyLabel}</div>
                    <p className="row-card__description">
                      Отдаёте: {offer.offeredSummary}
                      <br />
                      Запрашиваете: {offer.requestedSummary}
                      <br />
                      {offer.message ?? "Без сообщения"}
                      <br />
                      {offer.outcomeSummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={offer.tone}>{offer.outcomeLabel}</Pill>
                    {data.counterparties.find((entry) => entry.label === offer.counterpartyLabel)?.isFavoriteTrader ? <Pill tone="success">Favorite trader</Pill> : null}
                    <span className="muted">Создана: {formatDateTime(offer.createdAt)}</span>
                    <span className="muted">До {formatDateTime(offer.expiresAt)}</span>
                    <form action={cancelTradeOffer} className="inline-form">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <input type="hidden" name="redirectTo" value="/deals" />
                      <button className="button button--ghost" type="submit">
                        Отменить
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Нет ожидающих исходящих сделок" description="Когда вы отправите новый barter-оффер, он появится здесь до ответа, отмены или истечения." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Resolved deal history"
        description="История закрытых офферов объясняет outcome человеческим языком: кто был контрагентом, что обменивалось и когда оффер был принят, отклонён, отменён или истёк."
        tone="neutral"
      >
        {data.resolvedOffers.length > 0 ? (
          <div className="stack-sm">
            {data.resolvedOffers.map((offer) => (
              <article key={offer.id} className="row-card">
                <div>
                  <div className="row-card__title">{offer.directionLabel} сделка · {offer.counterpartyLabel}</div>
                  <p className="row-card__description">
                    Отдавалось: {offer.offeredSummary}
                    <br />
                    Запрашивалось: {offer.requestedSummary}
                    <br />
                    {offer.outcomeSummary}
                    {offer.message ? (
                      <>
                        <br />
                        Сообщение: {offer.message}
                      </>
                    ) : null}
                  </p>
                </div>
                  <div className="row-card__aside">
                    <Pill tone={offer.tone}>{offer.outcomeLabel}</Pill>
                    {data.counterparties.find((entry) => entry.label === offer.counterpartyLabel)?.isFavoriteTrader ? <Pill tone="success">Memory kept</Pill> : null}
                    <span className="muted">Создана: {formatDateTime(offer.createdAt)}</span>
                  <span className="muted">
                    {offer.respondedAt ? `Закрыта: ${formatDateTime(offer.respondedAt)}` : `Истекла: ${formatDateTime(offer.expiresAt)}`}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Resolved history пока пуст"
            description="После первых accepted, rejected, cancelled или expired офферов здесь появится читаемая история исходов."
          />
        )}
      </SectionCard>

      <SectionCard title="Trade rules from spec" description="Foundation не отклоняется от выбранной barter-модели MVP." tone="warning">
        <ul className="bullet-list bullet-list--muted">
          {data.ruleSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
