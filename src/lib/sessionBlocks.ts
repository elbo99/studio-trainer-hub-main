import type { TaskWithDetails } from "@/services/tasksService";

export type SessionType = "swimming" | "cardio" | "strength" | "wellness" | "other";

export interface BlockItem {
  /** Main label of the item (exercise name or instruction) */
  label: string;
  /** Optional structured details, rendered as chips */
  duration?: string | null;
  setsReps?: string | null;
  rest?: string | null;
  intensity?: string | null;
  heartZone?: string | null;
  /** Optional free-text note attached to the item */
  note?: string | null;
}

export interface SessionBlock {
  title: string;
  items: BlockItem[];
}

export interface ParsedSession {
  /** Filtered, contextual blocks */
  blocks: SessionBlock[];
  /** Computed total duration if we can extract one from items, otherwise the task.duration */
  estimatedDuration: string | null;
  /** Display-level difficulty (intensity for simple types, mixed otherwise) */
  difficulty: string | null;
  /** Goal / description (already on the task) */
  objective: string | null;
  /** Coach message */
  coachMessage: string | null;
}

/**
 * Categories of types that share rendering rules.
 * Strength / hyrox / swimming → multi-exercise composition.
 * Cardio / wellness / mobility / breathing / recovery → narrative blocks.
 */
const STRENGTH_LIKE = new Set(["strength"]);
const COMPOSITION_LIKE = new Set(["strength", "swimming"]);

function isStrengthLike(type: string) {
  return STRENGTH_LIKE.has(type);
}

function splitPipe(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(" | ").map((p) => p.trim()).filter(Boolean);
}

/**
 * Detects "## Block name" headers in a multi-line exercise_notes blob.
 * Returns the list of blocks or null if no header found.
 */
function parseHeaderedBlocks(text: string | null): { title: string; lines: string[] }[] | null {
  if (!text) return null;
  if (!/(^|\n)\s*##\s+/.test(text)) return null;
  const lines = text.split(/\r?\n/);
  const blocks: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) blocks.push(current);
      current = { title: m[1], lines: [] };
    } else if (current) {
      if (line.trim()) current.lines.push(line.trim());
    }
  }
  if (current) blocks.push(current);
  return blocks.length > 0 ? blocks : null;
}

/**
 * For strength / hyrox / swimming sessions where coach used parallel pipe-separated
 * arrays across duration / sets_reps / rest / intensity / exercise_notes / heart_zones.
 */
function parseCompositionBlock(task: TaskWithDetails): SessionBlock | null {
  const names = splitPipe(task.duration);
  const sets = splitPipe(task.sets_reps);
  const rests = splitPipe((task as any).rest);
  const intens = splitPipe(task.intensity);
  const notes = splitPipe((task as any).exercise_notes);
  const hz = splitPipe((task as any).heart_zones);
  const len = Math.max(names.length, sets.length, rests.length, intens.length, notes.length, hz.length);
  if (len === 0) return null;
  const items: BlockItem[] = [];
  for (let i = 0; i < len; i++) {
    const label = names[i] || `Exercice ${i + 1}`;
    items.push({
      label,
      setsReps: sets[i] || null,
      rest: rests[i] || null,
      intensity: intens[i] || null,
      heartZone: hz[i] || null,
      note: notes[i] || null,
    });
  }
  return { title: "Déroulé de la séance", items };
}

/**
 * For non-strength sessions: each exercise_notes line is a narrative step.
 * Optional inline "label — detail" or "label: detail" parsing.
 */
function parseNarrativeBlock(task: TaskWithDetails, title: string, lines: string[]): SessionBlock {
  const items: BlockItem[] = lines.map((raw) => {
    const line = raw.replace(/^[-•*]\s*/, "").trim();
    // Capture a leading duration token like "3min", "30s", "1 min"
    const durMatch = /^(\d+\s?(?:min|m|s|sec|secondes?|minutes?))\b[\s:—-]*/i.exec(line);
    if (durMatch) {
      const rest = line.slice(durMatch[0].length).trim();
      return { label: rest || durMatch[1], duration: durMatch[1] };
    }
    return { label: line };
  });
  return { title, items };
}

/**
 * Filter chips on an item based on session type so members never see irrelevant fields.
 */
export function filterItemForType(item: BlockItem, type: string): BlockItem {
  const t = type as SessionType;
  if (isStrengthLike(t)) return item; // strength: show everything
  if (t === "swimming") {
    return { ...item, rest: null, heartZone: item.heartZone };
  }
  // cardio: show duration + intensity + heart zone, hide sets/reps/rest
  if (t === "cardio") {
    return { ...item, setsReps: null, rest: null };
  }
  // wellness / breathing / mobility / recovery: hide everything strength-y
  return { ...item, setsReps: null, rest: null, intensity: null, heartZone: null };
}

function sumDurations(blocks: SessionBlock[]): string | null {
  let totalMin = 0;
  let any = false;
  for (const b of blocks) {
    for (const item of b.items) {
      const s = item.duration;
      if (!s) continue;
      const m = /(\d+(?:[.,]\d+)?)\s?(min|m|s|sec)/i.exec(s);
      if (!m) continue;
      const n = parseFloat(m[1].replace(",", "."));
      if (Number.isNaN(n)) continue;
      const unit = m[2].toLowerCase();
      totalMin += unit.startsWith("s") ? n / 60 : n;
      any = true;
    }
  }
  if (!any || totalMin <= 0) return null;
  const rounded = Math.round(totalMin);
  return `${rounded} min`;
}

export function parseSession(task: TaskWithDetails): ParsedSession {
  const type = task.type as SessionType;
  const objective = task.description?.trim() || null;
  const coachMessage = task.notes?.trim() || null;

  // 1) Headered blocks always win (future-proof format)
  const headered = parseHeaderedBlocks((task as any).exercise_notes);
  let blocks: SessionBlock[] = [];

  if (headered) {
    blocks = headered.map((b) => parseNarrativeBlock(task, b.title, b.lines));
  } else if (COMPOSITION_LIKE.has(type)) {
    const composition = parseCompositionBlock(task);
    if (composition && composition.items.length > 0) blocks = [composition];
  } else {
    // Narrative: split exercise_notes by " | " (legacy) or by newlines
    const exNotes = (task as any).exercise_notes as string | null | undefined;
    if (exNotes) {
      const lines = exNotes.includes(" | ")
        ? exNotes.split(" | ").map((s) => s.trim()).filter(Boolean)
        : exNotes.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (lines.length > 0) blocks = [parseNarrativeBlock(task, "Déroulé de la séance", lines)];
    }
  }

  // Apply type filtering on each item
  blocks = blocks.map((b) => ({
    ...b,
    items: b.items.map((i) => filterItemForType(i, type)),
  }));

  const computed = sumDurations(blocks);
  const estimatedDuration = computed || (task.duration && !COMPOSITION_LIKE.has(type) ? task.duration : null);

  // Difficulty: intensity makes sense for strength / cardio / hyrox
  const difficulty =
    type === "wellness" || type === "other"
      ? null
      : task.intensity && !task.intensity.includes(" | ")
      ? task.intensity
      : null;

  return { blocks, estimatedDuration, difficulty, objective, coachMessage };
}

export function intensityLabel(v: string | null | undefined): string | null {
  if (!v) return null;
  if (v === "light") return "Légère";
  if (v === "moderate") return "Modérée";
  if (v === "intense") return "Intense";
  if (v === "max") return "Maximum";
  return v;
}
