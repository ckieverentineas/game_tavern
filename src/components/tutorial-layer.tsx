"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";

type TutorialStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

type TutorialLayerProps = {
  storageKey: string;
  title: string;
  description: string;
  steps: readonly TutorialStep[];
  dismissLabel?: string;
  reopenLabel?: string;
};

export function TutorialLayer({
  storageKey,
  title,
  description,
  steps,
  dismissLabel = "Пропустить",
  reopenLabel = "Показать быстрый tutorial",
}: TutorialLayerProps) {
  const headingId = useId();
  const [expanded, setExpanded] = useState(true);
  const [dismissedOverride, setDismissedOverride] = useState<boolean | null>(null);

  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const storedDismissed = (() => {
    if (!hydrated) {
      return false;
    }

    try {
      return window.localStorage.getItem(storageKey) === "dismissed";
    } catch {
      return false;
    }
  })();

  const dismissed = dismissedOverride ?? storedDismissed;

  const handleDismiss = () => {
    setDismissedOverride(true);

    try {
      window.localStorage.setItem(storageKey, "dismissed");
    } catch {
      // no-op
    }
  };

  const handleReopen = () => {
    setDismissedOverride(false);
    setExpanded(true);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // no-op
    }
  };

  if (!hydrated || steps.length === 0) {
    return null;
  }

  if (dismissed) {
    return (
      <button className="tutorial-layer__toggle button button--ghost" type="button" onClick={handleReopen}>
        {reopenLabel}
      </button>
    );
  }

  return (
    <aside className="tutorial-layer" aria-labelledby={headingId}>
      <div className="tutorial-layer__header">
        <div className="stack-sm">
          <span className="tutorial-layer__eyebrow">Quick tutorial</span>
          <h2 className="tutorial-layer__title" id={headingId}>
            {title}
          </h2>
          <p className="tutorial-layer__description">{description}</p>
        </div>

        <div className="button-row button-row--compact">
          <button className="button button--ghost" type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Свернуть" : "Развернуть"}
          </button>
          <button className="button button--ghost" type="button" onClick={handleDismiss}>
            {dismissLabel}
          </button>
        </div>
      </div>

      {expanded ? (
        <ol className="tutorial-layer__steps">
          {steps.map((step, index) => (
            <li className="tutorial-layer__step" key={step.key}>
              <span className="tutorial-layer__step-index">{index + 1}</span>
              <div className="tutorial-layer__step-copy">
                <strong>{step.title}</strong>
                <p className="tutorial-layer__description">{step.description}</p>
                <Link className="tutorial-layer__step-link" href={step.href}>
                  {step.actionLabel}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}
