import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Expeditions"
      title="Загружаем PvE-горизонт"
      description="Подтягиваем маршруты, party readiness, историю забегов и reward forecast."
    />
  );
}
