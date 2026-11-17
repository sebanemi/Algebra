import { add, subtract, multiply, dot, cross, det, norm, inv, transpose, lusolve, eigs, trace } from 'mathjs';
import type { Vector3Tuple } from '../types/curriculum';

/**
 * Redondea un número para mostrar en UI evitando errores de punto flotante (-0.00 -> 0)
 */
export function formatNum(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '—';
  const cleaned = Math.abs(val) < 1e-9 ? 0 : val;
  return Number(cleaned.toFixed(decimals)).toString();
}

/**
 * Formatea una tupla vectorial como (x, y) en R2 o (x, y, z) en R3
 */
export function formatVector(v: Vector3Tuple, isR2 = false, decimals = 2): string {
  if (isR2) {
    return `(${formatNum(v[0], decimals)}, ${formatNum(v[1], decimals)})`;
  }
  return `(${formatNum(v[0], decimals)}, ${formatNum(v[1], decimals)}, ${formatNum(v[2], decimals)})`;
}

/**
 * Calcula la norma euclidiana ||v|| usando mathjs
 */
export function vectorNorm(v: Vector3Tuple): number {
  return Number(norm(v));
}

/**
 * Suma dos vectores u + v usando mathjs
 */
export function vectorAdd(u: Vector3Tuple, v: Vector3Tuple): Vector3Tuple {
  const res = add(u, v) as number[];
  return [res[0], res[1], res[2]];
}

/**
 * Resta dos vectores u - v usando mathjs
 */
export function vectorSubtract(u: Vector3Tuple, v: Vector3Tuple): Vector3Tuple {
  const res = subtract(u, v) as number[];
  return [res[0], res[1], res[2]];
}

/**
 * Multiplica un vector por un escalar k * u usando mathjs
 */
export function vectorScale(u: Vector3Tuple, k: number): Vector3Tuple {
  const res = multiply(u, k) as number[];
  return [res[0], res[1], res[2]];
}

/**
 * Producto escalar (dot product) u · v usando mathjs
 */
export function vectorDot(u: Vector3Tuple, v: Vector3Tuple): number {
  return Number(dot(u, v));
}

/**
 * Ángulo entre dos vectores en radianes y grados, usando mathjs dot y norm
 */
export function vectorAngle(
  u: Vector3Tuple,
  v: Vector3Tuple
): { radians: number; degrees: number } | null {
  const normU = vectorNorm(u);
  const normV = vectorNorm(v);
  if (normU < 1e-8 || normV < 1e-8) {
    return null;
  }
  const cosTheta = Math.max(-1, Math.min(1, vectorDot(u, v) / (normU * normV)));
  const radians = Math.acos(cosTheta);
  const degrees = (radians * 180) / Math.PI;
  return { radians, degrees };
}

/**
 * Proyección ortogonal de u sobre v: proj_v(u) = ((u · v) / ||v||^2) * v
 */
export function vectorProjection(
  u: Vector3Tuple,
  v: Vector3Tuple
): {
  projectedVector: Vector3Tuple;
  scalarProjection: number;
  factor: number;
} | null {
  const normV = vectorNorm(v);
  if (normV < 1e-8) {
    return null;
  }
  const uv = vectorDot(u, v);
  const vv = vectorDot(v, v);
  const factor = uv / vv;
  const scalarProjection = uv / normV;
  const projectedVector = vectorScale(v, factor);
  return { projectedVector, scalarProjection, factor };
}

/**
 * Producto vectorial u × v en R3 usando mathjs
 */
export function vectorCross(u: Vector3Tuple, v: Vector3Tuple): Vector3Tuple {
  const res = cross(u, v) as number[];
  return [res[0], res[1], res[2]];
}

/**
 * Producto mixto [u, v, w] = u · (v × w) = det([u; v; w]) usando mathjs
 */
export function vectorMixedProduct(
  u: Vector3Tuple,
  v: Vector3Tuple,
  w: Vector3Tuple
): {
  determinant: number;
  volume: number;
  crossVW: Vector3Tuple;
} {
  const crossVW = vectorCross(v, w);
  const determinant = Number(det([u, v, w]));
  return {
    determinant,
    volume: Math.abs(determinant),
    crossVW,
  };
}

// ============================================================================
// UNIDAD 2: RECTA Y PLANO — FUNCIONES MATEMÁTICAS Y GEOMÉTRICAS
// ============================================================================

/**
 * Formatea la ecuación general del plano Ax + By + Cz + D = 0
 */
export function formatPlaneEquation(n: Vector3Tuple, dTerm: number): string {
  const parts: string[] = [];
  const vars = ['x', 'y', 'z'];

  n.forEach((coef, idx) => {
    if (Math.abs(coef) < 1e-8) return;
    const sign = coef < 0 ? '-' : parts.length > 0 ? '+' : '';
    const absVal = Math.abs(coef);
    const numStr = Math.abs(absVal - 1) < 1e-8 ? '' : formatNum(absVal, 2);
    parts.push(`${sign} ${numStr}${vars[idx]}`.trim());
  });

  if (parts.length === 0) {
    return `${formatNum(dTerm, 2)} = 0`;
  }

  if (Math.abs(dTerm) >= 1e-8) {
    const sign = dTerm < 0 ? '-' : '+';
    parts.push(`${sign} ${formatNum(Math.abs(dTerm), 2)}`);
  }

  return `${parts.join(' ')} = 0`;
}

/**
 * Distancia de un punto P a una recta L(P0, d) y pie de la perpendicular Q
 */
export function pointToLineDistance(
  point: Vector3Tuple,
  linePoint: Vector3Tuple,
  lineDir: Vector3Tuple
): {
  distance: number;
  closestPoint: Vector3Tuple;
  parameterT: number;
  perpVector: Vector3Tuple;
} | null {
  const dNormSq = vectorDot(lineDir, lineDir);
  if (dNormSq < 1e-8) return null;

  const p0ToP = vectorSubtract(point, linePoint);
  const parameterT = vectorDot(p0ToP, lineDir) / dNormSq;
  const closestPoint = vectorAdd(linePoint, vectorScale(lineDir, parameterT));
  const perpVector = vectorSubtract(point, closestPoint);
  const distance = vectorNorm(perpVector);

  return {
    distance,
    closestPoint,
    parameterT,
    perpVector,
  };
}

/**
 * Distancia de un punto P a un plano Ax + By + Cz + D = 0 y pie de la perpendicular Q
 */
export function pointToPlaneDistance(
  point: Vector3Tuple,
  planeNormal: Vector3Tuple,
  planeD: number
): {
  distance: number;
  signedEvaluation: number;
  closestPoint: Vector3Tuple;
  perpVector: Vector3Tuple;
} | null {
  const nNormSq = vectorDot(planeNormal, planeNormal);
  if (nNormSq < 1e-8) return null;

  const signedEvaluation = vectorDot(planeNormal, point) + planeD;
  const factor = -signedEvaluation / nNormSq;
  const perpVector = vectorScale(planeNormal, -factor); // desde Q hacia P
  const closestPoint = vectorAdd(point, vectorScale(planeNormal, factor));
  const distance = Math.abs(signedEvaluation) / Math.sqrt(nNormSq);

  return {
    distance,
    signedEvaluation,
    closestPoint,
    perpVector,
  };
}

/**
 * Posición relativa e intersección entre Recta L(P0, d) y Plano Ax + By + Cz + D = 0
 */
export function analyzeLineAndPlane(
  linePoint: Vector3Tuple,
  lineDir: Vector3Tuple,
  planeNormal: Vector3Tuple,
  planeD: number
): {
  status: 'secant' | 'parallel' | 'contained' | 'degenerate';
  dotDN: number;
  angleDegrees: number;
  intersectionPoint: Vector3Tuple | null;
  parameterT: number | null;
  distance: number;
  projectedOriginOnPlane: Vector3Tuple;
} {
  const normD = vectorNorm(lineDir);
  const normN = vectorNorm(planeNormal);
  if (normD < 1e-8 || normN < 1e-8) {
    return {
      status: 'degenerate',
      dotDN: 0,
      angleDegrees: 0,
      intersectionPoint: null,
      parameterT: null,
      distance: 0,
      projectedOriginOnPlane: [0, 0, 0] as Vector3Tuple,
    };
  }

  const dotDN = vectorDot(lineDir, planeNormal);
  const evalP0 = vectorDot(planeNormal, linePoint) + planeD;

  // Ángulo entre recta y plano: sin(α) = |d · n| / (||d|| ||n||)
  const sinAlpha = Math.min(1, Math.abs(dotDN) / (normD * normN));
  const angleDegrees = (Math.asin(sinAlpha) * 180) / Math.PI;

  const ptPlane = pointToPlaneDistance(linePoint, planeNormal, planeD);
  const projectedOriginOnPlane: Vector3Tuple = ptPlane
    ? ptPlane.closestPoint
    : [0, 0, 0];

  if (Math.abs(dotDN) < 1e-7) {
    if (Math.abs(evalP0) < 1e-7) {
      return {
        status: 'contained',
        dotDN: 0,
        angleDegrees: 0,
        intersectionPoint: linePoint,
        parameterT: 0,
        distance: 0,
        projectedOriginOnPlane,
      };
    }
    return {
      status: 'parallel',
      dotDN: 0,
      angleDegrees: 0,
      intersectionPoint: null,
      parameterT: null,
      distance: ptPlane ? ptPlane.distance : 0,
      projectedOriginOnPlane,
    };
  }

  const t = -evalP0 / dotDN;
  const intersectionPoint = vectorAdd(linePoint, vectorScale(lineDir, t));

  return {
    status: 'secant',
    dotDN,
    angleDegrees,
    intersectionPoint,
    parameterT: t,
    distance: 0,
    projectedOriginOnPlane,
  };
}

/**
 * Posición relativa, intersección y distancia mínima entre dos rectas L1(P1, d1) y L2(P2, d2)
 */
export function analyzeTwoLines(
  p1: Vector3Tuple,
  d1: Vector3Tuple,
  p2: Vector3Tuple,
  d2: Vector3Tuple
): {
  status: 'intersecting' | 'parallel' | 'coincident' | 'skew' | 'degenerate';
  angleDegrees: number;
  distance: number;
  closestPointL1: Vector3Tuple;
  closestPointL2: Vector3Tuple;
  t1: number;
  t2: number;
  mixedProduct: number;
} {
  const norm1 = vectorNorm(d1);
  const norm2 = vectorNorm(d2);
  if (norm1 < 1e-8 || norm2 < 1e-8) {
    return {
      status: 'degenerate',
      angleDegrees: 0,
      distance: 0,
      closestPointL1: p1,
      closestPointL2: p2,
      t1: 0,
      t2: 0,
      mixedProduct: 0,
    };
  }

  const crossD = vectorCross(d1, d2);
  const crossNorm = vectorNorm(crossD);
  const p1ToP2 = vectorSubtract(p2, p1);

  const cosTheta = Math.min(
    1,
    Math.abs(vectorDot(d1, d2)) / (norm1 * norm2)
  );
  const angleDegrees = (Math.acos(cosTheta) * 180) / Math.PI;

  // Caso paralelo o coincidente: ||d1 × d2|| ≈ 0
  if (crossNorm < 1e-7) {
    const ptDist = pointToLineDistance(p2, p1, d1);
    const dist = ptDist ? ptDist.distance : 0;
    const q1 = ptDist ? ptDist.closestPoint : p1;
    return {
      status: dist < 1e-6 ? 'coincident' : 'parallel',
      angleDegrees: 0,
      distance: dist,
      closestPointL1: q1,
      closestPointL2: p2,
      t1: ptDist ? ptDist.parameterT : 0,
      t2: 0,
      mixedProduct: 0,
    };
  }

  // No paralelas: calculamos los puntos más cercanos Q1 en L1 y Q2 en L2
  // t1 = ((P2 - P1) × d2) · (d1 × d2) / ||d1 × d2||^2
  // t2 = ((P2 - P1) × d1) · (d1 × d2) / ||d1 × d2||^2
  const crossNormSq = crossNorm * crossNorm;
  const t1 = vectorDot(vectorCross(p1ToP2, d2), crossD) / crossNormSq;
  const t2 = vectorDot(vectorCross(p1ToP2, d1), crossD) / crossNormSq;

  const q1 = vectorAdd(p1, vectorScale(d1, t1));
  const q2 = vectorAdd(p2, vectorScale(d2, t2));
  const dist = vectorNorm(vectorSubtract(q2, q1));
  const mixed = Number(det([p1ToP2, d1, d2]));

  return {
    status: dist < 1e-5 ? 'intersecting' : 'skew',
    angleDegrees,
    distance: dist,
    closestPointL1: q1,
    closestPointL2: q2,
    t1,
    t2,
    mixedProduct: mixed,
  };
}

/**
 * Posición relativa e intersección entre dos planos π1(n1, D1) y π2(n2, D2)
 */
export function analyzeTwoPlanes(
  n1: Vector3Tuple,
  d1: number,
  n2: Vector3Tuple,
  d2: number
): {
  status: 'secant' | 'parallel' | 'coincident' | 'degenerate';
  dihedralAngleDegrees: number;
  distance: number;
  intersectionLinePoint: Vector3Tuple | null;
  intersectionLineDir: Vector3Tuple | null;
} {
  const norm1 = vectorNorm(n1);
  const norm2 = vectorNorm(n2);
  if (norm1 < 1e-8 || norm2 < 1e-8) {
    return {
      status: 'degenerate',
      dihedralAngleDegrees: 0,
      distance: 0,
      intersectionLinePoint: null,
      intersectionLineDir: null,
    };
  }

  const lineDir = vectorCross(n1, n2);
  const dirNorm = vectorNorm(lineDir);

  const cosTheta = Math.min(1, Math.abs(vectorDot(n1, n2)) / (norm1 * norm2));
  const dihedralAngleDegrees = (Math.acos(cosTheta) * 180) / Math.PI;

  if (dirNorm < 1e-7) {
    // Normales paralelas: tomamos un punto sobre π1 y medimos su distancia a π2
    const pOnPlane1 = vectorScale(n1, -d1 / (norm1 * norm1));
    const ptDist = pointToPlaneDistance(pOnPlane1, n2, d2);
    const dist = ptDist ? ptDist.distance : 0;

    return {
      status: dist < 1e-6 ? 'coincident' : 'parallel',
      dihedralAngleDegrees: 0,
      distance: dist,
      intersectionLinePoint: null,
      intersectionLineDir: null,
    };
  }

  // Punto más cercano al origen sobre la recta de intersección de ambos planos:
  // p = ( (d2*(n1·n2) - d1*||n2||^2)*n1 + (d1*(n1·n2) - d2*||n1||^2)*n2 ) / ||n1 × n2||^2
  const n1n1 = vectorDot(n1, n1);
  const n2n2 = vectorDot(n2, n2);
  const n1n2 = vectorDot(n1, n2);
  const denom = dirNorm * dirNorm;

  const c1 = (d2 * n1n2 - d1 * n2n2) / denom;
  const c2 = (d1 * n1n2 - d2 * n1n1) / denom;
  const intersectionLinePoint = vectorAdd(
    vectorScale(n1, c1),
    vectorScale(n2, c2)
  );

  return {
    status: 'secant',
    dihedralAngleDegrees,
    distance: 0,
    intersectionLinePoint,
    intersectionLineDir: lineDir,
  };
}

// ============================================================================
// UNIDAD 4: MATRICES Y DETERMINANTES — FUNCIONES CON MATHJS
// ============================================================================

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export type Matrix2x2 = [[number, number], [number, number]];

/**
 * Extrae la submatriz 2x2 superior izquierda de una matriz 3x3
 */
export function toMatrix2x2(m: Matrix3x3): Matrix2x2 {
  return [
    [m[0][0], m[0][1]],
    [m[1][0], m[1][1]],
  ];
}

/**
 * Extrae los 3 vectores columna de una matriz (en R2 la 3ra componente es 0)
 */
export function matrixColumnsAsVectors(
  m: Matrix3x3,
  isR2 = false
): { c1: Vector3Tuple; c2: Vector3Tuple; c3: Vector3Tuple } {
  if (isR2) {
    return {
      c1: [m[0][0], m[1][0], 0],
      c2: [m[0][1], m[1][1], 0],
      c3: [0, 0, 1],
    };
  }
  return {
    c1: [m[0][0], m[1][0], m[2][0]],
    c2: [m[0][1], m[1][1], m[2][1]],
    c3: [m[0][2], m[1][2], m[2][2]],
  };
}

/**
 * Calcula el determinante de una matriz 2x2 o 3x3 usando mathjs
 */
export function matrixDeterminant(m: Matrix3x3, isR2 = false): number {
  const target = isR2 ? toMatrix2x2(m) : m;
  return Number(det(target));
}

/**
 * Suma dos matrices 3x3 usando mathjs
 */
export function matrixAdd(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  return add(a, b) as Matrix3x3;
}

/**
 * Resta dos matrices 3x3 usando mathjs
 */
export function matrixSubtract(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  return subtract(a, b) as Matrix3x3;
}

/**
 * Multiplica dos matrices 3x3 (o sus bloques 2x2 embebidos) usando mathjs
 */
export function matrixMultiply(
  a: Matrix3x3,
  b: Matrix3x3,
  isR2 = false
): Matrix3x3 {
  if (isR2) {
    const prod2 = multiply(toMatrix2x2(a), toMatrix2x2(b)) as Matrix2x2;
    return [
      [prod2[0][0], prod2[0][1], 0],
      [prod2[1][0], prod2[1][1], 0],
      [0, 0, 1],
    ];
  }
  return multiply(a, b) as Matrix3x3;
}

/**
 * Transpone una matriz 3x3 usando mathjs
 */
export function matrixTranspose(m: Matrix3x3): Matrix3x3 {
  return transpose(m) as Matrix3x3;
}

/**
 * Calcula la matriz de cofactores Cof(A) usando det de mathjs en cada menor
 */
export function matrixCofactors(m: Matrix3x3, isR2 = false): Matrix3x3 {
  if (isR2) {
    return [
      [m[1][1], -m[1][0], 0],
      [-m[0][1], m[0][0], 0],
      [0, 0, 1],
    ];
  }

  const cof: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const minorRows: number[][] = [];
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const row: number[] = [];
        for (let c = 0; c < 3; c++) {
          if (c === j) continue;
          row.push(m[r][c]);
        }
        minorRows.push(row);
      }
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      cof[i][j] = sign * Number(det(minorRows));
    }
  }
  return cof;
}

/**
 * Calcula la matriz inversa A^(-1) usando mathjs inv(A) si det(A) != 0
 */
export function matrixInverse(
  m: Matrix3x3,
  isR2 = false
): {
  invertible: boolean;
  determinant: number;
  inverse: Matrix3x3 | null;
  cofactors: Matrix3x3;
  adjugate: Matrix3x3;
} {
  const determinant = matrixDeterminant(m, isR2);
  const cofactors = matrixCofactors(m, isR2);
  const adjugate = matrixTranspose(cofactors);

  if (Math.abs(determinant) < 1e-7) {
    return {
      invertible: false,
      determinant: 0,
      inverse: null,
      cofactors,
      adjugate,
    };
  }

  if (isR2) {
    const inv2 = inv(toMatrix2x2(m)) as Matrix2x2;
    return {
      invertible: true,
      determinant,
      inverse: [
        [inv2[0][0], inv2[0][1], 0],
        [inv2[1][0], inv2[1][1], 0],
        [0, 0, 1],
      ],
      cofactors,
      adjugate,
    };
  }

  const inv3 = inv(m) as Matrix3x3;
  return {
    invertible: true,
    determinant,
    inverse: inv3,
    cofactors,
    adjugate,
  };
}

// ============================================================================
// UNIDAD 5: SISTEMAS DE ECUACIONES LINEALES (GAUSS-JORDAN + ROUCHÉ-FROBENIUS)
// ============================================================================

export interface GaussJordanStep {
  title: string;
  operationCode: string;
  description: string;
  augmentedMatrix: number[][]; // 2x3 en R2, 3x4 en R3
  pivotRow?: number;
  pivotCol?: number;
  targetRow?: number;
}

export type SystemClassification = 'SCD' | 'SCI' | 'SI';

export interface LinearSystemAnalysis {
  classification: SystemClassification;
  rankA: number;
  rankAugmented: number;
  numVariables: number;
  degreesOfFreedom: number;
  determinantA: number;
  uniqueSolution: Vector3Tuple | null;
  solutionLine: { point: Vector3Tuple; dir: Vector3Tuple } | null;
  steps: GaussJordanStep[];
}

function cloneAug(mat: number[][]): number[][] {
  return mat.map((row) => row.map((v) => (Math.abs(v) < 1e-10 ? 0 : v)));
}

/**
 * Ejecuta Gauss-Jordan paso a paso y clasifica el sistema por Rouché-Frobenius,
 * usando lusolve y det de mathjs para la solución exacta.
 */
export function solveLinearSystemGaussJordan(
  matrixA: Matrix3x3,
  vectorB: Vector3Tuple,
  isR2 = false
): LinearSystemAnalysis {
  const n = isR2 ? 2 : 3;

  // Construcción de la matriz ampliada inicial [A | b]
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push(matrixA[i][j]);
    }
    row.push(vectorB[i]);
    aug.push(row);
  }

  const steps: GaussJordanStep[] = [
    {
      title: 'Matriz Ampliada Inicial [A | b]',
      operationCode: 'Inicio',
      description:
        'Representación matricial del sistema original antes de aplicar operaciones elementales de fila.',
      augmentedMatrix: cloneAug(aug),
    },
  ];

  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < n; col++) {
    // 1. Búsqueda de pivote máximo parcial en la columna actual
    let maxRow = pivotRow;
    for (let r = pivotRow + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = r;
      }
    }

    if (Math.abs(aug[maxRow][col]) < 1e-8) {
      // No hay pivote no nulo en esta columna
      continue;
    }

    // 2. Intercambio de filas si es necesario
    if (maxRow !== pivotRow) {
      const temp = aug[pivotRow];
      aug[pivotRow] = aug[maxRow];
      aug[maxRow] = temp;
      steps.push({
        title: `Intercambio de Filas (Pivoteo)`,
        operationCode: `F${pivotRow + 1} ↔ F${maxRow + 1}`,
        description: `Se intercambia la fila ${pivotRow + 1} con la fila ${
          maxRow + 1
        } para ubicar un pivote no nulo en la posición (${pivotRow + 1}, ${
          col + 1
        }).`,
        augmentedMatrix: cloneAug(aug),
        pivotRow,
        pivotCol: col,
      });
    }

    // 3. Normalización de la fila pivote (hacer pivote = 1)
    const pivotVal = aug[pivotRow][col];
    if (Math.abs(pivotVal - 1) > 1e-8) {
      for (let c = col; c <= n; c++) {
        aug[pivotRow][c] /= pivotVal;
      }
      steps.push({
        title: `Normalización de Pivote (Fila ${pivotRow + 1})`,
        operationCode: `F${pivotRow + 1} ← (1 / ${formatNum(pivotVal, 2)}) · F${
          pivotRow + 1
        }`,
        description: `Se divide la fila ${pivotRow + 1} por ${formatNum(
          pivotVal,
          2
        )} para obtener un pivote principal igual a 1.`,
        augmentedMatrix: cloneAug(aug),
        pivotRow,
        pivotCol: col,
      });
    }

    // 4. Eliminación hacia arriba y hacia abajo en la columna actual
    for (let r = 0; r < n; r++) {
      if (r === pivotRow) continue;
      const factor = aug[r][col];
      if (Math.abs(factor) > 1e-8) {
        for (let c = col; c <= n; c++) {
          aug[r][c] -= factor * aug[pivotRow][c];
        }
        const signStr =
          factor >= 0
            ? `- ${formatNum(factor, 2)}`
            : `+ ${formatNum(Math.abs(factor), 2)}`;
        steps.push({
          title: `Eliminación en Fila ${r + 1} (Columna ${col + 1})`,
          operationCode: `F${r + 1} ← F${r + 1} ${signStr} · F${pivotRow + 1}`,
          description: `Se anula el coeficiente en la fila ${
            r + 1
          }, columna ${col + 1} operando con la fila pivote ${pivotRow + 1}.`,
          augmentedMatrix: cloneAug(aug),
          pivotRow,
          pivotCol: col,
          targetRow: r,
        });
      }
    }

    pivotRow++;
  }

  // Cálculo de rangos rg(A) y rg(A | b) sobre la matriz escalonada reducida (RREF)
  const finalAug = cloneAug(aug);
  let rankA = 0;
  let rankAugmented = 0;

  for (let r = 0; r < n; r++) {
    const rowCoeffs = finalAug[r].slice(0, n);
    const hasNonZeroA = rowCoeffs.some((v) => Math.abs(v) > 1e-6);
    const hasNonZeroAug = finalAug[r].some((v) => Math.abs(v) > 1e-6);
    if (hasNonZeroA) rankA++;
    if (hasNonZeroAug) rankAugmented++;
  }

  const determinantA = matrixDeterminant(matrixA, isR2);

  let classification: SystemClassification = 'SCD';
  if (rankA < rankAugmented) {
    classification = 'SI';
  } else if (rankA < n) {
    classification = 'SCI';
  } else {
    classification = 'SCD';
  }

  // Solución única mediante lusolve de mathjs cuando es SCD
  let uniqueSolution: Vector3Tuple | null = null;
  if (classification === 'SCD' && Math.abs(determinantA) > 1e-7) {
    try {
      if (isR2) {
        const a2 = toMatrix2x2(matrixA);
        const b2 = [vectorB[0], vectorB[1]];
        const sol = lusolve(a2, b2) as number[][];
        uniqueSolution = [sol[0][0], sol[1][0], 0];
      } else {
        const sol = lusolve(matrixA, vectorB) as number[][];
        uniqueSolution = [sol[0][0], sol[1][0], sol[2][0]];
      }
    } catch {
      uniqueSolution = [
        finalAug[0][n],
        finalAug[1][n],
        isR2 ? 0 : finalAug[2][n],
      ];
    }
  }

  // Si es SCI, hallamos una recta solución para graficarla
  let solutionLine: { point: Vector3Tuple; dir: Vector3Tuple } | null = null;
  if (classification === 'SCI') {
    if (isR2) {
      // En R2 si rg=1, una de las ecuaciones no nulas define la recta solución
      const validRow =
        finalAug.find(
          (r) => Math.abs(r[0]) > 1e-6 || Math.abs(r[1]) > 1e-6
        ) ?? finalAug[0];
      const lineObj = rowTo2DLine(validRow[0], validRow[1], validRow[2]);
      if (lineObj) solutionLine = lineObj;
    } else {
      // En R3 con rg=2 (dos planos no paralelos), la intersección de las dos primeras filas independientes de RREF da la recta
      const n1: Vector3Tuple = [finalAug[0][0], finalAug[0][1], finalAug[0][2]];
      const d1 = -finalAug[0][3];
      const n2: Vector3Tuple = [finalAug[1][0], finalAug[1][1], finalAug[1][2]];
      const d2 = -finalAug[1][3];
      const planesInt = analyzeTwoPlanes(n1, d1, n2, d2);
      if (
        planesInt.status === 'secant' &&
        planesInt.intersectionLinePoint &&
        planesInt.intersectionLineDir
      ) {
        solutionLine = {
          point: planesInt.intersectionLinePoint,
          dir: planesInt.intersectionLineDir,
        };
      }
    }
  }

  return {
    classification,
    rankA,
    rankAugmented,
    numVariables: n,
    degreesOfFreedom: classification === 'SI' ? 0 : n - rankA,
    determinantA,
    uniqueSolution,
    solutionLine,
    steps,
  };
}

/**
 * Convierte una ecuación 2D ax + by = c en Punto P0 y Vector Director d en el plano XY
 */
export function rowTo2DLine(
  a: number,
  b: number,
  c: number
): { point: Vector3Tuple; dir: Vector3Tuple } | null {
  const normSq = a * a + b * b;
  if (normSq < 1e-8) return null;
  // Punto más cercano al origen: (a*c / (a^2+b^2), b*c / (a^2+b^2), 0)
  const px = (a * c) / normSq;
  const py = (b * c) / normSq;
  // Vector director perpendicular a la normal (a, b): (-b, a, 0)
  return {
    point: [px, py, 0],
    dir: [-b, a, 0],
  };
}

// ============================================================================
// UNIDAD 7: TRANSFORMACIONES LINEALES (NÚCLEO, IMAGEN Y DEFORMACIÓN)
// ============================================================================

export type TransformationSpaceMode = 'R2-R2' | 'R3-R3' | 'R3-R2' | 'R2-R3';

/**
 * Convierte la matriz 3x3 de trabajo en la matriz efectiva en R3 según el modo V -> W
 */
export function getEffectiveTransformationMatrix(
  m: Matrix3x3,
  spaceMode: TransformationSpaceMode
): Matrix3x3 {
  if (spaceMode === 'R2-R2') {
    return [
      [m[0][0], m[0][1], 0],
      [m[1][0], m[1][1], 0],
      [0, 0, 0],
    ];
  }
  if (spaceMode === 'R3-R2') {
    // Matriz 2x3: 3 columnas de entrada (R3) -> 2 filas de salida (R2 en el plano XY, z=0)
    return [
      [m[0][0], m[0][1], m[0][2]],
      [m[1][0], m[1][1], m[1][2]],
      [0, 0, 0],
    ];
  }
  if (spaceMode === 'R2-R3') {
    // Matriz 3x2: 2 columnas de entrada (R2) -> 3 filas de salida (R3)
    return [
      [m[0][0], m[0][1], 0],
      [m[1][0], m[1][1], 0],
      [m[2][0], m[2][1], 0],
    ];
  }
  return m;
}

/**
 * Multiplica la matriz A por un vector x: T(x) = A * x usando mathjs
 */
export function applyMatrixToVector(
  m: Matrix3x3,
  x: Vector3Tuple,
  spaceMode: TransformationSpaceMode = 'R3-R3'
): Vector3Tuple {
  const effM = getEffectiveTransformationMatrix(m, spaceMode);
  const effX: Vector3Tuple =
    spaceMode === 'R2-R2' || spaceMode === 'R2-R3'
      ? [x[0], x[1], 0]
      : x;
  const res = multiply(effM, effX) as number[];
  return [res[0], res[1], res[2]];
}

export interface LinearTransformationAnalysis {
  domainDim: number; // n (columnas)
  codomainDim: number; // m (filas)
  rank: number; // dim(Im(T))
  nullity: number; // dim(Nu(T))
  determinant: number | null; // solo para matrices cuadradas (n == m)
  isInjective: boolean; // nullity == 0
  isSurjective: boolean; // rank == codomainDim
  isIsomorphism: boolean; // inyectiva y sobreyectiva
  imageBasis: Vector3Tuple[];
  kernelBasis: Vector3Tuple[];
  imagePlaneNormal: Vector3Tuple | null; // cuando dim(Im) == 2 en codominio R3
  kernelPlaneNormal: Vector3Tuple | null; // cuando dim(Nu) == 2 en dominio R3
}

/**
 * Analiza una Transformación Lineal T: R^n -> R^m (con n, m ∈ {2, 3})
 * hallando bases exactas del Núcleo (Kernel) en R^n y de la Imagen en R^m,
 * y verificando el Teorema de la Dimensión: dim(Nu(T)) + dim(Im(T)) = dim(Dominio).
 */
export function analyzeLinearTransformation(
  matrixA: Matrix3x3,
  spaceMode: TransformationSpaceMode = 'R3-R3'
): LinearTransformationAnalysis {
  const domainDim =
    spaceMode === 'R2-R2' || spaceMode === 'R2-R3' ? 2 : 3;
  const codomainDim =
    spaceMode === 'R2-R2' || spaceMode === 'R3-R2' ? 2 : 3;

  // Construir matriz m x n para reducción por filas Gauss-Jordan
  const rref: number[][] = [];
  for (let r = 0; r < codomainDim; r++) {
    const row: number[] = [];
    for (let c = 0; c < domainDim; c++) {
      row.push(matrixA[r][c]);
    }
    rref.push(row);
  }

  let pivotRow = 0;
  const pivotCols: number[] = [];
  const pivotRowForCol: Record<number, number> = {};

  for (let col = 0; col < domainDim && pivotRow < codomainDim; col++) {
    let maxRow = pivotRow;
    for (let r = pivotRow + 1; r < codomainDim; r++) {
      if (Math.abs(rref[r][col]) > Math.abs(rref[maxRow][col])) {
        maxRow = r;
      }
    }

    if (Math.abs(rref[maxRow][col]) < 1e-7) {
      continue;
    }

    if (maxRow !== pivotRow) {
      const tmp = rref[pivotRow];
      rref[pivotRow] = rref[maxRow];
      rref[maxRow] = tmp;
    }

    const pVal = rref[pivotRow][col];
    for (let c = col; c < domainDim; c++) {
      rref[pivotRow][c] /= pVal;
    }

    for (let r = 0; r < codomainDim; r++) {
      if (r === pivotRow) continue;
      const factor = rref[r][col];
      if (Math.abs(factor) > 1e-8) {
        for (let c = col; c < domainDim; c++) {
          rref[r][c] -= factor * rref[pivotRow][c];
        }
      }
    }

    pivotCols.push(col);
    pivotRowForCol[col] = pivotRow;
    pivotRow++;
  }

  const freeCols: number[] = [];
  for (let c = 0; c < domainDim; c++) {
    if (!pivotCols.includes(c)) {
      freeCols.push(c);
    }
  }

  // Columnas originales en el espacio de llegada (R^m embebido en 3D)
  const allCols: Vector3Tuple[] = [];
  for (let c = 0; c < domainDim; c++) {
    allCols.push([
      matrixA[0][c],
      matrixA[1][c],
      codomainDim === 3 ? matrixA[2][c] : 0,
    ]);
  }

  const imageBasis: Vector3Tuple[] = pivotCols.map((cIdx) => allCols[cIdx]);

  // Base del Núcleo (en el espacio de partida R^n embebido en 3D)
  const kernelBasis: Vector3Tuple[] = freeCols.map((freeCol) => {
    const vec: [number, number, number] = [0, 0, 0];
    vec[freeCol] = 1;
    for (const pCol of pivotCols) {
      const pRow = pivotRowForCol[pCol];
      const val = -rref[pRow][freeCol];
      vec[pCol] = Math.abs(val) < 1e-9 ? 0 : val;
    }
    return vec;
  });

  const rank = pivotCols.length;
  const nullity = domainDim - rank;

  let determinant: number | null = null;
  if (domainDim === codomainDim) {
    determinant = matrixDeterminant(matrixA, domainDim === 2);
  }

  let imagePlaneNormal: Vector3Tuple | null = null;
  if (codomainDim === 3 && rank === 2 && imageBasis.length === 2) {
    imagePlaneNormal = vectorCross(imageBasis[0], imageBasis[1]);
  } else if (codomainDim === 2 && rank === 2 && spaceMode === 'R3-R2') {
    // En R3 -> R2 cuando rg = 2, la imagen es todo el plano XY (normal = (0,0,1))
    imagePlaneNormal = [0, 0, 1];
  }

  let kernelPlaneNormal: Vector3Tuple | null = null;
  if (domainDim === 3 && nullity === 2 && kernelBasis.length === 2) {
    kernelPlaneNormal = vectorCross(kernelBasis[0], kernelBasis[1]);
  }

  const isInjective = nullity === 0;
  const isSurjective = rank === codomainDim;

  return {
    domainDim,
    codomainDim,
    rank,
    nullity,
    determinant,
    isInjective,
    isSurjective,
    isIsomorphism: isInjective && isSurjective,
    imageBasis,
    kernelBasis,
    imagePlaneNormal,
    kernelPlaneNormal,
  };
}

// ============================================================================
// UNIDAD 8: AUTOVALORES, AUTOVECTORES Y DIAGONALIZACIÓN (CON MATHJS eigs)
// ============================================================================

export interface EigenPairGroup {
  lambda: number;
  algebraicMultiplicity: number;
  geometricMultiplicity: number;
  eigenvectors: Vector3Tuple[];
}

export interface EigenSystemAnalysis {
  characteristicPolynomialText: string;
  traceVal: number;
  detVal: number;
  hasComplexEigenvalues: boolean;
  complexPairText: string | null;
  eigenGroups: EigenPairGroup[];
  allEigenvectors: { lambda: number; vector: Vector3Tuple; color: string }[];
  isSymmetric: boolean;
  isDiagonalizable: boolean;
  matrixP: Matrix3x3 | null;
  matrixD: Matrix3x3 | null;
  matrixPInv: Matrix3x3 | null;
}

function extractRealPart(val: unknown): { re: number; im: number } {
  if (typeof val === 'number') {
    return { re: val, im: 0 };
  }
  if (val && typeof val === 'object' && 're' in val && 'im' in val) {
    const c = val as { re: number; im: number };
    return { re: Number(c.re), im: Number(c.im) };
  }
  return { re: Number(val) || 0, im: 0 };
}

function normalizeVec3(v: Vector3Tuple): Vector3Tuple {
  const len = vectorNorm(v);
  if (len < 1e-8) return [1, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Calcula autovalores, autovectores, subespacios propios y diagonalización A = P * D * P^(-1)
 * empleando eigs, trace, det e inv de mathjs.
 */
export function analyzeEigenSystem(
  matrixA: Matrix3x3,
  isR2 = false
): EigenSystemAnalysis {
  const n = isR2 ? 2 : 3;
  const targetMat = isR2 ? toMatrix2x2(matrixA) : matrixA;

  const traceVal = Number(trace(targetMat));
  const detVal = Number(det(targetMat));

  // Verificar si A es simétrica
  let isSymmetric = true;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(matrixA[i][j] - matrixA[j][i]) > 1e-6) {
        isSymmetric = false;
      }
    }
  }

  // Polinomio característico p(λ)
  let characteristicPolynomialText = '';
  if (isR2) {
    const trSign = traceVal >= 0 ? '-' : '+';
    const detSign = detVal >= 0 ? '+' : '-';
    characteristicPolynomialText = `p(λ) = λ² ${trSign} ${formatNum(
      Math.abs(traceVal),
      2
    )}λ ${detSign} ${formatNum(Math.abs(detVal), 2)} = 0`;
  } else {
    const m11 = matrixA[1][1] * matrixA[2][2] - matrixA[1][2] * matrixA[2][1];
    const m22 = matrixA[0][0] * matrixA[2][2] - matrixA[0][2] * matrixA[2][0];
    const m33 = matrixA[0][0] * matrixA[1][1] - matrixA[0][1] * matrixA[1][0];
    const sumMinors = m11 + m22 + m33;
    characteristicPolynomialText = `p(λ) = -λ³ + (${formatNum(
      traceVal,
      2
    )})λ² - (${formatNum(sumMinors, 2)})λ + (${formatNum(detVal, 2)}) = 0`;
  }

  // Obtener raíces reales y posibles raíces complejas usando eigs de mathjs + verificación analítica
  const rawRealRoots: number[] = [];
  let hasComplexEigenvalues = false;
  let complexPairText: string | null = null;

  if (isR2) {
    // En 2x2 verificamos el discriminante exacto primero y usamos eigs de mathjs
    const disc = traceVal * traceVal - 4 * detVal;
    if (disc < -1e-7) {
      hasComplexEigenvalues = true;
      const re = traceVal / 2;
      const im = Math.sqrt(-disc) / 2;
      complexPairText = `λ₁,₂ = ${formatNum(re, 2)} ± ${formatNum(im, 2)}i`;
    } else {
      try {
        const eigRes = eigs(targetMat);
        const vals = Array.isArray(eigRes.values)
          ? eigRes.values
          : (eigRes.values as { toArray: () => unknown[] }).toArray();
        for (const v of vals) {
          const { re, im } = extractRealPart(v);
          if (Math.abs(im) > 1e-5) {
            hasComplexEigenvalues = true;
          } else {
            rawRealRoots.push(re);
          }
        }
      } catch {
        const sqrtD = Math.sqrt(Math.max(0, disc));
        rawRealRoots.push((traceVal + sqrtD) / 2, (traceVal - sqrtD) / 2);
      }
    }
  } else {
    // En 3x3 invocamos eigs de mathjs
    try {
      const eigRes = eigs(targetMat);
      const vals = Array.isArray(eigRes.values)
        ? eigRes.values
        : (eigRes.values as { toArray: () => unknown[] }).toArray();
      for (const v of vals) {
        const { re, im } = extractRealPart(v);
        if (Math.abs(im) > 1e-4) {
          hasComplexEigenvalues = true;
          complexPairText = `${formatNum(re, 2)} ± ${formatNum(
            Math.abs(im),
            2
          )}i`;
        } else {
          rawRealRoots.push(re);
        }
      }
    } catch {
      // Fallback cúbico numérico cuando eigs no converge en matrices defectivas de Jordan 3x3
      const m11 = matrixA[1][1] * matrixA[2][2] - matrixA[1][2] * matrixA[2][1];
      const m22 = matrixA[0][0] * matrixA[2][2] - matrixA[0][2] * matrixA[2][0];
      const m33 = matrixA[0][0] * matrixA[1][1] - matrixA[0][1] * matrixA[1][0];
      const c2 = -traceVal;
      const c1 = m11 + m22 + m33;
      const c0 = -detVal;
      // Método de Cardano para λ^3 + c2*λ^2 + c1*λ + c0 = 0
      const p = (3 * c1 - c2 * c2) / 3;
      const q = (2 * c2 * c2 * c2 - 9 * c2 * c1 + 27 * c0) / 27;
      const delta = (q * q) / 4 + (p * p * p) / 27;
      if (delta > 1e-6) {
        hasComplexEigenvalues = true;
        const u = Math.cbrt(-q / 2 + Math.sqrt(delta));
        const v = Math.cbrt(-q / 2 - Math.sqrt(delta));
        const r1 = u + v - c2 / 3;
        const re = -(u + v) / 2 - c2 / 3;
        const im = (Math.sqrt(3) / 2) * Math.abs(u - v);
        rawRealRoots.push(r1);
        complexPairText = `${formatNum(re, 2)} ± ${formatNum(im, 2)}i`;
      } else {
        const r = Math.sqrt(Math.max(0, -(p * p * p) / 27));
        const phi =
          r > 1e-9 ? Math.acos(Math.max(-1, Math.min(1, -q / (2 * r)))) : 0;
        const mag = 2 * Math.cbrt(r);
        rawRealRoots.push(
          mag * Math.cos(phi / 3) - c2 / 3,
          mag * Math.cos((phi + 2 * Math.PI) / 3) - c2 / 3,
          mag * Math.cos((phi + 4 * Math.PI) / 3) - c2 / 3
        );
      }
    }
  }

  // Agrupar raíces reales cercanas (tolerancia 1e-3) para determinar multiplicidad algebraica
  rawRealRoots.sort((a, b) => b - a);
  const distinctGroups: { lambda: number; count: number }[] = [];
  for (const r of rawRealRoots) {
    const cleanedR = Math.abs(r) < 1e-6 ? 0 : Number(r.toFixed(4));
    const existing = distinctGroups.find(
      (g) => Math.abs(g.lambda - cleanedR) < 1e-2
    );
    if (existing) {
      existing.count++;
    } else {
      distinctGroups.push({ lambda: cleanedR, count: 1 });
    }
  }

  // Para cada autovalor real distinto λ, hallamos una base exacta del autoespacio E_λ = Nu(A - λI)
  const eigenGroups: EigenPairGroup[] = distinctGroups.map((g) => {
    const shifted: Matrix3x3 = [
      [matrixA[0][0] - g.lambda, matrixA[0][1], matrixA[0][2]],
      [matrixA[1][0], matrixA[1][1] - g.lambda, matrixA[1][2]],
      [matrixA[2][0], matrixA[2][1], matrixA[2][2] - g.lambda],
    ];
    const kerAnalysis = analyzeLinearTransformation(
      shifted,
      isR2 ? 'R2-R2' : 'R3-R3'
    );
    let basis = kerAnalysis.kernelBasis.map((v) => normalizeVec3(v));

    // Si por redondeo numérico de punto flotante el kernel dio vacío para una raíz real válida,
    // calculamos el autovector por producto vectorial de filas o cofactor 2x2
    if (basis.length === 0) {
      if (isR2) {
        const r0 = shifted[0];
        const r1 = shifted[1];
        if (Math.hypot(r0[0], r0[1]) >= Math.hypot(r1[0], r1[1])) {
          basis = [normalizeVec3([-r0[1], r0[0], 0])];
        } else {
          basis = [normalizeVec3([-r1[1], r1[0], 0])];
        }
      } else {
        const row0: Vector3Tuple = shifted[0];
        const row1: Vector3Tuple = shifted[1];
        const row2: Vector3Tuple = shifted[2];
        let cVec = vectorCross(row0, row1);
        if (vectorNorm(cVec) < 1e-5) cVec = vectorCross(row0, row2);
        if (vectorNorm(cVec) < 1e-5) cVec = vectorCross(row1, row2);
        basis = [normalizeVec3(cVec)];
      }
    }

    return {
      lambda: g.lambda,
      algebraicMultiplicity: g.count,
      geometricMultiplicity: basis.length,
      eigenvectors: basis,
    };
  });

  const EIGEN_COLORS = ['#38bdf8', '#34d399', '#fb923c'];
  const allEigenvectors: {
    lambda: number;
    vector: Vector3Tuple;
    color: string;
  }[] = [];

  eigenGroups.forEach((grp) => {
    grp.eigenvectors.forEach((vec) => {
      const color = EIGEN_COLORS[allEigenvectors.length % EIGEN_COLORS.length];
      allEigenvectors.push({ lambda: grp.lambda, vector: vec, color });
    });
  });

  const totalGeomMult = allEigenvectors.length;
  const isDiagonalizable = !hasComplexEigenvalues && totalGeomMult === n;

  let matrixP: Matrix3x3 | null = null;
  let matrixD: Matrix3x3 | null = null;
  let matrixPInv: Matrix3x3 | null = null;

  if (isDiagonalizable) {
    if (isR2 && allEigenvectors.length >= 2) {
      const v1 = allEigenvectors[0].vector;
      const v2 = allEigenvectors[1].vector;
      matrixP = [
        [v1[0], v2[0], 0],
        [v1[1], v2[1], 0],
        [0, 0, 1],
      ];
      matrixD = [
        [allEigenvectors[0].lambda, 0, 0],
        [0, allEigenvectors[1].lambda, 0],
        [0, 0, 1],
      ];
      const invRes = matrixInverse(matrixP, true);
      if (invRes.invertible) matrixPInv = invRes.inverse;
    } else if (!isR2 && allEigenvectors.length >= 3) {
      const v1 = allEigenvectors[0].vector;
      const v2 = allEigenvectors[1].vector;
      const v3 = allEigenvectors[2].vector;
      matrixP = [
        [v1[0], v2[0], v3[0]],
        [v1[1], v2[1], v3[1]],
        [v1[2], v2[2], v3[2]],
      ];
      matrixD = [
        [allEigenvectors[0].lambda, 0, 0],
        [0, allEigenvectors[1].lambda, 0],
        [0, 0, allEigenvectors[2].lambda],
      ];
      const invRes = matrixInverse(matrixP, false);
      if (invRes.invertible) matrixPInv = invRes.inverse;
    }
  }

  return {
    characteristicPolynomialText,
    traceVal,
    detVal,
    hasComplexEigenvalues,
    complexPairText,
    eigenGroups,
    allEigenvectors,
    isSymmetric,
    isDiagonalizable,
    matrixP,
    matrixD,
    matrixPInv,
  };
}




