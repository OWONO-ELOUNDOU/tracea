import { formatRelativeDate } from "./format";

export function RelativeDate({
  iso,
  now,
  prefix,
}: {
  iso: string;
  now: Date;
  /** Text before the date, e.g. « Modifié ». */
  prefix: string;
}) {
  return (
    <time dateTime={iso} className="text-xs leading-4 text-ink/70">
      {prefix} {formatRelativeDate(iso, now)}
    </time>
  );
}
