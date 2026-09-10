import { cn } from "@/lib/utils/cn";

type SelectProps = {
  label: string;
  id: string;
  error?: string;
} & Omit<React.ComponentProps<"select">, "id">;

export function Select({
  label,
  id,
  error,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-12 w-full rounded-lg border bg-card px-3.5 text-base text-foreground shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          error ? "border-danger" : "border-border hover:border-slate-300",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
