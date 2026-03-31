import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Guild directory"
      title="Загружаем social layer"
      description="Собираем каталог домов, watchlist, diplomacy memory и seasonal board."
    />
  );
}
