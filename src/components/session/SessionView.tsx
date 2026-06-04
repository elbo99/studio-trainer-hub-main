import { motion } from "framer-motion";
import { Timer, Flame, MessageCircle, Repeat, Heart, Dumbbell } from "lucide-react";
import type { TaskWithDetails } from "@/services/tasksService";
import { parseSession, intensityLabel } from "@/lib/sessionBlocks";

interface SessionViewProps {
  task: TaskWithDetails;
}

const intensityClasses = (v: string | null) =>
  v === "max"
    ? "text-destructive bg-destructive/10 border-destructive/20"
    : v === "intense"
    ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
    : v === "moderate"
    ? "text-primary bg-primary/10 border-primary/20"
    : "text-muted-foreground bg-secondary border-border";

function Chip({
  children,
  tone = "default",
  icon,
}: {
  children: React.ReactNode;
  tone?: "default" | "primary" | "warning" | "muted";
  icon?: React.ReactNode;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 text-primary border-primary/20"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : tone === "muted"
      ? "bg-secondary text-muted-foreground border-border"
      : "bg-card text-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cls}`}>
      {icon}
      {children}
    </span>
  );
}

export function SessionView({ task }: SessionViewProps) {
  const session = parseSession(task);

  return (
    <div className="space-y-4">
      {/* ====== HEADER ====== */}
      {(session.objective || session.estimatedDuration || session.difficulty) && (
        <div className="space-y-2.5">
          {session.objective && (
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
                🎯 Objectif de la séance
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{session.objective}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {session.estimatedDuration && (
              <Chip tone="primary" icon={<Timer className="w-3.5 h-3.5" />}>
                {session.estimatedDuration}
              </Chip>
            )}
            {session.difficulty && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${intensityClasses(
                  session.difficulty
                )}`}
              >
                <Flame className="w-3.5 h-3.5" />
                {intensityLabel(session.difficulty)}
              </span>
            )}
            {task.frequency > 1 && task.recurrence === "weekly" && (
              <Chip tone="muted" icon={<Repeat className="w-3.5 h-3.5" />}>
                {task.frequency}× / semaine
              </Chip>
            )}
          </div>
        </div>
      )}

      {/* ====== COACH MESSAGE ====== */}
      {session.coachMessage && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-2xl p-3.5"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70 mb-1">
                Mot de ton coach
              </p>
              <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">
                {session.coachMessage}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====== BLOCKS ====== */}
      {session.blocks.length > 0 && (
        <div className="space-y-3">
          {session.blocks.map((block, bIdx) => (
            <motion.div
              key={bIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: bIdx * 0.04 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/40 border-b border-border">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                  {bIdx + 1}
                </span>
                <h4 className="text-sm font-semibold text-foreground break-words">{block.title}</h4>
              </div>
              <ul className="divide-y divide-border/60">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="px-3.5 py-3 space-y-1.5">
                    <p className="text-sm text-foreground leading-snug break-words font-medium">
                      {item.label}
                    </p>
                    {(item.duration || item.setsReps || item.rest || item.intensity || item.heartZone) && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.duration && (
                          <Chip tone="primary" icon={<Timer className="w-3 h-3" />}>
                            {item.duration}
                          </Chip>
                        )}
                        {item.setsReps && (
                          <Chip tone="default" icon={<Dumbbell className="w-3 h-3" />}>
                            {item.setsReps}
                          </Chip>
                        )}
                        {item.rest && <Chip tone="muted">💤 {item.rest}</Chip>}
                        {item.intensity && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${intensityClasses(
                              item.intensity
                            )}`}
                          >
                            🔥 {intensityLabel(item.intensity)}
                          </span>
                        )}
                        {item.heartZone && (
                          <Chip tone="warning" icon={<Heart className="w-3 h-3" />}>
                            {item.heartZone}
                          </Chip>
                        )}
                      </div>
                    )}
                    {item.note && (
                      <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {item.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
