import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

type InfoCardProps = {
  title: string;
  value: ReactNode;
  detail?: string;
  tone?: Tone;
};

type SectionCardProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};

type EmptyStateProps = {
  title: string;
  description: string;
};

type PillProps = {
  children: ReactNode;
  tone?: Tone;
};

type NoticeProps = {
  children: ReactNode;
  tone?: Tone | "danger";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        <span className="page-header__eyebrow">{eyebrow}</span>
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__description">{description}</p>
      </div>

      {actions ? <div className="button-row">{actions}</div> : null}
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
  title,
  description,
  aside,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <div>
          <h2 className="section-card__title">{title}</h2>
          {description ? (
            <p className="section-card__description">{description}</p>
          ) : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: PillProps) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function Notice({ children, tone = "accent" }: NoticeProps) {
  return <div className={`notice notice--${tone}`}>{children}</div>;
}
