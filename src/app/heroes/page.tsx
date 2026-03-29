import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import {
  type PageSearchParams,
  formatNumber,
  readActionFeedback,
} from "@/lib/format";
import {
  equipItemToHero,
  purchaseHeroSlotsUpgrade,
  recruitHero,
  unequipItemFromHero,
} from "@/server/actions/foundation";
import { getHeroesPageData } from "@/server/game";

export default async function HeroesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const [params, snapshot] = await Promise.all([searchParams, getHeroesPageData()]);
  const feedback = readActionFeedback(params);

  if (!snapshot.ok) {
      return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Heroes / Roster"
          title="Ростер недоступен"
          description="Ростер не может загрузиться, пока локальная SQLite не инициализирована."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Выполните `npm run db:setup`, чтобы загрузить стартовую партию.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;
  const recommendedAction = data.onboarding.recommendedAction;
  const equipMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "equip-hero") ?? null;
  const recruitMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "recruit-hero") ?? null;
  const workshopMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "upgrade-item") ?? null;

  return (
    <div className="page-stack">
        <PageHeader
          eyebrow="Heroes / Roster"
          title={`Партия гильдии ${data.guildName}`}
          description="Центральный экран роста ростера: лимит hero slots, quality breakpoints таверны, текущие герои и перенос экипировки между основной тройкой и резервом."
          actions={
            <>
              <Link className="button button--primary" href="/expedition">
                Подготовить экспедицию
              </Link>
              <Link className="button button--ghost" href="/inventory">
                Открыть инвентарь
              </Link>
           </>
         }
       />

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      {recommendedAction?.href === "/heroes" ? (
        <Notice tone={recommendedAction.tone}>
          <strong>{recommendedAction.title}.</strong> {recommendedAction.summary} {recommendedAction.reason}
        </Notice>
      ) : equipMilestone && equipMilestone.status !== "completed" ? (
        <Notice tone={equipMilestone.tone}>
          <strong>{equipMilestone.title}.</strong> {equipMilestone.summary} {equipMilestone.blockers[0] ?? "Ростер уже готов к этому шагу прямо сейчас."}
        </Notice>
      ) : null}

      {recruitMilestone && recruitMilestone.status === "blocked" && recommendedAction?.key !== recruitMilestone.key ? (
        <Notice tone={recruitMilestone.tone}>{recruitMilestone.blockers[0]}</Notice>
      ) : null}

      <div className="stats-grid stats-grid--4">
        <InfoCard
          title="Ростер"
          value={`${data.roster.usedSlots} / ${data.roster.heroSlotLimit}`}
          detail={`${data.roster.freeSlots} свободных мест в гильдии.`}
          tone="accent"
        />
        <InfoCard
          title="Свободны для похода"
          value={data.roster.availableHeroes}
          detail={
            data.roster.activeHeroes > 0
              ? `${data.roster.activeHeroes} героев уже заняты текущими экспедициями.`
              : "Весь текущий ростер можно ротировать прямо сейчас."
          }
        />
        <InfoCard
          title="Золото гильдии"
          value={formatNumber(data.guildGold)}
          detail={`Найм героя в таверне стоит ${formatNumber(data.recruitment.costGold)} золота. Следующий recruit tier: ${data.recruitmentProgression.nextRarityLabel ?? "максимум MVP"}.`}
        />
        <InfoCard
          title="До второго состава"
          value={data.roster.reserveLoopUnlocked ? "Готов" : `${data.roster.reserveLoopShortfall} гер.`}
          detail={
            data.roster.reserveLoopUnlocked
              ? `Порог ${data.roster.reserveLoopTarget} героев достигнут: одна тройка может идти в поход, пока вторая готовится.`
              : `Соберите ${data.roster.reserveLoopTarget} героев, чтобы один активный поход не блокировал следующий.`
          }
          tone="success"
        />
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Hero slots гильдии"
          description="Размер ростера теперь ограничен реальным лимитом. Апгрейд слотов открывает новых бойцов и сценарий с двумя полноценными тройками."
          aside={<Pill tone={data.roster.freeSlots > 0 ? "success" : "warning"}>{`${data.roster.usedSlots}/${data.roster.heroSlotLimit}`}</Pill>}
        >
          <div className="tile-grid tile-grid--3">
            <article className="metric-card">
              <span className="metric-card__label">Суммарный hero XP</span>
              <strong className="metric-card__value">{formatNumber(data.totalHeroXp)}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-card__label">Пиковый уровень</span>
              <strong className="metric-card__value">Lv. {data.highestHeroLevel}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-card__label">Готовых героев</span>
              <strong className="metric-card__value">{data.roster.availableHeroes}</strong>
            </article>
          </div>

          {data.heroSlotsUpgrade.nextCostGold ? (
            <form action={purchaseHeroSlotsUpgrade} className="card-form">
              <input type="hidden" name="redirectTo" value="/heroes" />
              <div className="row-card">
                <div>
                  <div className="row-card__title">Следующий апгрейд слотов</div>
                  <p className="row-card__description">
                    Уровень улучшения: {data.heroSlotsUpgrade.currentLevel} → {data.heroSlotsUpgrade.nextLevel}
                    <br />
                    После покупки лимит ростера вырастет до {data.heroSlotsUpgrade.nextSlotLimit} героев.
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={data.heroSlotsUpgrade.canAfford ? "success" : "warning"}>
                    {data.heroSlotsUpgrade.canAfford ? "Можно купить" : "Не хватает золота"}
                  </Pill>
                  <span className="muted">
                    Цена: {formatNumber(data.heroSlotsUpgrade.nextCostGold)} золота
                  </span>
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
              title="Лимит слотов достигнут"
              description="Для MVP этого потолка хватает, чтобы тестировать ротацию и второй полноценный состав."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Таверна: доступные рекруты"
          description="Доска найма генерируется сервером и теперь меняет качество рекрутов вместе с ростом гильдии."
          aside={
            <Pill tone={data.recruitment.hasOpenSlot && data.recruitment.canAfford ? "success" : "warning"}>
              {data.recruitment.hasOpenSlot
                ? data.recruitment.canAfford
                  ? "Можно нанимать"
                  : "Нужно золото"
                : "Слоты заполнены"}
            </Pill>
          }
        >
          <p className="muted">
            Текущий quality breakpoint: {data.recruitmentProgression.currentRarityLabel}. {data.recruitmentProgression.nextGoalLabel ?? "Максимальный recruit tier уже открыт."}
          </p>
          <div className="stack-sm">
            {data.recruitment.candidates.map((candidate) => (
              <article key={candidate.key} className="row-card">
                <div>
                  <div className="row-card__title">{candidate.name}</div>
                  <p className="row-card__description">
                    {candidate.heroClassLabel} · {candidate.rarityLabel} · Lv. {candidate.level} · Power {formatNumber(candidate.powerScore)}
                    <br />
                    {candidate.tacticalRoleLabel}
                    <br />
                    {candidate.zoneFocusLabel}
                    <br />
                    {candidate.summary}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={candidate.canHire ? "success" : "warning"}>
                    {candidate.canHire
                      ? "Можно нанять"
                      : data.recruitment.hasOpenSlot
                        ? "Нужно золото"
                        : "Купите слоты"}
                  </Pill>
                  <span className="muted">Цена: {formatNumber(candidate.recruitCostGold)} золота</span>
                  <form action={recruitHero} className="inline-form">
                    <input type="hidden" name="candidateKey" value={candidate.key} />
                    <input type="hidden" name="redirectTo" value="/heroes" />
                    <button className="button button--primary" type="submit" disabled={!candidate.canHire}>
                      Нанять
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Текущий ростер" description="У каждого героя можно снять надетый предмет или выбрать новый из общего пула доступной экипировки. Это позволяет перекидывать лучшие вещи между основной тройкой и резервом.">
        <div className="hero-grid">
          {data.heroes.map((hero) => (
            <article key={hero.id} className="hero-card">
              <div className="hero-card__header">
                <div>
                  <strong>{hero.name}</strong>
                  <p className="muted">{hero.heroClassLabel}</p>
                </div>
                <Pill tone={hero.status === "AVAILABLE" ? "success" : "accent"}>{hero.statusLabel}</Pill>
              </div>

              <div className="metrics-inline">
                <article className="metric-card">
                  <span className="metric-card__label">Уровень</span>
                  <strong className="metric-card__value">{hero.level}</strong>
                </article>
                <article className="metric-card">
                  <span className="metric-card__label">Hero XP</span>
                  <strong className="metric-card__value">{formatNumber(hero.heroXp)}</strong>
                </article>
                <article className="metric-card">
                  <span className="metric-card__label">Power</span>
                  <strong className="metric-card__value">{formatNumber(hero.powerScore)}</strong>
                </article>
              </div>

              <div className="mini-list">
                <span className="muted">Редкость: {hero.rarityLabel}</span>
                <span className="muted">
                  XP до следующего уровня: {hero.nextLevelXp ? `${formatNumber(hero.heroXp)} / ${formatNumber(hero.nextLevelXp)}` : "уровень capped для MVP"}
                </span>
                <span className="muted">Экипировка сейчас даёт {formatNumber(hero.equipmentPower)} power.</span>
                <strong>Экипировка</strong>
                {hero.equipment.length > 0 ? (
                  hero.equipment.map((item) => (
                    <div key={item.id} className="split-list__row">
                      <span>{item.name}</span>
                      <span className="muted">
                        {item.slotLabel} · {item.rarityLabel} · {item.powerLabel}
                        <br />
                        {item.workshopLevelLabel} · {item.workshopSummary}
                        <br />
                        {item.valueSummary}
                      </span>
                      {hero.status === "AVAILABLE" ? (
                        <form action={unequipItemFromHero} className="inline-form">
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="redirectTo" value="/heroes" />
                          <button className="button button--ghost" type="submit">
                            Снять
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Пустые слоты"
                    description="Свободный лут из инвентаря можно экипировать прямо из этого экрана."
                  />
                )}
                <strong>Потенциал апгрейда</strong>
                {hero.slotUpgrades.length > 0 ? (
                  hero.slotUpgrades.map((upgrade) => (
                    <span key={`${hero.id}-${upgrade.slotKey}`} className="muted">
                      {upgrade.slotLabel}: {upgrade.currentPower > 0 ? `+${upgrade.currentPower}` : "пусто"} → +{upgrade.bestAvailablePower} power (+{upgrade.delta})
                    </span>
                  ))
                ) : (
                  <span className="muted">В инвентаре нет предметов, которые были бы сильнее текущих слотов этого героя.</span>
                )}
              </div>

              {hero.status === "AVAILABLE" ? (
                <form action={equipItemToHero} className="card-form">
                  <input type="hidden" name="heroId" value={hero.id} />
                  <input type="hidden" name="redirectTo" value="/heroes" />
                  <label className="form-field">
                    <span className="form-field__label">Надеть предмет</span>
                    <select name="itemId" defaultValue="">
                      <option value="">Выберите предмет</option>
                      {hero.equipOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.slotLabel} · {item.rarityLabel} · {item.powerLabel} · {item.workshopLevelLabel} · {item.comparisonLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="form-help">Если слот уже занят, сначала снимите текущий предмет — разница по power уже подсчитана в списке.</span>
                  <button className="button button--primary" type="submit">
                    Экипировать
                  </button>
                </form>
              ) : (
                <span className="form-help">Пока герой в экспедиции, его экипировка заблокирована.</span>
              )}
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Пул доступной экипировки" description="Эти предметы лежат свободно в инвентаре и готовы к экипировке на любом подходящем герое. Power уже учитывает workshop-бонус, если предмет был усилен раньше.">
          {data.equippableItems.length > 0 ? (
            <div className="stack-sm">
              {data.equippableItems.map((item) => (
                <article key={item.id} className="row-card">
                  <div>
                    <div className="row-card__title">{item.name}</div>
                    <p className="row-card__description">
                      {item.slotLabel} · {item.rarityLabel} · {item.powerLabel}
                      <br />
                      {item.workshopLevelLabel} · {item.workshopSummary}
                      <br />
                      {item.progressionLabel} · {item.valueSummary}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Свободного снаряжения нет"
              description={equipMilestone?.status === "blocked"
                ? equipMilestone.blockers[0] ?? "Сходите в экспедицию или выкупите что-то на рынке, чтобы расширить выбор экипировки."
                : "Сходите в экспедицию или выкупите что-то на рынке, чтобы расширить выбор экипировки."}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Workshop impact on roster"
          description="Усиленная экипировка повышает реальный hero power и постепенно закрепляет лучшие предметы внутри гильдии вместо продажи наружу."
          aside={
            <Pill tone={data.workshop.unlocked ? "success" : "warning"}>
              {data.workshop.unlocked ? `Tier ${data.workshop.facilityLevel}` : "Locked"}
            </Pill>
          }
        >
          <p className="muted">{data.workshop.summary}</p>
          {data.workshop.projects.length > 0 ? (
            <div className="stack-sm">
              {data.workshop.projects.map((project) => (
                <article key={`${project.itemId}-${project.heroName}`} className="row-card">
                  <div>
                    <div className="row-card__title">{project.heroName} · {project.itemName}</div>
                    <p className="row-card__description">
                      {project.slotLabel} · {project.workshopLevelLabel} · {project.currentPowerLabel}
                      <br />
                      {project.nextEffectSummary ?? project.limitationSummary ?? "Следующий workshop tier пока недоступен."}
                      {project.costSummary ? (
                        <>
                          <br />
                          Цена: {project.costSummary}
                        </>
                      ) : null}
                      {!project.canUpgrade && project.limitationSummary ? (
                        <>
                          <br />
                          {project.limitationSummary}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={project.canUpgrade ? "success" : "warning"}>
                      {project.canUpgrade ? `+${project.nextDeltaPower} power сейчас` : "Нужны ресурсы / tier"}
                    </Pill>
                    <Link className="button button--ghost" href="/inventory">
                      Открыть workshop
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Workshop пока не давит на ростер"
              description={
                workshopMilestone && workshopMilestone.status !== "completed"
                  ? workshopMilestone.blockers[0] ?? workshopMilestone.summary
                  : data.workshop.nextGoalLabel ?? "Сначала откройте facility на dashboard, затем вернитесь к экипировке."
              }
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
