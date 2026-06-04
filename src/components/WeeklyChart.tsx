import { motion } from "framer-motion";

interface WeekData {
  week: string;
  percentage: number;
}

interface WeeklyChartProps {
  data: WeekData[];
  title?: string;
}

export function WeeklyChart({ data, title = "Progression hebdomadaire" }: WeeklyChartProps) {
  const maxPercentage = Math.max(...data.map(d => d.percentage), 100);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      
      <div className="space-y-3">
        {data.map((week, i) => (
          <motion.div
            key={week.week}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-muted-foreground w-20 shrink-0">
              {week.week}
            </span>
            <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(week.percentage / maxPercentage) * 100}%` }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                className={`h-full rounded-full ${
                  week.percentage >= 100
                    ? "bg-emerald-500"
                    : week.percentage >= 75
                    ? "bg-primary"
                    : week.percentage >= 50
                    ? "bg-amber-500"
                    : "bg-destructive"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-foreground w-12 text-right">
              {week.percentage}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
