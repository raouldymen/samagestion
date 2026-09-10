import { cn } from "@/lib/utils/cn";

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

type AvatarProps = {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary",
        sizes[size],
        className,
      )}
      aria-label={`Profil de ${name}`}
    >
      {getInitials(name)}
    </span>
  );
}
