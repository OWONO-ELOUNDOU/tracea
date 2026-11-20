"use client";

import { useId } from "react";
import { cardClass, cardTitleClass, type FormBinding } from "./binding";
import { DecimalField, FieldError, GroupError, SelectField } from "./fields";
import { FIELD_KEYS, type SitePreviewState } from "./form-model";
import { RECTANGLE_ACCESS_LABELS, type Option } from "./options";
import { SitePreview } from "./site-preview";
import { texts } from "./texts";

function accessOptions(sides: number | null): Option[] {
  if (sides === null) {
    return RECTANGLE_ACCESS_LABELS.map((label, index) => ({ value: String(index), label }));
  }
  return Array.from({ length: sides }, (_, index) => ({
    value: String(index),
    label: texts.side(index + 1),
  }));
}

export function SiteCard({
  binding,
  preview,
  emptyZone,
}: {
  binding: FormBinding;
  preview: SitePreviewState;
  /** Valid rectangular site whose buildable zone is empty (D28). */
  emptyZone: boolean;
}) {
  const headingId = useId();
  const setbacksHelpId = useId();
  const { values, errors, change, leave } = binding;
  const polygon = values.polygon;
  const boundaryError = errors["site.boundary"];
  const pair = "grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2";

  const decimal = (
    field: "width" | "depth" | "north" | "front" | "side" | "rear" | "slope" | "slopeDirection",
    label: string,
    extra: { help?: string; describedByIds?: string[]; error?: string } = {},
  ) => (
    <DecimalField
      fieldKey={FIELD_KEYS[field]}
      label={label}
      value={values[field]}
      help={extra.help}
      describedByIds={extra.describedByIds}
      error={extra.error ?? errors[FIELD_KEYS[field]]}
      onChange={(value) => change(field, value)}
      onBlur={() => leave(FIELD_KEYS[field])}
    />
  );

  return (
    <section aria-labelledby={headingId} className={cardClass}>
      <h2 id={headingId} className={cardTitleClass}>
        {texts.siteHeading}
      </h2>
      <SitePreview preview={preview} />
      <div className="mt-3.5 flex flex-col gap-3.5">
        {polygon === null ? (
          <div className={pair}>
            {decimal("width", texts.width, {
              error: errors[FIELD_KEYS.width] ?? boundaryError,
            })}
            {decimal("depth", texts.depth)}
          </div>
        ) : (
          <div>
            <p className="text-sm">{texts.polygonSite(polygon.points.length)}</p>
            <FieldError id={`${headingId}-boundary`} message={boundaryError} />
          </div>
        )}
        <div className={pair}>
          <SelectField
            fieldKey={FIELD_KEYS.access}
            label={texts.access}
            value={values.access}
            help={texts.accessHelp}
            options={accessOptions(polygon === null ? null : polygon.points.length)}
            error={errors[FIELD_KEYS.access]}
            onChange={(value) => change("access", value, true)}
          />
          {decimal("north", texts.north, { help: texts.northHelp })}
        </div>
        <div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-3">
            {decimal("front", texts.front, { describedByIds: [setbacksHelpId] })}
            {decimal("side", texts.sideSetback, { describedByIds: [setbacksHelpId] })}
            {decimal("rear", texts.rear, { describedByIds: [setbacksHelpId] })}
          </div>
          <p id={setbacksHelpId} className="mt-1 text-xs leading-4 text-ink/70">
            {texts.setbacksHelp}
          </p>
          <FieldError id={`${setbacksHelpId}-error`} message={errors["site.setbacks"]} />
        </div>
        {emptyZone ? (
          <div className="flex gap-2 rounded-lg border border-warn bg-surface px-3 py-2 text-xs leading-4 text-ink">
            <span aria-hidden="true" className="text-warn">
              ⚠
            </span>
            <p>{texts.emptyZone}</p>
          </div>
        ) : null}
        <div className={pair}>
          {decimal("slope", texts.slope)}
          {decimal("slopeDirection", texts.slopeDirection, { help: texts.slopeDirectionHelp })}
        </div>
      </div>
      <GroupError message={errors.site} />
    </section>
  );
}
