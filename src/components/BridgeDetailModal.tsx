import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Calculator, FileText, Trash2, Info, History, AlertTriangle, Loader2, Eye, RotateCcw } from 'lucide-react';
import type { Bridge, DeleteBridgeResult, KValueCalculation } from '../lib/types';
import { getCalculationsByBridge, deleteCalculation, getBridgeById } from '../lib/db';

interface BridgeDetailModalProps {
  bridge: Bridge | null;
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (bridge: Bridge, spanIndex?: number) => void;
  onDelete?: (bridge: Bridge) => Promise<DeleteBridgeResult>;
  onViewResult?: (calculation: KValueCalculation, bridge: Bridge) => void;
  onViewReport?: (calculationId: string) => void;
  dataRefresh: number;
}

interface CalcHistory {
  id: string;
  calcTime: string;
  spanIndex: number;
  beamType: string;
  ballastThickness: number;
  eccentricity: number;
  impactFactor: number;
  kValue: number;
  creator: string;
}

export default function BridgeDetailModal({ bridge, isOpen, onClose, onCalculate, onDelete, onViewResult, onViewReport, dataRefresh }: BridgeDetailModalProps) {
  const [calcHistory, setCalcHistory] = useState<CalcHistory[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCalcHistory = useCallback(async () => {
    if (!bridge) return;
    const calculations = await getCalculationsByBridge(bridge.id);

    const bridgeCalcs = calculations
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .map((c) => ({
        id: c.id,
        calcTime: c.createTime,
        spanIndex: c.spanIndex,
        beamType: c.beamType,
        ballastThickness: c.input.ballastThicknessT,
        eccentricity: c.input.eccentricityE,
        impactFactor: c.input.impactFactor,
        kValue: c.output.kFinal,
        creator: c.creator,
      }));

    setCalcHistory(bridgeCalcs);
  }, [bridge]);

  useEffect(() => {
    if (isOpen && bridge) {
      loadCalcHistory();
    } else {
      setCalcHistory([]);
    }
  }, [isOpen, bridge, loadCalcHistory, dataRefresh]);

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

  useEffect(() => {
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmationName('');
    setDeleteError(null);
    setIsDeleting(false);
  }, [bridge?.id, isOpen]);

  const handleDeleteCalculation = async (id: string) => {
    if (!confirm('确定要删除这条计算记录吗？')) return;
    const success = await deleteCalculation(id);
    if (success) {
      loadCalcHistory();
    }
  };

  const handleViewResult = async (record: CalcHistory) => {
    if (!onViewResult || !bridge) return;
    // 获取完整的计算记录
    const calculations = await getCalculationsByBridge(bridge.id);
    const calculation = calculations.find(c => c.id === record.id);
    if (calculation) {
      onViewResult(calculation, bridge);
    }
  };

  const handleViewReport = (calculationId: string) => {
    if (!onViewReport) return;
    onViewReport(calculationId);
  };

  const handleRecalculate = (record: CalcHistory) => {
    if (!bridge) return;
    // 关闭详情弹窗并打开计算抽屉，传入对应的孔跨
    onCalculate(bridge, record.spanIndex);
  };

  const resetDeleteConfirmation = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmationName('');
    setDeleteError(null);
    setIsDeleting(false);
  };

  const handleConfirmDeleteBridge = async () => {
    if (!bridge || !onDelete || deleteConfirmationName !== bridge.bridgeName) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDelete(bridge);
      resetDeleteConfirmation();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '删除桥梁失败');
      setIsDeleting(false);
    }
  };

  if (!isOpen || !bridge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">{bridge.bridgeName}</h2>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg">
              {bridge.lineName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* 基础信息 */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-800">基础信息</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">线名</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bridge.lineName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">桥号</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bridge.bridgeNo}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">中心里程</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bridge.centerMileage}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">建成年度</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bridge.buildYear}年</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">孔跨式样</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bridge.spanType}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">孔跨数</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{bridge.spanCount}孔</p>
                  </div>
                </div>

                {/* 各孔梁参数 */}
                <div className="mt-5">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">各孔梁参数</span>
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">孔号</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">梁型</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">梁长(m)</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">梁高(m)</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">梁中心距(m)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(bridge.spans ?? []).map((s) => (
                          <tr key={s.index} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-sm text-gray-700">{s.index}#</td>
                            <td className="px-4 py-2.5 text-sm text-gray-700">{s.beamType}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-700 text-right tabular-nums">{s.beamLength}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-700 text-right tabular-nums">{s.beamHeight || '-'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-700 text-right tabular-nums">{s.beamCenterDist}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* K值计算历史 */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">K值计算历史</h3>
                </div>
                <button
                  onClick={() => onCalculate(bridge)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增计算
                </button>
              </div>

              {calcHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">计算时间</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">孔跨</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">梁型</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">道砟厚度</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">偏心值</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">冲击系数</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">K值</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">计算人</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {calcHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(record.calcTime).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">第 {record.spanIndex} 孔</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.beamType}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.ballastThickness}cm</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.eccentricity}mm</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.impactFactor}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                            {record.kValue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{record.creator}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleViewResult(record)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="查看结果"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleViewReport(record.id)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="查看报告"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRecalculate(record)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title="重新计算"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCalculation(record.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mb-3">暂无计算记录</p>
                  <button
                    onClick={() => onCalculate(bridge)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    开始计算
                  </button>
                </div>
              )}
            </div>

            {onDelete && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">危险操作</h3>
                    <p className="mt-1 text-sm text-red-600">永久删除该桥梁档案，以及关联的计算历史和报告。此操作无法撤销。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteConfirmationName('');
                      setIsDeleteConfirmOpen(true);
                    }}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除桥梁
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {isDeleteConfirmOpen && onDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && resetDeleteConfirmation()} />
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">确认删除桥梁</h3>
                  <p className="mt-0.5 text-sm text-gray-500">此操作无法撤销</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetDeleteConfirmation}
                disabled={isDeleting}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>桥梁：<span className="font-semibold">{bridge.bridgeName}</span>（{bridge.bridgeNo}）</p>
                <p className="mt-1">关联的 {calcHistory.length} 条计算历史和报告将一并删除。</p>
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {deleteError}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  请输入完整桥梁名称 <span className="font-semibold text-red-600">{bridge.bridgeName}</span> 以确认删除
                </span>
                <input
                  type="text"
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  disabled={isDeleting}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-400/20 disabled:bg-gray-100"
                  placeholder="输入桥梁名称"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={resetDeleteConfirmation}
                disabled={isDeleting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBridge}
                disabled={isDeleting || deleteConfirmationName !== bridge.bridgeName}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? '删除中...' : '永久删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
