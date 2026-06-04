 import { cn } from "@/lib/utils";
 
 interface ProgressRingProps {
   progress: number;
   size?: number;
   strokeWidth?: number;
   className?: string;
 }
 
 export function ProgressRing({ 
   progress, 
   size = 120, 
   strokeWidth = 8,
   className 
 }: ProgressRingProps) {
   const radius = (size - strokeWidth) / 2;
   const circumference = radius * 2 * Math.PI;
   const offset = circumference - (progress / 100) * circumference;
 
   return (
     <div className={cn("relative", className)} style={{ width: size, height: size }}>
       <svg className="transform -rotate-90" width={size} height={size}>
         <circle
           className="text-muted"
           strokeWidth={strokeWidth}
           stroke="currentColor"
           fill="transparent"
           r={radius}
           cx={size / 2}
           cy={size / 2}
         />
         <circle
           className="text-primary transition-all duration-500 ease-out"
           strokeWidth={strokeWidth}
           strokeDasharray={circumference}
           strokeDashoffset={offset}
           strokeLinecap="round"
           stroke="currentColor"
           fill="transparent"
           r={radius}
           cx={size / 2}
           cy={size / 2}
         />
       </svg>
       <div className="absolute inset-0 flex items-center justify-center">
         <span className="font-bold text-foreground text-xs">{Math.round(progress)}%</span>
       </div>
     </div>
   );
 }