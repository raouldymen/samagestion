"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DateInputProps = {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  showToday?: boolean;
} & Omit<React.ComponentProps<"input">, "id" | "type">;

function todayInDakar() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dakar" }).format(new Date());
}

export function DateInput({
  label,
  id,
  error,
  hint,
  hideLabel = false,
  showToday = false,
  className,
  max,
  ...props
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  function selectToday() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const value = todayInDakar();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-foreground"}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <CalendarDays
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={id}
            type="date"
            lang="fr-SN"
            max={max ?? todayInDakar()}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hintId}
            className={cn(
              "h-12 w-full rounded-lg border bg-card py-0 pr-3 pl-10 text-base text-foreground shadow-sm",
              "[color-scheme:light]",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              error ? "border-danger" : "border-border hover:border-slate-300",
              className,
            )}
            {...props}
          />
        </div>
        {showToday ? (
          <button
            type="button"
            onClick={selectToday}
            className="h-12 shrink-0 rounded-lg border border-border bg-card px-3 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Aujourd&apos;hui
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {!error && hint ? <p id={hintId} className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
