import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Guild profile"
      title="Загружаем публичный профиль дома"
      description="Собираем identity showcase, prestige, renown, diplomacy и social CTA."
    />
  );
}
