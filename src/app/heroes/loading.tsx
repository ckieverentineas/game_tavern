import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Heroes / Roster"
      title="Загружаем ростер"
      description="Подтягиваем героев, таверну, слоты и текущую экипировку."
    />
  );
}
