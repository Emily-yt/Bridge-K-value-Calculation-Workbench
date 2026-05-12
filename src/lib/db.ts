import type { Bridge, KValueCalculation, KValueInput } from './types';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (typeof json.code === 'number' && json.code !== 0)) {
    throw new Error(json.message || `请求失败 (${res.status})`);
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
