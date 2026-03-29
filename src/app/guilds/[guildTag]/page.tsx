import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import { claimWorldEventReward } from "@/server/actions/foundation";
import { getGuildPublicProfilePageData } from "@/server/game";

export default async function GuildPublicProfilePage({
  params,
}: {
  params: Promise<{ guildTag: string }>;
}) {
  await connection();
  const { guildTag } = await params;
  const snapshot = await getGuildPublicProfilePageData(guildTag);

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Guild profile"
          title="Публичный профиль гильдии недоступен"
          description="Social profile не смог загрузить progression snapshot для выбранной гильдии."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Проверьте seed-данные через `npm run db:setup` и затем откройте каталог снова.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Guild profile"
        title={`${data.guild.name} [${data.guild.tag}]`}
        description="Публичная social-memory витрина гильдии: owner, renown/perstige tiers, favorite traders, recurring links, badges/perks, часть ростера и мягкие CTA в уже существующие loops взаимодействия."
        actions={
          <>
            <Link className="button button--primary" href={data.socialCtas.marketHref}>
              Смотреть market context
            </Link>
            <Link className="button button--ghost" href={data.socialCtas.dealsHref}>
              Private deal CTA
            </Link>
            <Link className="button button--ghost" href={data.socialCtas.directoryHref}>
              Назад в каталог
            </Link>
          </>
        }
      />

      <Notice tone={data.guild.isCurrentContext ? "success" : "accent"}>
        {data.guild.isCurrentContext
          ? "Это публичная версия вашей текущей гильдии: теперь её статус, reputation и social visibility читаются так же, как у остальных."
          : `Гильдия ${data.guild.name} [${data.guild.tag}] видна публично и теперь сразу объясняет, почему она статусна как контрагент, supplier или frontier-имя.`}
      </Notice>

      <Notice tone={data.prestige.tone}>
        <strong>{data.prestige.tierLabel}.</strong> {data.prestige.spotlight}
      </Notice>

      <Notice tone={data.renown.tone}>
        <strong>{data.renown.tierLabel}.</strong> {data.renown.spotlight}
      </Notice>

      <Notice tone="accent">
        <strong>{data.worldEventBoard.season.label}.</strong> Профиль теперь показывает не только prestige-историю,
        но и текущий seasonal status этой гильдии в глобальных world events.
      </Notice>

      <div className="stats-grid stats-grid--4">
        <InfoCard
          title="Renown"
          value={`${data.renown.score}`}
          detail={`#${data.renown.rank} из ${data.renown.total} · ${data.renown.recurringLabel}`}
          tone={data.renown.tone}
        />
        <InfoCard
          title="Prestige"
          value={`${data.prestige.score}`}
          detail={`#${data.prestige.rank} из ${data.prestige.total} · ${data.prestige.recentTrustLabel}`}
          tone={data.prestige.tone}
        />
        <InfoCard
          title="Guild level"
          value={`Lv. ${data.guild.level}`}
          detail={data.guild.nextLevelXp
            ? `${formatNumber(data.guild.xp)} / ${formatNumber(data.guild.nextLevelXp)} XP до следующего уровня.`
            : `${formatNumber(data.guild.xp)} XP накоплено.`}
          tone="accent"
        />
        <InfoCard
          title="Wealth"
          value={formatNumber(data.guild.gold)}
          detail={`Market activity ${data.guild.marketActivity} · лотов ${data.guild.activeListingsCount} · спрос ${data.guild.activeBuyOrdersCount}.`}
        />
        <InfoCard
          title="Roster power"
          value={formatNumber(data.guild.rosterPower)}
          detail={`${data.guild.heroCount} героев · слот-лимит ${data.guild.heroSlotLimit} · пик ${data.guild.highestHeroPower} power.`}
          tone="success"
        />
        <InfoCard
          title="PvE status"
          value={data.guild.pveLabel}
          detail={`Экспедиций закрыто ${data.guild.completedExpeditions}, активных ${data.guild.activeExpeditions}. Risk: ${data.guild.highestUnlockedRiskLabel}.`}
        />
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Renown / retention loop"
          description="Renown не про raw power, а про повторные связи: familiar houses, preferred trader callouts, social badges и memory recap без лома баланса."
          aside={<Pill tone={data.renown.tone}>{data.renown.tierLabel}</Pill>}
        >
          <div className="stack-sm">
            <article className="row-card">
              <div>
                <div className="row-card__title">Recurring interaction summary</div>
                <p className="row-card__description">
                  {data.recurringSummary.summary}
                  <br />
                  {data.recurringSummary.spotlight}
                  <br />
                  {data.renown.recentInteractionLabel}
                  <br />
                  {data.renown.favoriteCounterpartyLabel ?? "Любимые дома ещё собираются."}
                </p>
              </div>
              <div className="row-card__aside">
                {data.renown.perks.map((perk) => (
                  <Pill key={perk.key} tone={perk.tone}>{perk.label}</Pill>
                ))}
                {data.renown.badges.map((badge) => (
                  <Pill key={badge.key} tone={badge.tone}>{badge.label}</Pill>
                ))}
              </div>
            </article>
            {data.renown.rankingContributions.map((contribution) => (
              <article key={contribution.key} className="row-card">
                <div>
                  <div className="row-card__title">{contribution.label}</div>
                  <p className="row-card__description">
                    Score +{contribution.score}
                    <br />
                    Value: {contribution.value}
                    <br />
                    {contribution.detail}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={contribution.score > 0 ? "success" : "neutral"}>
                    {contribution.score > 0 ? `+${contribution.score}` : "0"}
                  </Pill>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Social identity snapshot"
          description="Профиль не декоративный: он объясняет, кто владеет гильдией, почему ей доверяют и где именно она набирает social prestige."
          aside={<Pill tone={data.prestige.tone}>{data.prestige.tierLabel}</Pill>}
        >
          <div className="stack-sm">
            <article className="row-card">
              <div>
                <div className="row-card__title">{data.guild.ownerDisplayName}</div>
                <p className="row-card__description">
                  Основатель гильдии с {formatDateTime(data.guild.ownerSince)}
                  <br />
                  {data.prestige.summary}
                  <br />
                  {data.guild.socialSummary}
                  <br />
                  Каналы: {data.guild.marketUnlocked ? "рынок открыт" : "рынок закрыт"} · {data.guild.tradeUnlocked ? "deals открыты" : "deals закрыты"}
                  <br />
                  Contracts {data.guild.contractsCompleted} · private deals {data.guild.privateDealsCompleted}
                </p>
              </div>
              <div className="row-card__aside">
                {data.prestige.badges.map((badge) => (
                  <Pill key={badge.key} tone={badge.tone}>{badge.label}</Pill>
                ))}
                <Pill tone={data.guild.marketUnlocked ? "success" : "warning"}>
                  {data.guild.marketUnlocked ? "Market online" : "Market locked"}
                </Pill>
                <Pill tone={data.guild.tradeUnlocked ? "success" : "warning"}>
                  {data.guild.tradeUnlocked ? "Deals online" : "Deals locked"}
                </Pill>
              </div>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          title="Favorite traders / recurring links"
          description="Любимые дома появляются из repeated market sales, fulfilled demand и accepted deals. Это мягкий retention hook: хочется вернуться именно к знакомым контрагентам."
        >
          {data.favoriteTraders.length > 0 ? (
            <div className="stack-sm">
              {data.favoriteTraders.map((counterparty) => (
                <article key={counterparty.guildId} className="row-card">
                  <div>
                    <div className="row-card__title">
                      {counterparty.guildName} [{counterparty.guildTag}]
                    </div>
                    <p className="row-card__description">
                      {counterparty.relationshipLabel} · {counterparty.summary}
                      <br />
                      {counterparty.interactionCount} interactions · {counterparty.channelCount} channels · {counterparty.recentInteractions} recent
                      <br />
                      Sales {counterparty.marketSalesAsSeller + counterparty.marketSalesAsBuyer} · requests {counterparty.buyOrderSupplied + counterparty.buyOrderReceived} · deals {counterparty.acceptedDeals}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={counterparty.isCurrentContext ? "success" : "accent"}>{counterparty.relationshipLabel}</Pill>
                    <Link className="button button--ghost" href={counterparty.profileHref}>
                      Профиль
                    </Link>
                    <Link className="button button--ghost" href={counterparty.marketHref}>
                      Рынок
                    </Link>
                    <Link className="button button--ghost" href={counterparty.dealsHref}>
                      Deal CTA
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Favorite traders ещё не собраны" description="Как только гильдия повторно встретит те же дома через market или deals, здесь появится social memory с любимыми контрагентами." />
          )}
        </SectionCard>

        <SectionCard
          title="Prestige breakdown"
          description="Репутация не скрыта за чёрным ящиком: видно, какие существующие loops реально строят public trust и status для этой гильдии."
        >
          <div className="stack-sm">
            {data.prestige.rankingContributions.map((contribution) => (
              <article key={contribution.key} className="row-card">
                <div>
                  <div className="row-card__title">{contribution.label}</div>
                  <p className="row-card__description">
                    Score +{contribution.score}
                    <br />
                    Value: {contribution.value}
                    <br />
                    {contribution.detail}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={contribution.score > 0 ? "success" : "neutral"}>
                    {contribution.score > 0 ? `+${contribution.score}` : "0"}
                  </Pill>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Leaderboard placements"
          description="Статусный слой считывается мгновенно: на каких метриках эта гильдия действительно выделяется среди остальных."
        >
          <div className="stack-sm">
            {data.leaderboardPlacements.map((placement) => (
              <article key={placement.key} className="row-card">
                <div>
                  <div className="row-card__title">{placement.title}</div>
                  <p className="row-card__description">
                    #{placement.rank} из {placement.total}
                    <br />
                    {placement.valueLabel}
                    <br />
                    {placement.detail}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={placement.rank === 1 ? "accent" : placement.rank <= 3 ? "success" : "neutral"}>
                    {placement.rank === 1 ? "Лидер" : placement.rank <= 3 ? `Top ${placement.rank}` : `Rank ${placement.rank}`}
                  </Pill>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Seasonal standings"
          description="World event board показывает, как именно эта гильдия выглядит в текущем сезоне: личный вклад, позиция среди соперников и claimable rewards."
        >
          <div className="stack-sm">
            {data.worldEventBoard.events.map((event) => {
              const claimableTiers = data.guild.isCurrentContext
                ? event.rewardTiers.filter((tier) => tier.status === "claimable")
                : [];

              return (
                <article key={event.key} className="row-card">
                  <div>
                    <div className="row-card__title">{event.title}</div>
                    <p className="row-card__description">
                      {event.description}
                      <br />
                      {event.focusGuild
                        ? `Вклад ${event.focusGuild.guildTag}: ${event.focusGuild.points} очк. · rank #${event.focusGuild.rank}/${event.focusGuild.total} · ${event.focusGuild.detail}`
                        : event.objectiveLabel}
                      <br />
                      {event.focusGuild?.highlight ?? event.objectiveLabel}
                      <br />
                      {event.focusGuild?.nextThresholdLabel ?? "Все tier-цели сезона закрыты."}
                      <br />
                      Top standings: {event.standings.slice(0, 3).map((entry) => `#${entry.rank} ${entry.guildTag} (${entry.points})`).join(" • ")}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={event.tone}>{event.progressPercent}% world</Pill>
                    {event.focusGuild ? <Pill tone={claimableTiers.length > 0 ? "success" : "accent"}>#{event.focusGuild.rank}/{event.focusGuild.total}</Pill> : null}
                    {claimableTiers.map((tier) => (
                      <form key={`${event.key}-${tier.key}`} action={claimWorldEventReward} className="inline-form">
                        <input type="hidden" name="eventKey" value={event.key} />
                        <input type="hidden" name="tierKey" value={tier.key} />
                        <input type="hidden" name="redirectTo" value="/guilds" />
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
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Часть ростера"
          description="Лучшие герои делают power и PvE progression читаемыми даже без доступа к приватному управлению гильдией."
        >
          {data.featuredHeroes.length > 0 ? (
            <div className="stack-sm">
              {data.featuredHeroes.map((hero) => (
                <article key={hero.id} className="row-card">
                  <div>
                    <div className="row-card__title">{hero.name}</div>
                    <p className="row-card__description">
                      {hero.heroClassLabel} · {hero.rarityLabel}
                      <br />
                      Lv. {hero.level} · {formatNumber(hero.heroXp)} XP · {formatNumber(hero.powerScore)} power
                      <br />
                      {hero.statusLabel}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone="accent">{hero.heroClassLabel}</Pill>
                    <Pill tone={hero.statusLabel === "Готов" ? "success" : "neutral"}>{hero.statusLabel}</Pill>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Ростер пока пуст" description="Как только у гильдии появятся герои, они начнут формировать её публичный power-профиль." />
          )}
        </SectionCard>

        <SectionCard
          title="Recent social memory"
          description="Здесь остаются действия, которые строят знакомую историю мира: successful sales, fulfilled demand, accepted deals, contract rewards и frontier clears с памятью о контрагенте."
        >
          {data.socialMemory.length > 0 ? (
            <div className="stack-sm">
              {data.socialMemory.map((entry) => (
                <article key={entry.id} className="row-card">
                  <div>
                    <div className="row-card__title">{entry.title}</div>
                    <p className="row-card__description">
                      {entry.summary}
                      <br />
                      {entry.detail}
                      {entry.counterpartyGuildTag ? (
                        <>
                          <br />
                          Social memory: {entry.counterpartyGuildTag}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={entry.tone}>{entry.sourceLabel}</Pill>
                    <span className="muted">{formatDateTime(entry.at)}</span>
                    <Link className="button button--ghost" href={entry.href}>
                      Открыть контекст
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Публичная активность пока тиха" description="Когда гильдия начнёт торговать, закрывать контракты и ходить в PvE, след появится здесь автоматически." />
          )}
        </SectionCard>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Витрина рынка"
          description="Публичный профиль даёт мягкий переход в реальное взаимодействие: можно сразу открыть контекст гильдии на рынке."
        >
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
                    <Pill tone="accent">Live listing</Pill>
                    <span className="muted">До {formatDateTime(listing.expiresAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Активных лотов сейчас нет" description="Даже без live listings social profile остаётся полезным: статус и история всё равно видны." />
          )}
        </SectionCard>

        <SectionCard
          title="Публичный спрос"
          description="Buy orders показывают, что именно гильдии сейчас нужно, и превращают профиль в реальную social CTA к исполнению спроса или private deal."
        >
          {data.activeBuyOrders.length > 0 ? (
            <div className="stack-sm">
              {data.activeBuyOrders.map((order) => (
                <article key={order.id} className="row-card">
                  <div>
                    <div className="row-card__title">{order.resourceLabel}</div>
                    <p className="row-card__description">
                      {order.quantity} шт. · {formatNumber(order.totalPriceGold)} зол.
                      <br />
                      {order.priceSummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone="success">Buy order</Pill>
                    <span className="muted">До {formatDateTime(order.expiresAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Открытого спроса нет" description="Когда гильдия разместит новый buy order, он сразу станет понятным social signal для других игроков." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
