import { buildableZone, siteBoundaryPolygon, type Point, type ProjectSite } from "@tracea/domain";
import { useId } from "react";
import type { SitePreviewState } from "./form-model";
import { formatDimension, formatMetres, formatPlain } from "./number-input";
import { RECTANGLE_ACCESS_SIDES } from "./options";
import { texts } from "./texts";

/** Drawing area of the frame `6:231`, inside the 370 × 200 view box. */
const AREA = { x: 40, y: 20, width: 290, height: 160 };
/** Centre of the north symbol (spec § 6.5). */
export const NORTH = { x: 348, y: 34 };
/** Half-length and half-width of the needle, distance from the centre to the letter. */
const NEEDLE = { half: 11, halfWidth: 4, letter: 17 };

const NBSP = " ";

function describe(site: ProjectSite, zoneIsEmpty: boolean): string {
  const north = `Nord orienté à ${formatPlain(site.northAngle)}° dans le sens des aiguilles d'une montre depuis le haut de l'aperçu.`;
  const { boundary } = site;
  if (boundary.kind === "polygon") {
    return `Terrain défini par un contour de ${boundary.points.length} côtés. Voie d'accès sur le côté ${site.accessEdgeIndex + 1}. ${north}`;
  }
  const side = RECTANGLE_ACCESS_SIDES[site.accessEdgeIndex] ?? RECTANGLE_ACCESS_SIDES[0];
  const { front, side: lateral, rear } = site.setbacks;
  return [
    `Terrain rectangulaire de ${formatMetres(boundary.width)} m de largeur sur ${formatMetres(boundary.depth)} m de profondeur.`,
    `Voie d'accès ${side} de l'aperçu.`,
    north,
    `Reculs${NBSP}: avant ${formatMetres(front)} m, latéral ${formatMetres(lateral)} m, arrière ${formatMetres(rear)} m.`,
    zoneIsEmpty
      ? "Aucune zone constructible avec ces reculs."
      : "Zone constructible représentée en tireté.",
  ].join(" ");
}

/**
 * Site-plan north symbol (spec § 6.5, A18): a narrow diamond whose north half is filled, turned by
 * `angle` clockwise; the « N » follows the filled tip but stays upright. Decorative: the angle is
 * given by the preview's <desc>.
 */
function NorthSymbol({ angle }: { angle: number }) {
  const { x, y } = NORTH;
  const { half, halfWidth, letter } = NEEDLE;
  const radians = (angle * Math.PI) / 180;
  const tip = `${x},${y - half}`;
  const tail = `${x},${y + half}`;
  const left = `${x - halfWidth},${y}`;
  const right = `${x + halfWidth},${y}`;
  const halo = "stroke-paper";
  return (
    <g aria-hidden="true" data-north-symbol="">
      <g data-north-needle="" transform={`rotate(${angle} ${x} ${y})`}>
        <polygon
          points={`${tip} ${right} ${tail} ${left}`}
          className={`fill-none ${halo}`}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <polygon
          data-north-half=""
          points={`${tip} ${right} ${left}`}
          className="fill-ink stroke-ink"
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <polygon
          points={`${left} ${right} ${tail}`}
          className="fill-surface stroke-ink"
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <circle cx={x} cy={y} r={2} className="fill-ink" />
      </g>
      <text
        data-north-letter=""
        x={x + letter * Math.sin(radians)}
        y={y - letter * Math.cos(radians)}
        textAnchor="middle"
        dominantBaseline="central"
        paintOrder="stroke"
        strokeWidth={3}
        className={`fill-ink text-[11px] font-semibold ${halo}`}
      >
        N
      </text>
    </g>
  );
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function boundsOf(points: readonly Point[]): Box {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

/** Rough advance of an 11 px character of the interface font, to decide on a line break. */
const CHARACTER_WIDTH = 5.6;
const LINE_HEIGHT = 13;

/** Label centred in a shape; its last word goes to a second line when the shape is too narrow. */
function CentredLabel({ box, text, className }: { box: Box; text: string; className: string }) {
  const x = (box.left + box.right) / 2;
  const y = (box.top + box.bottom) / 2;
  const space = text.lastIndexOf(" ");
  const lines =
    text.length * CHARACTER_WIDTH <= box.right - box.left - 8 || space === -1
      ? [text]
      : [text.slice(0, space), text.slice(space + 1)];
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className={className}>
      {lines.map((line, index) => (
        <tspan
          key={line}
          x={x}
          dy={index === 0 ? ((1 - lines.length) * LINE_HEIGHT) / 2 : LINE_HEIGHT}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

const pointsAttribute = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

/**
 * Schematic preview of the site as entered (spec § 6.5): outline from `siteBoundaryPolygon`, zone
 * from `buildableZone`, both computed by `@tracea/domain`. Only numbers reach the drawing.
 */
export function SitePreview({ preview }: { preview: SitePreviewState }) {
  const titleId = useId();
  const descId = useId();
  const frame = "mx-auto aspect-[37/20] w-full max-w-[480px]";

  if (preview.kind !== "ready") {
    return (
      <figure className="mt-3.5">
        <div
          className={`${frame} flex items-center justify-center rounded-lg border border-dashed border-line px-6 text-center text-xs leading-4 text-ink/70`}
        >
          {preview.kind === "blank" ? texts.previewBlank : texts.previewInvalid}
        </div>
      </figure>
    );
  }

  const { site } = preview;
  const rectangle = site.boundary.kind === "rectangle";
  const outline = siteBoundaryPolygon(site);
  const zone = rectangle ? buildableZone(site) : null;
  const xs = outline.map(([x]) => x);
  const ys = outline.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  const scale = Math.min(AREA.width / width, AREA.height / height);
  const left = AREA.x + (AREA.width - width * scale) / 2;
  const bottom = AREA.y + (AREA.height + height * scale) / 2;
  const right = left + width * scale;
  const top = bottom - height * scale;
  // Input frame has Y pointing up: edge 0 of a rectangle is at the bottom of the preview.
  const toSvg = ([x, y]: Point): Point => [left + (x - minX) * scale, bottom - (y - minY) * scale];

  const parcel = outline.map(toSvg);
  const edge = site.accessEdgeIndex;
  const from = parcel[edge];
  const to = parcel[(edge + 1) % parcel.length];
  const zonePoints = zone?.map(toSvg) ?? null;

  let accessLabel: { x: number; y: number; vertical: boolean; hanging: boolean } | null = null;
  if (rectangle && from !== undefined && to !== undefined) {
    const middle: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    accessLabel =
      [
        { x: middle[0], y: middle[1] - 6, vertical: false, hanging: false },
        { x: middle[0] - 6, y: middle[1], vertical: true, hanging: false },
        { x: middle[0], y: middle[1] + 6, vertical: false, hanging: true },
        { x: middle[0] + 6, y: middle[1], vertical: true, hanging: true },
      ][edge] ?? null;
  }

  const textClass = "text-[11px]";
  const tick = (x: number, y: number) => (
    <line x1={x - 2.12} y1={y + 2.12} x2={x + 2.12} y2={y - 2.12} />
  );

  return (
    <figure className="mt-3.5">
      <svg
        viewBox="0 0 370 200"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        className={`${frame} block`}
      >
        <title id={titleId}>{texts.previewTitle}</title>
        <desc id={descId}>{describe(site, rectangle && zone === null)}</desc>
        <rect x={0} y={0} width={370} height={200} className="fill-paper" />
        <polygon
          points={pointsAttribute(parcel)}
          className="fill-surface stroke-ink"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {zonePoints === null ? null : (
          <>
            <polygon
              points={pointsAttribute(zonePoints)}
              className="fill-primary/8 stroke-primary"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <CentredLabel
              box={boundsOf(zonePoints)}
              text={texts.previewZone}
              className={`${textClass} fill-ink/70`}
            />
          </>
        )}
        {rectangle && zone === null ? (
          <CentredLabel
            box={{ left, right, top, bottom }}
            text={texts.previewNoZone}
            className={`${textClass} fill-ink`}
          />
        ) : null}
        {from !== undefined && to !== undefined ? (
          <line
            x1={from[0]}
            y1={from[1]}
            x2={to[0]}
            y2={to[1]}
            className="stroke-ink"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {accessLabel === null ? null : (
          <text
            x={accessLabel.x}
            y={accessLabel.y}
            textAnchor="middle"
            dominantBaseline={accessLabel.hanging ? "hanging" : "auto"}
            transform={
              accessLabel.vertical ? `rotate(-90 ${accessLabel.x} ${accessLabel.y})` : undefined
            }
            className={`${textClass} fill-ink/70`}
          >
            {texts.previewAccess}
          </text>
        )}
        {site.boundary.kind === "rectangle" ? (
          <g className="stroke-dim" strokeWidth={1}>
            <line x1={left} y1={bottom + 6} x2={right} y2={bottom + 6} />
            {tick(left, bottom + 6)}
            {tick(right, bottom + 6)}
            <text
              x={(left + right) / 2}
              y={bottom + 18}
              textAnchor="middle"
              stroke="none"
              className={`${textClass} fill-dim`}
            >
              {formatDimension(site.boundary.width)}
            </text>
            <text
              x={left - 6}
              y={(top + bottom) / 2}
              textAnchor="end"
              dominantBaseline="middle"
              stroke="none"
              className={`${textClass} fill-dim`}
            >
              {formatDimension(site.boundary.depth)}
            </text>
          </g>
        ) : null}
        <NorthSymbol angle={site.northAngle} />
      </svg>
      <figcaption className="mt-2 text-xs leading-4 text-ink/70">{texts.previewCaption}</figcaption>
    </figure>
  );
}
