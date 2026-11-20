"use client";

import { useId } from "react";
import { secondaryButton, focusRing } from "@/components/projects/styles";
import type { FormBinding } from "./binding";
import { DecimalField, FieldError, SelectField } from "./fields";
import { roomKey } from "./form-model";
import { roomTypeLabel, roomTypeOptions } from "./options";
import { texts } from "./texts";

/**
 * Editable rooms table (spec § 6.3): native controls in reading order, no ARIA grid, so the arrow
 * keys keep their usual meaning inside lists and fields.
 */
export function RoomsTable({ binding }: { binding: FormBinding }) {
  const id = useId();
  const { values, errors, changeRoom, leave, addRoom, deleteRoom } = binding;
  const listError = errors["parameters.rooms"];
  const rows = values.rooms;

  return (
    <div className="mt-5">
      {rows.length === 0 ? (
        <>
          <p className="text-sm font-medium leading-[18px]">{texts.rooms}</p>
          <p className="mt-2 text-sm text-ink/70">{texts.noRooms}</p>
        </>
      ) : (
        <div className="relative overflow-x-auto">
          <table
            className="w-full min-w-[420px] border-separate border-spacing-x-0 border-spacing-y-2"
            aria-describedby={listError === undefined ? undefined : `${id}-error`}
          >
            <caption className="text-left text-sm font-medium leading-[18px]">
              {texts.rooms}
            </caption>
            <thead>
              <tr className="text-left text-xs leading-4 text-ink/70">
                <th scope="col" className="px-1 pt-2 font-normal">
                  {texts.roomType}
                </th>
                <th scope="col" className="w-[122px] pl-3 pr-1 pt-2 font-normal">
                  {texts.roomCount}
                </th>
                <th scope="col" className="w-[162px] pl-3 pr-1 pt-2 font-normal">
                  {texts.roomMinArea}
                </th>
                <th scope="col" className="w-11 pl-3 pt-2">
                  <span className="sr-only">{texts.deleteColumn}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const number = index + 1;
                const typeKey = roomKey(index, "type");
                const countKey = roomKey(index, "count");
                const areaKey = roomKey(index, "minArea");
                return (
                  <tr key={row.key} className="align-top">
                    <td>
                      <SelectField
                        fieldKey={typeKey}
                        ariaLabel={texts.cellLabel(texts.roomType, number)}
                        value={row.type}
                        emptyLabel={texts.chooseType}
                        options={roomTypeOptions}
                        error={errors[typeKey]}
                        onChange={(value) => changeRoom(index, "type", value, true)}
                      />
                    </td>
                    <td className="pl-3">
                      <DecimalField
                        fieldKey={countKey}
                        ariaLabel={texts.cellLabel(texts.roomCount, number)}
                        value={row.count}
                        error={errors[countKey]}
                        onChange={(value) => changeRoom(index, "count", value)}
                        onBlur={() => leave(countKey)}
                      />
                    </td>
                    <td className="pl-3">
                      <DecimalField
                        fieldKey={areaKey}
                        ariaLabel={texts.cellLabel(texts.roomMinArea, number)}
                        value={row.minArea}
                        placeholder="—"
                        error={errors[areaKey]}
                        onChange={(value) => changeRoom(index, "minArea", value)}
                        onBlur={() => leave(areaKey)}
                      />
                    </td>
                    <td className="pl-3">
                      <button
                        type="button"
                        data-delete-row={index}
                        aria-label={texts.deleteRow(number, roomTypeLabel(row.type))}
                        onClick={() => deleteRoom(index)}
                        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-ink hover:bg-paper ${focusRing}`}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <FieldError id={`${id}-error`} message={listError} />
      <button
        type="button"
        data-add-room=""
        onClick={addRoom}
        className={`${secondaryButton} mt-2 gap-2`}
      >
        <span aria-hidden="true">+</span>
        {texts.addRoom}
      </button>
    </div>
  );
}
