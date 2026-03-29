import type { FoundationResult } from "@/server/foundation";

export function unwrapFoundationResult<T>(result: FoundationResult<T>): T {
  if (!result.ok) {
    throw new Error(`Ожидался успешный FoundationResult, получена ошибка: ${result.error}`);
  }

  return result.data;
}

