import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import {
  type PageSearchParams,
  formatCompactList,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatSignedNumber,
  readActionFeedback,
} from "@/lib/format";
import {
  claimGuildContract,
  claimExpeditionRewards,
  claimWorldEventReward,
  startExpedition,
} from "@/server/actions/foundation";
import { getExpeditionPageData } from "@/server/game";

export default async function ExpeditionPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const [params, snapshot] = await Promise.all([searchParams, getExpeditionPageData()]);
  const feedback = readActionFeedback(params);

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Expeditions"
          title="Экран экспедиций недоступен"
          description="Игровые данные экспедиций сейчас не читаются из локальной SQLite."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Выполните `npm run db:setup`, чтобы просмотреть локации и историю забегов.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;
  const recommendedAction = data.onboarding.recommendedAction;
  const startMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "start-expedition") ?? null;
  const claimMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "claim-expedition") ?? null;
  const expeditionContracts = data.contractBoard.entries.filter((contract) =>
    contract.relatedRoutes.includes("expedition"),
  );
  const expeditionSeasonEvents = data.worldEventBoard.events.filter((event) =>
    event.relatedRoutes.includes("expedition"),
  );
  const activeRuns = data.expeditions.filter((expedition) => expedition.status === "ACTIVE").length;
  const claimableRuns = data.expeditions.filter((expedition) => expedition.status === "COMPLETED").length;

  const getResultTone = (tier: typeof data.expeditions[number]["resultTier"]) => {
    if (tier === "TRIUMPH") {
      return "success" as const;
    }

    if (tier === "SUCCESS") {
      return "accent" as const;
    }

    if (tier === "SETBACK" || tier === "FAILURE") {
      return "warning" as const;
    }

    return "neutral" as const;
  };

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
        eyebrow="Expeditions"
        title="PvE-горизонт: маршруты, специализации наград и элитные вылазки"
        description="Экспедиции теперь различаются не только по tier зоны: часть маршрутов играет в resource farming, часть — в жадный high-risk payout, а элитные забеги заметно сильнее давят на партию ради редкого лута и XP."
      />

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      <Notice tone="accent">
        Читаемый выбор теперь такой: обычные маршруты дают baseline-награду, снабженческие рейсы сильнее кормят workshop,
        высокорисковые обходы толкают в золото и волатильность, а элитные экспедиции поднимают ставку на rare loot и hero XP.
      </Notice>

      {expeditionSeasonEvents[0] ? (
        <Notice tone={expeditionSeasonEvents[0].tone}>
          <strong>{expeditionSeasonEvents[0].title}.</strong> Очки сезона приходят именно после claim экспедиции:
          high-risk и elite clear превращаются в публичный вклад и seasonal reward tiers.
        </Notice>
      ) : null}

      {recommendedAction?.href === "/expedition" ? (
        <Notice tone={recommendedAction.tone}>
          <strong>{recommendedAction.title}.</strong> {recommendedAction.summary} {recommendedAction.reason}
        </Notice>
      ) : claimMilestone?.status === "available" ? (
        <Notice tone="success">
          <strong>{claimMilestone.title}.</strong> {claimMilestone.summary}
        </Notice>
      ) : startMilestone && startMilestone.status !== "completed" ? (
        <Notice tone={startMilestone.tone}>
          <strong>{startMilestone.title}.</strong> {startMilestone.summary} {startMilestone.blockers[0] ?? "Экран уже готов к первой партии."}
        </Notice>
      ) : null}

      <SectionCard
        title="PvE seasonal board"
        description={`Экспедиции подключены к ${data.worldEventBoard.season.label}: high-risk claim-ы видны всем гильдиям и сразу сравниваются по standings.`}
        aside={
          <Pill tone={expeditionSeasonEvents.some((event) => event.rewardTiers.some((tier) => tier.status === "claimable")) ? "success" : "accent"}>
            {`${expeditionSeasonEvents.length} event`}
          </Pill>
        }
      >
        <div className="stack-sm">
          {expeditionSeasonEvents.map((event) => {
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
                      ? `Ваш PvE-вклад: ${event.focusGuild.points} очк. · rank #${event.focusGuild.rank}/${event.focusGuild.total} · ${event.focusGuild.detail}`
                      : event.objectiveLabel}
                    <br />
                    {event.focusGuild?.highlight ?? event.objectiveLabel}
                    <br />
                    Reward tiers: {formatCompactList(event.rewardTiers.map((tier) => `${tier.label} — ${tier.statusLabel}`))}
                    <br />
                    Лидеры frontier: {event.standings.slice(0, 3).map((entry) => `#${entry.rank} ${entry.guildTag} (${entry.points})`).join(" • ")}
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
                      <input type="hidden" name="redirectTo" value="/expedition" />
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
        title="PvE-linked contracts"
        description="Objective board подсказывает, какие expedition-действия сейчас реально двигают гильдейские контракты, а не просто дают очередной isolated run."
        aside={<Pill tone={expeditionContracts.some((contract) => contract.claimable) ? "success" : "accent"}>{`${expeditionContracts.length} linked`}</Pill>}
      >
        <div className="stack-sm">
          {expeditionContracts.map((contract) => (
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
                {contract.claimedAt ? <span className="muted">{formatDateTime(contract.claimedAt)}</span> : null}
                {contract.claimable ? (
                  <form action={claimGuildContract} className="inline-form">
                    <input type="hidden" name="contractKey" value={contract.key} />
                    <input type="hidden" name="redirectTo" value="/expedition" />
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
        <InfoCard
          title="PvE unlocks"
          value={`${data.zoneProgression.unlockedLocationCount}/${data.zoneProgression.totalLocationCount}`}
          detail={data.zoneProgression.nextGoalLabel ?? "Все expedition tiers уже открыты."}
          tone="accent"
        />
        <InfoCard
          title="Special scenarios"
          value={`${data.zoneProgression.unlockedSpecialScenarioCount}/${data.zoneProgression.totalSpecialScenarioCount}`}
          detail={
            data.zoneProgression.totalSpecialScenarioCount > 0
              ? `Highest unlocked risk: ${data.zoneProgression.highestUnlockedRiskLabel}.`
              : "Специальные сценарии пока не заведены в демо-срезе."
          }
        />
        <InfoCard
          title="Available heroes"
          value={data.availableHeroes.length}
          detail={
            data.rosterProgression.reserveLoopUnlocked
              ? `Порог ${data.rosterProgression.reserveLoopTarget} героев достигнут: одна тройка может быть в пути, пока вторая собирается.`
              : `До второго полного состава не хватает ${data.rosterProgression.reserveLoopShortfall} героя(ев).`
          }
        />
        <InfoCard title="Active runs" value={activeRuns} detail="Забеги лениво завершаются на следующем релевантном запросе." />
        <InfoCard title="Ready to claim" value={claimableRuns} detail="Завершённые экспедиции не начисляют награды автоматически." tone="success" />
      </div>

      <SectionCard
        title="Ротация и второй состав"
        description="Ростер шире трёх героев превращает экспедиции в более гибкий loop: можно подбирать роли под зоны и не упираться в один активный поход."
        aside={<Pill tone={data.rosterProgression.reserveLoopUnlocked ? "success" : "warning"}>{`${data.rosterProgression.totalHeroes}/${data.rosterProgression.reserveLoopTarget}`}</Pill>}
      >
        <p className="muted">
          {data.rosterProgression.reserveLoopUnlocked
            ? `Гильдия уже доросла до ${data.rosterProgression.reserveLoopTarget} героев. После отправки одной тройки в путь останется полноценный резерв под следующую зону.`
            : `Сейчас в ростере ${data.rosterProgression.totalHeroes} героев при лимите ${data.rosterProgression.heroSlotLimit}. Купите ещё слоты и наймите ${data.rosterProgression.reserveLoopShortfall} героя(ев), чтобы один активный поход не блокировал второй.`}
        </p>
      </SectionCard>

      <SectionCard
        title="Zone progression"
        description="PvE-линейка теперь включает не только новые зоны, но и сценарные ответвления с отдельным risk/reward-профилем."
        aside={<Pill tone={data.zoneProgression.nextLocationName ? "accent" : "success"}>{data.zoneProgression.statusLabel}</Pill>}
      >
        <p className="muted">
          {data.zoneProgression.nextGoalLabel ?? "Текущая MVP-цепочка зон уже полностью открыта."}
          <br />
          Открыто special-сценариев: {data.zoneProgression.unlockedSpecialScenarioCount}/
          {data.zoneProgression.totalSpecialScenarioCount}. Самый жёсткий доступный риск: {data.zoneProgression.highestUnlockedRiskLabel}.
        </p>
      </SectionCard>

      <SectionCard title="Новые PvE-сценарии" description="Эти маршруты расширяют горизонт поверх базовых зон и меняют не только цифры, но и профиль награды.">
        <div className="stack-sm">
          {data.locations
            .filter((location) => location.scenarioLabel !== "Стандартная экспедиция")
            .map((location) => (
              <article key={`scenario-${location.id}`} className="row-card">
                <div>
                  <div className="row-card__title">{location.name}</div>
                  <p className="row-card__description">
                    {location.scenarioLabel} · {location.scenarioSummary}
                    <br />
                    Risk/reward: {location.riskLabel} · {location.rewardFocusLabel}
                    <br />
                    {location.rewardRules.join(" • ")}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={location.isUnlocked ? "success" : "warning"}>{location.isUnlocked ? "Открыт" : `Lv.${location.requiredGuildLevel}`}</Pill>
                  <Pill tone={getRiskTone(location.riskLabel)}>{location.riskLabel}</Pill>
                  {location.isElite ? <Pill tone="warning">Elite</Pill> : null}
                </div>
              </article>
            ))}
        </div>
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Запуск новой экспедиции" description="Выберите открытую локацию и ровно трёх свободных героев из ростера.">
          {data.availableHeroes.length >= 3 ? (
            <form action={startExpedition} className="card-form">
              <input type="hidden" name="redirectTo" value="/expedition" />
              <div className="form-grid form-grid--2">
                <label className="form-field">
                  <span className="form-field__label">Локация</span>
                  <select name="locationId" defaultValue="">
                    <option value="">Выберите зону</option>
                    {data.locations.map((location) => (
                      <option
                        key={location.id}
                        value={location.id}
                        disabled={!location.isUnlocked}
                      >
                        {location.name} · {location.scenarioLabel} · {location.riskLabel} · {formatDuration(location.durationSeconds)} · req Lv.{location.requiredGuildLevel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-field">
                <span className="form-field__label">Герои партии</span>
                <div className="checkbox-grid">
                  {data.availableHeroes.map((hero) => (
                    <label key={hero.id} className="checkbox-option">
                      <input type="checkbox" name="heroIds" value={hero.id} />
                      <span className="checkbox-option__copy">
                        <strong>{hero.name}</strong>
                        <span className="muted">{hero.heroClassLabel}</span>
                        <span className="muted">{hero.tacticalRoleLabel}</span>
                        <span className="muted">Power: {formatNumber(hero.powerScore)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <span className="form-help">
                  Без client-side автоподбора состав проверяется сервером: дубликаты и неверное число героев будут отклонены.
                </span>
                <span className="form-help">
                  Для supply run важнее стабильный trio под темп, для high-risk route — запас силы под волатильность, для elite expedition — закрытие ключевых ролей без просадки.
                </span>
              </div>

              <button className="button button--primary" type="submit">
                Отправить партию
              </button>
            </form>
          ) : (
            <EmptyState
              title="Недостаточно свободных героев"
              description={startMilestone?.blockers[0] ?? "Дождитесь завершения текущих походов или сначала заберите уже готовые экспедиции."}
            />
          )}
        </SectionCard>

        <SectionCard title="Доступные локации" description="У каждой зоны теперь есть не только профиль угроз, но и читаемый сценарный модификатор с отдельным payoff-профилем.">
          <div className="stack-sm">
            {data.locations.map((location) => (
              <article key={location.id} className="row-card">
                <div>
                  <div className="row-card__title">{location.name}</div>
                  <p className="row-card__description">
                    Scenario: {location.scenarioLabel}
                    <br />
                    {location.scenarioSummary}
                    <br />
                    Risk/reward: {location.riskLabel} · {location.rewardFocusLabel}
                    <br />
                    Pressure: {location.hazardLabel}
                    <br />
                    Preferred roles: {formatCompactList(location.preferredRoles)}
                    <br />
                    Loot curve: {location.lootValueSummary}
                    <br />
                    Top drop: {location.topLootLabel}
                    <br />
                    Loot preview: {formatCompactList(location.lootPreview)}
                    <br />
                    Rules: {formatCompactList(location.rewardRules)}
                    <br />
                    Best free trio: {location.bestPartyNames.length > 0 ? formatCompactList(location.bestPartyNames) : "—"}
                    {location.bestPartyPower !== null && location.powerGap !== null ? (
                      <>
                        <br />
                        Forecast: {formatNumber(location.bestPartyPower)} против {formatNumber(location.recommendedPower)} ({formatSignedNumber(location.powerGap)})
                      </>
                    ) : null}
                    <br />
                    {location.blockerSummary}
                    {!location.isUnlocked ? (
                      <>
                        <br />
                        Unlock requirement: guild level {location.requiredGuildLevel}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={location.isUnlocked ? "success" : "warning"}>
                    {location.isUnlocked ? "Открыта" : "Закрыта"}
                  </Pill>
                  <Pill tone={getRiskTone(location.riskLabel)}>{location.riskLabel}</Pill>
                  {location.isElite ? <Pill tone="warning">Elite</Pill> : null}
                  <span className="muted">{formatDuration(location.durationSeconds)}</span>
                  <span className="muted">Power: {formatNumber(location.recommendedPower)}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="История и текущие забеги" description="Активные, завершённые и уже забранные походы сохраняются в одном списке вместе с risk/reward-профилем, прогнозом XP и боевым отчётом.">
        {data.expeditions.length > 0 ? (
          <div className="stack-sm">
            {data.expeditions.map((expedition) => (
              <article key={expedition.id} className="row-card">
                <div>
                  <div className="row-card__title">{expedition.locationName}</div>
                  <p className="row-card__description">
                    {expedition.scenarioLabel} · {expedition.riskLabel} · {expedition.rewardFocusLabel}
                    <br />
                    Группа: {formatCompactList(expedition.partyNames)}
                    <br />
                    Тактический рейтинг: {formatNumber(expedition.partyPowerSnapshot)} против угрозы {formatNumber(expedition.threatScoreSnapshot)} ({formatSignedNumber(expedition.partyPowerSnapshot - expedition.threatScoreSnapshot)})
                    <br />
                    {expedition.riskRewardSummary}
                    <br />
                    {expedition.resultSummary ?? "Итоговый отчёт появится после завершения похода."}
                    <br />
                    {expedition.rewardSummary.length > 0
                      ? expedition.rewardSummary.join(" • ")
                      : "Награды ещё не рассчитаны."}
                    {expedition.heroXpRewardPerHero ? (
                      <>
                        <br />
                        Hero XP на claim: по {expedition.heroXpRewardPerHero} каждому участнику.
                      </>
                    ) : null}
                  </p>
                  {expedition.combatLog.length > 0 ? (
                    <div className="mini-list">
                      {expedition.combatLog.map((line) => (
                        <span key={`${expedition.id}-${line}`} className="muted">
                          • {line}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="row-card__aside">
                  <Pill tone={expedition.status === "COMPLETED" ? "success" : expedition.status === "ACTIVE" ? "accent" : "neutral"}>
                    {expedition.statusLabel}
                  </Pill>
                  <Pill tone={getRiskTone(expedition.riskLabel)}>{expedition.riskLabel}</Pill>
                  {expedition.resultLabel ? <Pill tone={getResultTone(expedition.resultTier)}>{expedition.resultLabel}</Pill> : null}
                  <span className="muted">Старт: {formatDateTime(expedition.startedAt)}</span>
                  <span className="muted">Финиш: {formatDateTime(expedition.endsAt)}</span>
                  {expedition.status === "COMPLETED" ? (
                    <form action={claimExpeditionRewards} className="inline-form">
                      <input type="hidden" name="expeditionId" value={expedition.id} />
                      <input type="hidden" name="redirectTo" value="/expedition" />
                      <button className="button button--primary" type="submit">
                        Забрать награды
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Нет забегов"
            description={startMilestone?.summary ?? "Отправьте первую партию — история начнёт заполняться сразу после старта экспедиции."}
          />
        )}
      </SectionCard>
    </div>
  );
}
