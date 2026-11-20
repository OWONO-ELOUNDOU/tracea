import type { FormValues, RoomCell, ScalarField } from "./form-model";

/** What a card needs from the screen: values, displayed errors and change handlers. */
export interface FormBinding {
  values: FormValues;
  /** Displayed error by field key (API errors first, then revealed local errors). */
  errors: Record<string, string>;
  /** `commit`: lists and chips, validated and saved at once (spec § 8.1, § 9.1). */
  change: (field: ScalarField, value: string, commit?: boolean) => void;
  /** A text field was left. */
  leave: (key: string) => void;
  changeRoom: (index: number, cell: RoomCell, value: string, commit?: boolean) => void;
  addRoom: () => void;
  deleteRoom: (index: number) => void;
}

export const cardClass = "min-w-0 rounded-xl border border-line bg-surface p-6";
export const cardTitleClass = "text-base font-semibold leading-6";
