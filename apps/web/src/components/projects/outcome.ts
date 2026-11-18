/** What the screen tells a dialog once its call has settled. */
export type ActionOutcome =
  /** The screen has handled the result and closed the dialog. */
  | { kind: "done" }
  /** Refusal attached to the name field (`fields.name` of a 422). */
  | { kind: "fieldError"; message: string }
  /** Any other failure, shown at the top of the dialog. */
  | { kind: "formError"; message: string };
