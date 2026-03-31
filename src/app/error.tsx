"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell-error">
      <section className="shell-error__panel" role="alert" aria-live="assertive">
        <span className="page-header__eyebrow">Application error</span>
        <h1 className="page-header__title">Интерфейс столкнулся с неожиданной ошибкой</h1>
        <p className="page-header__description">
          Текущее действие не завершилось, но сессия и данные не должны быть потеряны. Повторная
          попытка обычно восстанавливает экран без ручного перезапуска.
        </p>
        <div className="shell-error__actions">
          <button className="button button--primary" type="button" onClick={() => unstable_retry()}>
            Попробовать снова
          </button>
          <Link className="button button--ghost" href="/dashboard">
            Вернуться на dashboard
          </Link>
          <Link className="button button--ghost" href="/">
            Открыть обзор
          </Link>
        </div>
        <p className="muted">
          {error.digest ? `Технический идентификатор: ${error.digest}.` : "Ошибка не вернула digest."}
        </p>
      </section>
    </div>
  );
}
