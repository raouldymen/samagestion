import { cn } from "@/lib/utils/cn";

type TextareaProps = {
  label: string;
  id: string;
  error?: string;
} & Omit<React.ComponentProps<"textarea">, "id">;

export function Textarea({
  label,
  id,
  error,
  className,
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "min-h-28 w-full rounded-lg border bg-card px-3.5 py-3 text-base text-foreground shadow-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          error ? "border-danger" : "border-border hover:border-slate-300",
          className,
        )}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
