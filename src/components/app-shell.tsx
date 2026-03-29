"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME, APP_NAVIGATION, FOUNDATION_STAGE_LABEL } from "@/lib/domain";
import {
  logout,
  openDemoSandbox,
  returnToAuthenticatedGuild,
  switchActiveGuild,
} from "@/server/actions/foundation";

type DemoGuildShellItem = {
  id: string;
  name: string;
  tag: string;
  level: number;
  gold: number;
  heroCount: number;
  inventoryCount: number;
  claimBoxCount: number;
  marketUnlocked: boolean;
  tradeUnlocked: boolean;
  focusLabel: string;
  isDefault: boolean;
};

type AppShellProps = {
  children: ReactNode;
  shellContext: {
    mode: "authenticated" | "demo";
    viewer: {
      id: string;
      displayName: string;
      email: string;
      guildName: string | null;
      guildTag: string | null;
    } | null;
    demoContext: {
      ready: boolean;
      error: string | null;
      activeGuildTag: string | null;
      managedGuilds: DemoGuildShellItem[];
    };
  };
};

export function AppShell({ children, shellContext }: AppShellProps) {
  const pathname = usePathname();
  const redirectTo = pathname && pathname.length > 0 ? pathname : "/";
  const activeDemoGuild = shellContext.demoContext.ready
    ? shellContext.demoContext.managedGuilds.find(
      (guild) => guild.tag === shellContext.demoContext.activeGuildTag,
    ) ?? null
    : null;
  const viewerGuildLabel = shellContext.viewer?.guildName && shellContext.viewer.guildTag
    ? `${shellContext.viewer.guildName} [${shellContext.viewer.guildTag}]`
    : "Гильдия аккаунта недоступна";
  const activeGuildTag = shellContext.mode === "authenticated"
    ? shellContext.viewer?.guildTag ?? null
    : activeDemoGuild?.tag ?? null;
  const activeGuildProfileHref = activeGuildTag ? `/guilds/${encodeURIComponent(activeGuildTag)}` : "/guilds";

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <Link className="brand" href="/">
          <span className="brand__eyebrow">{FOUNDATION_STAGE_LABEL}</span>
          <strong>{APP_NAME}</strong>
          <span className="muted">local alpha idle/management RPG</span>
        </Link>

        <div className="sidebar-panel">
          <span className={`pill ${shellContext.mode === "authenticated" ? "pill--success" : "pill--accent"}`}>
            {shellContext.mode === "authenticated" ? "Alpha session" : "Demo sandbox"}
          </span>
          <p>
            {shellContext.mode === "authenticated"
              ? "Текущие server-side snapshots и игровые actions работают в личном аккаунт-гильд контексте по cookie-based session."
              : "Sandbox-контур остаётся доступным локально: demo-гильдия выбирается switcher-ом и удерживается cookie-сессией между экранами."}
          </p>
        </div>

        <div className="sidebar-panel">
          <div className="stack-sm">
            <div>
              <span className="muted">Viewer</span>
              <strong>{shellContext.viewer ? shellContext.viewer.displayName : "Гостевой режим"}</strong>
              <p className="muted">
                {shellContext.viewer
                  ? `${shellContext.viewer.email} · ${viewerGuildLabel}`
                  : "Войдите в аккаунт, чтобы играть в своём контексте, или используйте demo sandbox для локальной отладки."}
              </p>
            </div>

            <div className="actions-inline">
              {shellContext.viewer ? (
                <>
                  {shellContext.mode === "authenticated" ? (
                    <form action={openDemoSandbox} className="inline-form">
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button className="button button--ghost" type="submit">
                        Открыть demo
                      </button>
                    </form>
                  ) : shellContext.viewer.guildTag ? (
                    <form action={returnToAuthenticatedGuild} className="inline-form">
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button className="button button--primary" type="submit">
                        К своей гильдии
                      </button>
                    </form>
                  ) : null}

                  <form action={logout} className="inline-form">
                    <input type="hidden" name="redirectTo" value="/" />
                    <button className="button button--ghost" type="submit">
                      Выйти
                    </button>
                  </form>
                </>
              ) : (
                <Link className="button button--ghost" href="/">
                  Signup / login
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-panel">
          <div className="stack-sm">
            <div>
              <span className="muted">Active guild context</span>
              <strong>
                {shellContext.mode === "authenticated"
                  ? viewerGuildLabel
                  : activeDemoGuild
                    ? `${activeDemoGuild.name} [${activeDemoGuild.tag}]`
                    : "Demo context недоступен"}
              </strong>
              <p className="muted">
                {shellContext.mode === "authenticated"
                  ? "Рынок, сделки, ростер, seasonal board и metaprogression читаются строго от лица вашей гильдии без глобального demo fallback."
                  : activeDemoGuild
                    ? "Sandbox переключает те же экраны между managed demo-гильдиями для двухсторонней проверки рынка, seasonal standings и barter-loop-а."
                    : shellContext.demoContext.error ?? "Список управляемых гильдий появится после `npm run db:setup`."}
              </p>
            </div>

            <div className="actions-inline">
              <Link className="button button--ghost" href="/dashboard">
                Seasonal board
              </Link>
              <Link className="button button--ghost" href="/guilds">
                Каталог гильдий
              </Link>
              <Link className="button button--ghost" href={activeGuildProfileHref}>
                Публичный профиль
              </Link>
            </div>

            {shellContext.mode === "demo" && shellContext.demoContext.ready ? (
              <div className="guild-switcher">
                {shellContext.demoContext.managedGuilds.map((guild) => {
                  const isActive = guild.tag === shellContext.demoContext.activeGuildTag;

                  return (
                    <form key={guild.tag} action={switchActiveGuild} className="guild-switcher__entry">
                      <input type="hidden" name="guildTag" value={guild.tag} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />

                      <div className="guild-switcher__header">
                        <strong>
                          {guild.name} [{guild.tag}]
                        </strong>
                        <span className={`pill ${isActive ? "pill--success" : "pill--accent"}`}>
                          {isActive ? "Активна" : guild.isDefault ? "Default" : "Managed"}
                        </span>
                      </div>

                      <div className="guild-switcher__meta">
                        <span>
                          Lv. {guild.level} · {guild.gold.toLocaleString("ru-RU")} зол. · {guild.heroCount} гер. · инвентарь {guild.inventoryCount}
                        </span>
                        <span>{guild.focusLabel}</span>
                        <span>
                          {guild.marketUnlocked ? "Рынок открыт" : "Рынок закрыт"} · {guild.tradeUnlocked ? "Сделки открыты" : "Сделки закрыты"} · claim box {guild.claimBoxCount}
                        </span>
                      </div>

                      <button
                        className={`button ${isActive ? "button--primary" : "button--ghost"}`}
                        type="submit"
                        disabled={isActive}
                      >
                        {isActive ? "Текущий контекст" : "Сделать активной"}
                      </button>
                    </form>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <nav className="nav">
          {APP_NAVIGATION.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                className={`nav-link${isActive ? " nav-link--active" : ""}`}
                href={item.href}
              >
                <span className="nav-link__label">{item.label}</span>
                <span className="nav-link__description">{item.description}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <span className="muted">
            {shellContext.mode === "authenticated" ? "Личный контекст" : "Проверка двухстороннего loop-а"}
          </span>
          <strong>
            {shellContext.mode === "authenticated"
              ? "Demo sandbox остаётся доступным через кнопку выше, не смешивая ваш аккаунт с seeded-гильдиями."
              : "Переключайте управляемые гильдии, чтобы смотреть рынок и сделки с обеих сторон."}
          </strong>
        </div>
      </aside>

      <main className="shell__main">{children}</main>
    </div>
  );
}
