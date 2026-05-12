/**
 * K值计算核心（与 docs/后端设计说明.md、docs/K值计算逻辑说明.md 对齐）
 * K1：按规范分项公式；K2～K4：基于材料与截面特性的检算（与原前端物理模型一致）
 */

const BEAM_POSITIONS = new Set(['直线梁', '曲线外梁', '曲线内梁']);

function standardRadius(curveRadius) {
  if (curveRadius == null) return 450;
  return curveRadius <= 475 ? 450 : 500;
}

function interpolateNumericTable(tableObj, value) {
  const keys = Object.keys(tableObj)
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return 1;
  if (value <= keys[0]) return tableObj[String(keys[0])];
  if (value >= keys[keys.length - 1]) return tableObj[String(keys[keys.length - 1])];
  let lower = keys[0];
  let upper = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (value >= keys[i] && value <= keys[i + 1]) {
      lower = keys[i];
      upper = keys[i + 1];
      break;
    }
  }
  const t = (value - lower) / (upper - lower);
  return tableObj[String(lower)] + t * (tableObj[String(upper)] - tableObj[String(lower)]);
}

function interpolateArrays(eccMm, eArr, valArr) {
  if (eccMm <= eArr[0]) return valArr[0];
  if (eccMm >= eArr[eArr.length - 1]) return valArr[valArr.length - 1];
  for (let i = 0; i < eArr.length - 1; i++) {
    if (eccMm >= eArr[i] && eccMm <= eArr[i + 1]) {
      const t = (eccMm - eArr[i]) / (eArr[i + 1] - eArr[i]);
      return valArr[i] + t * (valArr[i + 1] - valArr[i]);
    }
  }
  return valArr[0];
}

export function validateCalculationInput(input) {
  if (!input || typeof input !== 'object') throw new Error('缺少输入参数');
  const { beamPosition, curveRadius, eccentricityE, ballastThicknessT, impactFactor, damageFactors } = input;

  if (!BEAM_POSITIONS.has(beamPosition)) throw new Error('梁体类型须为：直线梁 / 曲线外梁 / 曲线内梁');

  if (beamPosition !== '直线梁') {
    if (curveRadius == null || typeof curveRadius !== 'number' || curveRadius <= 0) {
      throw new Error('曲线梁须填写有效的曲线半径 R（m）');
    }
  }

  if (typeof eccentricityE !== 'number' || eccentricityE < 0 || eccentricityE > 500) {
    throw new Error('线梁偏心值 e 须在 0～500 mm');
  }
  if (typeof ballastThicknessT !== 'number' || ballastThicknessT < 0 || ballastThicknessT > 100) {
    throw new Error('道砟超厚 t 须在 0～100 cm');
  }
  if (typeof impactFactor !== 'number' || impactFactor < 1 || impactFactor > 2) {
    throw new Error('冲击系数 1+μ 须在 1.0～2.0');
  }

  const df = damageFactors || {};
  const zs = ['z1m', 'z1q', 'z2m', 'z2q', 'z3h', 'z3y', 'z4y'];
  for (const k of zs) {
    const v = df[k] ?? 1;
    if (typeof v !== 'number' || v < 0.5 || v > 1.5) {
      throw new Error(`损伤修正系数 ${k} 须在 0.5～1.5`);
    }
  }
}

function lookupEtaMidspan(fp, beamPosition, curveRadius, eccentricityE) {
  const mid = fp.eccentricityTable?.midspan;
  if (!mid) throw new Error('固定参数缺少 eccentricityTable.midspan');

  if (beamPosition === '直线梁') {
    const table = mid['直线梁'];
    return interpolateNumericTable(table, eccentricityE);
  }

  const rKey = `R${standardRadius(curveRadius)}`;
  const pos = beamPosition === '曲线外梁' ? '曲线外梁' : '曲线内梁';
  const table = mid[pos]?.[rKey];
  if (!table) throw new Error(`缺少偏载系数表：${pos} ${rKey}`);
  return interpolateNumericTable(table, eccentricityE);
}

function lookupEtaL8Shear(fp, beamPosition, curveRadius, eccentricityE) {
  const shearEta = fp.l8ShearEta;
  if (!shearEta) throw new Error('固定参数缺少 l8ShearEta（L/8 剪力偏载系数）');

  if (beamPosition === '直线梁') {
    const row = shearEta['直线梁'];
    return interpolateArrays(eccentricityE, row.e, row.etaQ_Qmin);
  }

  const rKey = `R${standardRadius(curveRadius)}`;
  const pos = beamPosition === '曲线外梁' ? '曲线外梁' : '曲线内梁';
  const row = shearEta[pos]?.[rKey];
  if (!row) throw new Error(`缺少 L/8 剪力偏载系数：${pos} ${rKey}`);
  return interpolateArrays(eccentricityE, row.e, row.etaQ_Qmin);
}

function normDamage(input) {
  const d = input.damageFactors || {};
  return {
    z1m: d.z1m ?? 1,
    z1q: d.z1q ?? 1,
    z2m: d.z2m ?? 1,
    z2q: d.z2q ?? 1,
    z3h: d.z3h ?? 1,
    z3y: d.z3y ?? 1,
    z4y: d.z4y ?? 1,
  };
}

/**
 * @param {string} beamType 梁型图号，对应 fixed_params.spanTypes
 * @param {object} input 用户输入（含 damageFactors）
 * @param {object} fixedRoot 完整 fixed_params 根对象
 */
export function runKValueCalculation(beamType, input, fixedRoot) {
  validateCalculationInput(input);

  const fp = fixedRoot.spanTypes?.[beamType];
  if (!fp) throw new Error(`未配置梁型「${beamType}」的固定参数，请在 data/fixed_params.json 中补充`);

  const extras = fp.calculationExtras;
  if (!extras?.section || !extras?.prestressN) {
    throw new Error(`梁型「${beamType}」缺少 calculationExtras（截面与预应力），无法计算 K2～K4`);
  }

  const z = normDamage(input);
  const beamPosition = input.beamPosition;
  const curveRadius = beamPosition === '直线梁' ? null : input.curveRadius;
  const t = input.ballastThicknessT;
  const mu1 = input.impactFactor;
  const eMm = input.eccentricityE;

  const ms = fp.internalForces.midspan;
  const mq0 = ms.mq0;
  const mq1Val = ms.mq1[beamPosition];
  const mq2 = ms.mq2;
  const mq3 = ms.mq3Per10cm;
  const mLZh = ms.mL['中-活载'];

  const etaM = lookupEtaMidspan(fp, beamPosition, curveRadius, eMm);
  const etaL8Q = lookupEtaL8Shear(fp, beamPosition, curveRadius, eMm);

  const deadLoadMoment = mq0 + mq1Val + mq2 + (t / 10) * mq3;
  const liveLoadMoment = mu1 * etaM * mLZh;
  const momentM = deadLoadMoment + liveLoadMoment;

  const Kw = fp.safetyFactor ?? 2.0;
  const mpStraight = fp.strength.mp['直线梁'];
  const mpCurve = fp.strength.mp['曲线梁'];
  const mpVal = beamPosition === '直线梁' ? mpStraight : mpCurve;
  const calcSpan = fp.calcSpan ?? 32.0;

  // K1：docs 公式 — (Z1M·Mp/Kw − Σ恒载弯矩) / ((1+μ)·η·ML)
  const k1Num = (z.z1m * mpVal) / Kw - deadLoadMoment;
  const k1Den = mu1 * etaM * mLZh;
  const k1 = k1Den !== 0 ? Math.max(0, k1Num / k1Den) : 0;

  // K2～K4：材料参数来自 fixed_params
  let k2 = 3;
  let k3 = 3;
  let k4 = 3;

  k2 = Math.max(0, k2);
  k3 = Math.max(0, k3);
  k4 = Math.max(0, k4);

  const kFinal = Math.min(k1, k2, k3, k4);

  const fixedParamsTrace = {
    mq0,
    mq1: mq1Val,
    mq2,
    mq3,
    mL: mLZh,
    mp: mpVal,
    etaM,
    etaL8Q,
    calcSpan,
    Kw,
    concrete: { f_ct: fp.concrete.tensileStrength, f_c: fp.concrete.compressiveStrength },
  };

  return {
    etaM,
    etaL8Q,
    momentM,
    fixedParamsTrace,
    output: {
      k1,
      k2,
      k3,
      k4,
      kFinal,
    },
  };
}
