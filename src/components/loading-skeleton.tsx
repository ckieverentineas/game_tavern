type PageLoadingStateProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageLoadingState({ eyebrow, title, description }: PageLoadingStateProps) {
  return (
    <div className="loading-page page-stack" aria-busy="true" aria-live="polite">
      <section className="loading-hero">
        <div className="stack-sm">
          <span className="page-header__eyebrow">{eyebrow}</span>
          <div className="loading-skeleton loading-skeleton--headline" />
          <div className="loading-skeleton loading-skeleton--text" />
          <div className="loading-skeleton loading-skeleton--text loading-skeleton--text-short" />
        </div>
        <div className="button-row">
          <div className="loading-skeleton loading-skeleton--button" />
          <div className="loading-skeleton loading-skeleton--button" />
        </div>
        <div className="muted">{title} · {description}</div>
      </section>

      <div className="loading-stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="loading-skeleton loading-skeleton--card" key={`stat-${index}`} />
        ))}
      </div>

      <div className="loading-grid">
        <section className="loading-section">
          <div className="loading-section__header">
            <div className="loading-skeleton loading-skeleton--title" />
            <div className="loading-skeleton loading-skeleton--text" />
          </div>
          <div className="loading-section__rows">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="loading-skeleton loading-skeleton--card" key={`row-${index}`} />
            ))}
          </div>
        </section>

        <section className="loading-section">
          <div className="loading-section__header">
            <div className="loading-skeleton loading-skeleton--title" />
            <div className="loading-skeleton loading-skeleton--text loading-skeleton--text-short" />
          </div>
          <div className="loading-section__rows">
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="loading-skeleton loading-skeleton--card" key={`aside-${index}`} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
