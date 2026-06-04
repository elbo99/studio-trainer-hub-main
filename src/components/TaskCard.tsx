 import { motion } from "framer-motion";
 import { Check, Dumbbell, Waves, Heart, Sparkles, MoreHorizontal } from "lucide-react";
 import { cn } from "@/lib/utils";
 import type { Task } from "@/types";
 
 const taskIcons = {
   swimming: Waves,
   cardio: Heart,
   strength: Dumbbell,
   wellness: Sparkles,
   other: MoreHorizontal,
 };
 
 interface TaskCardProps {
   task: Task;
   onToggle: (id: string) => void;
   delay?: number;
 }
 
 export function TaskCard({ task, onToggle, delay = 0 }: TaskCardProps) {
   const Icon = taskIcons[task.type];
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: delay * 0.1, duration: 0.3 }}
       className={cn(
         "relative overflow-hidden rounded-2xl p-4 transition-all duration-300",
         "bg-card border border-border",
         task.isCompleted && "opacity-60"
       )}
     >
       <div className="flex items-center gap-4">
         <button
           onClick={() => onToggle(task.id)}
           className={cn(
             "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
             task.isCompleted
               ? "bg-success text-success-foreground"
               : "bg-secondary text-primary hover:bg-primary/20"
           )}
         >
           {task.isCompleted ? (
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ type: "spring", stiffness: 500, damping: 30 }}
             >
               <Check className="h-6 w-6" />
             </motion.div>
           ) : (
             <Icon className="h-6 w-6" />
           )}
         </button>
         
         <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold text-foreground break-words",
              task.isCompleted && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground break-words">{task.description}</p>
            )}
         </div>
 
         {task.notes && (
           <div className="shrink-0 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
             Note
           </div>
         )}
       </div>
     </motion.div>
   );
 }