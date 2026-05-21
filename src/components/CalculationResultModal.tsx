import { useEffect, useMemo } from 'react';
import { X, Calculator, TrendingDown, FileText, Info, History } from 'lucide-react';
import type { KValueCalculation, Bridge } from '../lib/types';
import { QValueTooltip } from './QValueTooltip';

interface CalculationResultModalProps {
  calculation: KValueCalculation | null;
  bridge: Bridge | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReport?: (calculationId: string) => void;
  previousCalculation?: KValueCalculation | null;
}

// 获取K值状态
// 判定逻辑：
// 1. K >= 1：满足"中-活载"要求
// 2. K < 1：需计算Q值，若 Q < K 则满足要求
const getKValueStatus = (k: number, qResult?: { c80: { meetsRequirement: boolean }; km98: { meetsRequirement: boolean } } | null) => {
  if (k >= 1.0) {
    return { label: '满足"中-活载"要求', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '✓' };
  }
  // K < 1 时，检查Q值
  if (qResult) {
    const c80Meets = qResult.c80.meetsRequirement;
    const km98Meets = qResult.km98.meetsRequirement;
    if (c80Meets && km98Meets) {
      return { label: '满足要求', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '✓' };
    } else if (c80Meets || km98Meets) {
      return { label: '部分满足', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '⚠️' };
    }
  }
  return { label: '不满足运营要求，需立即处理', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: '❌' };
};

// 获取K分项状态
const getKItemStatus = (k: number) => {
  if (k >= 2.0) return { color: 'text-gray-700', barColor: 'bg-gray-500', width: '100%' };
  if (k >= 1.5) return { color: 'text-gray-700', barColor: 'bg-gray-500', width: `${(k / 2.0) * 100}%` };
  if (k >= 1.0) return { color: 'text-amber-600', barColor: 'bg-amber-500', width: `${(k / 2.0) * 100}%` };
  return { color: 'text-red-600', barColor: 'bg-red-500', width: `${(k / 2.0) * 100}%` };
};

// K值项目配置
const K_ITEMS = [
  { key: 'k1', label: 'K1', desc: '正截面抗弯强度' },
  { key: 'k2', label: 'K2', desc: '正截面抗裂性' },
  { key: 'k3', label: 'K3', desc: '正截面应力' },
  { key: 'k4', label: 'K4', desc: '斜截面剪应力' },
  { key: 'k5', label: 'K5', desc: '斜截面抗裂性' },
] as const;

export default function CalculationResultModal({
  calculation,
  bridge,
  isOpen,
  onClose,
  onOpenReport,
  previousCalculation,
}: CalculationResultModalProps) {
  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const status = useMemo(() => {
    if (!calculation) return null;
    return getKValueStatus(calculation.output.kFinal, calculation.output.qResult);
  }, [calculation]);

  const kChange = useMemo(() => {
    if (!calculation || !previousCalculation) return null;
    const change = calculation.output.kFinal - previousCalculation.output.kFinal;
    return {
      value: change.toFixed(4),
      isIncrease: change > 0,
      isSame: change === 0,
    };
  }, [calculation, previousCalculation]);

  if (!isOpen || !calculation || !bridge) return null;

  const { output, input, createTime, spanIndex, beamType } = calculation;
  const { k1, k2, k3, k4, kFinal } = output;
  const k5 = output.k5 ?? 0; // 旧数据可能没有k5

  // 找出最小K值对应的项
  const kValues = [
    { key: 'k1', value: k1, label: 'K1' },
    { key: 'k2', value: k2, label: 'K2' },
    { key: 'k3', value: k3, label: 'K3' },
    { key: 'k4', value: k4, label: 'K4' },
    { key: 'k5', value: k5, label: 'K5' },
  ];
  const minKItem = kValues.reduce((min, item) => item.value < min.value ? item : min);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">计算结果详情</h2>
              <p className="text-xs text-gray-500">
                {bridge.bridgeName} · 第{spanIndex}孔 · {createTime.replace('T', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* 计算参数 */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-100/50 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-800 text-sm">计算参数</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-400">梁体类型</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{beamType}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">线梁偏心</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{input.eccentricityE}mm</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">道砟超厚</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{input.ballastThicknessT}cm</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">冲击系数</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{input.impactFactor}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 承载系数卡片 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-800 text-sm">承载系数</h3>
              </div>
              <div className="p-4">
                {/* 5个K值 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {K_ITEMS.map((item) => {
                    const kValue = output[item.key];
                    const kStatus = getKItemStatus(kValue);
                    const isMin = minKItem.key === item.key;
                    return (
                      <div key={item.key} className={`p-2 rounded-lg border text-center ${isMin ? 'border-amber-300 bg-white' : 'border-gray-200 bg-gray-50/50'}`}>
                        <p className="text-xs text-gray-500 mb-0.5">{item.desc}</p>
                        <span className={`text-sm font-semibold ${kStatus.color}`}>
                          {item.label}={kValue.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 整体K值 */}
                <div className={`text-center p-3 rounded-lg border ${status?.borderColor} ${status?.bgColor}`}>
                  <p className="text-xs text-gray-500 mb-1">整体检定承载系数（取{minKItem.label}最小值）</p>
                  <span className="text-xl font-bold text-gray-800">K = {kFinal.toFixed(2)}</span>
                </div>

                {/* Q值显示（当K < 1时） */}
                {output.qResult && (
                  <div className="mt-3 flex items-center justify-center">
                    <QValueTooltip qResult={output.qResult} />
                  </div>
                )}
              </div>
            </div>

            {/* 历史对比 */}
            {previousCalculation && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-100/50 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">历史对比</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">上次计算</p>
                      <p className="text-sm text-gray-700">
                        {previousCalculation.createTime.split('T')[0]} · K={previousCalculation.output.kFinal.toFixed(4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">变化</p>
                      <p className={`text-sm font-medium ${kChange?.isIncrease ? 'text-emerald-600' : kChange?.isSame ? 'text-gray-600' : 'text-red-600'}`}>
                        {kChange?.isIncrease ? '+' : ''}{kChange?.value} {kChange?.isIncrease ? '↑' : kChange?.isSame ? '→' : '↓'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            关闭
          </button>
          {onOpenReport && (
            <button
              onClick={() => onOpenReport(calculation.id)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
