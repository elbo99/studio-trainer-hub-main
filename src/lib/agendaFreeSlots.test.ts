import { describe, it, expect } from "vitest";
import {
  computeFreeSlots,
  zonedTimeToUtc,
  formatLocal,
  STUDIO_TIMEZONE,
  type OpeningHours,
} from "../../supabase/functions/_shared/agenda";

const TZ = STUDIO_TIMEZONE;
const at = (y: number, mo: number, d: number, hhmm: string) => zonedTimeToUtc(y, mo, d, hhmm, TZ);

describe("zonedTimeToUtc", () => {
  it("handles winter (UTC+1) and summer (UTC+2) in Zurich", () => {
    expect(at(2026, 11, 16, "06:30").toISOString()).toBe("2026-11-16T05:30:00.000Z");
    expect(at(2026, 7, 6, "06:30").toISOString()).toBe("2026-07-06T04:30:00.000Z");
    expect(formatLocal(new Date("2026-11-16T05:30:00Z"), TZ)).toBe("2026-11-16T06:30");
  });
});

describe("computeFreeSlots", () => {
  // Lundi 16 novembre 2026
  const mondayFrom = at(2026, 11, 16, "00:00");
  const mondayTo = at(2026, 11, 17, "00:00");

  it("returns the whole opening window when nothing is booked", () => {
    const slots = computeFreeSlots({ from: mondayFrom, to: mondayTo, durationMinutes: 60, busy: [] });
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      start_local: "2026-11-16T08:00",
      end_local: "2026-11-16T21:00",
      weekday: "lundi",
      duration_minutes: 13 * 60,
    });
  });

  it("splits around appointments and drops gaps shorter than the duration", () => {
    const busy = [
      { start: at(2026, 11, 16, "08:30"), end: at(2026, 11, 16, "09:00") }, // laisse 08:00-08:30 (30 min)
      { start: at(2026, 11, 16, "12:00"), end: at(2026, 11, 16, "13:00") },
      { start: at(2026, 11, 16, "12:30"), end: at(2026, 11, 16, "14:00") }, // chevauche le précédent
      { start: at(2026, 11, 16, "20:15"), end: at(2026, 11, 16, "22:00") }, // déborde la fermeture
    ];
    const slots = computeFreeSlots({ from: mondayFrom, to: mondayTo, durationMinutes: 60, busy });
    expect(slots.map((s) => [s.start_local, s.end_local])).toEqual([
      ["2026-11-16T09:00", "2026-11-16T12:00"],
      ["2026-11-16T14:00", "2026-11-16T20:15"],
    ]);
  });

  it("keeps a gap that is exactly the requested duration", () => {
    const busy = [
      { start: at(2026, 11, 16, "08:00"), end: at(2026, 11, 16, "10:00") },
      { start: at(2026, 11, 16, "11:00"), end: at(2026, 11, 16, "21:00") },
    ];
    const slots = computeFreeSlots({ from: mondayFrom, to: mondayTo, durationMinutes: 60, busy });
    expect(slots).toHaveLength(1);
    expect(slots[0].start_local).toBe("2026-11-16T10:00");
    expect(slots[0].duration_minutes).toBe(60);
  });

  it("covers a full week with Saturday morning and closed Sunday", () => {
    const slots = computeFreeSlots({
      from: mondayFrom,
      to: at(2026, 11, 23, "00:00"),
      durationMinutes: 60,
      busy: [],
    });
    expect(slots.map((s) => s.weekday)).toEqual(["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]);
    expect(slots[5]).toMatchObject({ start_local: "2026-11-21T08:00", end_local: "2026-11-21T11:00" });
  });

  it("Thursday opens at 07:00 and a session must end by 18:30", () => {
    const thu = (h: string) => at(2026, 11, 19, h);
    const busy = [{ start: thu("07:00"), end: thu("17:00") }];
    const slots = computeFreeSlots({ from: thu("00:00"), to: thu("23:59"), durationMinutes: 60, busy });
    expect(slots.map((s) => [s.start_local, s.end_local])).toEqual([["2026-11-19T17:00", "2026-11-19T18:30"]]);
    // 17:45 → 18:30 ne laisse que 45 min : pas de créneau d'1h
    const late = computeFreeSlots({ from: thu("00:00"), to: thu("23:59"), durationMinutes: 60, busy: [{ start: thu("07:00"), end: thu("17:45") }] });
    expect(late).toEqual([]);
    const free = computeFreeSlots({ from: thu("00:00"), to: thu("23:59"), durationMinutes: 60, busy: [] });
    expect(free[0]).toMatchObject({ start_local: "2026-11-19T07:00", end_local: "2026-11-19T18:30", weekday: "jeudi" });
  });

  it("Saturday: last 1h session starts at 10:00 (closing 11:00)", () => {
    const sat = (h: string) => at(2026, 11, 21, h);
    const busy = [{ start: sat("08:00"), end: sat("10:00") }];
    const slots = computeFreeSlots({ from: sat("00:00"), to: sat("23:59"), durationMinutes: 60, busy });
    expect(slots.map((s) => [s.start_local, s.end_local, s.weekday])).toEqual([["2026-11-21T10:00", "2026-11-21T11:00", "samedi"]]);
    const tooLate = computeFreeSlots({ from: sat("00:00"), to: sat("23:59"), durationMinutes: 60, busy: [{ start: sat("08:00"), end: sat("10:15") }] });
    expect(tooLate).toEqual([]);
  });

  it("Sunday is closed", () => {
    const slots = computeFreeSlots({ from: at(2026, 11, 22, "00:00"), to: at(2026, 11, 23, "00:00"), durationMinutes: 60, busy: [] });
    expect(slots).toEqual([]);
  });

  it("clips to the requested range", () => {
    const slots = computeFreeSlots({
      from: at(2026, 11, 16, "15:10"),
      to: at(2026, 11, 16, "18:00"),
      durationMinutes: 60,
      busy: [],
    });
    expect(slots.map((s) => [s.start_local, s.end_local])).toEqual([["2026-11-16T15:10", "2026-11-16T18:00"]]);
  });

  it("respects DST change (last Sunday of March) and custom opening hours", () => {
    const hours: OpeningHours = { 7: [{ start: "01:00", end: "05:00" }] };
    const slots = computeFreeSlots({
      from: at(2026, 3, 29, "00:00"),
      to: at(2026, 3, 30, "00:00"),
      durationMinutes: 60,
      busy: [],
      openingHours: hours,
    });
    // 01:00 -> 05:00 heure locale, mais 02:00-03:00 n'existe pas ce jour-là : 3h réelles
    expect(slots).toHaveLength(1);
    expect(slots[0].duration_minutes).toBe(180);
    expect(slots[0].start).toBe("2026-03-29T00:00:00.000Z");
  });

  it("returns nothing for an invalid range or duration", () => {
    expect(computeFreeSlots({ from: mondayTo, to: mondayFrom, durationMinutes: 60, busy: [] })).toEqual([]);
    expect(computeFreeSlots({ from: mondayFrom, to: mondayTo, durationMinutes: 0, busy: [] })).toEqual([]);
  });
});
