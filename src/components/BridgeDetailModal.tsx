import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Calculator, FileText, Trash2, TrendingDown, Info, History } from 'lucide-react';
import type { Bridge } from '../lib/types';
import { getCalculationsByBridge, deleteCalculation } from '../lib/db';

interface BridgeDetailModalProps {
  bridge: Bridge | null;
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (bridge: Bridge) => void;
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

export default function BridgeDetailModal({ bridge, isOpen, onClose, onCalculate, dataRefresh }: BridgeDetailModalProps) {
  const [calcHistory, setCalcHistory] = useState<CalcHistory[]>([]);

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

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条计算记录吗？')) return;
    const success = await deleteCalculation(id);
    if (success) {
      loadCalcHistory();
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
                              <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

            {/* K值变化趋势 */}
            {calcHistory.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">K值变化趋势</h3>
                </div>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">K值变化趋势图（开发中）</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
