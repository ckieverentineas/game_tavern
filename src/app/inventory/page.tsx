import Link from "next/link";
import { connection } from "next/server";

import { EmptyState, InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import {
  type PageSearchParams,
  formatDateTime,
  formatNumber,
  readActionFeedback,
} from "@/lib/format";
import { upgradeInventoryItem } from "@/server/actions/foundation";
import { getInventoryPageData } from "@/server/game";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const [params, snapshot] = await Promise.all([searchParams, getInventoryPageData()]);
  const feedback = readActionFeedback(params);

  if (!snapshot.ok) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Inventory"
          title="Инвентарь пока недоступен"
          description="Игровой инвентарь не может быть прочитан, пока локальная SQLite не инициализирована."
        />
        <SectionCard title="Ошибка данных" description={snapshot.error}>
          <p className="muted">Поднимите базу через `npm run db:setup`, затем обновите страницу.</p>
        </SectionCard>
      </div>
    );
  }

  const { data } = snapshot;
  const recommendedAction = data.onboarding.recommendedAction;
  const workshopMilestone = data.onboarding.milestones.find((milestone) => milestone.key === "upgrade-item") ?? null;
  const tradableItems = data.items.filter((item) => item.tradable);
  const bestPowerItem = data.items.reduce<(typeof data.items)[number] | null>(
    (best, item) => (!best || item.powerScore > best.powerScore ? item : best),
    null,
  );
  const richestTradableItem = tradableItems.reduce<(typeof data.items)[number] | null>(
    (best, item) => (!best || (item.vendorBasePrice ?? 0) > (best.vendorBasePrice ?? 0) ? item : best),
    null,
  );
  const workshopReadyCount = data.workshop.candidates.filter((candidate) => candidate.canUpgrade).length;
  const bestWorkshopCandidate = data.workshop.candidates.find((candidate) => candidate.canUpgrade) ?? null;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Inventory"
        title="Предметы и stack-ресурсы аккаунта"
        description="Инвентарь показывает, что уже надето, что реально усиливает героев, и какие экземпляры лучше отправлять на рынок как ходовые или премиальные лоты."
        actions={
          <>
            <Link className="button button--primary" href="/heroes">
              Управлять героями
            </Link>
            <Link className="button button--ghost" href="/market">
              На рынок
            </Link>
          </>
        }
      />

      {feedback ? <Notice tone={feedback.tone}>{feedback.message}</Notice> : null}

      {recommendedAction?.href === "/inventory" ? (
        <Notice tone={recommendedAction.tone}>
          <strong>{recommendedAction.title}.</strong> {recommendedAction.summary} {recommendedAction.reason}
        </Notice>
      ) : workshopMilestone && workshopMilestone.status !== "completed" ? (
        <Notice tone={workshopMilestone.tone}>
          <strong>{workshopMilestone.title}.</strong> {workshopMilestone.summary} {workshopMilestone.blockers[0] ?? "Первый апгрейд уже можно собрать из текущих ресурсов."}
        </Notice>
      ) : null}

      <div className="stats-grid stats-grid--4">
        <InfoCard title="Gold" value={formatNumber(data.gold)} detail="Основная мягкая валюта гильдии." tone="accent" />
        <InfoCard
          title="Workshop"
          value={data.workshop.unlocked ? `Tier ${data.workshop.facilityLevel}` : "Locked"}
          detail={
            bestWorkshopCandidate
              ? `${workshopReadyCount} проектов готовы. Лучший кандидат: ${bestWorkshopCandidate.name}.`
              : data.workshop.summary
          }
        />
        <InfoCard title="Tradable items" value={tradableItems.length} detail={richestTradableItem ? `Самый ценный sellable-лот: ${richestTradableItem.name} · ${formatNumber(richestTradableItem.vendorBasePrice ?? 0)} зол.` : "Сейчас нечего безопасно выводить на рынок."} tone="warning" />
        <InfoCard title="Best combat item" value={bestPowerItem ? bestPowerItem.powerLabel : "—"} detail={bestPowerItem ? `${bestPowerItem.name} · ${bestPowerItem.rarityLabel}` : "Боевых апгрейдов пока нет."} />
      </div>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard title="Ресурсные балансы" description="Эти стеки уже работают как часть loot loop, рынка и будущей trade-экономики MVP.">
          {data.resources.length > 0 ? (
            <div className="tile-grid tile-grid--2">
              {data.resources.map((resource) => (
                <article key={resource.id} className="metric-card">
                  <span className="metric-card__label">{resource.label}</span>
                  <strong className="metric-card__value">{formatNumber(resource.amount)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Ресурсов нет"
              description="ResourceBalance уже предусмотрен, но seed должен заполнить стартовые значения."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Workshop / reforging-lite"
          description="Долгий resource sink усиливает существующую экипировку, тратит золото и походные ресурсы и отрезает upgraded-предмет от рынка."
          aside={
            <Pill tone={data.workshop.unlocked ? "success" : "warning"}>
              {data.workshop.unlocked ? `Tier ${data.workshop.facilityLevel}` : "Locked"}
            </Pill>
          }
        >
          <p className="muted">{data.workshop.summary}</p>
          <ul className="bullet-list bullet-list--muted">
            <li>Каждый апгрейд тратит золото и профильный expedition-ресурс: оружие — руду, броня — кожу, аксессуары — травы.</li>
            <li>Со второго item tier подключается {" "}чародейская пыль как общий late-loop катализатор.</li>
            <li>Первое усиление привязывает предмет к гильдии: его уже нельзя безопасно вывести на рынок или в barter.</li>
            <li>{data.workshop.nextGoalLabel}</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Workshop projects"
        description="Здесь виден реальный trade-off между продажей и вложением в power: стоимость, следующий эффект и блокеры по ресурсам или facility tier."
      >
        {data.workshop.candidates.length > 0 ? (
          <div className="stack-sm">
            {data.workshop.candidates.map((candidate) => (
              <article key={candidate.id} className="row-card">
                <div>
                  <div className="row-card__title">{candidate.name}</div>
                  <p className="row-card__description">
                    {candidate.slotLabel} · {candidate.rarityLabel} · {candidate.workshopLevelLabel}
                    <br />
                    Текущий итог: {candidate.effectivePowerLabel}
                    <br />
                    {candidate.equippedHeroName ? `На герое ${candidate.equippedHeroName}` : candidate.stateLabel}
                    <br />
                    {candidate.nextEffectSummary ?? candidate.limitationSummary ?? "Следующий tier пока не рассчитан."}
                    {candidate.costSummary ? (
                      <>
                        <br />
                        Цена: {candidate.costSummary}
                      </>
                    ) : null}
                    {!candidate.canUpgrade && candidate.limitationSummary ? (
                      <>
                        <br />
                        {candidate.limitationSummary}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="row-card__aside">
                  <Pill tone={candidate.canUpgrade ? "success" : "warning"}>
                    {candidate.canUpgrade ? "Готов к усилению" : "Есть ограничения"}
                  </Pill>
                  <form action={upgradeInventoryItem} className="inline-form">
                    <input type="hidden" name="itemId" value={candidate.id} />
                    <input type="hidden" name="redirectTo" value="/inventory" />
                    <button className="button button--primary" type="submit" disabled={!candidate.canUpgrade}>
                      Усилить предмет
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Проектов нет"
            description={
              workshopMilestone && workshopMilestone.status !== "completed"
                ? workshopMilestone.blockers[0] ?? workshopMilestone.summary
                : "Свободная или надетая экипировка появится здесь автоматически, как только в гильдии найдётся подходящий предмет."
            }
          />
        )}
      </SectionCard>

      <SectionCard title="Текущие item instances" description="Экземпляры отделены от ItemDefinition, поэтому здесь видно и боевую пользу предмета, и его торговую пригодность как отдельные derived-поля.">
        <div className="table-list table-list--6">
          <div className="table-list__head">
            <span>Предмет</span>
            <span>Слот / тип</span>
            <span>Редкость / power</span>
            <span>Ценность</span>
            <span>Состояние / торговля</span>
            <span>Получен</span>
          </div>
          {data.items.map((item) => (
            <div key={item.id} className="table-list__row">
              <span>
                {item.name}
                <br />
                <span className="muted">
                  {item.progressionLabel} · {item.workshopLevelLabel}
                </span>
              </span>
              <span>
                {item.slotLabel}
                <br />
                <span className="muted">{item.typeLabel}</span>
              </span>
              <span>
                {item.rarityLabel}
                <br />
                <span className="muted">
                  {item.powerLabel}
                  <br />
                  {item.workshopSummary}
                </span>
              </span>
              <span>{item.valueSummary}</span>
              <span>
                {item.stateLabel}
                <br />
                <span className="muted">{item.equippedHeroName ? `На герое ${item.equippedHeroName}` : item.tradeLabel}</span>
              </span>
              <span>{formatDateTime(item.acquiredAt)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
