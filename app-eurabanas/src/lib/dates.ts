const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDaysIso(value: string, days: number): string {
  const base = isIsoDate(value) ? new Date(`${value}T12:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return 0;
  const start = new Date(`${checkIn}T12:00:00`).getTime();
  const end = new Date(`${checkOut}T12:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function formatDate(value: string): string {
  if (!isIsoDate(value)) return value;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
