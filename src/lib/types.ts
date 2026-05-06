export interface Bridge {
  id: string;
  name: string;
  line: string;
  direction: string;
  mileage: string;
  span_type: string;
  span_count: number;
  year_built: number | null;
  drawing_number: string;
  created_at: string;
}

export interface Calculation {
  id: string;
  bridge_id: string;
  user_id: string;
  load_case: string;
  load_type: string;
  eccentricity: number;
  ballast_thickness: number;
  secondary_dead_load: number;
  capacity_coefficient: number;
  material_grade: string;
  elastic_modulus: number | null;
  poisson_ratio: number | null;
  thermal_coeff: number | null;
  strength: number | null;
  k_value_1985: number | null;
  k_value_2017_no_tension: number | null;
  k_value_2017_no_crack: number | null;
  controlling_k: number | null;
  controlling_code: string;
  risk_notes: string[];
  created_at: string;
  bridge?: Bridge;
}

export type StepId = 1 | 2 | 3 | 4;

export interface StepStatus {
  current: StepId;
  completed: StepId[];
}

export const DRAWING_OPTIONS = [
  '专桥2059',
  '专桥2060',
  '专桥2061',
  '专桥2062',
  '专桥2063',
];

export const LOAD_TYPE_OPTIONS = [
  '场80',
  '场60',
  '场40',
  '场20',
];

export const MATERIAL_MAP: Record<string, { grade: string; E: number; v: number; alpha: number; strength: number }> = {
  '专桥2059': { grade: 'C48', E: 34500, v: 0.2, alpha: 1e-5, strength: 32.1 },
  '专桥2060': { grade: 'C50', E: 35500, v: 0.2, alpha: 1e-5, strength: 33.5 },
  '专桥2061': { grade: 'C55', E: 37000, v: 0.2, alpha: 1e-5, strength: 35.2 },
  '专桥2062': { grade: 'C45', E: 33500, v: 0.2, alpha: 1e-5, strength: 30.8 },
  '专桥2063': { grade: 'C40', E: 32500, v: 0.2, alpha: 1e-5, strength: 28.5 },
};
