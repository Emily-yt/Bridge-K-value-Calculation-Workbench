/**
 * K值计算核心引擎 v2.0
 * 根据 docs/K值计算逻辑.md 实现
 * 包含K1-K5全部分项检定承载系数计算
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

  const {
    beamPosition,
    curveRadius,
    eccentricityE,
    ballastThicknessT,
    impactFactor,
    damageFactors,
  } = input;

  if (!BEAM_POSITIONS.has(beamPosition)) {
    throw new Error('梁体类型须为：直线梁 / 曲线外梁 / 曲线内梁');
  }

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

function lookupEtaL8(fp, beamPosition, curveRadius, eccentricityE) {
  const l8Table = fp.eccentricityTable?.l8;
  if (!l8Table) throw new Error('固定参数缺少 eccentricityTable.l8');

  if (beamPosition === '直线梁') {
    const table = l8Table['直线梁'];
    const eArr = Object.keys(table).map(Number).sort((a, b) => a - b);
    const etaMArr = eArr.map(e => table[String(e)].etaM);
    const etaQArr = eArr.map(e => table[String(e)].etaQ);

    return {
      etaM: interpolateArrays(eccentricityE, eArr, etaMArr),
      etaQ: interpolateArrays(eccentricityE, eArr, etaQArr),
    };
  }

  const rKey = `R${standardRadius(curveRadius)}`;
  const pos = beamPosition === '曲线外梁' ? '曲线外梁' : '曲线内梁';
  const table = l8Table[pos]?.[rKey];

  if (!table) throw new Error(`缺少L/8偏载系数表：${pos} ${rKey}`);

  const eArr = Object.keys(table).map(Number).sort((a, b) => a - b);
  const etaMArr = eArr.map(e => table[String(e)].etaM);
  const etaQArr = eArr.map(e => table[String(e)].etaQ);

  return {
    etaM: interpolateArrays(eccentricityE, eArr, etaMArr),
    etaQ: interpolateArrays(eccentricityE, eArr, etaQArr),
  };
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

function demandAbs(value) {
  return Math.abs(Number(value) || 0);
}

/**
 * 计算K5（斜截面抗裂性）- 通过方程组求解
 * 应满足 |σtp| ≤ Z3H·fct
 *
 * 根据文档公式：
 * σc = Z2M·Z4Y·σpc - K·[Z2M·σ_dead + K5·Z2M·(1+μ)·ηM·σ_L]
 * τc = K·[Z2Q·τ_dead + K5·Z2Q·(1+μ)·ηQ·τ_L] - Z2Q·Z4Y·τpc
 * σtp = σc/2 - sqrt((σc/2)^2 + τc^2)
 */
function calculateK5(
  sigma_c_dead,
  tau_dead,
  sigma_pc_eff,
  tau_pc_eff,
  sigma_L_live,
  tau_L_live,
  mu1,
  etaM,
  etaQ,
  z2m,
  z2q,
  z3h,
  K_crack,
  fct
) {
  let k5_low = 0;
  let k5_high = 5;

  const fctEffective = z3h * fct;
  const tolerance = 0.0001;
  const maxIter = 100;

  // 正应力保留符号，剪应力取幅值
  const sigmaDeadDemand = sigma_c_dead;
  const sigmaLiveDemand = sigma_L_live;
  const tauDeadDemand = demandAbs(tau_dead);
  const tauLiveDemand = demandAbs(tau_L_live);

  for (let i = 0; i < maxIter; i++) {
    const k5 = (k5_low + k5_high) / 2;

    const sigma_c =
      sigma_pc_eff +
      K_crack * (
        z2m * sigmaDeadDemand +
        k5 * z2m * mu1 * etaM * sigmaLiveDemand
      );

    const tau_c =
      K_crack * (
        z2q * tauDeadDemand +
        k5 * z2q * mu1 * etaQ * tauLiveDemand
      ) -
      tau_pc_eff;

    const sigma_tp =
      sigma_c / 2 -
      Math.sqrt(Math.pow(sigma_c / 2, 2) + Math.pow(tau_c, 2));

    const absSigmaTp = Math.abs(sigma_tp);

    if (Math.abs(absSigmaTp - fctEffective) < tolerance) {
      return k5;
    }

    if (absSigmaTp > fctEffective) {
      k5_high = k5;
    } else {
      k5_low = k5;
    }
  }

  return (k5_low + k5_high) / 2;
}

/**
 * @param {string} beamType 梁型图号，对应 fixed_params.spanTypes
 * @param {object} input 用户输入（含 damageFactors）
 * @param {object} fixedRoot 完整 fixed_params 根对象
 */
export function runKValueCalculation(beamType, input, fixedRoot) {
  validateCalculationInput(input);

  const fp = fixedRoot.spanTypes?.[beamType];
  if (!fp) {
    throw new Error(`未配置梁型「${beamType}」的固定参数，请在 data/fixed_params.json 中补充`);
  }

  const z = normDamage(input);
  const beamPosition = input.beamPosition;
  const curveRadius = beamPosition === '直线梁' ? null : input.curveRadius;
  const t = input.ballastThicknessT;
  const mu1 = input.impactFactor;
  const eMm = input.eccentricityE;

  // 获取安全系数
  const Kw = fp.safetyFactors?.strength ?? 2.0;
  const K_crack = fp.safetyFactors?.crackResistance ?? 1.2;

  // 获取材料参数
  const fct = fp.concrete?.tensileStrength ?? 3.02;
  const fc = fp.concrete?.compressiveStrength ?? 32.10;
  const gamma =
    fp.concrete?.plasticFactor?.[beamPosition === '直线梁' ? '直线梁' : '曲线梁'] ??
    1.323;

  // ===== 跨中截面参数 =====
  const ms = fp.internalForces.midspan;
  const mq0 = ms.mq0;
  const mq1Val = ms.mq1[beamPosition];
  const mq2 = ms.mq2;
  const mq3 = ms.mq3Per10cm;
  const mLZh = ms.mL['中-活载'];

  // 跨中应力参数
  const sigmaMid = fp.stresses?.midspan;
  const sigma_q0_mid = sigmaMid?.sigma_q0 ?? -6.520;
  const sigma_q1_mid = sigmaMid?.sigma_q1?.[beamPosition] ?? -3.211;
  const sigma_q2_mid = sigmaMid?.sigma_q2 ?? -0.948;
  const sigma_q3_mid = sigmaMid?.sigma_q3Per10cm ?? -0.675;
  const sigma_L_mid = sigmaMid?.sigma_L?.['中-活载'] ?? -8.539;

  // 跨中预应力效应
  const sigma_pc_mid =
    fp.prestressEffect?.midspan?.sigma_pc?.[beamPosition] ??
    (beamPosition === '直线梁' ? 20.956 : 23.995);

  // 查表获取跨中偏载系数
  const etaM_mid = lookupEtaMidspan(fp, beamPosition, curveRadius, eMm);

  // 计算跨中主力组合
  const deadLoadMoment = mq0 + mq1Val + mq2 + (t / 10) * mq3;
  const liveLoadMoment = mu1 * etaM_mid * mLZh;
  const momentM = deadLoadMoment + liveLoadMoment;

  const deadLoadSigmaMid =
    sigma_q0_mid + sigma_q1_mid + sigma_q2_mid + (t / 10) * sigma_q3_mid;
  const liveLoadSigmaMid = mu1 * etaM_mid * sigma_L_mid;
  const sigmaMidTotal = deadLoadSigmaMid + liveLoadSigmaMid;

  // K2、K3 使用“应力需求值”，避免表格负号导致减负变加
  const deadLoadSigmaMidDemand = demandAbs(deadLoadSigmaMid);
  const sigmaLiveMidDemand = demandAbs(sigma_L_mid);

  // ===== L/8截面参数 =====
  const l8 = fp.internalForces.l8;
  const l8Stresses = fp.stresses?.l8;
  const l8Prestress = fp.prestressEffect?.l8;

  // L/8内力参数（对应V_min工况）
  const mq0_l8_q = l8.mq0.q;
  const mq1_l8_q = l8.mq1[beamPosition].q;
  const mq2_l8_q = l8.mq2.q;
  const mq3_l8_q = l8.mq3Per10cm.q;
  const mL_l8_q = l8.mL['中-活载'].qMax;

  // L/8剪应力参数（中性轴，用于K4）
  const tau_q0_l8 = l8Stresses?.neutral?.tau_q0 ?? -1.197;
  const tau_q1_l8 = l8Stresses?.neutral?.tau_q1?.[beamPosition] ?? -0.667;
  const tau_q2_l8 = l8Stresses?.neutral?.tau_q2 ?? -0.197;
  const tau_q3_l8 = l8Stresses?.neutral?.tau_q3Per10cm ?? -0.140;
  const tau_L_l8 = l8Stresses?.vMin?.neutral?.tau_L?.['中-活载'] ?? -2.198;

  // L/8下梗腋应力参数
  // 最低限度修正：
  // K5 不再只验算 Mmax 下梗腋，同时补充 Vmin 下梗腋。
  //
  // 兼容两种 fixed_params 结构：
  // 1）旧结构：l8Stresses.lowerHaunch 表示 Mmax 下梗腋；
  // 2）新结构：l8Stresses.mMax.lowerHaunch / l8Stresses.vMin.lowerHaunch 分别表示两种工况。
  const lowerHaunchMMax = l8Stresses?.mMax?.lowerHaunch ?? l8Stresses?.lowerHaunch;
  const lowerHaunchVMin = l8Stresses?.vMin?.lowerHaunch;

  // Mmax 下梗腋
  const sigma_q0_lh = lowerHaunchMMax?.sigma_q0 ?? -1.692;
  const sigma_q1_lh = lowerHaunchMMax?.sigma_q1?.[beamPosition] ?? -0.838;
  const sigma_q2_lh = lowerHaunchMMax?.sigma_q2 ?? -0.247;
  const sigma_q3_lh = lowerHaunchMMax?.sigma_q3Per10cm ?? -0.176;
  const sigma_L_lh = lowerHaunchMMax?.sigma_L?.['中-活载'] ?? -2.468;

  const tau_q0_lh = lowerHaunchMMax?.tau_q0 ?? -1.039;
  const tau_q1_lh = lowerHaunchMMax?.tau_q1?.[beamPosition] ?? -0.593;
  const tau_q2_lh = lowerHaunchMMax?.tau_q2 ?? -0.175;
  const tau_q3_lh = lowerHaunchMMax?.tau_q3Per10cm ?? -0.125;
  const tau_L_lh = lowerHaunchMMax?.tau_L?.['中-活载'] ?? -1.558;

  // Vmin 下梗腋
  // 恒载和预应力在报告表中与 Mmax 工况相同；
  // 如果 fixed_params 中单独配置了 vMin，则优先取 vMin。
  const sigma_q0_lh_vMin = lowerHaunchVMin?.sigma_q0 ?? sigma_q0_lh;
  const sigma_q1_lh_vMin = lowerHaunchVMin?.sigma_q1?.[beamPosition] ?? sigma_q1_lh;
  const sigma_q2_lh_vMin = lowerHaunchVMin?.sigma_q2 ?? sigma_q2_lh;
  const sigma_q3_lh_vMin = lowerHaunchVMin?.sigma_q3Per10cm ?? sigma_q3_lh;
  const sigma_L_lh_vMin = lowerHaunchVMin?.sigma_L?.['中-活载'] ?? -2.370;

  const tau_q0_lh_vMin = lowerHaunchVMin?.tau_q0 ?? tau_q0_lh;
  const tau_q1_lh_vMin = lowerHaunchVMin?.tau_q1?.[beamPosition] ?? tau_q1_lh;
  const tau_q2_lh_vMin = lowerHaunchVMin?.tau_q2 ?? tau_q2_lh;
  const tau_q3_lh_vMin = lowerHaunchVMin?.tau_q3Per10cm ?? tau_q3_lh;
  const tau_L_lh_vMin = lowerHaunchVMin?.tau_L?.['中-活载'] ?? -1.956;

  // L/8预应力效应
  const tau_pc_l8 =
    l8Prestress?.neutral?.tau_pc?.[beamPosition] ??
    (beamPosition === '直线梁' ? 1.262 : 1.367);

  const sigma_pc_lh =
    l8Prestress?.lowerHaunch?.sigma_pc?.[beamPosition] ??
    (beamPosition === '直线梁' ? 13.040 : 14.750);

  const tau_pc_lh =
    l8Prestress?.lowerHaunch?.tau_pc?.[beamPosition] ??
    (beamPosition === '直线梁' ? 1.087 : 1.172);

  // 查表获取L/8偏载系数
  const etaL8 = lookupEtaL8(fp, beamPosition, curveRadius, eMm);
  const etaM_l8 = etaL8.etaM;
  const etaQ_l8 = etaL8.etaQ;

  // 计算L/8主力组合
  const deadLoadTauL8 =
    tau_q0_l8 + tau_q1_l8 + tau_q2_l8 + (t / 10) * tau_q3_l8;
  const liveLoadTauL8 = mu1 * etaQ_l8 * tau_L_l8;
  const tauL8Total = deadLoadTauL8 + liveLoadTauL8;

  // K4 使用“剪应力需求值”，避免表格负号导致减负变加
  const deadLoadTauL8Demand = demandAbs(deadLoadTauL8);
  const tauLiveL8Demand = demandAbs(tau_L_l8);

  // Mmax 下梗腋合计
  const deadLoadSigmaLh =
    sigma_q0_lh + sigma_q1_lh + sigma_q2_lh + (t / 10) * sigma_q3_lh;
  const liveLoadSigmaLh = mu1 * etaM_l8 * sigma_L_lh;

  const deadLoadTauLh =
    tau_q0_lh + tau_q1_lh + tau_q2_lh + (t / 10) * tau_q3_lh;
  const liveLoadTauLh = mu1 * etaQ_l8 * tau_L_lh;

  // Vmin 下梗腋合计
  const deadLoadSigmaLhVMin =
    sigma_q0_lh_vMin +
    sigma_q1_lh_vMin +
    sigma_q2_lh_vMin +
    (t / 10) * sigma_q3_lh_vMin;

  const liveLoadSigmaLhVMin = mu1 * etaM_l8 * sigma_L_lh_vMin;

  const deadLoadTauLhVMin =
    tau_q0_lh_vMin +
    tau_q1_lh_vMin +
    tau_q2_lh_vMin +
    (t / 10) * tau_q3_lh_vMin;

  const liveLoadTauLhVMin = mu1 * etaQ_l8 * tau_L_lh_vMin;

  // ===== 强度参数 =====
  const mpStraight = fp.strength.mp['直线梁'];
  const mpCurve = fp.strength.mp['曲线梁'];
  const mpVal = beamPosition === '直线梁' ? mpStraight : mpCurve;

  // ===== K1：正截面抗弯强度 =====
  // K1 = (Z1M·Mp/Kw − Σ恒载弯矩) / ((1+μ)·η·ML)
  const k1Num = (z.z1m * mpVal) / Kw - deadLoadMoment;
  const k1Den = mu1 * etaM_mid * mLZh;
  const k1 = k1Den !== 0 ? Math.max(0, k1Num / k1Den) : 0;

  // ===== K2：正截面抗裂性 =====
  // K2 = [(Z2M·Z4Y·σpc + γ·Z3H·fct)/K − Z2M·Σ恒载应力需求] / [Z2M·(1+μ)·η·σL需求]
  const k2Num =
    (z.z2m * z.z4y * sigma_pc_mid + gamma * z.z3h * fct) / K_crack -
    z.z2m * deadLoadSigmaMidDemand;

  const k2Den = z.z2m * mu1 * etaM_mid * sigmaLiveMidDemand;
  const k2 = k2Den !== 0 ? Math.max(0, k2Num / k2Den) : 0;

  // ===== K3：正截面应力 =====
  // K3 = [Z2M·Z4Y·σpc − Z2M·Σ恒载应力需求] / [Z2M·(1+μ)·η·σL需求]
  const k3Num =
    z.z2m * z.z4y * sigma_pc_mid -
    z.z2m * deadLoadSigmaMidDemand;

  const k3Den = z.z2m * mu1 * etaM_mid * sigmaLiveMidDemand;
  const k3 = k3Den !== 0 ? Math.max(0, k3Num / k3Den) : 0;

  // ===== K4：斜截面剪应力 =====
  // K4 = [(Z2Q·Z4Y·τpc + Z3H·0.17·fc) − Z2Q·Σ恒载剪应力需求] / [Z2Q·(1+μ)·ηQ·τL需求]
  const k4Num =
    z.z2q * z.z4y * tau_pc_l8 +
    z.z3h * 0.17 * fc -
    z.z2q * deadLoadTauL8Demand;

  const k4Den = z.z2q * mu1 * etaQ_l8 * tauLiveL8Demand;
  const k4 = k4Den !== 0 ? Math.max(0, k4Num / k4Den) : 0;

  // ===== K5：斜截面抗裂性 =====
  // 使用方程组求解，应满足 |σtp| ≤ Z3H·fct
  const sigma_pc_eff = z.z2m * z.z4y * sigma_pc_lh;
  const tau_pc_eff = z.z2q * z.z4y * tau_pc_lh;

  // Mmax 下梗腋 K5
  const k5MMaxLowerHaunch = calculateK5(
    deadLoadSigmaLh,
    deadLoadTauLh,
    sigma_pc_eff,
    tau_pc_eff,
    sigma_L_lh,
    tau_L_lh,
    mu1,
    etaM_l8,
    etaQ_l8,
    z.z2m,
    z.z2q,
    z.z3h,
    K_crack,
    fct
  );

  // Vmin 下梗腋 K5
  const k5VMinLowerHaunch = calculateK5(
    deadLoadSigmaLhVMin,
    deadLoadTauLhVMin,
    sigma_pc_eff,
    tau_pc_eff,
    sigma_L_lh_vMin,
    tau_L_lh_vMin,
    mu1,
    etaM_l8,
    etaQ_l8,
    z.z2m,
    z.z2q,
    z.z3h,
    K_crack,
    fct
  );

  // 最低限度修正：K5 同时验算 Mmax 下梗腋和 Vmin 下梗腋，取较小值作为控制值
  let k5 = Math.min(k5MMaxLowerHaunch, k5VMinLowerHaunch);
  let k5ControlCase =
    k5MMaxLowerHaunch <= k5VMinLowerHaunch ? 'Mmax下梗腋' : 'Vmin下梗腋';

  // 最终K值取最小值
  const kFinal = Math.min(k1, k2, k3, k4, k5);

  // ===== Q值计算（当K < 1时）=====
  let qC80 = null;
  let qKM98 = null;
  let qResult = null;

  if (kFinal < 1.0) {
    const mL_C80 = ms.mL['C80'];
    const mL_KM98 = ms.mL['KM98'];
    const mL_Zhong = ms.mL['中-活载'];

    const mL_l8_C80 = l8.mL['C80'].qMin;
    const mL_l8_KM98 = l8.mL['KM98'].qMin;
    const mL_l8_Zhong = l8.mL['中-活载'].qMin;

    const qC80_M = mL_C80 / mL_Zhong;
    const qC80_V = Math.abs(mL_l8_C80) / Math.abs(mL_l8_Zhong);
    qC80 = Math.max(qC80_M, qC80_V);

    const qKM98_M = mL_KM98 / mL_Zhong;
    const qKM98_V = Math.abs(mL_l8_KM98) / Math.abs(mL_l8_Zhong);
    qKM98 = Math.max(qKM98_M, qKM98_V);

    qResult = {
      c80: {
        q: Number(qC80.toFixed(4)),
        meetsRequirement: qC80 < kFinal,
      },
      km98: {
        q: Number(qKM98.toFixed(4)),
        meetsRequirement: qKM98 < kFinal,
      },
    };
  }

  // 追踪参数
  const fixedParamsTrace = {
    // 跨中参数
    mq0,
    mq1: mq1Val,
    mq2,
    mq3,
    mL: mLZh,
    sigma_q0: sigma_q0_mid,
    sigma_q1: sigma_q1_mid,
    sigma_q2: sigma_q2_mid,
    sigma_q3: sigma_q3_mid,
    sigma_L: sigma_L_mid,
    sigma_pc_mid,
    etaM: etaM_mid,

    // L/8参数
    tau_q0: tau_q0_l8,
    tau_q1: tau_q1_l8,
    tau_q2: tau_q2_l8,
    tau_q3: tau_q3_l8,
    tau_L: tau_L_l8,
    tau_pc_l8,
    etaM_l8,
    etaQ_l8,

    // Mmax 下梗腋参数
    sigma_q0_lh,
    sigma_q1_lh,
    sigma_q2_lh,
    sigma_q3_lh,
    sigma_L_lh,
    tau_q0_lh,
    tau_q1_lh,
    tau_q2_lh,
    tau_q3_lh,
    tau_L_lh,

    // Vmin 下梗腋参数
    sigma_q0_lh_vMin,
    sigma_q1_lh_vMin,
    sigma_q2_lh_vMin,
    sigma_q3_lh_vMin,
    sigma_L_lh_vMin,
    tau_q0_lh_vMin,
    tau_q1_lh_vMin,
    tau_q2_lh_vMin,
    tau_q3_lh_vMin,
    tau_L_lh_vMin,

    // 预应力参数
    sigma_pc_lh,
    tau_pc_lh,

    k5MMaxLowerHaunch,
    k5VMinLowerHaunch,
    k5ControlCase,

    // 材料参数
    mp: mpVal,
    Kw,
    K_crack,
    fct,
    fc,
    gamma,

    // 修正系数
    damageFactors: z,

    // 保留中间量，方便调试
    momentM,
    sigmaMidTotal,
    tauL8Total,
    liveLoadMoment,
    liveLoadSigmaMid,
    liveLoadTauL8,
    liveLoadSigmaLh,
    liveLoadTauLh,
    liveLoadSigmaLhVMin,
    liveLoadTauLhVMin,
  };

  return {
    etaM: etaM_mid,
    etaL8Q: etaQ_l8,
    momentM,
    fixedParamsTrace,
    output: {
      k1: Number(k1.toFixed(4)),
      k2: Number(k2.toFixed(4)),
      k3: Number(k3.toFixed(4)),
      k4: Number(k4.toFixed(4)),
      k5: Number(k5.toFixed(4)),
      kFinal: Number(kFinal.toFixed(4)),
      qResult,
    },
  };
}