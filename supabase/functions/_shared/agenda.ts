// Logique pure de l'agenda (aucune dépendance) : partagée entre la fonction
// Edge `api` (Deno) et les tests vitest (Node).

export const STUDIO_TIMEZONE = "Europe/Zurich";

export type OpeningWindow = { start: string; end: string }; // "HH:MM" heure locale
/** Clé = jour ISO (1 = lundi … 7 = dimanche). Jour absent ou [] = fermé. */
export type OpeningHours = Record<number, OpeningWindow[]>;

// Horaires réels de Studio Gym (heure locale Europe/Zurich), à modifier ICI uniquement.
// Fenêtre = heure de la première séance → heure de fermeture : un créneau de
// `duration` minutes doit être terminé au plus tard à la fermeture.
// TODO(Guillaume): ajuster ici si les horaires changent (vacances, été…).
export const STUDIO_OPENING_HOURS: OpeningHours = {
  1: [{ start: "08:00", end: "21:00" }], // lundi : dernière séance 20h00
  2: [{ start: "08:00", end: "20:00" }], // mardi : dernière séance 19h00
  3: [{ start: "08:00", end: "20:00" }], // mercredi : dernière séance 19h00
  4: [{ start: "07:00", end: "18:30" }], // jeudi : dernière séance 17h30
  5: [{ start: "08:00", end: "18:30" }], // vendredi : dernière séance 17h30
  6: [{ start: "08:00", end: "11:00" }], // samedi : dernière séance 10h00
  7: [], // dimanche : fermé
};

export type Interval = { start: Date; end: Date };

export type FreeSlot = {
  start: string; // ISO UTC
  end: string; // ISO UTC
  start_local: string; // "YYYY-MM-DDTHH:MM" dans le fuseau du studio
  end_local: string;
  weekday: string; // "lundi", "mardi", …
  duration_minutes: number;
};

const WEEKDAYS_FR = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAY_SHORT: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function toLocalParts(date: Date, timeZone: string): LocalParts & { second: number } {
  const parts: Record<string, string> = {};
  for (const p of formatter(timeZone).formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_SHORT[parts.weekday],
  };
}

/** Décalage (ms) du fuseau par rapport à UTC à l'instant donné. */
function offsetAt(date: Date, timeZone: string): number {
  const p = toLocalParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convertit une heure murale locale (jour + "HH:MM") en instant UTC. */
export function zonedTimeToUtc(year: number, month: number, day: number, hhmm: string, timeZone: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, h, m);
  let ts = wall - offsetAt(new Date(wall), timeZone);
  // Second passage pour les jours de changement d'heure.
  const corrected = wall - offsetAt(new Date(ts), timeZone);
  if (corrected !== ts) ts = corrected;
  return new Date(ts);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatLocal(date: Date, timeZone: string): string {
  const p = toLocalParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end.getTime() > i.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start.getTime() <= last.end.getTime()) {
      if (i.end.getTime() > last.end.getTime()) last.end = new Date(i.end);
    } else {
      out.push({ start: new Date(i.start), end: new Date(i.end) });
    }
  }
  return out;
}

/** Fenêtres d'ouverture (en UTC) qui recoupent [from, to). */
export function openingIntervals(from: Date, to: Date, hours: OpeningHours, timeZone: string): Interval[] {
  const out: Interval[] = [];
  // On part de la veille locale pour couvrir les décalages de fuseau.
  let cursor = new Date(from.getTime() - DAY);
  const stop = to.getTime() + DAY;
  const seen = new Set<string>();
  while (cursor.getTime() <= stop) {
    const p = toLocalParts(cursor, timeZone);
    const key = `${p.year}-${p.month}-${p.day}`;
    if (!seen.has(key)) {
      seen.add(key);
      for (const w of hours[p.weekday] ?? []) {
        const start = zonedTimeToUtc(p.year, p.month, p.day, w.start, timeZone);
        const end = zonedTimeToUtc(p.year, p.month, p.day, w.end, timeZone);
        const s = Math.max(start.getTime(), from.getTime());
        const e = Math.min(end.getTime(), to.getTime());
        if (e > s) out.push({ start: new Date(s), end: new Date(e) });
      }
    }
    cursor = new Date(cursor.getTime() + 12 * 60 * MINUTE); // pas de 12h : robuste aux jours de 23/25h
  }
  return mergeIntervals(out);
}

export type FreeSlotsInput = {
  from: Date;
  to: Date;
  durationMinutes: number;
  busy: Interval[];
  openingHours?: OpeningHours;
  timeZone?: string;
};

/**
 * Plages libres d'au moins `durationMinutes` dans les heures d'ouverture,
 * hors rendez-vous / créneaux bloqués (`busy`).
 */
export function computeFreeSlots({
  from,
  to,
  durationMinutes,
  busy,
  openingHours = STUDIO_OPENING_HOURS,
  timeZone = STUDIO_TIMEZONE,
}: FreeSlotsInput): FreeSlot[] {
  if (!(to.getTime() > from.getTime()) || !(durationMinutes > 0)) return [];
  const minMs = durationMinutes * MINUTE;
  const blocked = mergeIntervals(busy);
  const result: FreeSlot[] = [];

  for (const open of openingIntervals(from, to, openingHours, timeZone)) {
    let cursor = open.start.getTime();
    const pushFree = (s: number, e: number) => {
      if (e - s < minMs) return;
      const start = new Date(s);
      const end = new Date(e);
      result.push({
        start: start.toISOString(),
        end: end.toISOString(),
        start_local: formatLocal(start, timeZone),
        end_local: formatLocal(end, timeZone),
        weekday: WEEKDAYS_FR[toLocalParts(start, timeZone).weekday],
        duration_minutes: Math.round((e - s) / MINUTE),
      });
    };
    for (const b of blocked) {
      const bs = b.start.getTime();
      const be = b.end.getTime();
      if (be <= cursor || bs >= open.end.getTime()) continue;
      if (bs > cursor) pushFree(cursor, bs);
      cursor = Math.max(cursor, be);
      if (cursor >= open.end.getTime()) break;
    }
    if (cursor < open.end.getTime()) pushFree(cursor, open.end.getTime());
  }
  return result;
}
