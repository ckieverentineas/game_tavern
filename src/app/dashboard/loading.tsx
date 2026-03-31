import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Guild dashboard"
      title="Загружаем board гильдии"
      description="Подтягиваем метрики, objective board, world events и social activity."
    />
  );
}
