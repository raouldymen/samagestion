const fcfaFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Dakar",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Dakar",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatFcfa(amount: number): string {
  const formatted = fcfaFormatter.format(Math.abs(amount));
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";
  return `${sign}${formatted} FCFA`;
}

export function formatFcfaAbsolute(amount: number): string {
  return `${fcfaFormatter.format(amount)} FCFA`;
}

export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

export function formatCalendarDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate.slice(0, 10)}T12:00:00`));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

export function formatRelativeTime(isoDate: string, now = new Date()) {
  const diff = Math.max(0, now.getTime() - new Date(isoDate).getTime());
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) {
    return "À l'instant";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `${days} j`;
}
