import type { Bridge, KValueCalculation, KValueInput } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });
  } catch (e) {
    throw new Error(`无法连接到服务器，请检查后端服务是否运行中。(${(e as Error).message})`);
  }

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`服务器返回了非 JSON 数据 (HTTP ${res.status})，请检查 VITE_API_BASE_URL 配置是否正确。`);
  }

  if (!res.ok || (typeof json.code === 'number' && json.code !== 0)) {
    throw new Error(json.message as string || `请求失败 (${res.status})`);
  }
  if (json.data === undefined) {
    throw new Error(`服务器响应中缺少 data 字段`);
  }
  return json.data as T;
}

export async function getBridges(): Promise<Bridge[]> {
  return apiRequest<Bridge[]>('/api/bridges');
}

export async function getBridgeById(id: string): Promise<Bridge | null> {
  const bridges = await getBridges();
  return bridges.find((b) => b.id === id) || null;
}

export async function searchBridges(query: string): Promise<Bridge[]> {
  const bridges = await getBridges();
  const q = query.toLowerCase();
  return bridges.filter(
    (b) =>
      b.bridgeName.toLowerCase().includes(q) ||
      b.centerMileage.toLowerCase().includes(q) ||
      b.lineName.toLowerCase().includes(q)
  );
}

export async function getCalculations(): Promise<KValueCalculation[]> {
  return apiRequest<KValueCalculation[]>('/api/calculations');
}

export async function getCalculationById(id: string): Promise<KValueCalculation | null> {
  try {
    return await apiRequest<KValueCalculation>(`/api/calculations/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function getCalculationsByBridge(bridgeId: string): Promise<KValueCalculation[]> {
  return apiRequest<KValueCalculation[]>(
    `/api/bridges/${encodeURIComponent(bridgeId)}/calculations`
  );
}

// 计算K值（不保存）
export async function calculateKValue(body: {
  bridgeId: string;
  spanIndex: number;
  input: KValueInput;
}): Promise<KValueCalculation> {
  return apiRequest<KValueCalculation>('/api/kvalue-calculate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 保存K值计算结果
export async function saveKValueResult(body: {
  bridgeId: string;
  spanIndex: number;
  input: KValueInput;
  output: { k1: number; k2: number; k3: number; k4: number; kFinal: number; calcTime: string };
  intermediate?: { etaM?: number; momentM?: number; fixedParams?: Record<string, unknown> };
  creator?: string;
  creatorId?: string | null;
}): Promise<KValueCalculation> {
  return apiRequest<KValueCalculation>('/api/kvalue-save', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteCalculation(id: string): Promise<boolean> {
  try {
    await apiRequest<{ deleted: boolean }>(`/api/calculations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return false;
  }
}

// 保存报告内容（HTML）
export async function saveReport(id: string, data: {
  htmlContent?: string;
  notes?: string;
  reviewer?: string;
}): Promise<KValueCalculation> {
  return apiRequest<KValueCalculation>(`/api/calculations/${encodeURIComponent(id)}/report`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function clearCache() {
  /* 数据由后端 data/*.json 持久化 */
}
