"use client";

import { useId } from "react";
import { cardClass, cardTitleClass, type FormBinding } from "./binding";
import { ChipGroup, DecimalField, GroupError, SelectField } from "./fields";
import { FIELD_KEYS } from "./form-model";
import {
  buildingTypeOptions,
  coveringOptions,
  garageOptions,
  levelOptions,
  orientationOptions,
  roofOptions,
} from "./options";
import { RoomsTable } from "./rooms-table";
import { texts } from "./texts";

const row = "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3";

export function ParametersCard({ binding }: { binding: FormBinding }) {
  const headingId = useId();
  const { values, errors, change, leave } = binding;
  const hasCovering = values.roof !== "";
  const hasGarageArea = values.garage !== "" && values.garage !== "none";
  return (
    <section aria-labelledby={headingId} className={cardClass}>
      <h2 id={headingId} className={cardTitleClass}>
        {texts.parametersHeading}
      </h2>
      <p className="mt-1 text-xs leading-4 text-ink/70">{texts.parametersHelp}</p>
      <div className={`mt-5 ${row}`}>
        <SelectField
          fieldKey={FIELD_KEYS.buildingType}
          label={texts.buildingType}
          value={values.buildingType}
          emptyLabel={texts.fromDescription}
          options={buildingTypeOptions}
          error={errors[FIELD_KEYS.buildingType]}
          onChange={(value) => change("buildingType", value, true)}
        />
        <ChipGroup
          fieldKey={FIELD_KEYS.levels}
          label={texts.levels}
          value={values.levels}
          options={levelOptions}
          error={errors[FIELD_KEYS.levels]}
          onChange={(value) => change("levels", value, true)}
        />
        <DecimalField
          fieldKey={FIELD_KEYS.targetArea}
          label={texts.targetArea}
          value={values.targetArea}
          error={errors[FIELD_KEYS.targetArea]}
          onChange={(value) => change("targetArea", value)}
          onBlur={() => leave(FIELD_KEYS.targetArea)}
        />
      </div>
      <div className={`mt-5 ${row}`}>
        <SelectField
          fieldKey={FIELD_KEYS.roof}
          label={texts.roof}
          value={values.roof}
          emptyLabel={texts.fromDescription}
          options={roofOptions}
          error={errors[FIELD_KEYS.roof]}
          onChange={(value) => change("roof", value, true)}
        />
        <SelectField
          fieldKey={FIELD_KEYS.garage}
          label={texts.garage}
          value={values.garage}
          emptyLabel={texts.fromDescription}
          options={garageOptions}
          error={errors[FIELD_KEYS.garage]}
          onChange={(value) => change("garage", value, true)}
        />
        <SelectField
          fieldKey={FIELD_KEYS.orientation}
          label={texts.livingOrientation}
          value={values.orientation}
          emptyLabel={texts.fromDescription}
          options={orientationOptions}
          error={errors[FIELD_KEYS.orientation]}
          onChange={(value) => change("orientation", value, true)}
        />
      </div>
      {hasCovering || hasGarageArea ? (
        <div className={`mt-5 ${row}`}>
          {hasCovering ? (
            <SelectField
              fieldKey={FIELD_KEYS.covering}
              label={texts.covering}
              value={values.covering}
              emptyLabel={texts.coveringUnspecified}
              options={coveringOptions}
              error={errors[FIELD_KEYS.covering]}
              onChange={(value) => change("covering", value, true)}
              className="sm:col-start-1"
            />
          ) : null}
          {hasGarageArea ? (
            <DecimalField
              fieldKey={FIELD_KEYS.garageArea}
              label={texts.garageArea}
              value={values.garageArea}
              error={errors[FIELD_KEYS.garageArea]}
              onChange={(value) => change("garageArea", value)}
              onBlur={() => leave(FIELD_KEYS.garageArea)}
              className="sm:col-start-2"
            />
          ) : null}
        </div>
      ) : null}
      <RoomsTable binding={binding} />
      <GroupError message={errors.parameters} />
    </section>
  );
}
