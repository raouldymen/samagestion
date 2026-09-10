import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-muted-foreground",
} as const;

type BadgeProps = {
  variant?: keyof typeof variants;
} & React.ComponentProps<"span">;

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
