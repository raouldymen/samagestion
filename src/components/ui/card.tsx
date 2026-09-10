import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-base font-semibold text-foreground", className)} {...props}>
      {children}
    </h2>
  );
}
