import { cn } from "@/lib/utils";

interface RollingNumberProps {
  value: number;
  className?: string;
  durationMs?: number;
}

function RollingDigit({ digit, durationMs }: { digit: number; durationMs: number }) {
  return (
    <span
      className="relative inline-block overflow-hidden align-baseline"
      style={{ height: "1em", lineHeight: 1 }}
    >
      <span className="invisible" aria-hidden="true">
        0
      </span>
      <span
        className="absolute left-0 top-0 flex flex-col"
        style={{
          transform: `translateY(-${digit}em)`,
          transition: `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span
            key={d}
            className="flex items-center justify-center"
            style={{ height: "1em", lineHeight: 1 }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Odometer / scoreboard-style number: each digit rolls vertically when it
 * changes, like a tennis scoreboard. Digit size follows the font-size of the
 * element (uses em units), so style it via `className`.
 */
export function RollingNumber({ value, className, durationMs = 700 }: RollingNumberProps) {
  const str = Math.max(0, Math.floor(value || 0)).toLocaleString("en-US");
  return (
    <span
      dir="ltr"
      aria-label={str}
      className={cn("inline-flex items-center tabular-nums leading-none", className)}
    >
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <RollingDigit key={i} digit={Number(ch)} durationMs={durationMs} />
        ) : (
          <span key={i} className="inline-block">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
