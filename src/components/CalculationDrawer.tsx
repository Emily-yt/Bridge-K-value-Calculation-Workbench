import { useState, useEffect } from 'react';
import { X, RotateCcw, Play, ChevronDown, ChevronUp, Calculator, CheckCircle, AlertTriangle, XCircle, FileText, Save } from 'lucide-react';
import type { Bridge, KValueCalculation, BeamSpan } from '../lib/types';
import { calculateKValue, saveKValueResult } from '../lib/db';
import { QValueTooltip } from './QValueTooltip';

// 验证桥孔是否支持计算
function isSpanSupported(span: BeamSpan): boolean {
  return span.beamType === '专桥2059' && span.beamLength === 32.6;
}

// Toast 提示组件
function Toast({ message, type, onClose }: { message: string; type: 'warning' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'warning' ? 'bg-amber-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2`}>
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface CalculationDrawerProps {
  bridge: Bridge | null;
  initialSpanIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onOpenReport?: (calculationId: string) => void;
}

type CalculationPhase = 'input' | 'calculating' | 'result';

// 根据K值获取状态
// 判定逻辑：
// 1. K >= 1：满足"中-活载"要求
// 2. K < 1：需计算Q值，若 Q < K 则满足运行列车要求
function getKValueStatus(k: number, qResult?: { c80: { meetsRequirement: boolean }; km98: { meetsRequirement: boolean } } | null) {
  if (k >= 1.0) {
    return { label: '满足要求', color: 'green', icon: CheckCircle, text: '满足中-活载要求' };
  }
  // K < 1 时，检查Q值
  if (qResult) {
    const c80Meets = qResult.c80.meetsRequirement;
    const km98Meets = qResult.km98.meetsRequirement;
    if (c80Meets && km98Meets) {
      return { label: '满足要求', color: 'green', icon: CheckCircle, text: '满足要求' };
    } else if (c80Meets || km98Meets) {
      return { label: '部分满足', color: 'orange', icon: AlertTriangle, text: '部分满足' };
    }
  }
  return { label: '不满足', color: 'red', icon: XCircle, text: '不满足运营要求，需立即处理' };
}

// 颜色配置
const colorMap = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    textLight: 'text-green-500',
    bgLight: 'bg-green-100',
    progress: 'bg-green-500',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
    textLight: 'text-orange-500',
    bgLight: 'bg-orange-100',
    progress: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    textLight: 'text-red-500',
    bgLight: 'bg-red-100',
    progress: 'bg-red-500',
  },
};

export default function CalculationDrawer({ bridge, initialSpanIndex, isOpen, onClose, onComplete, onOpenReport }: CalculationDrawerProps) {
  const [spanIndex, setSpanIndex] = useState(1);
  const [beamPosition, setBeamPosition] = useState('直线梁');
  const [curveRadius, setCurveRadius] = useState<number | null>(null);
  const [eccentricityE, setEccentricityE] = useState(70);
  const [ballastThicknessT, setBallastThicknessT] = useState(5);
  const [impactFactor, setImpactFactor] = useState(1.1935);

  const [z1m, setZ1m] = useState(1.0);
  const [z1q, setZ1q] = useState(1.0);
  const [z2m, setZ2m] = useState(1.0);
  const [z2q, setZ2q] = useState(1.0);
  const [z3h, setZ3h] = useState(1.0);
  const [z3y, setZ3y] = useState(1.0);
  const [z4y, setZ4y] = useState(1.0);

  const [showDamageCoeffs, setShowDamageCoeffs] = useState(false);
  const [phase, setPhase] = useState<CalculationPhase>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KValueCalculation | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'warning' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (bridge?.spans?.length) {
      // 如果传入了初始孔索引，优先使用；否则找到第一个支持的桥孔
      if (initialSpanIndex && bridge.spans.some(s => s.index === initialSpanIndex)) {
        setSpanIndex(initialSpanIndex);
      } else {
        const firstSupported = bridge.spans.find(isSpanSupported);
        setSpanIndex(firstSupported?.index ?? bridge.spans[0].index);
      }
    }
  }, [bridge?.id, bridge?.spans, initialSpanIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleReset = () => {
    if (bridge?.spans?.length) setSpanIndex(bridge.spans[0].index);
    setBeamPosition('直线梁');
    setCurveRadius(null);
    setEccentricityE(70);
    setBallastThicknessT(5);
    setImpactFactor(1.1935);
    setZ1m(1);
    setZ1q(1);
    setZ2m(1);
    setZ2q(1);
    setZ3h(1);
    setZ3y(1);
    setZ4y(1);
    setShowDamageCoeffs(false);
    setError(null);
    setResult(null);
    setPhase('input');
    setSaveSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCalculate = async () => {
    if (!bridge) return;

    // 参数验证
    if (beamPosition !== '直线梁' && (curveRadius == null || curveRadius <= 0)) {
      setError('曲线梁需填写有效的曲线半径 R（m）');
      return;
    }

    // 桥孔类型验证
    const selectedSpan = spans.find(s => s.index === spanIndex);
    if (selectedSpan && !isSpanSupported(selectedSpan)) {
      setToast({
        message: `当前暂不支持 ${selectedSpan.beamType} 梁长 ${selectedSpan.beamLength}m 的桥孔计算`,
        type: 'warning'
      });
      return;
    }

    setError(null);

    try {
      // 只计算，不保存
      const calcResult = await calculateKValue({
        bridgeId: bridge.id,
        spanIndex,
        input: {
          beamPosition,
          curveRadius: beamPosition === '直线梁' ? null : curveRadius,
          eccentricityE,
          ballastThicknessT,
          impactFactor,
          damageFactors: {
            z1m,
            z1q,
            z2m,
            z2q,
            z3h,
            z3y,
            z4y,
          },
        },
      });
      setResult(calcResult);
      setPhase('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
      setPhase('input');
    }
  };

  const handleSave = async () => {
    if (!bridge || !result) return;

    try {
      // 保存计算结果
      await saveKValueResult({
        bridgeId: bridge.id,
        spanIndex,
        creator: '当前用户',
        input: {
          beamPosition,
          curveRadius: beamPosition === '直线梁' ? null : curveRadius,
          eccentricityE,
          ballastThicknessT,
          impactFactor,
          damageFactors: {
            z1m,
            z1q,
            z2m,
            z2q,
            z3h,
            z3y,
            z4y,
          },
        },
        output: result.output,
        intermediate: result.intermediate,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        onComplete();
        handleClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleSaveAndReport = async () => {
    if (!bridge || !result) return;

    try {
      // 保存计算结果
      const savedResult = await saveKValueResult({
        bridgeId: bridge.id,
        spanIndex,
        creator: '当前用户',
        input: {
          beamPosition,
          curveRadius: beamPosition === '直线梁' ? null : curveRadius,
          eccentricityE,
          ballastThicknessT,
          impactFactor,
          damageFactors: {
            z1m,
            z1q,
            z2m,
            z2q,
            z3h,
            z3y,
            z4y,
          },
        },
        output: result.output,
        intermediate: result.intermediate,
      });
      setSaveSuccess(true);
      // 关闭抽屉并打开报告预览弹窗
      onComplete();
      handleClose();
      onOpenReport?.(savedResult.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleRecalculate = () => {
    setPhase('input');
    setResult(null);
    setSaveSuccess(false);
  };

  if (!isOpen || !bridge) return null;

  const spans = bridge.spans ?? [];

  // 获取当前选中的桥孔
  const currentSpan = spans.find(s => s.index === spanIndex);
  const kStatus = result ? getKValueStatus(result.output.kFinal, result.output.qResult) : null;
  const colors = kStatus ? colorMap[kStatus.color as keyof typeof colorMap] : null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={handleClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">K值计算</h2>
              <p className="text-sm text-gray-500">{bridge.bridgeName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-800 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                保存成功
              </div>
            )}

            {/* Result State */}
            {phase === 'result' && result && kStatus && colors && (
              <div className={`${colors.bg} rounded-lg border ${colors.border} overflow-hidden`}>
                <div className="px-3 py-1.5 bg-white/50 border-b border-gray-200/50 flex items-center gap-1.5">
                  <CheckCircle className={`w-3.5 h-3.5 ${colors.text}`} />
                  <span className="text-xs font-medium text-gray-700">计算完成</span>
                </div>

                <div className="p-3">
                  {/* 第一行：K值和状态并排居中 */}
                  <div className="flex items-center justify-center gap-3">
                    <div className={`text-2xl font-bold ${colors.text}`}>
                      K={result.output.kFinal.toFixed(2)}
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${colors.bgLight} ${colors.text} text-xs`}>
                      <kStatus.icon className="w-3 h-3" />
                      {kStatus.text}
                    </div>
                    {/* Q值tooltip（当K < 1时） */}
                    {result.output.qResult && <QValueTooltip qResult={result.output.qResult} />}
                  </div>

                  {/* 第二行：K1~K5 */}
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    <div className="bg-white/60 rounded px-2 py-1.5 text-center">
                      <span className="text-xs text-gray-400">K1</span>
                      <div className="text-sm font-semibold text-gray-700">{result.output.k1.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/60 rounded px-2 py-1.5 text-center">
                      <span className="text-xs text-gray-400">K2</span>
                      <div className="text-sm font-semibold text-gray-700">{result.output.k2.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/60 rounded px-2 py-1.5 text-center">
                      <span className="text-xs text-gray-400">K3</span>
                      <div className="text-sm font-semibold text-gray-700">{result.output.k3.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/60 rounded px-2 py-1.5 text-center">
                      <span className="text-xs text-gray-400">K4</span>
                      <div className="text-sm font-semibold text-gray-700">{result.output.k4.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/60 rounded px-2 py-1.5 text-center">
                      <span className="text-xs text-gray-400">K5</span>
                      <div className="text-sm font-semibold text-gray-700">{(result.output.k5 ?? 0).toFixed(2)}</div>
                    </div>
                  </div>


                </div>
              </div>
            )}

            {/* Input Form - 在input和result阶段都显示，但result阶段可以折叠 */}
            {(phase === 'input' || phase === 'result') && (
              <div className={`space-y-5 ${phase === 'result' ? 'opacity-60' : ''}`}>
                <Section title="计算孔跨" icon="zap">
                  <FormField label="孔序号">
                    <select
                      value={spanIndex}
                      onChange={(e) => {
                        const newIndex = Number(e.target.value);
                        const selectedSpan = spans.find(s => s.index === newIndex);
                        if (selectedSpan && !isSpanSupported(selectedSpan)) {
                          setToast({
                            message: `当前暂不支持 ${selectedSpan.beamType} 梁长 ${selectedSpan.beamLength}m 的桥孔计算`,
                            type: 'warning'
                          });
                          return;
                        }
                        setSpanIndex(newIndex);
                      }}
                      disabled={phase === 'result'}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                    >
                      {spans.map((s) => (
                        <option key={s.index} value={s.index}>
                          第 {s.index} 孔 · {s.beamType} · 梁长 {s.beamLength}m {!isSpanSupported(s) ? '(暂不支持)' : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </Section>

                <Section title="结构与荷载" icon="zap">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <FormField label="梁体类型">
                      <select
                        value={beamPosition}
                        onChange={(e) => setBeamPosition(e.target.value)}
                        disabled={phase === 'result'}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      >
                        <option value="直线梁">直线梁</option>
                        <option value="曲线外梁">曲线外梁</option>
                        <option value="曲线内梁">曲线内梁</option>
                      </select>
                    </FormField>
                    <FormField label="线梁偏心值 e (mm)">
                      <input
                        type="number"
                        step="1"
                        value={eccentricityE}
                        onChange={(e) => setEccentricityE(parseFloat(e.target.value) || 0)}
                        disabled={phase === 'result'}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      />
                    </FormField>
                    {beamPosition !== '直线梁' && (
                      <div className="sm:col-span-2">
                        <FormField label="曲线半径 R (m)">
                          <input
                            type="number"
                            step="1"
                            value={curveRadius ?? ''}
                            onChange={(e) => setCurveRadius(e.target.value ? parseFloat(e.target.value) : null)}
                            disabled={phase === 'result'}
                            className={`w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 ${
                              error?.includes('曲线半径') ? 'border-red-300 bg-red-50' : 'border-gray-200'
                            }`}
                            placeholder="输入曲线半径"
                          />
                        </FormField>
                      </div>
                    )}
                    <FormField label="冲击系数 1+μ">
                      <input
                        type="number"
                        step="0.0001"
                        value={impactFactor}
                        onChange={(e) => setImpactFactor(parseFloat(e.target.value) || 1)}
                        disabled={phase === 'result'}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      />
                    </FormField>
                    <FormField label="道砟超厚 t (cm)">
                      <input
                        type="number"
                        step="0.1"
                        value={ballastThicknessT}
                        onChange={(e) => setBallastThicknessT(parseFloat(e.target.value) || 0)}
                        disabled={phase === 'result'}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                      />
                    </FormField>
                  </div>
                </Section>

                <Section title="损伤修正系数" icon="shield">
                  <button
                    type="button"
                    onClick={() => setShowDamageCoeffs(!showDamageCoeffs)}
                    disabled={phase === 'result'}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    {showDamageCoeffs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showDamageCoeffs ? '收起系数设置' : '展开系数设置（默认1.00）'}
                  </button>
                  {showDamageCoeffs && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField label={<span>抗弯强度 Z<sub>1M</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z1m}
                          onChange={(e) => setZ1m(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                      <FormField label={<span>抗剪强度 Z<sub>1Q</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z1q}
                          onChange={(e) => setZ1q(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                      <FormField label={<span>弯曲正应力 Z<sub>2M</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z2m}
                          onChange={(e) => setZ2m(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                      <FormField label={<span>弯曲剪应力 Z<sub>2Q</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z2q}
                          onChange={(e) => setZ2q(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                      <FormField label={<span>混凝土强度 Z<sub>3H</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z3h}
                          onChange={(e) => setZ3h(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                      <FormField label={<span>预应力筋强度 Z<sub>3Y</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z3y}
                          onChange={(e) => setZ3y(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                      <FormField label={<span>永存预应力 Z<sub>4Y</sub></span>}>
                        <input
                          type="number"
                          step="0.01"
                          value={z4y}
                          onChange={(e) => setZ4y(parseFloat(e.target.value) || 1)}
                          disabled={phase === 'result'}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                        />
                      </FormField>
                    </div>
                  )}
                </Section>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          {phase === 'input' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!currentSpan || !isSpanSupported(currentSpan)}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                开始计算K值
              </button>
            </>
          )}

          {phase === 'result' && (
            <>
              <button
                type="button"
                onClick={handleRecalculate}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重新计算
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Save className="w-4 h-4" />
                保存结果
              </button>
              <button
                type="button"
                onClick={handleSaveAndReport}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                保存并生成报告
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const iconMap: Record<string, React.ReactNode> = {
    zap: <ZapIcon />,
    shield: <ShieldIcon />,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <div className="text-blue-600">{iconMap[icon]}</div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FormField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ZapIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
