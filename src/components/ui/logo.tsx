import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type LogoProps = {
  href?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const markSizes = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

const wordmarkSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
} as const;

function Mark({ size }: { size: keyof typeof markSizes }) {
  return (
    <span
      className={cn(
        "inline-flex items-end justify-center gap-0.5 rounded-xl bg-primary p-1.5 text-primary-foreground shadow-sm",
        markSizes[size],
      )}
      aria-hidden="true"
    >
      <span className="h-[40%] w-1 rounded-sm bg-white/80" />
      <span className="h-[65%] w-1 rounded-sm bg-white/90" />
      <span className="h-[90%] w-1 rounded-sm bg-white" />
    </span>
  );
}

export function Logo({
  href = "/",
  showWordmark = true,
  size = "md",
  className,
}: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} />
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            wordmarkSizes[size],
          )}
        >
          SamaGestion
        </span>
      ) : null}
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {content}
    </Link>
  );
}
