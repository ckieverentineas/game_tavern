# Guild Exchange — local alpha + demo sandbox

Локальный прототип браузерной idle/management RPG на Next.js + TypeScript + Prisma + SQLite.

## Быстрый старт

1. Подготовьте SQLite и seed:

```bash
npm run db:setup
```

2. Запустите dev-сервер:

```bash
npm run dev
```

3. Откройте [`http://localhost:3000`](http://localhost:3000).

## Local alpha account + demo sandbox

- После [`npm run db:setup`](package.json:17) доступны оба режима:
  - **local alpha account** — зарегистрируйте аккаунт на главной странице, сразу получите стартовую гильдию и войдёте в личный user/guild context
  - **demo sandbox** — без входа или через shell переключитесь в seeded `Dawn Ledger [DEMO]` / `Ashen Union [RIVL]` и используйте multi-guild switcher для локальной отладки
- Signup flow сразу создаёт:
  - пользователя с email + password
  - cookie-based session
  - стартовую гильдию с открытыми market/trade каналами
  - базовый ростер героев, стартовые предметы, ресурсы и workshop tier 1
- В любом режиме после setup можно проверить полный минимальный loop:
  - отправить героев в экспедицию
  - дождаться lazy resolution и забрать награды
  - экипировать предметы на героев и снять их обратно
  - выставить item/resource лот на рынок, купить чужой лот, отменить свой и забрать claim
  - создать приватную barter-сделку, принять её, отклонить или отменить
  - купить guild upgrade на дополнительные слоты и progression unlock-и
  - открыть `/guilds`, сравнить public leaderboards, перейти в публичный профиль гильдии и затем мягко провалиться в `/market?guild=TAG` или `/deals?to=TAG`

## Social directory / public profile flow

- Новый social discovery layer живёт в `/guilds` и `/guilds/[guildTag]`
- `/guilds` показывает:
  - публичный каталог гильдий
  - каталог игроков по owner/display name
  - лидерборды по guild level, wealth, roster power и market activity
  - seasonal world event board с общими целями, standings и claimable rewards
- `/guilds/[guildTag]` показывает полезный public profile:
  - гильдию, tag, owner/display name
  - progression snapshot, power, wealth, PvE status и часть ростера
  - live market / buy-order витрину и recent public activity
  - seasonal status по событиям frontier / market / forge
  - social CTA в `/market?guild=TAG` и `/deals?to=TAG`
- Dashboard, `/expedition` и `/market` теперь отдельно объясняют, как текущие действия двигают world events и какие rewards уже можно забрать.
- Seed теперь поднимает не только managed demo-гильдии для sandbox switching, но и дополнительные публичные seasonal claims, чтобы directory, event standings и leaderboard-слой выглядели живыми сразу после [`npm run db:setup`](package.json:19)

## Проверки

Для базовой проверки проекта доступны команды:

```bash
npm run check
npm run build
```

## Примечание по Prisma config

В проекте используется [`prisma.config.ts`](prisma.config.ts), поэтому CLI не подхватывает `.env` автоматически. Если `DATABASE_URL` не задана явно, конфиг использует fallback `file:./dev.db`, чтобы [`npm run db:setup`](package.json:17) работал сразу в локальном MVP-сценарии.
