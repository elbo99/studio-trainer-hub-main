import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "w-8 h-8 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

export function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const base = "rounded-full overflow-hidden shrink-0 flex items-center justify-center";

  if (avatarUrl) {
    return (
      <div className={cn(base, sizeMap[size], className)}>
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn(base, "bg-primary/15", sizeMap[size], className)}>
      <span className="font-bold text-primary">{initial}</span>
    </div>
  );
}
