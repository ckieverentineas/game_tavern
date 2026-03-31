import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Guild Exchange"
      title="Собираем сводку текущего контекста"
      description="Подгружаем shell, контекст гильдии и ключевые панели интерфейса."
    />
  );
}
