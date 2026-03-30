import Link from "next/link";
import { connection } from "next/server";

import { GuildIdentityMark, getGuildIdentitySurfaceStyle } from "@/components/guild-identity";
import { GuildDiplomacyControls } from "@/components/guild-diplomacy-controls";
import { GuildWatchToggle } from "@/components/guild-watch-toggle";
import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import { type PageSearchParams, formatDateTime, formatNumber, readActionFeedback } from "@/lib/format";
import { claimWorldEventReward } from "@/server/actions/foundation";
import { getGuildPublicProfilePageData } from "@/server/game";

export default async function GuildPublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ guildTag: string }>;
  searchParams: PageSearchParams;
}) {
  await connection();
  const [{ guildTag }, queryParams] = await Promise.all([params, searchParams]);
  const snapshot = await getGuildPublicProfilePageData(guildTag);
  const feedback = readActionFeedback(queryParams);

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
  const viewerRelation = data.viewerDiplomacy?.relation ?? "neutral";
  const viewerRelationTone = viewerRelation === "rivalry"
    ? "accent"
    : viewerRelation === "endorsement" || data.viewerDiplomacy?.isEndorsedByTarget
      ? "success"
      : "neutral";

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
            {!data.guild.isCurrentContext ? (
              <>
                <GuildWatchToggle
                  guildTag={data.guild.tag}
                  isWatched={data.isWatched}
                  redirectTo={`/guilds/${encodeURIComponent(data.guild.tag)}`}
                  followLabel="Добавить в watchlist"
                  unfollowLabel="Убрать из watchlist"
                />
                <GuildDiplomacyControls
                  guildTag={data.guild.tag}
                  relation={viewerRelation}
                  redirectTo={`/guilds/${encodeURIComponent(data.guild.tag)}`}
                  endorseLabel="Endorse"
                  rivalLabel="Tag rival"
                  unrivalLabel="Убрать rival"
                  clearLabel="Neutral"
                />
              </>
            ) : null}
            <Link className="button button--ghost" href={data.socialCtas.dealsHref}>
              Private deal CTA
            </Link>
            <Link className="button button--ghost" href={data.socialCtas.directoryHref}>
              Назад в каталог
            </Link>
          </>
        }
      />

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      <section className="identity-showcase" style={getGuildIdentitySurfaceStyle(data.guild.identity)}>
        <div className="identity-showcase__header">
          <GuildIdentityMark identity={data.guild.identity} />
          <div className="identity-showcase__copy">
            <span className="page-header__eyebrow">{data.guild.identity.titleLabel}</span>
            <h2 className="identity-showcase__title">{data.guild.identity.showcaseTitle}</h2>
            <p className="identity-showcase__subtitle">
              {data.guild.identity.signatureLabel} · Owner {data.guild.ownerDisplayName}
            </p>
          </div>
        </div>
        <p className="identity-showcase__motto">«{data.guild.identity.motto}»</p>
        <p className="identity-showcase__bio">{data.guild.identity.publicBio}</p>
        <div className="identity-showcase__chips">
          <Pill tone="accent">{data.guild.identity.titleLabel}</Pill>
          <Pill tone="success">{data.guild.identity.crestLabel}</Pill>
          <Pill tone="neutral">{data.guild.identity.colorLabel}</Pill>
          <Pill tone={data.guild.isCurrentContext ? "success" : "accent"}>
            {data.guild.isCurrentContext ? "Ваш дом" : "Public showcase"}
          </Pill>
        </div>
        <div className="identity-inline-summary">
          <span>{data.guild.socialSummary}</span>
          <span>{data.guild.pveLabel}</span>
          <span>{data.guild.marketUnlocked ? "Market open" : "Market locked"}</span>
          <span>{data.guild.tradeUnlocked ? "Deals open" : "Deals locked"}</span>
        </div>
      </section>

      <Notice tone={data.guild.isCurrentContext ? "success" : "accent"}>
        {data.guild.isCurrentContext
          ? "Это публичная версия вашей текущей гильдии: теперь её статус, reputation и social visibility читаются так же, как у остальных."
          : `Гильдия ${data.guild.name} [${data.guild.tag}] видна публично и теперь сразу объясняет, почему она статусна как контрагент, supplier или frontier-имя.`}
      </Notice>

      {!data.guild.isCurrentContext ? (
        <Notice tone={data.isWatched ? "success" : "accent"}>
          <strong>{data.watchlist.storageLabel}.</strong> {data.isWatched
            ? `${data.guild.name} [${data.guild.tag}] уже в вашем watchlist и будет появляться в персональной social activity ленте на dashboard.`
            : `${data.guild.name} [${data.guild.tag}] ещё не отслеживается. Добавьте дом в watchlist, чтобы возвращаться за его market, deal, contract и frontier activity.`}
        </Notice>
      ) : null}

      <Notice tone={data.prestige.tone}>
        <strong>{data.prestige.tierLabel}.</strong> {data.prestige.spotlight}
      </Notice>

      <Notice tone={data.renown.tone}>
        <strong>{data.renown.tierLabel}.</strong> {data.renown.spotlight}
      </Notice>

      <Notice tone={data.diplomacy.tone}>
        <strong>{data.diplomacy.statusLabel}.</strong> {data.diplomacy.spotlight}
      </Notice>

      {data.viewerDiplomacy ? (
        <Notice tone={viewerRelationTone}>
          <strong>{data.viewerDiplomacy.relationLabel}.</strong> {data.viewerDiplomacy.summary}
        </Notice>
      ) : null}

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
          title="Watchlist"
          value={data.isWatched ? "Watching" : `${data.watchlist.count}/${data.watchlist.maxCount}`}
          detail={data.guild.isCurrentContext
            ? "Текущую гильдию нельзя подписать на саму себя."
            : data.isWatched
              ? `${data.guild.tag} уже в вашем retention watchlist.`
              : "Добавьте дом в watchlist, чтобы видеть его действия в персональной follow-ленте."}
          tone={data.isWatched ? "success" : "accent"}
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
          title="Diplomacy"
          value={`${data.diplomacy.endorsementCount}/${data.diplomacy.rivalryCount}`}
          detail={`${data.diplomacy.outgoingEndorsementCount} outgoing endorsements · ${data.diplomacy.outgoingRivalryCount} outgoing rivalry tags.`}
          tone={data.diplomacy.tone}
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
          title="Diplomacy snapshot"
          description="Лёгкий relational слой поверх существующих loops: endorsements усиливают trust/familiarity, rivalry tags добавляют мягкое соревновательное давление без PvP-войн."
          aside={<Pill tone={data.diplomacy.tone}>{data.diplomacy.statusLabel}</Pill>}
        >
          <div className="stack-sm">
            <article className="row-card">
              <div>
                <div className="row-card__title">Public diplomacy memory</div>
                <p className="row-card__description">
                  {data.diplomacy.summary}
                  <br />
                  {data.viewerDiplomacy?.mutualHistorySummary ?? "Прямой viewer-to-guild relation пока не задан."}
                  <br />
                  Suggested allies: {data.diplomacy.suggestedAllies.map((entry) => entry.guildTag).join(" • ") || "пока не выбраны"}
                  <br />
                  Suggested rivals: {data.diplomacy.suggestedRivals.map((entry) => entry.guildTag).join(" • ") || "пока не выбраны"}
                </p>
              </div>
              <div className="row-card__aside">
                {data.diplomacy.badges.map((badge) => (
                  <Pill key={badge.key} tone={badge.tone}>{badge.label}</Pill>
                ))}
              </div>
            </article>

            {[
              { title: "Incoming endorsements", entries: data.diplomacy.incomingEndorsements },
              { title: "Outgoing endorsements", entries: data.diplomacy.outgoingEndorsements },
              { title: "Incoming rivalries", entries: data.diplomacy.incomingRivalries },
              { title: "Outgoing rivalries", entries: data.diplomacy.outgoingRivalries },
            ].map((group) => (
              <article key={group.title} className="row-card">
                <div>
                  <div className="row-card__title">{group.title}</div>
                  <p className="row-card__description">
                    {group.entries.length > 0
                      ? group.entries.map((entry) => `${entry.guildTag} — ${entry.reasonLabel}`).join(" • ")
                      : "Пока пусто: эта часть diplomacy memory ещё не заполнена."}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={group.title.includes("rival") ? "accent" : "success"}>{group.entries.length}</Pill>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

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
          description="Identity теперь не скрыта в настройках: profile сразу показывает framing дома, crest/theme и public copy, по которым его запоминают другие игроки."
          aside={<Pill tone={data.prestige.tone}>{data.prestige.tierLabel}</Pill>}
        >
          <div className="stack-sm">
            <article className="row-card">
              <div>
                <div className="row-card__title row-card__title--with-mark">
                  <GuildIdentityMark identity={data.guild.identity} compact />
                  <span>{data.guild.ownerDisplayName}</span>
                </div>
                <p className="row-card__description">
                  Основатель гильдии с {formatDateTime(data.guild.ownerSince)}
                  <br />
                  {data.guild.identity.titleDescription}
                  <br />
                  {data.guild.identity.crestDescription}
                  <br />
                  {data.guild.identity.colorDescription}
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
                <Pill tone="accent">{data.guild.identity.titleLabel}</Pill>
                <Pill tone="success">{data.guild.identity.crestLabel}</Pill>
                <Pill tone="neutral">{data.guild.identity.colorLabel}</Pill>
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
