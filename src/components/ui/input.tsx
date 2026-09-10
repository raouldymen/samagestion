import { cn } from "@/lib/utils/cn";

type InputProps = {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
} & Omit<React.ComponentProps<"input">, "id">;

export function Input({
  label,
  id,
  error,
  hint,
  hideLabel = false,
  className,
  ...props
}: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "text-sm font-medium text-foreground"}
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hintId}
        className={cn(
          "h-12 w-full rounded-lg border bg-card px-3.5 text-base text-foreground shadow-sm",
          "placeholder:text-muted-foreground",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          error ? "border-danger" : "border-border hover:border-slate-300",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
