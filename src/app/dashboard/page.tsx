import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import { FOUNDATION_ACTIONS } from "@/lib/domain";
import {
  type PageSearchParams,
  formatCompactList,
  formatDateTime,
  formatNumber,
  formatSignedNumber,
  readActionFeedback,
} from "@/lib/format";
import {
  claimGuildContract,
  claimExpeditionRewards,
  claimWorldEventReward,
  purchaseGuildUpgrade,
} from "@/server/actions/foundation";
import { getAppShellContext } from "@/server/foundation";
import { getDashboardPageData } from "@/server/game";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const [params, snapshot, shellContext] = await Promise.all([
    searchParams,
    getDashboardPageData(),
    getAppShellContext(),
  ]);
  const feedback = readActionFeedback(params);

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Guild dashboard"
          title="Dashboard временно недоступен"
          description="Игровая сводка не может загрузиться, пока локальная SQLite не инициализирована."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Выполните `npm run db:setup`, затем перезапустите dev-сервер.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;
  const recommendedAction = data.onboarding.recommendedAction;
  const pendingExpeditionClaims = data.claimableExpeditions.length;
  const pendingTradeActions = data.inbox.pending.filter((entry) => entry.kind === "trade-offer").length;
  const pendingMarketActions = data.inbox.pending.filter((entry) => entry.kind === "market-claim").length;
  const pendingWorldEventRewards = data.inbox.pending.filter((entry) => entry.kind === "world-event-reward").length;
  const contractBoard = data.contractBoard;
  const worldEventBoard = data.worldEventBoard;
  const getRiskTone = (label: string) => {
    if (label.includes("Экстремальный")) {
      return "warning" as const;
    }

    if (label.includes("Высокий")) {
      return "accent" as const;
    }

    if (label.includes("Низкий")) {
      return "success" as const;
    }

    return "neutral" as const;
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Guild dashboard"
        title={`${data.guild.name} [${data.guild.tag}]`}
        description={
          data.onboarding.isActive
            ? "Главная стартовая точка первого сеанса: board показывает, какой loop уже открыт, что реально доступно прямо сейчас и куда лучше идти следующим кликом."
            : "Главный экран objective board: базовые first-session loops уже закрыты, а contracts, facilities и PvE horizon продолжают вести гильдию дальше."
        }
        actions={
          <>
            {recommendedAction ? (
              <Link className="button button--primary" href={recommendedAction.href}>
                {recommendedAction.actionLabel}
              </Link>
            ) : (
              <Link className="button button--primary" href="/expedition">
                Перейти к экспедициям
              </Link>
            )}
            <Link className="button button--ghost" href={`/guilds/${encodeURIComponent(data.guild.tag)}`}>
              Публичный профиль
            </Link>
            <Link className="button button--ghost" href="/guilds">
              Лидерборды
            </Link>
            <Link className="button button--ghost" href="/market">
              Открыть рынок
            </Link>
          </>
        }
      />

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      <Notice tone="accent">
        Текущий guild context: {data.guild.name} [{data.guild.tag}]. В account-режиме это ваша
        личная гильдия, а в demo sandbox shell может переключать seeded-перспективу без смешивания
        данных между режимами.
      </Notice>

      <Notice tone="success">
        PvE теперь даёт не только новые зоны, но и разные типы ставок: resource-heavy supply run, жадный high-risk payout и elite run под rare loot + XP.
      </Notice>

      <Notice tone="success">
        Социальный слой уже включён: эту гильдию можно открыть как public profile, сравнить с другими в `/guilds` и использовать как мягкий вход в рынок и private deals.
      </Notice>

      {data.guildPrestige ? (
        <Notice tone={data.guildPrestige.prestige.tone}>
          <strong>{data.guildPrestige.prestige.tierLabel}.</strong> {data.guildPrestige.prestige.spotlight}
        </Notice>
      ) : null}

      {data.guildPrestige ? (
        <Notice tone={data.guildPrestige.renown.tone}>
          <strong>{data.guildPrestige.renown.tierLabel}.</strong> {data.guildPrestige.renown.spotlight}
          {data.guildPrestige.renown.favoriteCounterpartyLabel ? ` Любимый дом сейчас: ${data.guildPrestige.renown.favoriteCounterpartyLabel}.` : ""}
        </Notice>
      ) : null}

      <Notice tone="accent">
        <strong>{worldEventBoard.season.label}.</strong> {worldEventBoard.season.summary} Сейчас видно
        {` ${worldEventBoard.summary.claimableRewardCount} готовых reward-claim, ${worldEventBoard.summary.nearGoalCount} близких tier-целей и ${worldEventBoard.summary.recentActivityCount} публичных сигналов активности.`}
      </Notice>

      {shellContext.mode === "demo" ? (
        <Notice tone="accent">
          Сейчас открыт demo sandbox: onboarding board читает состояние активной seeded-гильдии и может быть уже частично пройден, но не мешает multi-guild switching и локальной диагностике.
        </Notice>
      ) : null}

      <SectionCard
        title="World event / seasonal board"
        description={`Public board поверх уже существующих loops. ${worldEventBoard.season.progressLabel}.`}
        aside={
          <Pill tone={worldEventBoard.summary.claimableRewardCount > 0 ? "success" : "accent"}>
            {worldEventBoard.summary.claimableRewardCount > 0
              ? `${worldEventBoard.summary.claimableRewardCount} reward ready`
              : worldEventBoard.season.label}
          </Pill>
        }
      >
        <div className="stack-sm">
          {worldEventBoard.events.map((event) => {
            const claimableTiers = event.rewardTiers.filter((tier) => tier.status === "claimable");

            return (
              <article key={event.key} className="row-card">
                <div>
                  <div className="row-card__title">{event.title}</div>
                  <p className="row-card__description">
                    {event.eyebrow} · {event.description}
                    <br />
                    {event.progressLabel} · {event.statusLabel}
                    <br />
                    {event.focusGuild
                      ? `Ваш вклад: ${event.focusGuild.points} очк. · rank #${event.focusGuild.rank}/${event.focusGuild.total} · ${event.focusGuild.detail}`
                      : event.objectiveLabel}
                    <br />
                    {event.focusGuild?.highlight ?? event.objectiveLabel}
                    <br />
                    Reward tiers: {formatCompactList(event.rewardTiers.map((tier) => `${tier.label} — ${tier.statusLabel}`))}
                    <br />
                    Лидеры: {event.standings.slice(0, 3).map((entry) => `#${entry.rank} ${entry.guildTag} (${entry.points})`).join(" • ")}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={event.tone}>{event.progressPercent}% world</Pill>
                  {event.focusGuild ? (
                    <Pill tone={claimableTiers.length > 0 ? "success" : "accent"}>
                      {event.focusGuild.nextThresholdLabel ?? "Все tier-цели закрыты"}
                    </Pill>
                  ) : null}
                  {claimableTiers.map((tier) => (
                    <form key={`${event.key}-${tier.key}`} action={claimWorldEventReward} className="inline-form">
                      <input type="hidden" name="eventKey" value={event.key} />
                      <input type="hidden" name="tierKey" value={tier.key} />
                      <input type="hidden" name="redirectTo" value="/dashboard" />
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
        title="First-session guide"
        description={data.onboarding.summary}
        aside={<Pill tone={data.onboarding.isActive ? "accent" : "success"}>{data.onboarding.progressLabel}</Pill>}
      >
        <div className="stack-sm">
          {recommendedAction ? (
            <Notice tone={recommendedAction.tone}>
              <strong>Recommended next step:</strong> {recommendedAction.title}. {recommendedAction.summary} {recommendedAction.reason}
            </Notice>
          ) : (
            <Notice tone="success">Все базовые first-session milestones уже закрыты для текущего guild context.</Notice>
          )}

          {data.onboarding.blockers.length > 0 ? (
            <ul className="bullet-list bullet-list--muted">
              {data.onboarding.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}

          {data.onboarding.milestones.map((milestone) => {
            const isRecommended = recommendedAction?.key === milestone.key;

            return (
              <article key={milestone.key} className="row-card">
                <div>
                  <div className="row-card__title">{milestone.title}</div>
                  <p className="row-card__description">
                    {milestone.summary}
                    <br />
                    {milestone.progressLabel}
                    {milestone.blockers.length > 0 ? (
                      <>
                        <br />
                        Блокеры: {formatCompactList(milestone.blockers)}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={milestone.tone}>{milestone.statusLabel}</Pill>
                  {isRecommended ? <span className="muted">Recommended next step</span> : null}
                  <Link className="button button--ghost" href={milestone.href}>
                    {milestone.actionLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <div className="stats-grid stats-grid--4">
        {data.guildPrestige ? (
          <InfoCard
            title="Renown"
            value={data.guildPrestige.renown.score}
            detail={`#${data.guildPrestige.renown.rank} из ${data.guildPrestige.renown.total} · ${data.guildPrestige.renown.recurringLabel}`}
            tone={data.guildPrestige.renown.tone}
          />
        ) : null}
        {data.guildPrestige ? (
          <InfoCard
            title="Prestige"
            value={data.guildPrestige.prestige.score}
            detail={`#${data.guildPrestige.prestige.rank} из ${data.guildPrestige.prestige.total} · ${data.guildPrestige.prestige.recentTrustLabel}`}
            tone={data.guildPrestige.prestige.tone}
          />
        ) : null}
        <InfoCard
          title="Seasonal board"
          value={`${worldEventBoard.summary.claimableRewardCount} ready`}
          detail={`${worldEventBoard.summary.nearGoalCount} близких tier-целей · ${worldEventBoard.season.progressLabel}.`}
          tone={worldEventBoard.summary.claimableRewardCount > 0 ? "success" : "accent"}
        />
        <InfoCard
          title="Guild level"
          value={`Lv. ${data.guild.level}`}
          detail={
            data.guild.nextLevelXp
              ? `${formatNumber(data.guild.xp)} / ${formatNumber(data.guild.nextLevelXp)} XP до следующего уровня.`
              : `${formatNumber(data.guild.xp)} XP накоплено.`
          }
          tone="accent"
        />
        <InfoCard
          title="Gold"
          value={formatNumber(data.guild.gold)}
          detail="Золото тратится на найм, facility upgrades, рыночные листинги и долгие economy sinks гильдии."
        />
        <InfoCard
          title="Objective board"
          value={`${contractBoard.summary.readyCount} ready`}
          detail={`${contractBoard.summary.inProgressCount} в работе, ${contractBoard.summary.claimedCount} уже закрыто и ${contractBoard.summary.unavailableCount} пока ждут unlock-а.`}
          tone={contractBoard.summary.readyCount > 0 ? "success" : "accent"}
        />
        <InfoCard
          title="PvE horizon"
          value={`${data.pveHorizon.unlockedLocationCount}/${data.pveHorizon.totalLocationCount}`}
          detail={`Special scenarios: ${data.pveHorizon.unlockedSpecialScenarioCount}/${data.pveHorizon.totalSpecialScenarioCount}. Highest risk: ${data.pveHorizon.highestUnlockedRiskLabel}.`}
        />
        <InfoCard
          title="Actionable inbox"
          value={data.inbox.pending.length}
          detail={`${pendingWorldEventRewards} seasonal reward, ${pendingExpeditionClaims} expedition claim, ${pendingMarketActions} market / request outcome и ${pendingTradeActions} входящих сделки требуют внимания.`}
          tone="success"
        />
        <InfoCard
          title="Active expeditions"
          value={data.activeExpeditions.length}
          detail={`${data.claimableExpeditions.length} экспедиций уже ждут claim-награды.`}
        />
      </div>

      <SectionCard
        title="Guild objective board"
        description="Контракты не создают отдельный режим, а читаемо связывают уже существующие loops: снабжение ресурсами, high-risk PvE, request board, рынок и workshop."
        aside={
          <Pill tone={contractBoard.summary.readyCount > 0 ? "success" : "accent"}>
            {contractBoard.summary.readyCount > 0
              ? `${contractBoard.summary.readyCount} ready to claim`
              : `${contractBoard.summary.inProgressCount} в работе`}
          </Pill>
        }
      >
        <div className="stack-sm">
          {contractBoard.entries.map((contract) => (
            <article key={contract.key} className="row-card">
              <div>
                <div className="row-card__title">{contract.title}</div>
                <p className="row-card__description">
                  {contract.archetypeLabel} · {contract.summary}
                  <br />
                  {contract.progressLabel}
                  <br />
                  Награда: {formatCompactList(contract.rewardLabels)}
                  <br />
                  {contract.relatedActionSummary}
                  {contract.blockers.length > 0 ? (
                    <>
                      <br />
                      Блокеры: {formatCompactList(contract.blockers)}
                    </>
                  ) : null}
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={contract.tone}>{contract.statusLabel}</Pill>
                <span className="muted">{contract.archetypeLabel}</span>
                {contract.claimedAt ? (
                  <span className="muted">Claimed {formatDateTime(contract.claimedAt)}</span>
                ) : null}
                {contract.claimable ? (
                  <form action={claimGuildContract} className="inline-form">
                    <input type="hidden" name="contractKey" value={contract.key} />
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    <button className="button button--primary" type="submit">
                      Забрать награду
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

      <SectionCard
        title="Recent completed contracts"
        description="Последние закрытые objective-контракты остаются видимыми как короткая history-лента, чтобы multi-guild demo было проще читать при переключении перспективы."
      >
        {contractBoard.recentCompleted.length > 0 ? (
          <div className="stack-sm">
            {contractBoard.recentCompleted.map((contract) => (
              <article key={`${contract.key}-${contract.claimedAt.toISOString()}`} className="row-card">
                <div>
                  <div className="row-card__title">{contract.title}</div>
                  <p className="row-card__description">
                    {contract.summary}
                    <br />
                    Награда: {formatCompactList(contract.rewardLabels)}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone="neutral">Claimed</Pill>
                  <span className="muted">{formatDateTime(contract.claimedAt)}</span>
                  <Link className="button button--ghost" href={contract.href}>
                    Открыть контекст
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Контракты ещё не завершались"
            description="После первого contract claim здесь появится короткая recent-лента закрытых objective-циклов." 
          />
        )}
      </SectionCard>

      <SectionCard
        title="PvE horizon"
        description="Ближайшие PvE-цели теперь читаются отдельно: сколько маршрутов уже открыто, какие scenario-ветки доступны и на какой риск гильдия реально вышла."
        aside={<Pill tone={data.pveHorizon.unlockedSpecialScenarioCount > 0 ? "accent" : "warning"}>{`${data.pveHorizon.unlockedSpecialScenarioCount}/${data.pveHorizon.totalSpecialScenarioCount} special`}</Pill>}
      >
        <p className="muted">{data.pveHorizon.nextGoalLabel ?? "Все PvE-цели текущего MVP уже достигнуты."}</p>
        <div className="stack-sm">
          {data.pveHorizon.highlightedScenarios.map((scenario) => (
            <article key={scenario.code} className="row-card">
              <div>
                <div className="row-card__title">{scenario.name}</div>
                <p className="row-card__description">
                  {scenario.scenarioLabel} · {scenario.summary}
                  <br />
                  {scenario.riskLabel} · {scenario.rewardFocusLabel}
                  <br />
                  {scenario.progressSummary}
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={scenario.isUnlocked ? "success" : "warning"}>{scenario.statusLabel}</Pill>
                <Pill tone={getRiskTone(scenario.riskLabel)}>{scenario.riskLabel}</Pill>
                {scenario.isElite ? <Pill tone="warning">Elite</Pill> : null}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Guild facilities"
          description="Каждый facility показывает текущее состояние, лимит и ближайшую цель — вместо набора разрозненных апгрейдов."
        >
          <div className="stack-sm">
            {data.metaprogression.facilities.map((facility) => (
              <article key={facility.key} className="row-card">
                <div>
                  <div className="row-card__title">{facility.title}</div>
                  <p className="row-card__description">
                    {facility.summary}
                    <br />
                    {facility.limitLabel}
                    {facility.nextGoalLabel ? (
                      <>
                        <br />
                        Следующая цель: {facility.nextGoalLabel}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={facility.unlocked ? "success" : "warning"}>{facility.statusLabel}</Pill>
                  <Link className="button button--ghost" href={facility.href}>
                    Открыть facility
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Next milestones"
          description="Derived goals объясняют, зачем продолжать текущие loops: новая PvE-ветка, recruit breakpoint, второй состав и ближайший facility tier."
        >
          <div className="stack-sm">
            {data.metaprogression.nextGoals.map((goal) => (
              <article key={goal.key} className="row-card">
                <div>
                  <div className="row-card__title">{goal.title}</div>
                  <p className="row-card__description">
                    {goal.summary}
                    <br />
                    {goal.progressLabel}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={goal.status === "completed" ? "success" : "accent"}>
                    {goal.status === "completed" ? "Достигнуто" : "Следующая цель"}
                  </Pill>
                  <Link className="button button--ghost" href={goal.href}>
                    Открыть контекст
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Upgrade board"
        description="Общий board facility tiers показывает цену, условия, текущий usage и то, что откроется после следующей покупки."
      >
        <div className="stack-sm">
          {data.metaprogression.upgradeBoard.map((upgrade) => (
            <form key={upgrade.upgradeType} action={purchaseGuildUpgrade} className="card-form">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <input type="hidden" name="upgradeType" value={upgrade.upgradeType} />
              <div className="row-card">
                <div>
                  <div className="row-card__title">{upgrade.title}</div>
                  <p className="row-card__description">
                    {upgrade.summary}
                    <br />
                    {upgrade.currentValueLabel}
                    <br />
                    {upgrade.usageLabel}
                    <br />
                    {upgrade.nextValueLabel ?? "MVP-потолок уже достигнут."}
                    <br />
                    Milestone: {upgrade.milestoneLabel}
                    {upgrade.blockerSummary ? (
                      <>
                        <br />
                        {upgrade.blockerSummary}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={upgrade.canPurchase ? "success" : upgrade.nextLevel ? "warning" : "neutral"}>
                    {upgrade.nextLevel ? (upgrade.canPurchase ? "Можно купить" : "Заблокировано") : "Макс tier"}
                  </Pill>
                  <span className="muted">Tier {upgrade.currentLevel}/{upgrade.maxLevel}</span>
                  <span className="muted">
                    {upgrade.nextCostGold !== null ? `Цена: ${formatNumber(upgrade.nextCostGold)} золота` : "Без следующего тира"}
                  </span>
                  <Link className="button button--ghost" href={upgrade.href}>
                    Контекст facility
                  </Link>
                </div>
              </div>

              <div className="mini-list">
                {upgrade.tiers.map((tier) => (
                  <span key={`${upgrade.upgradeType}-${tier.level}`} className="muted">
                    Tier {tier.level}: {tier.effectLabel} · {tier.requirementSummary} · {formatNumber(tier.costGold)} зол. · {tier.status}
                  </span>
                ))}
              </div>

              <button className="button button--primary" type="submit" disabled={!upgrade.canPurchase}>
                {upgrade.actionLabel}
              </button>
            </form>
          ))}
        </div>
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Unified inbox"
          description="Одно место для pending social/economy outcomes: claim-ready экспедиции, claim box рынка и request board-а, а также сделки, которые требуют ответа."
          aside={
            <Pill tone={data.inbox.pending.length > 0 ? "warning" : "success"}>
              {data.inbox.pending.length > 0 ? `${data.inbox.pending.length} action items` : "Inbox чист"}
            </Pill>
          }
        >
          {data.inbox.pending.length > 0 ? (
            <div className="stack-sm">
              {data.inbox.pending.map((entry) => (
                <article key={entry.id} className="row-card">
                  <div>
                    <div className="row-card__title">{entry.title}</div>
                    <p className="row-card__description">
                      {entry.summary}
                      <br />
                      {entry.detail}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={entry.tone}>
                      {entry.kind === "trade-offer"
                        ? "Сделка"
                        : entry.kind === "market-claim"
                          ? "Market claim"
                          : entry.kind === "world-event-reward"
                            ? "Seasonal reward"
                            : "Expedition claim"}
                    </Pill>
                    <span className="muted">{formatDateTime(entry.createdAt)}</span>
                    <Link className="button button--ghost" href={entry.href}>
                      {entry.actionLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ничего не ждёт внимания"
              description="Когда появятся market / request payouts, готовые expedition claims или входящие сделки, они автоматически соберутся здесь."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Recent social activity"
          description="Прозрачная recent history по sell listings, request board и приватным сделкам вместо чёрного ящика статусов."
          aside={<Pill tone={data.inbox.recent.length > 0 ? "accent" : "neutral"}>{data.inbox.recent.length} recent</Pill>}
        >
          {data.inbox.recent.length > 0 ? (
            <div className="stack-sm">
              {data.inbox.recent.map((entry) => (
                <article key={entry.id} className="row-card">
                  <div>
                    <div className="row-card__title">{entry.title}</div>
                    <p className="row-card__description">
                      {entry.summary}
                      <br />
                      {entry.detail}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={entry.tone}>
                      {entry.source === "market" ? "Market" : entry.source === "trade" ? "Deals" : "Seasonal board"}
                    </Pill>
                    <span className="muted">{formatDateTime(entry.createdAt)}</span>
                    <Link className="button button--ghost" href={entry.href}>
                      Открыть ленту
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="История ещё не собралась"
              description="После первых market / request / trade outcomes здесь появится понятная временная шкала recent activity."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Рост героев"
        description="Экспедиции теперь качают не только гильдию: каждый claim раздаёт hero XP и может поднимать уровни партии."
      >
        <div className="tile-grid tile-grid--3">
          <article className="metric-card">
            <span className="metric-card__label">Суммарный hero XP</span>
            <strong className="metric-card__value">{formatNumber(data.heroProgression.totalHeroXp)}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Средний уровень</span>
            <strong className="metric-card__value">Lv. {data.heroProgression.averageHeroLevel}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Пиковый уровень</span>
            <strong className="metric-card__value">Lv. {data.heroProgression.highestHeroLevel}</strong>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Рост ростера"
        description="Recruitment board, hero slots и quality breakpoints теперь работают как часть одной guild-цепочки роста."
        aside={<Pill tone={data.rosterProgression.freeSlots > 0 ? "success" : "warning"}>{`${data.rosterProgression.usedSlots}/${data.rosterProgression.heroSlotLimit}`}</Pill>}
      >
        <div className="tile-grid tile-grid--4">
          <article className="metric-card">
            <span className="metric-card__label">Всего героев</span>
            <strong className="metric-card__value">{data.rosterProgression.heroCount}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Готовы к походу</span>
            <strong className="metric-card__value">{data.rosterProgression.availableHeroes}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Активный резерв</span>
            <strong className="metric-card__value">
              {data.rosterProgression.reserveLoopUnlocked ? "Открыт" : `${data.rosterProgression.reserveLoopShortfall} гер.`}
            </strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Стоимость найма</span>
            <strong className="metric-card__value">{formatNumber(data.rosterProgression.recruitCostGold)}</strong>
          </article>
        </div>

        <div className="stack-sm">
          <article className="row-card">
            <div>
              <div className="row-card__title">Recruitment board</div>
              <p className="row-card__description">
                На экране героев всегда доступен ограниченный server-generated пул рекрутов. Сейчас
                {data.rosterProgression.freeSlots > 0
                  ? ` в гильдии ${data.rosterProgression.freeSlots} свободных slot(а) для найма.`
                  : " слоты заполнены, поэтому сначала нужен апгрейд ростера."}
                <br />
                Текущий quality breakpoint: {data.recruitmentProgression.currentRarityLabel}. {data.recruitmentProgression.nextGoalLabel ?? "Максимальный recruit tier уже открыт."}
              </p>
            </div>
            <div className="row-card__aside">
              <Pill tone={data.rosterProgression.canRecruit ? "success" : "warning"}>
                {data.rosterProgression.canRecruit
                  ? "Можно нанять"
                  : data.rosterProgression.freeSlots > 0
                    ? "Нужно золото"
                    : "Нужен апгрейд"}
              </Pill>
              <Link className="button button--ghost" href="/heroes">
                Открыть ростер
              </Link>
            </div>
          </article>

          {data.heroSlotsUpgrade.nextCostGold ? (
            <form action={purchaseGuildUpgrade} className="card-form">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <input type="hidden" name="upgradeType" value="HERO_SLOTS" />
              <div className="row-card">
                <div>
                  <div className="row-card__title">Следующий апгрейд hero slots</div>
                  <p className="row-card__description">
                    Лимит ростера вырастет до {data.heroSlotsUpgrade.nextSlotLimit} героев. Это прямой hook к более гибкой ротации, второму составу и следующему recruit breakpoint-у.
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={data.heroSlotsUpgrade.canAfford ? "success" : "warning"}>
                    {data.heroSlotsUpgrade.canAfford ? "Можно купить" : "Не хватает золота"}
                  </Pill>
                  <span className="muted">Цена: {formatNumber(data.heroSlotsUpgrade.nextCostGold)} золота</span>
                </div>
              </div>
              <button
                className="button button--primary"
                type="submit"
                disabled={!data.heroSlotsUpgrade.canPurchase}
              >
                Купить hero slots
              </button>
            </form>
          ) : (
            <EmptyState
              title="Апгрейды ростера исчерпаны"
              description="Для MVP этого потолка хватает, чтобы проверить ротацию, найм и второй полноценный состав."
            />
          )}
        </div>
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Активные экспедиции"
          description="Lazy resolution сработает автоматически при следующем заходе на экран, когда таймер закончится. Теперь здесь видно и текущий risk/reward-профиль маршрута."
          aside={<Pill tone="accent">{data.activeExpeditions.length} в пути</Pill>}
        >
          {data.activeExpeditions.length > 0 ? (
            <div className="stack-sm">
              {data.activeExpeditions.map((expedition) => (
                <article key={expedition.id} className="row-card">
                  <div>
                    <div className="row-card__title">{expedition.locationName}</div>
                    <p className="row-card__description">
                      {expedition.scenarioLabel} · {expedition.riskLabel} · {expedition.rewardFocusLabel}
                      <br />
                      Группа: {formatCompactList(expedition.partyNames)}
                      <br />
                      Тактический рейтинг {formatNumber(expedition.partyPowerSnapshot)} против угрозы {formatNumber(expedition.threatScoreSnapshot)} ({formatSignedNumber(expedition.partyPowerSnapshot - expedition.threatScoreSnapshot)})
                      <br />
                      {expedition.riskRewardSummary}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone="accent">{expedition.statusLabel}</Pill>
                    <Pill tone={getRiskTone(expedition.riskLabel)}>{expedition.riskLabel}</Pill>
                    <span className="muted">До {formatDateTime(expedition.endsAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Активных забегов нет"
              description="Соберите партию из трёх героев на экране экспедиций и запустите новый поход."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Social / economy channels"
          description="Dashboard теперь связывает unlock-состояние каналов с их текущей активностью и pending outcomes."
        >
          <div className="stack-sm">
            <article className="row-card">
              <div>
                <div className="row-card__title">Рынок</div>
                <p className="row-card__description">
                  Fixed-price лоты, resource request board, claim box и прозрачная history рынка уже работают на одном и том же data snapshot.
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={data.guild.marketUnlockedAt ? "success" : "warning"}>
                  {data.guild.marketUnlockedAt ? "Открыт" : "Закрыт"}
                </Pill>
                <span className="muted">Слотов: {data.guild.marketSlotsBase} · claims: {data.guild.counts.pendingClaims}</span>
                <Link className="button button--ghost" href="/market">
                  Открыть market history
                </Link>
              </div>
            </article>
            <article className="row-card">
              <div>
                <div className="row-card__title">Приватные сделки</div>
                <p className="row-card__description">
                  Barter-модель работает без прямой передачи золота и теперь разделяет pending inbox и resolved history.
                </p>
              </div>
              <div className="row-card__aside">
                <Pill tone={data.guild.tradeUnlockedAt ? "success" : "warning"}>
                  {data.guild.tradeUnlockedAt ? "Открыты" : "Закрыты"}
                </Pill>
                <span className="muted">Входящих ответов: {pendingTradeActions}</span>
                <Link className="button button--ghost" href="/deals">
                  Открыть deal history
                </Link>
              </div>
            </article>
          </div>
        </SectionCard>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Готовые награды экспедиций"
          description="Награды начисляются по кнопке claim, чтобы поддержать короткие session loops. Разные сценарии теперь читаются прямо в snapshot до нажатия claim."
        >
          {data.claimableExpeditions.length > 0 ? (
            <div className="stack-sm">
              {data.claimableExpeditions.map((expedition) => (
                <article key={expedition.id} className="row-card">
                  <div>
                    <div className="row-card__title">{expedition.locationName}</div>
                    <p className="row-card__description">
                      {expedition.scenarioLabel} · {expedition.riskLabel} · {expedition.rewardFocusLabel}
                      <br />
                      {expedition.resultLabel ? `${expedition.resultLabel} · ` : ""}
                      {expedition.resultSummary ?? "Отчёт ещё не готов."}
                      <br />
                      Рейтинг {formatNumber(expedition.partyPowerSnapshot)} против угрозы {formatNumber(expedition.threatScoreSnapshot)} ({formatSignedNumber(expedition.partyPowerSnapshot - expedition.threatScoreSnapshot)})
                      <br />
                      {expedition.riskRewardSummary}
                      <br />
                      {expedition.rewardSummary.join(" • ")}
                      {expedition.heroXpRewardPerHero ? (
                        <>
                          <br />
                          Hero XP на claim: по {expedition.heroXpRewardPerHero} каждому участнику.
                        </>
                      ) : null}
                    </p>
                    {expedition.combatLog.length > 0 ? (
                      <div className="mini-list">
                        {expedition.combatLog.slice(0, 2).map((line) => (
                          <span key={`${expedition.id}-${line}`} className="muted">
                            • {line}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="row-card__aside">
                    {expedition.resultLabel ? <Pill tone={expedition.resultTier === "TRIUMPH" ? "success" : expedition.resultTier === "SUCCESS" ? "accent" : "warning"}>{expedition.resultLabel}</Pill> : null}
                    <Pill tone={getRiskTone(expedition.riskLabel)}>{expedition.riskLabel}</Pill>
                    <span className="muted">Готово: {formatDateTime(expedition.completedAt)}</span>
                    <form action={claimExpeditionRewards} className="inline-form">
                      <input type="hidden" name="expeditionId" value={expedition.id} />
                      <input type="hidden" name="redirectTo" value="/dashboard" />
                      <button className="button button--primary" type="submit">
                        Забрать награды
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Пока ничего не ждёт claim-а"
              description="Как только поход завершится, награды появятся здесь и на экране экспедиций."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Guild upgrade: market slots"
          description="Экономический апгрейд по-прежнему расширяет лимит лотов, но теперь живёт рядом с новым ростом ростера."
        >
          {data.marketUpgrade.nextCostGold ? (
            <form action={purchaseGuildUpgrade} className="card-form">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <input type="hidden" name="upgradeType" value="MARKET_SLOTS" />
              <div className="stack-sm">
                <div className="row-card">
                  <div>
                    <div className="row-card__title">Следующий уровень рынка</div>
                    <p className="row-card__description">
                      После покупки лимит активных лотов увеличится до {data.guild.marketSlotsBase + 1}.
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={data.marketUpgrade.canAfford ? "success" : "warning"}>
                      {data.marketUpgrade.canAfford ? "Можно купить" : "Не хватает золота"}
                    </Pill>
                    <span className="muted">
                      Цена: {formatNumber(data.marketUpgrade.nextCostGold)} золота
                    </span>
                  </div>
                </div>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={!data.marketUpgrade.canAfford}
                >
                  Купить апгрейд рынка
                </button>
              </div>
            </form>
          ) : (
            <EmptyState
              title="Апгрейды рынка исчерпаны"
              description="Для MVP этого потолка достаточно, чтобы не раздувать scope прогрессии."
            />
          )}
        </SectionCard>
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Ресурсный срез" description="Сводка по stack-ресурсам, которые питают рынок, приватные сделки и будущие походы.">
          <div className="tile-grid tile-grid--2">
            {data.resources.map((resource) => (
              <article key={resource.resourceType} className="metric-card">
                <span className="metric-card__label">{resource.label}</span>
                <strong className="metric-card__value">{formatNumber(resource.amount)}</strong>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Активные server actions" description="Playable MVP использует эти мутации для реальных переходов состояния.">
          <div className="token-list">
            {FOUNDATION_ACTIONS.map((action) => (
              <span key={action} className="token">
                {action}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Последние экономические события" description="Журнал нужен и для UX-сводки, и для базовой диагностики экономических операций.">
        <div className="table-list table-list--5">
          <div className="table-list__head">
            <span>Событие</span>
            <span>Золото</span>
            <span>Ресурс</span>
            <span>Δ ресурса</span>
            <span>Время</span>
          </div>
          {data.recentLedger.map((entry) => (
            <div key={entry.id} className="table-list__row">
              <span>
                {entry.eventLabel}
                {entry.isSuspicious ? <em className="muted"> · flagged</em> : null}
              </span>
              <span className={entry.goldDelta >= 0 ? "number-positive" : "number-negative"}>
                {entry.goldDelta >= 0 ? "+" : ""}
                {formatNumber(entry.goldDelta)}
              </span>
              <span>{entry.resourceLabel ?? "—"}</span>
              <span>{entry.resourceDelta ?? "—"}</span>
              <span>{formatDateTime(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
