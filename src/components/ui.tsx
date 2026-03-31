import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "success" | "warning";
type SurfaceTone = Tone | "danger";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
};

type InfoCardProps = {
  title: string;
  value: ReactNode;
  detail?: string;
  tone?: Tone;
};

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  tone?: SurfaceTone;
};

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

type PillProps = {
  children: ReactNode;
  tone?: Tone;
};

type NoticeProps = {
  title?: ReactNode;
  children: ReactNode;
  tone?: SurfaceTone;
  action?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badges,
  meta,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        <div className="page-header__eyebrow-row">
          <span className="page-header__eyebrow">{eyebrow}</span>
          {badges ? <div className="page-header__badges">{badges}</div> : null}
        </div>
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__description">{description}</p>
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>

      {actions ? <div className="button-row button-row--header">{actions}</div> : null}
    </header>
  );
}

export function InfoCard({
  title,
  value,
  detail,
  tone = "neutral",
}: InfoCardProps) {
  return (
    <article className={`info-card info-card--${tone}`}>
      <span className="info-card__title">{title}</span>
      <strong className="info-card__value">{value}</strong>
      {detail ? <p className="info-card__detail">{detail}</p> : null}
    </article>
  );
}

export function SectionCard({
  id,
  title,
  description,
  aside,
  actions,
  children,
  tone = "neutral",
}: SectionCardProps) {
  return (
    <section className={`section-card section-card--${tone}`} id={id}>
      <div className="section-card__header">
        <div className="section-card__copy">
          <h2 className="section-card__title">{title}</h2>
          {description ? (
            <p className="section-card__description">{description}</p>
          ) : null}
        </div>

        {aside || actions ? (
          <div className="section-card__actions">
            {aside ? <div>{aside}</div> : null}
            {actions ? <div className="button-row button-row--compact">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong className="empty-state__title">{title}</strong>
      <p>{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: PillProps) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function Notice({ title, children, tone = "accent", action }: NoticeProps) {
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={tone === "danger" ? "assertive" : "polite"}
    >
      <div className="notice__content">
        {title ? <strong className="notice__title">{title}</strong> : null}
        <div>{children}</div>
      </div>
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  );
}
