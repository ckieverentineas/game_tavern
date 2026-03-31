import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Marketplace"
      title="Загружаем рынок"
      description="Подтягиваем активные лоты, buy orders, claim box и social context контрагентов."
    />
  );
}
