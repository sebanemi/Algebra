export type UnitId =
  | 'unit-1'
  | 'unit-2'
  | 'unit-3'
  | 'unit-4'
  | 'unit-5'
  | 'unit-6'
  | 'unit-7'
  | 'unit-8';

export interface CurriculumUnit {
  id: UnitId;
  number: number;
  title: string;
  subtitle: string;
  available: boolean;
  topics: string[];
}

export type Vector3Tuple = [number, number, number];

export type DimensionMode = 'R2' | 'R3';

export type VectorOperationMode =
  | 'add-sub'
  | 'scalar-mult'
  | 'dot-product'
  | 'cross-product'
  | 'mixed-product';

export const CURRICULUM_UNITS: CurriculumUnit[] = [
  {
    id: 'unit-1',
    number: 1,
    title: 'Vectores en ℝ² y ℝ³',
    subtitle: 'Álgebra vectorial, proyecciones y productos',
    available: true,
    topics: [
      'Suma, resta y regla del paralelogramo',
      'Producto por un escalar',
      'Producto escalar, ángulo y proyección ortogonal',
      'Producto vectorial y área del paralelogramo',
      'Producto mixto y volumen del paralelepípedo',
    ],
  },
  {
    id: 'unit-2',
    number: 2,
    title: 'Recta y Plano',
    subtitle: 'Ecuaciones, posiciones relativas y distancias',
    available: true,
    topics: [
      'Ecuación vectorial, paramétrica y simétrica de la recta',
      'Ecuación general y normal del plano',
      'Posiciones relativas e intersecciones',
      'Distancias punto-recta y punto-plano',
    ],
  },
  {
    id: 'unit-3',
    number: 3,
    title: 'Cónicas',
    subtitle: 'Circunferencia, elipse, parábola e hipérbola',
    available: true,
    topics: [
      'Circunferencia y excentricidad',
      'Elipse: focos, ejes y directrices',
      'Parábola: foco y directriz',
      'Hipérbola: asíntotas y focos',
    ],
  },
  {
    id: 'unit-4',
    number: 4,
    title: 'Matrices y Determinantes',
    subtitle: 'Operaciones e interpretación geométrica (área/volumen)',
    available: true,
    topics: [
      'Álgebra matricial y transpuesta',
      'Determinante como factor de escala de área y volumen',
      'Matriz inversa y condición de singularidad',
    ],
  },
  {
    id: 'unit-5',
    number: 5,
    title: 'Sistemas de Ecuaciones Lineales',
    subtitle: 'Gauss-Jordan paso a paso + geometría SCD, SCI, SI',
    available: true,
    topics: [
      'Eliminación de Gauss-Jordan interactiva',
      'Teorema de Rouché-Frobenius',
      'Interpretación geométrica de SCD, SCI y SI en ℝ² y ℝ³',
    ],
  },
  {
    id: 'unit-6',
    number: 6,
    title: 'Espacios Vectoriales',
    subtitle: 'Combinación lineal, Span, independencia y base',
    available: true,
    topics: [
      'Combinación lineal y coordenadas',
      'Subespacio generado (Span)',
      'Independencia lineal vs. dependencia',
      'Cambio de base y grillas deformadas',
    ],
  },
  {
    id: 'unit-7',
    number: 7,
    title: 'Transformaciones Lineales',
    subtitle: 'Deformación animada del espacio, Núcleo e Imagen',
    available: true,
    topics: [
      'Matriz asociada a una transformación lineal',
      'Rotación, reflexión, cizallamiento y proyección',
      'Núcleo (Kernel) e Imagen (Rango)',
    ],
  },
  {
    id: 'unit-8',
    number: 8,
    title: 'Autovalores y Autovectores',
    subtitle: 'Rectas invariantes, estiramiento por λ y diagonalización',
    available: true,
    topics: [
      'Polinomio característico y cálculo de λ',
      'Subespacios propios y direcciones invariantes',
      'Diagonalización de matrices simétricas y generales',
    ],
  },
];
