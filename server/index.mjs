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

// 保存报告内容（HTML）
app.put('/api/calculations/:id/report', async (req, res) => {
  try {
    const { htmlContent, notes, reviewer } = req.body || {};
    const store = await readJsonFile('k_calculations.json');
    const c = (store.calculations || []).find((x) => x.id === req.params.id);
    if (!c) return fail(res, 404, '计算记录不存在');

    c.report = {
      ...(c.report || {}),
      generated: true,
      generateTime: getBeijingTime(),
      htmlContent: htmlContent || c.report?.htmlContent,
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
