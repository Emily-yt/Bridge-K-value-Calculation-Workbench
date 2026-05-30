/** 单孔梁档案（与 data/bridges.json 一致） */
export interface BeamSpan {
  index: number;
  beamLength: number;
  beamHeight: number;
  beamCenterDist: number;
  beamType: string;
}

/** 桥梁基础信息 */
export interface Bridge {
  id: string;
  bridgeName: string;
  lineName: string;
  bridgeNo: string;
  centerMileage: string;
  spanType: string;
  spanCount: number;
  spans: BeamSpan[];
  buildYear: number;
  operationStatus: string;
}

/** 新建桥梁请求参数，派生字段由后端统一生成 */
export interface CreateBridgeInput {
  bridgeName: string;
  lineName: string;
  bridgeNo: string;
  centerMileage: string;
  buildYear: number;
  operationStatus: '运营中' | '已停用';
  structureType: string;
  spans: BeamSpan[];
}

/** 删除桥梁后的级联删除统计 */
export interface DeleteBridgeResult {
  deleted: true;
  deletedCalculations: number;
}

/** 损伤修正系数（与后端 input.damageFactors 一致） */
export interface DamageFactors {
  z1m: number;
  z1q: number;
  z2m: number;
  z2q: number;
  z3h: number;
  z3y: number;
  z4y: number;
}

/** K值计算输入（POST /api/calculations 的 input） */
export interface KValueInput {
  beamPosition: string;
  curveRadius: number | null;
  eccentricityE: number;
  ballastThicknessT: number;
  impactFactor: number;
  damageFactors: DamageFactors;
}

/** 中间结果 */
export interface KValueIntermediate {
  etaM: number;
  momentM: number;
  fixedParams: Record<string, unknown>;
}

/** Q值计算结果 */
export interface QValueResult {
  c80: { q: number; meetsRequirement: boolean };
  km98: { q: number; meetsRequirement: boolean };
}

/** 计算输出（不含主力弯矩，弯矩在 intermediate） */
export interface KValueOutput {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  kFinal: number;
  calcTime: string;
  qResult?: QValueResult | null;
}

export interface CalculationReport {
  generated: boolean;
  filePath: string | null;
  generateTime: string | null;
  notes?: string;
  reviewer?: string;
}

/** K值计算记录（与 data/k_calculations.json 中单条结构一致） */
export interface KValueCalculation {
  id: string;
  bridgeId: string;
  spanIndex: number;
  spanLength: number;
  beamType: string;
  createTime: string;
  creator: string;
  creatorId?: string | null;
  input: KValueInput;
  intermediate: KValueIntermediate;
  output: KValueOutput;
  report?: CalculationReport;
  bridge?: Bridge;
}

/** 首页卡片显示控制 */
export interface CardVisibility {
  totalBridges: boolean;
  pendingCalculation: boolean;
  lowKValue: boolean;
  monthlyExpire: boolean;
}


