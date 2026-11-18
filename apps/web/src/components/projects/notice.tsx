import { secondaryButton } from "./styles";

export interface NoticeMessage {
  kind: "status" | "alert";
  text: string;
  /** Changes on every new message so that a repeated text is announced again. */
  key: number;
}

/**
 * Page message area (§ 9.4). Both live regions stay in the DOM, empty when there is nothing to say,
 * so that inserted text is announced.
 */
export function Notice({
  message,
  onClose,
}: {
  message: NoticeMessage | null;
  onClose: () => void;
}) {
  const isAlert = message?.kind === "alert";
  const box =
    message === null
      ? ""
      : `mt-6 flex items-start gap-3 rounded-lg border bg-surface px-4 py-2 text-sm ${
          isAlert ? "border-danger/40 text-danger" : "border-ok/40 text-ink"
        }`;
  return (
    <div className={box}>
      {message === null ? null : (
        <span aria-hidden="true" className={`py-2 ${isAlert ? "text-danger" : "text-ok"}`}>
          {isAlert ? "⚠" : "✓"}
        </span>
      )}
      <div role="status" className={message?.kind === "status" ? "flex-1 py-2" : undefined}>
        {message?.kind === "status" ? <span key={message.key}>{message.text}</span> : null}
      </div>
      <div role="alert" className={isAlert ? "flex-1 py-2" : undefined}>
        {isAlert ? <span key={message.key}>{message.text}</span> : null}
      </div>
      {message === null ? null : (
        <button
          type="button"
          aria-label="Fermer le message"
          onClick={onClose}
          className={`${secondaryButton} shrink-0`}
        >
          Fermer
        </button>
      )}
    </div>
  );
}
