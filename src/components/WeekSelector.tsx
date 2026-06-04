import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekSelectorProps {
  weekStart: string;
  onChange: (weekStart: string) => void;
  allowFuture?: boolean;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("fr-FR", opts)} — ${end.toLocaleDateString("fr-FR", opts)}`;
}

function shiftWeek(weekStart: string, direction: -1 | 1): string {
  const date = new Date(weekStart + "T00:00:00");
  date.setDate(date.getDate() + direction * 7);
  return toLocalDateString(date);
}

export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return toLocalDateString(monday);
}

function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getCurrentWeekStart();
}

export function WeekSelector({ weekStart, onChange, allowFuture = false }: WeekSelectorProps) {
  const current = isCurrentWeek(weekStart);
  const disableForward = !allowFuture && current;
  return (
    <div className="flex items-center justify-between bg-card rounded-2xl px-2 py-1.5">
      <button
        onClick={() => onChange(shiftWeek(weekStart, -1))}
        className="p-2 rounded-xl active:bg-secondary transition-colors text-muted-foreground active:scale-90 transition-transform"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => onChange(getCurrentWeekStart())}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl active:bg-secondary transition-colors"
      >
        <span className="text-sm font-medium text-foreground">
          {getWeekLabel(weekStart)}
        </span>
        {current && (
          <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-md font-medium">
            Actuelle
          </span>
        )}
      </button>

      <button
        onClick={() => onChange(shiftWeek(weekStart, 1))}
        disabled={disableForward}
        className="p-2 rounded-xl active:bg-secondary transition-colors text-muted-foreground disabled:opacity-30 active:scale-90 transition-transform"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
