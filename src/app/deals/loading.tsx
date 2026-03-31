import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Deals"
      title="Загружаем private deals"
      description="Готовим inbox, outbox, историю офферов и social cues по контрагентам."
    />
  );
}
