import { PageLoadingState } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <PageLoadingState
      eyebrow="Inventory"
      title="Загружаем ресурсы и предметы"
      description="Подтягиваем stack-ресурсы, workshop candidates и торговую пригодность лута."
    />
  );
}
