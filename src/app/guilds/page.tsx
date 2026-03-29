import Link from "next/link";
import { connection } from "next/server";

import { InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import { claimWorldEventReward } from "@/server/actions/foundation";
import { getGuildDirectoryPageData } from "@/server/game";

export default async function GuildDirectoryPage() {
  await connection();
  const snapshot = await getGuildDirectoryPageData();

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Guild directory"
          title="Публичный social layer временно недоступен"
          description="Каталог гильдий и лидерборды не смогли загрузить текущие server-side snapshots."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Выполните `npm run db:setup`, чтобы наполнить public directory и leaderboard-слой.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Guild directory"
        title="Публичные гильдии, renown loop и social leaderboard-слой"
        description="Каталог теперь показывает не только силу и богатство, но и повторную social ценность: какие гильдии собирают familiar-house renown, кто возвращает к себе контрагентов сериями и где уже появились любимые дома мира."
        actions={
          <>
            <Link className="button button--primary" href="/market">
              Открыть рынок
            </Link>
            <Link className="button button--ghost" href="/deals">
              Перейти к private deals
            </Link>
          </>
        }
      />

      <Notice tone="accent">
        Renown и social memory собираются поверх уже существующих market sales, fulfilled buy orders, accepted deals, контрактов и PvE: без тяжёлого нового backend-а, но с понятной social visibility и причинами возвращаться не в пустой рынок, а к знакомым домам.
      </Notice>

      <Notice tone="success">
        <strong>{data.worldEventBoard.season.label}.</strong> Public world events собирают общий social pressure:
        кто ведёт frontier, кто двигает рынок и кто конвертирует контракты с workshop в civic growth.
      </Notice>

      <div className="stats-grid stats-grid--4">
        <InfoCard
          title="Guilds visible"
          value={data.community.guildCount}
          detail="Все seeded и реальные alpha-гильдии попадают в общий discovery слой."
          tone="accent"
        />
        <InfoCard
          title="Players visible"
          value={data.community.playerCount}
          detail="Каталог игроков derived из owner/display name уже существующих аккаунтов."
        />
        <InfoCard
          title="Renown leaders"
          value={data.community.renownLeaders}
          detail={`${data.community.recurringPairs} recurring ties уже делают рынок менее анонимным.`}
          tone="success"
        />
        <InfoCard
          title="Progress surfaced"
          value={`${data.community.contractsClaimed} / ${data.community.resolvedExpeditions}`}
          detail={`Контракты, high-risk clears и repeat-business серии получают публично читаемый status вместо чисто декоративной цифры.`}
        />
        <InfoCard
          title="Seasonal rewards"
          value={data.worldEventBoard.summary.claimableRewardCount}
          detail={`${data.worldEventBoard.summary.nearGoalCount} близких tier-целей · ${data.worldEventBoard.season.progressLabel}.`}
          tone={data.worldEventBoard.summary.claimableRewardCount > 0 ? "success" : "accent"}
        />
      </div>

      <SectionCard
        title="Seasonal board / world events"
        description={data.worldEventBoard.season.summary}
        aside={<Pill tone={data.worldEventBoard.summary.claimableRewardCount > 0 ? "success" : "accent"}>{data.worldEventBoard.season.label}</Pill>}
      >
        <div className="stack-sm">
          {data.worldEventBoard.events.map((event) => {
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
                      ? `Текущий guild-вклад: ${event.focusGuild.points} очк. · rank #${event.focusGuild.rank}/${event.focusGuild.total} · ${event.focusGuild.detail}`
                      : event.objectiveLabel}
                    <br />
                    {event.focusGuild?.highlight ?? event.objectiveLabel}
                    <br />
                    Reward tiers: {event.rewardTiers.map((tier) => `${tier.label} — ${tier.statusLabel}`).join(" • ")}
                    <br />
                    Top standings: {event.standings.map((entry) => `#${entry.rank} ${entry.guildTag} (${entry.points})`).join(" • ")}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={event.tone}>{event.progressPercent}% world</Pill>
                  {event.focusGuild ? <Pill tone={claimableTiers.length > 0 ? "success" : "accent"}>{event.focusGuild.nextThresholdLabel ?? "Все tier-цели закрыты"}</Pill> : null}
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

      <div className="content-grid content-grid--two-thirds">
        {data.leaderboards.map((leaderboard) => (
          <SectionCard
            key={leaderboard.key}
            title={leaderboard.title}
            description={leaderboard.description}
            aside={<Pill tone="accent">{leaderboard.metricLabel}</Pill>}
          >
            <div className="stack-sm">
              {leaderboard.entries.map((entry) => (
                <article key={`${leaderboard.key}-${entry.guildId}`} className="row-card">
                  <div>
                    <div className="row-card__title">
                      #{entry.rank} · {entry.guildName} [{entry.guildTag}]
                    </div>
                    <p className="row-card__description">
                      {entry.ownerDisplayName}
                      <br />
                      {entry.valueLabel}
                      <br />
                      {entry.renownTierLabel} · {entry.tierLabel}
                      {entry.primaryRenownPerkLabel ? ` · ${entry.primaryRenownPerkLabel}` : ""}
                      {entry.primaryBadgeLabel ? ` · ${entry.primaryBadgeLabel}` : ""}
                      <br />
                      {entry.favoriteCounterpartyLabel ? `Favorite trader: ${entry.favoriteCounterpartyLabel}` : "Пока любимые дома ещё не собраны."}
                      <br />
                      {entry.detail}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    {entry.primaryRenownPerkLabel ? <Pill tone="success">{entry.primaryRenownPerkLabel}</Pill> : null}
                    {entry.primaryBadgeLabel ? <Pill tone="accent">{entry.primaryBadgeLabel}</Pill> : null}
                    <Pill tone={entry.isCurrentContext ? "success" : entry.rank === 1 ? "accent" : "neutral"}>
                      {entry.isCurrentContext ? "Текущий контекст" : entry.rank === 1 ? "Лидер" : `Top ${entry.rank}`}
                    </Pill>
                    <Link className="button button--ghost" href={entry.href}>
                      Открыть профиль
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Каталог гильдий"
        description="Каждая гильдия получает prestige-витрину: tier, badges, trusted-status, видимые social proofs и мягкие CTA в уже существующие loops."
      >
        <div className="stack-sm">
          {data.guilds.map((guild) => (
            <article key={guild.guildId} className="row-card">
              <div>
                <div className="row-card__title">
                  {guild.guildName} [{guild.guildTag}]
                </div>
                <p className="row-card__description">
                  Owner: {guild.ownerDisplayName}
                  <br />
                  {guild.renown.tierLabel} · {guild.renown.score} renown · rank #{guild.renown.rank}/{guild.renown.total}
                  <br />
                  {guild.prestige.tierLabel} · {guild.prestige.score} prestige · rank #{guild.prestige.rank}/{guild.prestige.total}
                  <br />
                  Lv. {guild.level} · {formatNumber(guild.gold)} зол. · {formatNumber(guild.rosterPower)} power · {guild.heroCount} героев
                  <br />
                  {guild.marketActivityLabel}
                  <br />
                  {guild.pveLabel} · deals {guild.privateDealsCompleted} · contracts {guild.contractsCompleted}
                  <br />
                  {guild.recurringSummary.summary}
                  <br />
                  {guild.renown.favoriteCounterpartyLabel
                    ? `Favorite traders: ${guild.favoriteCounterparties.map((entry) => `${entry.guildTag} (${entry.relationshipLabel})`).join(" • ")}`
                    : "Пока любимые дома не собрались — первая серия повторных сделок быстро включит social memory."}
                  <br />
                  {guild.socialSummary}
                  <br />
                  {guild.renown.recentInteractionLabel}
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={guild.renown.tone}>{guild.renown.tierLabel}</Pill>
                {guild.renown.primaryPerkLabel ? <Pill tone="success">{guild.renown.primaryPerkLabel}</Pill> : null}
                <Pill tone={guild.prestige.tone}>{guild.prestige.tierLabel}</Pill>
                {guild.prestige.primaryBadgeLabel ? <Pill tone="accent">{guild.prestige.primaryBadgeLabel}</Pill> : null}
                <Pill tone={guild.isCurrentContext ? "success" : "accent"}>
                  {guild.isCurrentContext ? "Текущая гильдия" : "Публична"}
                </Pill>
                <Link className="button button--primary" href={guild.profileHref}>
                  Профиль
                </Link>
                <Link className="button button--ghost" href={guild.marketHref}>
                  Смотреть рынок
                </Link>
                <Link className="button button--ghost" href={guild.dealsHref}>
                  Открыть deal CTA
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Каталог игроков"
        description="Display name владельца теперь считывается вместе с prestige его гильдии: видно, кто стоит за trusted trader, contract house или rising guild-статусом."
      >
        <div className="stack-sm">
          {data.players.map((player) => (
            <article key={player.userId} className="row-card">
              <div>
                <div className="row-card__title">{player.displayName}</div>
                <p className="row-card__description">
                  {player.guildName} [{player.guildTag}]
                  <br />
                  {player.renown.tierLabel} · {player.renown.score} renown
                  {player.renown.primaryPerkLabel ? ` · ${player.renown.primaryPerkLabel}` : ""}
                  <br />
                  {player.prestige.tierLabel} · {player.prestige.score} prestige
                  {player.prestige.primaryBadgeLabel ? ` · ${player.prestige.primaryBadgeLabel}` : ""}
                  <br />
                  Lv. {player.guildLevel} · {formatNumber(player.rosterPower)} power · market {player.marketActivity}
                  <br />
                  В сообществе с {formatDateTime(player.joinedAt)}
                  <br />
                  {player.socialSummary}
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={player.renown.tone}>{player.renown.tierLabel}</Pill>
                {player.renown.primaryPerkLabel ? <Pill tone="success">{player.renown.primaryPerkLabel}</Pill> : null}
                <Pill tone={player.isCurrentContext ? "success" : "neutral"}>
                  {player.isCurrentContext ? "Это вы" : "Игрок visible"}
                </Pill>
                <Link className="button button--ghost" href={player.profileHref}>
                  Гильдия игрока
                </Link>
                <Link className="button button--ghost" href={player.dealsHref}>
                  Private deal
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
