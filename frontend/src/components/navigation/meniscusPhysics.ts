/**
 * Meniscus Liquid Navigation — Physics & SVG Geometry Solver
 * Based on https://github.com/hasib41/meniscus-liquid-nav
 */

export interface MeniscusGeometry {
  W: number;
  H: number;
  R: number;
  D: number;
  RB: number;
  S: number;
  CY: number;
  slots: number[];
  span: number;
}

export interface SharedNavMemory {
  x: number | null;
  v: number;
  role: string | null;
}

export const sharedNavMemory: SharedNavMemory = {
  x: null,
  v: 0,
  role: null,
};

export const clamp = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;

export const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Half-width of a trough built from a shoulder of radius s tangent to the
 * top edge and a bowl of radius rb centred at (·, by).
 * Solved from external-tangency condition |C1C2| = s + rb.
 */
export const reach = (s: number, rb: number, by: number): number =>
  Math.sqrt(Math.max((s + rb) ** 2 - (s - by) ** 2, 1));

/**
 * Calculates shoulder center and tangent contact point with the bowl
 */
export const wing = (
  bx: number,
  by: number,
  rb: number,
  s: number,
  side: -1 | 1
) => {
  const L = s + rb;
  const half = reach(s, rb, by);
  const sx = bx + side * half;
  return {
    sx,
    s,
    tx: sx + ((bx - sx) / L) * s,
    ty: s + ((by - s) / L) * s,
  };
};

/**
 * Generates the single continuous SVG path for the liquid navigation plate.
 * The top edge features an organic concave socket constructed from three tangent arcs.
 */
export function solveTrough(
  W: number,
  H: number,
  R: number,
  bx: number,
  by: number,
  rb: number,
  sL: number,
  sR: number
): string {
  if (W <= 0 || H <= 0) return '';

  const A = wing(bx, by, rb, sL, -1);
  const B = wing(bx, by, rb, sR, 1);

  // The bowl runs from A's tangent point to B's the short way under the bead
  const a0 = Math.atan2(A.ty - by, A.tx - bx);
  const a1 = Math.atan2(B.ty - by, B.tx - bx);
  let sweep = ((a0 - a1) * 180) / Math.PI;
  while (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;

  const n = (v: number) => Number(v.toFixed(2));

  return (
    `M 0 ${n(R)} ` +
    `A ${n(R)} ${n(R)} 0 0 1 ${n(R)} 0 ` +
    `L ${n(clamp(A.sx, R, W - R))} 0 ` +
    `A ${n(sL)} ${n(sL)} 0 0 1 ${n(A.tx)} ${n(A.ty)} ` +
    `A ${n(rb)} ${n(rb)} 0 ${large} 0 ${n(B.tx)} ${n(B.ty)} ` +
    `A ${n(sR)} ${n(sR)} 0 0 1 ${n(clamp(B.sx, R, W - R))} 0 ` +
    `L ${n(W - R)} 0 ` +
    `A ${n(R)} ${n(R)} 0 0 1 ${n(W)} ${n(R)} ` +
    `L ${n(W)} ${n(H - R)} ` +
    `A ${n(R)} ${n(R)} 0 0 1 ${n(W - R)} ${n(H)} ` +
    `L ${n(R)} ${n(H)} ` +
    `A ${n(R)} ${n(R)} 0 0 1 0 ${n(H - R)} ` +
    `Z`
  );
}

/**
 * Spring physics substep simulation for smooth, non-snapping trajectory
 */
export function stepSpring(
  x: number,
  v: number,
  target: number,
  K: number,
  C: number,
  dt: number
): { x: number; v: number } {
  let step = dt;
  let curX = x;
  let curV = v;

  while (step > 0) {
    const h = Math.min(step, 1 / 240);
    curV += (-K * (curX - target) - C * curV) * h;
    curX += curV * h;
    step -= h;
  }

  return { x: curX, v: curV };
}
