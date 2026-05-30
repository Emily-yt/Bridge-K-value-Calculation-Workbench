import type { BeamSpan, Bridge, KValueCalculation, KValueOutput } from './types';

export type KValueLevel = 'safe' | 'partial' | 'danger';
export type BridgeCoverageStatus = 'unevaluated' | 'partial' | 'complete';
export type KValueKey = 'k1' | 'k2' | 'k3' | 'k4' | 'k5';

export const K_VALUE_KEYS: KValueKey[] = ['k1', 'k2', 'k3', 'k4', 'k5'];

export const K_VALUE_ITEMS: Array<{ key: KValueKey; label: string; description: string }> = [
  { key: 'k1', label: 'K1', description: '正截面抗弯强度' },
  { key: 'k2', label: 'K2', description: '正截面抗裂性' },
  { key: 'k3', label: 'K3', description: '正截面应力' },
  { key: 'k4', label: 'K4', description: '斜截面抗剪' },
  { key: 'k5', label: 'K5', description: '斜截面抗裂性' },
];

export const K_VALUE_LEVELS = {
  safe: { key: 'safe', label: '满足要求', color: '#10b981', bgColor: '#ecfdf5' },
  partial: { key: 'partial', label: '部分满足', color: '#f59e0b', bgColor: '#fffbeb' },
  danger: { key: 'danger', label: '不满足要求', color: '#ef4444', bgColor: '#fef2f2' },
} as const;

export function isSpanSupported(span: BeamSpan): boolean {
  return span.beamType === '专桥2059' && span.beamLength === 32.6;
}

type QRequirementResult = {
  c80: { meetsRequirement: boolean };
  km98: { meetsRequirement: boolean };
};

export function getKValueLevel(kFinal: number, qResult?: QRequirementResult | null): KValueLevel {
  if (kFinal >= 1) return 'safe';
  if (!qResult) return 'danger';
  const { c80, km98 } = qResult;
  if (c80.meetsRequirement && km98.meetsRequirement) return 'safe';
  if (c80.meetsRequirement || km98.meetsRequirement) return 'partial';
  return 'danger';
}

export function getControlItem(output: Pick<KValueOutput, KValueKey>): { key: KValueKey; label: string; description: string; value: number } {
  const item = K_VALUE_ITEMS.reduce((minimum, current) =>
    output[current.key] < output[minimum.key] ? current : minimum
  );
  return { ...item, value: output[item.key] };
}

export function getAssessmentText(kFinal: number, qResult?: QRequirementResult | null): string {
  const level = getKValueLevel(kFinal, qResult);
  if (level === 'safe') {
    return kFinal >= 1 ? '满足中-活载要求' : 'C80、KM98 运行列车均满足要求';
  }
  if (level === 'danger') return '不满足运营要求，需立即处理';
  const allowed = qResult?.c80.meetsRequirement ? 'C80' : 'KM98';
  const disallowed = qResult?.c80.meetsRequirement ? 'KM98' : 'C80';
  return `部分满足：允许 ${allowed}，不允许 ${disallowed}`;
}

export function getAssessmentConclusion(output: KValueOutput): string {
  const control = getControlItem(output);
  const prefix = `本孔检定承载系数 K=${output.kFinal.toFixed(2)}，控制项为 ${control.label} ${control.description}。`;
  const level = getKValueLevel(output.kFinal, output.qResult);
  if (level === 'safe') {
    return `${prefix}${output.kFinal >= 1 ? '满足中-活载要求。' : '经运行列车补充检算，C80、KM98 均满足要求。'}`;
  }
  if (level === 'partial') {
    return `${prefix}${getAssessmentText(output.kFinal, output.qResult)}。应按车型限制通行，并加强监测。`;
  }
  return `${prefix}不满足运营要求。建议立即限制通行，安排专项检测和加固处理。`;
}

export function getLatestCalculationsBySpan(calculations: KValueCalculation[]): KValueCalculation[] {
  const latest = new Map<number, KValueCalculation>();
  calculations.forEach((calculation) => {
    const current = latest.get(calculation.spanIndex);
    if (!current || new Date(calculation.createTime) > new Date(current.createTime)) {
      latest.set(calculation.spanIndex, calculation);
    }
  });
  return Array.from(latest.values());
}

export function getBridgeCoverage(bridge: Bridge, calculations: KValueCalculation[]) {
  const supportedSpans = bridge.spans.filter(isSpanSupported);
  const supportedSpanIndices = new Set(supportedSpans.map((span) => span.index));
  const latestSupportedCalculations = getLatestCalculationsBySpan(
    calculations.filter((calculation) => calculation.bridgeId === bridge.id && supportedSpanIndices.has(calculation.spanIndex))
  );
  const supportedSpanCount = supportedSpans.length;
  const calculatedSupportedSpanCount = latestSupportedCalculations.length;
  const unsupportedSpanCount = bridge.spanCount - supportedSpanCount;
  const status: BridgeCoverageStatus =
    calculatedSupportedSpanCount === 0
      ? 'unevaluated'
      : calculatedSupportedSpanCount >= supportedSpanCount && supportedSpanCount > 0
        ? 'complete'
        : 'partial';

  return {
    status,
    supportedSpanCount,
    calculatedSupportedSpanCount,
    unsupportedSpanCount,
    latestSupportedCalculations,
    scopeText: `基于当前系统支持范围 ${calculatedSupportedSpanCount}/${supportedSpanCount} 孔${unsupportedSpanCount > 0 ? `，另 ${unsupportedSpanCount} 孔未纳入检算` : ''}`,
  };
}
