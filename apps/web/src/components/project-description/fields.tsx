"use client";

import { useId, type ReactNode } from "react";
import { inputClass } from "@/components/auth/fields";
import { focusRing } from "@/components/projects/styles";
import type { Option } from "./options";

/** Error under a control; its id is referenced by the control's `aria-describedby`. */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p id={id} className="mt-1 text-xs leading-4 text-danger">
      {message}
    </p>
  );
}

export function describedBy(...ids: (string | false | undefined | null)[]): string | undefined {
  const value = ids.filter(Boolean).join(" ");
  return value === "" ? undefined : value;
}

interface CommonProps {
  /** Contract key of the field, e.g. `parameters.targetHabitableArea`. */
  fieldKey: string;
  value: string;
  error?: string;
  help?: string;
  /** Extra description ids (shared help text). */
  describedByIds?: string[];
  onBlur?: () => void;
  className?: string;
}

interface LabelProps {
  /** Visible label; when absent, `ariaLabel` names the control (table cells). */
  label?: string;
  ariaLabel?: string;
}

function Shell({
  id,
  label,
  help,
  error,
  className,
  children,
}: {
  id: string;
  label?: string;
  help?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      {label === undefined ? null : (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium leading-[18px]">
          {label}
        </label>
      )}
      {children}
      {help === undefined ? null : (
        <p id={`${id}-help`} className="mt-1 text-xs leading-4 text-ink/70">
          {help}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Number typed in the unit of the screen (spec § 5.3): never `type="number"`. */
export function DecimalField({
  fieldKey,
  label,
  ariaLabel,
  value,
  error,
  help,
  describedByIds = [],
  onChange,
  onBlur,
  className,
  placeholder,
}: CommonProps &
  LabelProps & {
    onChange: (value: string) => void;
    placeholder?: string;
  }) {
  const id = useId();
  return (
    <Shell id={id} label={label} help={help} error={error} className={className}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        data-field={fieldKey}
        aria-label={ariaLabel}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(
          help !== undefined && `${id}-help`,
          ...describedByIds,
          error !== undefined && `${id}-error`,
        )}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`${inputClass} placeholder:text-ink/70`}
      />
    </Shell>
  );
}

/** Native list with label, help and error, styled as `TextField`. */
export function SelectField({
  fieldKey,
  label,
  ariaLabel,
  value,
  error,
  help,
  describedByIds = [],
  options,
  emptyLabel,
  onChange,
  onBlur,
  className,
}: CommonProps &
  LabelProps & {
    options: Option[];
    /** First option, with an empty value; absent when the list always has a value. */
    emptyLabel?: string;
    onChange: (value: string) => void;
  }) {
  const id = useId();
  return (
    <Shell id={id} label={label} help={help} error={error} className={className}>
      <select
        id={id}
        data-field={fieldKey}
        aria-label={ariaLabel}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(
          help !== undefined && `${id}-help`,
          ...describedByIds,
          error !== undefined && `${id}-error`,
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={inputClass}
      >
        {emptyLabel === undefined ? null : <option value="">{emptyLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

/**
 * Single-choice chips that can be cleared (spec § 6.2): toggle buttons rather than radios, since
 * activating the active chip goes back to « not specified ».
 */
export function ChipGroup({
  fieldKey,
  label,
  value,
  options,
  error,
  onChange,
  className,
}: {
  fieldKey: string;
  label: string;
  value: string;
  options: Option[];
  error?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium leading-[18px]">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error === undefined ? undefined : `${id}-error`}
        data-field={fieldKey}
        className="flex h-10 items-center gap-2"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? "" : option.value)}
              className={`inline-flex h-7 items-center rounded-lg px-3 text-sm ${focusRing} ${
                active
                  ? "bg-primary text-white"
                  : "border border-line bg-surface text-ink hover:bg-paper"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error === undefined ? null : (
        <p
          id={`${id}-error`}
          data-group-error=""
          tabIndex={-1}
          className="mt-1 text-xs leading-4 text-danger outline-none"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Error of a group or of a path without a field of its own, at the bottom of its card. */
export function GroupError({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p
      data-group-error=""
      tabIndex={-1}
      className="mt-4 text-xs leading-4 text-danger outline-none"
    >
      {message}
    </p>
  );
}
