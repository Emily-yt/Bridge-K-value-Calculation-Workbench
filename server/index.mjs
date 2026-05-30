import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runKValueCalculation } from './kValueEngine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const PORT = Number(process.env.PORT) || 3000;

async function readJsonFile(relPath) {
  const full = path.join(DATA_DIR, relPath);
  const text = await fs.readFile(full, 'utf8');
  return JSON.parse(text);
}

async function writeJsonFile(relPath, obj) {
  const full = path.join(DATA_DIR, relPath);
  await fs.writeFile(full, JSON.stringify(obj, null, 2), 'utf8');
}

function ok(res, data) {
  res.json({ code: 0, message: 'success', data });
}

function fail(res, status, message) {
  res.status(status).json({ code: status === 400 ? 400 : 500, message });
}

// 获取北京时间字符串（UTC+8）
function getBeijingTime() {
  const now = new Date();
  // 转换为北京时间（UTC+8）
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().replace('Z', '+08:00');
}

function roundKs(o) {
  const r = (x) => Math.round(x * 10000) / 10000;
  const result = {
    k1: r(o.k1),
    k2: r(o.k2),
    k3: r(o.k3),
    k4: r(o.k4),
    k5: r(o.k5),
    kFinal: r(o.kFinal),
  };
  // 如果存在Q值计算结果，一并返回
  if (o.qResult) {
    result.qResult = o.qResult;
  }
  return result;
}

let fixedParamsCache = null;

async function getFixedParams() {
  if (!fixedParamsCache) {
    fixedParamsCache = await readJsonFile('fixed_params.json');
  }
  return fixedParamsCache;
}

function generateBridgeId(list) {
  const maxId = list.reduce((max, bridge) => {
    const match = /^BRG(\d+)$/.exec(bridge.id || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `BRG${String(maxId + 1).padStart(3, '0')}`;
}

function getNominalSpanLength(beamLength) {
  return Number.isInteger(beamLength) ? beamLength : Math.floor(beamLength);
}

function buildSpanType(spans, structureType) {
  const groups = [];
  for (const span of spans) {
    const nominalLength = getNominalSpanLength(span.beamLength);
    const last = groups.at(-1);
    if (last && last.nominalLength === nominalLength) {
      last.count += 1;
    } else {
      groups.push({ count: 1, nominalLength });
    }
  }
  return `${groups.map((group) => `${group.count}-${group.nominalLength}m`).join('/')}-${structureType}`;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/bridges', async (_req, res) => {
  try {
    const bridges = await readJsonFile('bridges.json');
    ok(res, Array.isArray(bridges) ? bridges : bridges.list || []);
  } catch (e) {
    fail(res, 500, e.message || '读取桥梁数据失败');
  }
});

app.post('/api/bridges', async (req, res) => {
  try {
    const {
      bridgeName,
      lineName,
      bridgeNo,
      centerMileage,
      buildYear,
      operationStatus,
      structureType,
      spans,
    } = req.body || {};
    const normalized = {
      bridgeName: typeof bridgeName === 'string' ? bridgeName.trim() : '',
      lineName: typeof lineName === 'string' ? lineName.trim() : '',
      bridgeNo: typeof bridgeNo === 'string' ? bridgeNo.trim() : '',
      centerMileage: typeof centerMileage === 'string' ? centerMileage.trim() : '',
      structureType: typeof structureType === 'string' ? structureType.trim() : '',
    };

    if (Object.values(normalized).some((value) => !value)) {
      return fail(res, 400, '请完整填写桥梁名称、线路、桥号、中心里程和结构形式');
    }

    const year = Number(buildYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
      return fail(res, 400, `建成年份必须为 1800 至 ${currentYear} 之间的整数`);
    }
    if (!['运营中', '已停用'].includes(operationStatus)) {
      return fail(res, 400, '运营状态必须为“运营中”或“已停用”');
    }
    if (!Array.isArray(spans) || spans.length === 0) {
      return fail(res, 400, '请至少配置一个孔跨');
    }

    const normalizedSpans = [];
    for (let i = 0; i < spans.length; i += 1) {
      const span = spans[i] || {};
      const index = Number(span.index);
      const beamLength = Number(span.beamLength);
      const beamHeight = Number(span.beamHeight);
      const beamCenterDist = Number(span.beamCenterDist);
      const beamType = typeof span.beamType === 'string' ? span.beamType.trim() : '';

      if (index !== i + 1) {
        return fail(res, 400, '孔跨序号必须从 1 开始连续递增');
      }
      if (!Number.isFinite(beamLength) || beamLength <= 0) {
        return fail(res, 400, `第 ${index} 孔的梁长必须大于 0`);
      }
      if (!Number.isFinite(beamHeight) || beamHeight < 0) {
        return fail(res, 400, `第 ${index} 孔的梁高不能小于 0`);
      }
      if (!Number.isFinite(beamCenterDist) || beamCenterDist <= 0) {
        return fail(res, 400, `第 ${index} 孔的梁中心距必须大于 0`);
      }
      if (!beamType) {
        return fail(res, 400, `请填写第 ${index} 孔的梁型图号`);
      }

      normalizedSpans.push({ index, beamLength, beamHeight, beamCenterDist, beamType });
    }

    const bridges = await readJsonFile('bridges.json');
    const list = Array.isArray(bridges) ? bridges : bridges.list || [];
    const duplicate = list.some(
      (bridge) =>
        bridge.lineName?.trim().toLowerCase() === normalized.lineName.toLowerCase() &&
        bridge.bridgeNo?.trim().toLowerCase() === normalized.bridgeNo.toLowerCase()
    );
    if (duplicate) {
      return fail(res, 400, `线路“${normalized.lineName}”中已存在桥号“${normalized.bridgeNo}”`);
    }

    const bridge = {
      id: generateBridgeId(list),
      bridgeName: normalized.bridgeName,
      lineName: normalized.lineName,
      bridgeNo: normalized.bridgeNo,
      centerMileage: normalized.centerMileage,
      spanType: buildSpanType(normalizedSpans, normalized.structureType),
      spanCount: normalizedSpans.length,
      spans: normalizedSpans,
      buildYear: year,
      operationStatus,
    };

    list.push(bridge);
    if (Array.isArray(bridges)) {
      await writeJsonFile('bridges.json', list);
    } else {
      bridges.list = list;
      await writeJsonFile('bridges.json', bridges);
    }
    ok(res, bridge);
  } catch (e) {
    fail(res, 500, e.message || '新增桥梁失败');
  }
});

app.delete('/api/bridges/:id', async (req, res) => {
  try {
    const bridges = await readJsonFile('bridges.json');
    const list = Array.isArray(bridges) ? bridges : bridges.list || [];
    const bridgeExists = list.some((bridge) => bridge.id === req.params.id);
    if (!bridgeExists) return fail(res, 404, '桥梁不存在');

    const store = await readJsonFile('k_calculations.json');
    const calculations = store.calculations || [];
    const remainingCalculations = calculations.filter((calculation) => calculation.bridgeId !== req.params.id);
    const deletedCalculations = calculations.length - remainingCalculations.length;
    const remainingBridges = list.filter((bridge) => bridge.id !== req.params.id);

    store.calculations = remainingCalculations;
    await writeJsonFile('k_calculations.json', store);

    if (Array.isArray(bridges)) {
      await writeJsonFile('bridges.json', remainingBridges);
    } else {
      bridges.list = remainingBridges;
      await writeJsonFile('bridges.json', bridges);
    }

    ok(res, { deleted: true, deletedCalculations });
  } catch (e) {
    fail(res, 500, e.message || '删除桥梁失败');
  }
});

app.get('/api/bridges/:id', async (req, res) => {
  try {
    const bridges = await readJsonFile('bridges.json');
    const list = Array.isArray(bridges) ? bridges : bridges.list || [];
    const b = list.find((x) => x.id === req.params.id);
    if (!b) return fail(res, 404, '桥梁不存在');
    ok(res, b);
  } catch (e) {
    fail(res, 500, e.message || '读取失败');
  }
});

app.get('/api/bridges/:id/calculations', async (req, res) => {
  try {
    const store = await readJsonFile('k_calculations.json');
    const list = (store.calculations || []).filter((c) => c.bridgeId === req.params.id);
    ok(res, list);
  } catch (e) {
    fail(res, 500, e.message || '读取失败');
  }
});

app.get('/api/calculations', async (_req, res) => {
  try {
    const store = await readJsonFile('k_calculations.json');
    ok(res, store.calculations || []);
  } catch (e) {
    fail(res, 500, e.message || '读取失败');
  }
});

app.get('/api/calculations/:id', async (req, res) => {
  try {
    const store = await readJsonFile('k_calculations.json');
    const c = (store.calculations || []).find((x) => x.id === req.params.id);
    if (!c) return fail(res, 404, '计算记录不存在');
    
    // 关联桥梁信息
    const bridges = await readJsonFile('bridges.json');
    const list = Array.isArray(bridges) ? bridges : bridges.list || [];
    const bridge = list.find((x) => x.id === c.bridgeId);
    
    ok(res, { ...c, bridge: bridge || null });
  } catch (e) {
    fail(res, 500, e.message || '读取失败');
  }
});

// 保存K值计算记录（前端已完成计算）
app.post('/api/kvalue-save', async (req, res) => {
  try {
    const { bridgeId, spanIndex, input, output, intermediate, creator = '当前用户', creatorId = null } = req.body || {};
    const spanIdx = Number(spanIndex);
    if (!bridgeId || !Number.isInteger(spanIdx) || spanIdx < 1) {
      return fail(res, 400, '缺少 bridgeId 或有效的 spanIndex（正整数）');
    }
    if (!input || typeof input !== 'object') {
      return fail(res, 400, '缺少 input');
    }
    if (!output || typeof output !== 'object') {
      return fail(res, 400, '缺少 output（计算结果）');
    }

    const bridges = await readJsonFile('bridges.json');
    const list = Array.isArray(bridges) ? bridges : bridges.list || [];
    const bridge = list.find((x) => x.id === bridgeId);
    if (!bridge) return fail(res, 404, '桥梁不存在');

    const span = bridge.spans?.find((s) => s.index === spanIdx);
    if (!span) return fail(res, 400, `孔序号 ${spanIdx} 不存在`);

    const beamType = span.beamType;
    const spanLength = Math.floor(span.beamLength);

    const calcTime = getBeijingTime();
    const id = `CALC${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    const record = {
      id,
      bridgeId,
      spanIndex: spanIdx,
      spanLength,
      beamType,
      createTime: calcTime,
      creator,
      creatorId,
      input: {
        beamPosition: input.beamPosition,
        curveRadius: input.beamPosition === '直线梁' ? null : input.curveRadius,
        eccentricityE: input.eccentricityE,
        ballastThicknessT: input.ballastThicknessT,
        impactFactor: input.impactFactor,
        damageFactors: input.damageFactors || {},
      },
      intermediate: intermediate || {},
      output: {
        ...output,
        calcTime,
      },
      report: {
        generated: false,
        filePath: null,
        generateTime: null,
      },
    };

    const store = await readJsonFile('k_calculations.json');
    store.calculations = store.calculations || [];
    store.calculations.unshift(record);
    await writeJsonFile('k_calculations.json', store);

    ok(res, record);
  } catch (e) {
    fail(res, 500, e.message || '保存失败');
  }
});

app.delete('/api/calculations/:id', async (req, res) => {
  try {
    const store = await readJsonFile('k_calculations.json');
    const before = (store.calculations || []).length;
    store.calculations = (store.calculations || []).filter((x) => x.id !== req.params.id);
    if (store.calculations.length === before) return fail(res, 404, '记录不存在');
    await writeJsonFile('k_calculations.json', store);
    ok(res, { deleted: true });
  } catch (e) {
    fail(res, 500, e.message || '删除失败');
  }
});

// 保存报告人工填写内容。计算结果和系统结论始终由计算记录实时生成。
app.put('/api/calculations/:id/report', async (req, res) => {
  try {
    const { notes, reviewer } = req.body || {};
    const store = await readJsonFile('k_calculations.json');
    const c = (store.calculations || []).find((x) => x.id === req.params.id);
    if (!c) return fail(res, 404, '计算记录不存在');

    c.report = {
      ...(c.report || {}),
      generated: true,
      generateTime: getBeijingTime(),
      notes: notes !== undefined ? notes : c.report?.notes,
      reviewer: reviewer !== undefined ? reviewer : c.report?.reviewer,
    };

    await writeJsonFile('k_calculations.json', store);
    ok(res, c);
  } catch (e) {
    fail(res, 500, e.message || '保存失败');
  }
});

// 只计算K值，不保存
app.post('/api/kvalue-calculate', async (req, res) => {
  try {
    const { bridgeId, spanIndex, input } = req.body || {};
    const spanIdx = Number(spanIndex);
    if (!bridgeId || !Number.isInteger(spanIdx) || spanIdx < 1) {
      return fail(res, 400, '缺少 bridgeId 或有效的 spanIndex（正整数）');
    }
    if (!input || typeof input !== 'object') {
      return fail(res, 400, '缺少 input');
    }

    const bridges = await readJsonFile('bridges.json');
    const list = Array.isArray(bridges) ? bridges : bridges.list || [];
    const bridge = list.find((x) => x.id === bridgeId);
    if (!bridge) return fail(res, 404, '桥梁不存在');

    const span = bridge.spans?.find((s) => s.index === spanIdx);
    if (!span) return fail(res, 400, `孔序号 ${spanIdx} 不存在`);

    const beamType = span.beamType;
    const spanLength = Math.floor(span.beamLength);

    const fixedRoot = await getFixedParams();
    const raw = runKValueCalculation(beamType, input, fixedRoot);
    const ks = roundKs(raw.output);
    const momentR = Math.round(raw.momentM * 1000) / 1000;

    const calcTime = getBeijingTime();

    const result = {
      bridgeId,
      spanIndex: spanIdx,
      spanLength,
      beamType,
      input: {
        beamPosition: input.beamPosition,
        curveRadius: input.beamPosition === '直线梁' ? null : input.curveRadius,
        eccentricityE: input.eccentricityE,
        ballastThicknessT: input.ballastThicknessT,
        impactFactor: input.impactFactor,
        damageFactors: input.damageFactors || {},
      },
      intermediate: {
        etaM: raw.etaM,
        momentM: momentR,
        fixedParams: raw.fixedParamsTrace,
      },
      output: {
        ...ks,
        calcTime,
      },
    };

    ok(res, result);
  } catch (e) {
    const msg = e.message || '计算失败';
    const badInput =
      msg.includes('须') ||
      msg.includes('未配置') ||
      msg.includes('缺少') ||
      msg.includes('无效') ||
      msg.includes('不在');
    fail(res, badInput ? 400 : 500, msg);
  }
});

const distDir = path.join(ROOT, 'dist');
app.use(express.static(distDir));

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
