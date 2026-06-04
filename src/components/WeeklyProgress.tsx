import { motion } from "framer-motion";
import { ProgressRing } from "@/components/ui/progress-ring";

interface WeeklyProgressProps {
  completed: number;
  total: number;
}

export function WeeklyProgress({ completed, total }: WeeklyProgressProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 flex items-center gap-5"
    >
      <ProgressRing progress={progress} size={72} strokeWidth={6} />
      <div className="flex-1">
        <p className="font-bold text-foreground text-xs">
          {completed}<span className="text-muted-foreground font-normal text-lg">/{total}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {total - completed > 0
            ? `${total - completed} restant${total - completed > 1 ? "s" : ""}`
            : "Tout est fait! 🎉"}
        </p>
      </div>
    </motion.div>
  );
}
