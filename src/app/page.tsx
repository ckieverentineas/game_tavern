import Link from "next/link";
import { connection } from "next/server";

import { TutorialLayer } from "@/components/tutorial-layer";
import { InfoCard, Notice, PageHeader, Pill, SectionCard } from "@/components/ui";
import {
  APP_NAVIGATION,
  FOUNDATION_ACTIONS,
  FOUNDATION_BOUNDARIES,
  FOUNDATION_CHECKLIST,
  QUICK_TUTORIAL_STEPS,
  STARTER_ARCHETYPES,
} from "@/lib/domain";
import {
  type PageSearchParams,
  formatNumber,
  readActionFeedback,
} from "@/lib/format";
import {
  createStarterGuild,
  login,
  logout,
  openDemoSandbox,
  returnToAuthenticatedGuild,
  signup,
} from "@/server/actions/foundation";
import { getAppShellContext } from "@/server/foundation";
import { getDashboardPageData } from "@/server/game";

export default async function Home({
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
  const onboarding = snapshot.ok ? snapshot.data.onboarding : null;
  const viewerGuildLabel = shellContext.viewer?.guildName && shellContext.viewer.guildTag
    ? `${shellContext.viewer.guildName} [${shellContext.viewer.guildTag}]`
    : null;
  const isAuthenticatedMode = shellContext.mode === "authenticated";
  const activeContextLabel = snapshot.ok
    ? `${snapshot.data.guild.name} [${snapshot.data.guild.tag}]`
    : viewerGuildLabel ?? "локальный контекст";

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={shellContext.viewer ? (isAuthenticatedMode ? "Alpha account" : "Demo sandbox") : "Alpha-ready entry point"}
        title={shellContext.viewer
          ? isAuthenticatedMode
            ? `Личный guild context: ${viewerGuildLabel ?? shellContext.viewer.displayName}`
            : "Demo sandbox открыт рядом с account-сессией"
          : "Signup / login + demo sandbox"}
        description={shellContext.viewer
          ? isAuthenticatedMode
            ? "После входа игра работает в вашем собственном user/guild контексте: dashboard, рынок, сделки и progression читаются без глобального demo fallback."
            : "Личный аккаунт остаётся доступным, но сейчас открыт sandbox-режим для локальной проверки seeded-гильдий и двухсторонних market/deals сценариев."
          : "Точка входа теперь объединяет локальный signup/login, мгновенный bootstrap стартовой гильдии и сохранившийся demo sandbox для разработки и демонстрации."}
        badges={
          <>
            <Pill tone={shellContext.viewer ? (isAuthenticatedMode ? "success" : "accent") : "accent"}>
              {shellContext.viewer ? (isAuthenticatedMode ? "Account session" : "Demo sandbox") : "Quick start"}
            </Pill>
            <Pill tone={snapshot.ok ? (onboarding?.isActive ? "accent" : "success") : "warning"}>
              {snapshot.ok ? onboarding?.progressLabel ?? "Snapshot ready" : "Нужна база"}
            </Pill>
          </>
        }
        meta={
          snapshot.ok ? (
            <>
              <span>Lv. {snapshot.data.guild.level}</span>
              <span>• {formatNumber(snapshot.data.guild.gold)} золота</span>
              <span>• {snapshot.data.activeExpeditions.length} активных походов</span>
              <span>• {snapshot.data.claimableExpeditions.length} claim-ready</span>
            </>
          ) : (
            <>Auth, demo sandbox и social discovery уже собраны в единый первый вход.</>
          )
        }
        actions={
          <>
            <Link className="button button--primary" href="/dashboard">
              Открыть {activeContextLabel}
            </Link>
            <Link className="button button--ghost" href="/guilds">
              Смотреть сообщество
            </Link>

            {shellContext.viewer ? (
              isAuthenticatedMode ? (
                <>
                  <Link className="button button--ghost" href="/market">
                    Открыть рынок
                  </Link>
                  <form action={openDemoSandbox}>
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    <button className="button button--ghost" type="submit">
                      Перейти в demo sandbox
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <form action={returnToAuthenticatedGuild}>
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    <button className="button button--primary" type="submit">
                      Вернуться к своей гильдии
                    </button>
                  </form>
                  <form action={logout}>
                    <input type="hidden" name="redirectTo" value="/" />
                    <button className="button button--ghost" type="submit">
                      Выйти
                    </button>
                  </form>
                </>
              )
            ) : (
              <form action={openDemoSandbox}>
                <input type="hidden" name="redirectTo" value="/dashboard" />
                <button className="button button--ghost" type="submit">
                  Открыть demo sandbox
                </button>
              </form>
            )}
          </>
        }
      />

      {feedback ? <Notice title="Результат действия" tone={feedback.tone}>{feedback.message}</Notice> : null}

      {shellContext.viewer ? (
        <Notice title="Текущий режим" tone={isAuthenticatedMode ? "success" : "accent"}>
          {isAuthenticatedMode
            ? `Авторизован аккаунт ${shellContext.viewer.displayName}. Все игровые экраны используют вашу гильдию ${viewerGuildLabel ?? "безымянный контекст"}.`
            : `Вы вошли как ${shellContext.viewer.displayName}, но сейчас открыт demo sandbox. Sandbox не смешивает ваш аккаунт с seeded-гильдиями и в любой момент переключается обратно.`}
        </Notice>
      ) : (
        <Notice title="Как войти в продукт" tone="accent">
          Если хотите проверить реальные account/guild данные, зарегистрируйте локальный аккаунт ниже. Для быстрой демонстрации без входа остаётся demo sandbox, где виден тот же guided first-session flow.
        </Notice>
      )}

      <Notice title="Community layer" tone="success">
        У игры появился public community layer: каталог гильдий, каталог игроков, статусные лидерборды и сезонный world event board уже читаются поверх текущих экономики, PvE, workshop и контрактов через dashboard и экран `/guilds`.
      </Notice>

      {!shellContext.viewer ? (
        <div className="content-grid content-grid--two-thirds">
          <SectionCard
            title="Создать локальный аккаунт и стартовую гильдию"
            description="Signup сразу создаёт пользователя, cookie-based session и полностью играбельный guild bootstrap."
            aside={<Pill tone="success">alpha-ready</Pill>}
            tone="success"
          >
            <form action={signup} className="card-form">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <label className="form-field">
                <span className="form-field__label">Display name</span>
                <input name="displayName" minLength={2} placeholder="Например, Lianna" required />
              </label>
              <label className="form-field">
                <span className="form-field__label">Название гильдии</span>
                <input name="guildName" minLength={2} placeholder="Например, Amber Ledger" required />
              </label>
              <label className="form-field">
                <span className="form-field__label">Email</span>
                <input name="email" placeholder="you@example.com" required type="email" />
              </label>
              <label className="form-field">
                <span className="form-field__label">Пароль</span>
                <input minLength={8} name="password" placeholder="Минимум 8 символов" required type="password" />
              </label>
              <span className="form-help">
                После регистрации вы сразу получите стартовую гильдию, три базовых героя, предметы, ресурсы, workshop tier 1 и открытые market/trade контуры, а dashboard подхватит guided onboarding board с ближайшим шагом.
              </span>
              <button className="button button--primary" type="submit">
                Sign up и войти
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Войти в существующий аккаунт"
            description="Login восстанавливает личный guild context и переключает shell из sandbox в account-режим."
            tone="neutral"
          >
            <form action={login} className="card-form">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <label className="form-field">
                <span className="form-field__label">Email</span>
                <input name="email" placeholder="you@example.com" required type="email" />
              </label>
              <label className="form-field">
                <span className="form-field__label">Пароль</span>
                <input minLength={8} name="password" placeholder="Ваш пароль" required type="password" />
              </label>
              <button className="button button--primary" type="submit">
                Войти
              </button>
            </form>
          </SectionCard>
        </div>
      ) : (
        <SectionCard
          title="Текущий account state"
          description="Локальная alpha-сессия и demo sandbox теперь живут рядом, но читаются как разные контексты."
          aside={<Pill tone={isAuthenticatedMode ? "success" : "accent"}>{isAuthenticatedMode ? "Account mode" : "Demo mode"}</Pill>}
          tone={isAuthenticatedMode ? "success" : "accent"}
        >
          <div className="stack-sm">
            <article className="row-card">
              <div>
                <div className="row-card__title">{shellContext.viewer.displayName}</div>
                <p className="row-card__description">
                  {shellContext.viewer.email}
                  <br />
                  {viewerGuildLabel ?? "Личная гильдия недоступна"}
                  <br />
                  {isAuthenticatedMode
                    ? "Сейчас игра читает и мутирует ваши реальные account/guild данные."
                    : "Сейчас игра читает sandbox-данные, а личная гильдия ждёт возврата в account-режим."}
                </p>
              </div>
              <div className="row-card__aside actions-inline">
                {isAuthenticatedMode ? (
                  <form action={openDemoSandbox} className="inline-form">
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    <button className="button button--ghost" type="submit">
                      Открыть demo sandbox
                    </button>
                  </form>
                ) : (
                  <form action={returnToAuthenticatedGuild} className="inline-form">
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    <button className="button button--primary" type="submit">
                      Вернуться к своей гильдии
                    </button>
                  </form>
                )}

                <form action={logout} className="inline-form">
                  <input type="hidden" name="redirectTo" value="/" />
                  <button className="button button--ghost" type="submit">
                    Выйти
                  </button>
                </form>
              </div>
            </article>
          </div>
        </SectionCard>
      )}

      <SectionCard
          title="Demo sandbox"
          description="Managed demo guilds остаются доступными для локальной проверки двусторонних market/deals loop-ов и быстрых демонстраций без ручного SQL."
        aside={
          <Pill tone={shellContext.demoContext.ready ? "success" : "warning"}>
            {shellContext.demoContext.ready
              ? `${shellContext.demoContext.managedGuilds.length} managed guilds`
              : "sandbox offline"}
          </Pill>
        }
        tone={shellContext.demoContext.ready ? "accent" : "warning"}
      >
        <div className="stack-sm">
          <p className="muted">
            Demo sandbox не удалён из проекта: после <code>npm run db:setup</code> он по-прежнему поднимает Dawn Ledger [DEMO] и Ashen Union [RIVL], а shell сохраняет multi-guild switching для локальной диагностики.
          </p>

          <div className="actions-inline">
            <form action={openDemoSandbox} className="inline-form">
              <input type="hidden" name="redirectTo" value="/dashboard" />
              <button className="button button--ghost" type="submit">
                Открыть текущий sandbox
              </button>
            </form>

            <form action={createStarterGuild} className="inline-form">
              <input type="hidden" name="redirectTo" value="/" />
              <button className="button button--ghost" type="submit">
                Вернуть Dawn Ledger [DEMO]
              </button>
            </form>
          </div>

          {shellContext.demoContext.ready ? (
            <ul className="bullet-list bullet-list--muted">
              {shellContext.demoContext.managedGuilds.map((guild) => (
                <li key={guild.tag}>
                  {guild.name} [{guild.tag}] · Lv. {guild.level} · {guild.focusLabel}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{shellContext.demoContext.error ?? "Sandbox станет доступен после `npm run db:setup`."}</p>
          )}
        </div>
      </SectionCard>

      {snapshot.ok ? (
        <div className="stats-grid stats-grid--4">
          <InfoCard
            title="Уровень гильдии"
            value={`Lv. ${snapshot.data.guild.level}`}
            detail={`${formatNumber(snapshot.data.guild.xp)} guild XP накоплено в текущем контексте.`}
            tone="accent"
          />
          <InfoCard
            title="Золото"
            value={formatNumber(snapshot.data.guild.gold)}
            detail="Мягкая валюта уже заведена как центральная ось экономики MVP."
          />
          <InfoCard
            title="Активные экспедиции"
            value={snapshot.data.activeExpeditions.length}
            detail={`${snapshot.data.claimableExpeditions.length} походов уже можно закрыть через claim-flow.`}
          />
          <InfoCard
            title="PvE horizon"
            value={`${snapshot.data.pveHorizon.unlockedLocationCount} / ${snapshot.data.pveHorizon.totalLocationCount}`}
            detail={`Special scenarios: ${snapshot.data.pveHorizon.unlockedSpecialScenarioCount}/${snapshot.data.pveHorizon.totalSpecialScenarioCount}. Highest risk: ${snapshot.data.pveHorizon.highestUnlockedRiskLabel}.`}
          />
        </div>
      ) : (
        <SectionCard
          title="Локальные игровые данные ещё не подняты"
          description={snapshot.error}
          aside={<Pill tone="warning">Нужен `npm run db:setup`</Pill>}
          tone="warning"
        >
          <p className="muted">
            Auth-flow, demo sandbox и игровые экраны готовы, но SQLite foundation нужно инициализировать перед полноценной проверкой проекта.
          </p>
        </SectionCard>
      )}

      <div className="content-grid content-grid--two-thirds">
        {snapshot.ok ? (
          <SectionCard
            title="Первые 5–10 минут"
            description={onboarding?.summary ?? "Стартовый first-session board загрузится вместе с игровым snapshot."}
            aside={<Pill tone={onboarding?.isActive ? "accent" : "success"}>{onboarding?.progressLabel ?? "snapshot"}</Pill>}
            actions={
              <Link className="button button--ghost" href={onboarding?.recommendedAction?.href ?? "/dashboard"}>
                {onboarding?.recommendedAction?.actionLabel ?? "Открыть dashboard"}
              </Link>
            }
            tone={onboarding?.isActive ? "accent" : "success"}
          >
            <div className="stack-sm">
              {onboarding?.recommendedAction ? (
                <article className="row-card">
                  <div>
                    <div className="row-card__title">Рекомендуемый следующий шаг</div>
                    <p className="row-card__description">
                      {onboarding.recommendedAction.title}
                      <br />
                      {onboarding.recommendedAction.summary}
                      <br />
                      {onboarding.recommendedAction.reason}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={onboarding.recommendedAction.tone}>Next step</Pill>
                    <Link className="button button--ghost" href={onboarding.recommendedAction.href}>
                      {onboarding.recommendedAction.actionLabel}
                    </Link>
                  </div>
                </article>
              ) : null}

              {onboarding?.milestones.slice(0, 4).map((milestone) => (
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
                          {milestone.blockers[0]}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={milestone.tone}>{milestone.statusLabel}</Pill>
                    <Link className="button button--ghost" href={milestone.href}>
                      {milestone.actionLabel}
                    </Link>
                  </div>
                </article>
              ))}

              <p className="muted">
                {shellContext.mode === "demo"
                  ? "В demo sandbox этот board просто объясняет текущее состояние активной seeded-гильдии и не мешает developer switching между сторонами рынка."
                  : "После signup/login этот board становится личным маршрутом по основным loops без отдельного tutorial-engine."}
              </p>
            </div>
          </SectionCard>
        ) : null}

        {snapshot.ok ? (
          <SectionCard
            title="Новый PvE-горизонт"
            description="Даже на overview теперь видно, что экспедиции различаются не только по названию зоны, но и по профилю риска/награды."
          >
            <div className="stack-sm">
              {snapshot.data.pveHorizon.highlightedScenarios.map((scenario) => (
                <article key={scenario.code} className="row-card">
                  <div>
                    <div className="row-card__title">{scenario.name}</div>
                    <p className="row-card__description">
                      {scenario.scenarioLabel} · {scenario.summary}
                      <br />
                      {scenario.riskLabel} · {scenario.rewardFocusLabel}
                    </p>
                  </div>
                  <div className="row-card__aside">
                    <Pill tone={scenario.isUnlocked ? "success" : "warning"}>{scenario.statusLabel}</Pill>
                    {scenario.isElite ? <Pill tone="warning">Elite</Pill> : null}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Что уже работает"
          description="Playable MVP покрывает минимальную вертикаль без выхода в post-MVP scope."
        >
          <ul className="bullet-list">
            {FOUNDATION_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Осознанные границы MVP"
          description="Чтобы не расползтись по scope, прототип по-прежнему намеренно ограничен."
        >
          <ul className="bullet-list bullet-list--muted">
            {FOUNDATION_BOUNDARIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

        <SectionCard
          title="Ключевые маршруты foundation-shell"
          description="Каждый экран уже оформлен как стартовая игровая панель и одинаково доступен для личного аккаунта и demo sandbox."
          tone="accent"
        >
        <div className="route-grid">
          {APP_NAVIGATION.filter((item) => item.href !== "/").map((item) => (
            <Link key={item.href} className="route-card" href={item.href}>
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
              <span className="route-card__cta">Открыть →</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="content-grid content-grid--two-thirds">
        <SectionCard
          title="Стартовая партия MVP"
          description="Эти три архетипа теперь используются и в seeded demo, и в bootstrap новой пользовательской гильдии."
          tone="accent"
        >
          <div className="stack-sm">
            {STARTER_ARCHETYPES.map((hero) => (
              <article key={hero.heroClass} className="row-card">
                <div>
                  <div className="row-card__title">{hero.label}</div>
                  <p className="row-card__description">{hero.description}</p>
                </div>
                <div className="row-card__aside">
                  <span className="pill">{hero.name}</span>
                  <span className="muted">{hero.role}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Активные server actions"
          description="Auth, sandbox switching и gameplay actions ведут к реальным мутациям экономики, инвентаря и прогрессии."
          tone="neutral"
        >
          <div className="token-list">
            {FOUNDATION_ACTIONS.map((action) => (
              <span key={action} className="token">
                {action}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      {!shellContext.viewer || onboarding?.isActive ? (
        <TutorialLayer
          storageKey="guild-exchange-quick-tutorial-v1"
          title="Быстрый маршрут новичка"
          description={
            onboarding?.summary
            ?? "За несколько экранов можно собрать ростер, отправить первый поход, продать излишки и выбрать дома для social-first цикла."
          }
          steps={QUICK_TUTORIAL_STEPS}
        />
      ) : null}
    </div>
  );
}
