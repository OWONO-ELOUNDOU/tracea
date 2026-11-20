"use client";

import { DESCRIPTION_MAX_LENGTH, countCharacters } from "@tracea/domain";
import { useId, type RefObject } from "react";
import { TextField, inputClass } from "@/components/auth/fields";
import { focusRing } from "@/components/projects/styles";
import { cardClass, type FormBinding } from "./binding";
import { describedBy, FieldError } from "./fields";
import { FIELD_KEYS } from "./form-model";
import { formatCount } from "./number-input";
import { texts } from "./texts";

export function DescriptionCard({
  binding,
  textareaRef,
  examplesButtonRef,
  onOpenExamples,
}: {
  binding: FormBinding;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  examplesButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenExamples: () => void;
}) {
  const headingId = useId();
  const id = useId();
  const { values, errors, change, leave } = binding;
  const count = countCharacters(values.description);
  const over = count > DESCRIPTION_MAX_LENGTH;
  const descriptionError = errors[FIELD_KEYS.description];
  return (
    <section aria-labelledby={headingId} className={cardClass}>
      <h2 id={headingId} className="sr-only">
        {texts.descriptionHeading}
      </h2>
      <div className="[&>div]:mb-0">
        <TextField
          label={texts.nameLabel}
          type="text"
          autoComplete="off"
          data-field={FIELD_KEYS.name}
          value={values.name}
          error={errors[FIELD_KEYS.name]}
          onChange={(event) => change("name", event.target.value)}
          onBlur={() => leave(FIELD_KEYS.name)}
        />
      </div>
      <div className="mt-5">
        <label htmlFor={id} className="block text-sm font-medium leading-[18px]">
          {texts.descriptionLabel}
        </label>
        {/* No `maxLength`: it would count UTF-16 units, not characters (A9). */}
        <textarea
          ref={textareaRef}
          id={id}
          data-field={FIELD_KEYS.description}
          value={values.description}
          aria-invalid={descriptionError === undefined ? undefined : true}
          aria-describedby={describedBy(
            `${id}-counter`,
            descriptionError !== undefined && `${id}-error`,
          )}
          onChange={(event) => change("description", event.target.value)}
          onBlur={() => leave(FIELD_KEYS.description)}
          className={`${inputClass} mt-1.5 block h-[132px] min-h-[132px] resize-y py-3 text-sm leading-[22px]`}
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4">
          <p
            id={`${id}-counter`}
            className={`text-xs leading-4 ${over ? "text-danger" : "text-ink/70"}`}
          >
            {over ? <span aria-hidden="true">⚠ </span> : null}
            {texts.counter(formatCount(count), formatCount(DESCRIPTION_MAX_LENGTH))}
          </p>
          <button
            ref={examplesButtonRef}
            type="button"
            onClick={onOpenExamples}
            className={`min-h-6 rounded px-1 py-1 text-xs leading-4 text-primary underline ${focusRing}`}
          >
            {texts.examplesLink}
          </button>
        </div>
        <FieldError id={`${id}-error`} message={descriptionError} />
      </div>
    </section>
  );
}
