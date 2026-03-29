const numberFormatter = new Intl.NumberFormat("ru-RU");
const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export type ActionFeedback = {
  tone: "success" | "warning" | "danger";
  message: string;
};

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${numberFormatter.format(value)}`;
  }

  return numberFormatter.format(value);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }

  return `${minutes} мин`;
}

export function formatCompactList(values: string[]) {
  return values.length > 0 ? values.join(" • ") : "—";
}

export function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function readActionFeedback(
  params: Record<string, string | string[] | undefined>,
): ActionFeedback | null {
  const message = readSearchParam(params, "message");

  if (!message) {
    return null;
  }

  const status = readSearchParam(params, "status");

  if (status === "success") {
    return { tone: "success", message };
  }

  if (status === "danger") {
    return { tone: "danger", message };
  }

  return { tone: "warning", message };
}
