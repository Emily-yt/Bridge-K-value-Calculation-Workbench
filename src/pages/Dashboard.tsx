import { useEffect, useState } from 'react';
import { Building2, Clock, TrendingDown, Calendar, X } from 'lucide-react';
import { getBridges, getCalculations } from '../lib/db';
import type { Bridge, KValueCalculation } from '../lib/types';
import BridgeDetailModal from '../components/BridgeDetailModal';
import CalculationResultModal from '../components/CalculationResultModal';

interface DashboardStats {
  totalBridges: number;
  pendingBridges: number;
  lowKValueBridges: number;
  dueThisMonth: number;
}

interface RecentRecord {
  id: string;
  bridgeName: string;
  spanIndex: number;
  spanLength: number;
  date: string;
  kValue: number | null;
}

interface ExpiringBridge {
  id: string;
  bridgeName: string;
  daysLeft: number;
}

type ModalType = 'total' | 'pending' | 'lowK' | 'due' | null;

interface DashboardProps {
  dataRefresh: number;
  onViewChange: (view: 'bridges') => void;
  onCalculate?: (bridge: Bridge) => void;
  onOpenReport?: (calculationId: string) => void;
}

export default function Dashboard({
  dataRefresh,
  onViewChange,
  onCalculate,
  onOpenReport,
}: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalBridges: 0,
    pendingBridges: 0,
    lowKValueBridges: 0,
    dueThisMonth: 0,
  });
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [expiringBridges, setExpiringBridges] = useState<ExpiringBridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<{ bridges: Bridge[]; calculations: KValueCalculation[] }>({ bridges: [], calculations: [] });
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [selectedBridgeForDetail, setSelectedBridgeForDetail] = useState<Bridge | null>(null);
  const [selectedCalculation, setSelectedCalculation] = useState<KValueCalculation | null>(null);
  const [calculationBridge, setCalculationBridge] = useState<Bridge | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [dataRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [bridges, calculations] = await Promise.all([getBridges(), getCalculations()]);
      
      const bridgeMap = new Map(bridges.map(b => [b.id, b]));
      
      const bridgeCalculatedSpans = new Map<string, Set<number>>();
      calculations.forEach(calc => {
        if (!bridgeCalculatedSpans.has(calc.bridgeId)) {
          bridgeCalculatedSpans.set(calc.bridgeId, new Set());
        }
        bridgeCalculatedSpans.get(calc.bridgeId)!.add(calc.spanIndex);
      });
      
      let pendingBridges = 0;
      let lowKValueBridges = 0;
      let dueThisMonth = 0;
      const now = new Date();
      const currentYear = now.getFullYear();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      bridges.forEach(bridge => {
        const calculatedSpans = bridgeCalculatedSpans.get(bridge.id);
        const isComplete = calculatedSpans && calculatedSpans.size === bridge.spanCount;
        
        if (!isComplete) {
          pendingBridges++;
        }
        
        const bridgeCalcs = calculations.filter(c => c.bridgeId === bridge.id);
        const minKValue = bridgeCalcs.length > 0
          ? Math.min(...bridgeCalcs.map(c => c.output.kFinal))
          : null;
        
        if (minKValue !== null && minKValue < 1.0) {
          lowKValueBridges++;
        }
        
        const latestCalc = bridgeCalcs.sort(
          (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        )[0];
        
        let nextInspectionDate: Date;
        if (latestCalc) {
          nextInspectionDate = new Date(latestCalc.createTime);
          nextInspectionDate.setFullYear(nextInspectionDate.getFullYear() + 1);
        } else {
          const yearsSinceBuilt = currentYear - bridge.buildYear;
          const nextInspectionYear = bridge.buildYear + (Math.floor(yearsSinceBuilt / 6) + 1) * 6;
          nextInspectionDate = new Date(nextInspectionYear, 5, 1);
        }
        
        if (nextInspectionDate >= now && nextInspectionDate <= thirtyDaysLater) {
          dueThisMonth++;
        }
      });

      const totalBridges = bridges.length;

      setStats({
        totalBridges,
        pendingBridges,
        lowKValueBridges,
        dueThisMonth,
      });
      
      // 生成最近计算记录（按创建时间倒序）
      const sortedCalculations = [...calculations].sort(
        (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      ).slice(0, 5);
      
      const recent: RecentRecord[] = sortedCalculations.map((calc) => {
        const bridge = bridgeMap.get(calc.bridgeId);

        return {
          id: calc.id,
          bridgeName: bridge?.bridgeName || calc.bridgeId,
          spanIndex: calc.spanIndex,
          spanLength: calc.spanLength,
          date: calc.createTime.split('T')[0],
          kValue: calc.output.kFinal,
        };
      });
      
      setRecentRecords(recent);
      
      const expiring: ExpiringBridge[] = bridges
        .map((bridge) => {
          const bridgeCalcs = calculations.filter(c => c.bridgeId === bridge.id);
          const latestCalc = bridgeCalcs.sort(
            (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
          )[0];
          
          let nextInspectionDate: Date;
          if (latestCalc) {
            nextInspectionDate = new Date(latestCalc.createTime);
            nextInspectionDate.setFullYear(nextInspectionDate.getFullYear() + 1);
          } else {
            const yearsSinceBuilt = currentYear - bridge.buildYear;
            const nextInspectionYear = bridge.buildYear + (Math.floor(yearsSinceBuilt / 6) + 1) * 6;
            nextInspectionDate = new Date(nextInspectionYear, 5, 1);
          }
          
          const daysLeft = Math.ceil((nextInspectionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          return {
            id: bridge.id,
            bridgeName: bridge.bridgeName,
            daysLeft,
          };
        })
        .filter(b => b.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);
      
      setExpiringBridges(expiring);
      
      setModalData({ bridges, calculations });
      
      // 计算最后更新时间（取最新的计算记录时间或当前时间）
      const latestCalc = calculations.sort(
        (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      )[0];
      setLastUpdateTime(latestCalc ? latestCalc.createTime.split('T')[0] : new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModalContent = () => {
    if (!modalType) return null;
    
    const { bridges, calculations } = modalData;
    
    switch (modalType) {
      case 'total':
        return {
          title: '总桥梁列表',
          list: bridges.map(b => ({
            id: b.id,
            name: b.bridgeName,
            line: b.lineName,
            mileage: b.centerMileage,
            detail: `${b.spanCount}孔 · ${b.buildYear}年建`,
          })),
        };
      case 'pending': {
        const bridgeCalculatedSpans = new Map<string, Set<number>>();
        calculations.forEach(calc => {
          if (!bridgeCalculatedSpans.has(calc.bridgeId)) {
            bridgeCalculatedSpans.set(calc.bridgeId, new Set());
          }
          bridgeCalculatedSpans.get(calc.bridgeId)!.add(calc.spanIndex);
        });
        const pendingList = bridges.filter(bridge => {
          const calculatedSpans = bridgeCalculatedSpans.get(bridge.id);
          return !calculatedSpans || calculatedSpans.size < bridge.spanCount;
        });
        return {
          title: '待计算桥梁列表',
          list: pendingList.map(b => {
            const calculated = bridgeCalculatedSpans.get(b.id)?.size || 0;
            return {
              id: b.id,
              name: b.bridgeName,
              line: b.lineName,
              mileage: b.centerMileage,
              detail: `已计算 ${calculated}/${b.spanCount} 孔`,
            };
          }),
        };
      }
      case 'lowK': {
        const lowKList = bridges.filter(bridge => {
          const bridgeCalcs = calculations.filter(c => c.bridgeId === bridge.id);
          if (bridgeCalcs.length === 0) return false;
          const minKValue = Math.min(...bridgeCalcs.map(c => c.output.kFinal));
          return minKValue < 1.0;
        });
        return {
          title: 'K值偏低桥梁列表',
          list: lowKList.map(b => {
            const bridgeCalcs = calculations.filter(c => c.bridgeId === b.id);
            const minKValue = Math.min(...bridgeCalcs.map(c => c.output.kFinal));
            return {
              id: b.id,
              name: b.bridgeName,
              line: b.lineName,
              mileage: b.centerMileage,
              detail: `K=${minKValue.toFixed(4)}`,
            };
          }),
        };
      }
      case 'due': {
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const dueList = bridges.filter(bridge => {
          const bridgeCalcs = calculations.filter(c => c.bridgeId === bridge.id);
          const latestCalc = bridgeCalcs.sort(
            (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
          )[0];
          
          let nextInspectionDate: Date;
          if (latestCalc) {
            nextInspectionDate = new Date(latestCalc.createTime);
            nextInspectionDate.setFullYear(nextInspectionDate.getFullYear() + 1);
          } else {
            const currentYear = now.getFullYear();
            const yearsSinceBuilt = currentYear - bridge.buildYear;
            const nextInspectionYear = bridge.buildYear + (Math.floor(yearsSinceBuilt / 6) + 1) * 6;
            nextInspectionDate = new Date(nextInspectionYear, 5, 1);
          }
          
          return nextInspectionDate >= now && nextInspectionDate <= thirtyDaysLater;
        });
        return {
          title: '即将到期检定桥梁',
          list: dueList.map(b => {
            const bridgeCalcs = calculations.filter(c => c.bridgeId === b.id);
            const latestCalc = bridgeCalcs.sort(
              (a, c) => new Date(c.createTime).getTime() - new Date(a.createTime).getTime()
            )[0];
            
            let nextInspectionDate: Date;
            if (latestCalc) {
              nextInspectionDate = new Date(latestCalc.createTime);
              nextInspectionDate.setFullYear(nextInspectionDate.getFullYear() + 1);
            } else {
              const currentYear = now.getFullYear();
              const yearsSinceBuilt = currentYear - b.buildYear;
              const nextInspectionYear = b.buildYear + (Math.floor(yearsSinceBuilt / 6) + 1) * 6;
              nextInspectionDate = new Date(nextInspectionYear, 5, 1);
            }
            
            const daysLeft = Math.ceil((nextInspectionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            return {
              id: b.id,
              name: b.bridgeName,
              line: b.lineName,
              mileage: b.centerMileage,
              detail: `${daysLeft}天后到期`,
            };
          }),
        };
      }
      default:
        return null;
    }
  };

  const Modal = () => {
    const content = getModalContent();
    if (!modalType || !content) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          onClick={() => setModalType(null)}
        />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">{content.title}</h3>
            <button
              onClick={() => setModalType(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {content.list.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {content.list.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="px-4 py-3 rounded-lg mx-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.line} · {item.mileage}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 flex-shrink-0">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400">
                暂无数据
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-sm text-gray-500 text-center">
              共 {content.list.length} 座桥梁
            </p>
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ 
    title, 
    value, 
    percent, 
    icon: Icon, 
    color,
    unit,
    onClick 
  }: { 
    title: string; 
    value: number; 
    percent?: number;
    icon: typeof Building2;
    color: string;
    unit?: string;
    onClick?: () => void;
  }) => (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-xl p-5 border border-gray-200 shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}<span className="text-base font-normal text-gray-500">{unit || '座'}</span></p>
          {percent !== undefined && (
            <p className="text-sm text-gray-400 mt-1">{percent}%</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">首页</h2>
          <p className="text-sm text-gray-500 mt-1">系统概览与快捷入口</p>
        </div>
        <p className="text-sm text-gray-400">最后更新: {lastUpdateTime || '-'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="总桥梁"
          value={stats.totalBridges}
          icon={Building2}
          color="bg-blue-500"
          unit="座"
          onClick={() => setModalType('total')}
        />
        <StatCard
          title="待计算"
          value={stats.pendingBridges}
          icon={Clock}
          color="bg-amber-500"
          unit="座"
          onClick={() => setModalType('pending')}
        />
        <StatCard
          title="K值偏低"
          value={stats.lowKValueBridges}
          icon={TrendingDown}
          color="bg-red-500"
          unit="座"
          onClick={() => setModalType('lowK')}
        />
        <StatCard
          title="即将到期"
          value={stats.dueThisMonth}
          icon={Calendar}
          color="bg-emerald-500"
          unit="座"
          onClick={() => setModalType('due')}
        />
      </div>

      <Modal />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[300px] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-gray-800">最近计算记录</h3>
            <button 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {recentRecords.length > 0 ? (
                recentRecords.map((record, index) => {
                  const bridge = modalData.bridges.find(b => b.bridgeName === record.bridgeName);
                  const calculation = modalData.calculations.find(c => c.id === record.id);
                  return (
                    <div
                      key={record.id}
                      className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (calculation && bridge) {
                          setSelectedCalculation(calculation);
                          setCalculationBridge(bridge);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-500 w-6 flex-shrink-0">{index + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {record.bridgeName} · 第{record.spanIndex}孔
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {record.spanLength}m · {record.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {record.kValue && (
                          <span className="text-sm font-semibold text-gray-700">K={record.kValue.toFixed(4)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center text-gray-400">
                  暂无计算记录
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[300px] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-gray-800">即将到期检定</h3>
            <button 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {expiringBridges.map((expiringBridge, index) => {
                const bridge = modalData.bridges.find(b => b.id === expiringBridge.id);
                return (
                  <div 
                    key={expiringBridge.id} 
                    className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => bridge && setSelectedBridgeForDetail(bridge)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800">{expiringBridge.bridgeName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expiringBridge.daysLeft <= 30 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                          提醒
                        </span>
                      )}
                      <span className={`text-sm font-medium ${expiringBridge.daysLeft <= 30 ? 'text-red-600' : 'text-gray-600'}`}>
                        {expiringBridge.daysLeft}天后
                      </span>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">K值分布趋势</h3>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-400">K值变化趋势图（开发中）</p>
        </div>
      </div>

      <BridgeDetailModal
        bridge={selectedBridgeForDetail}
        isOpen={selectedBridgeForDetail !== null}
        onClose={() => setSelectedBridgeForDetail(null)}
        onCalculate={(bridge) => {
          setSelectedBridgeForDetail(null);
          onCalculate?.(bridge);
        }}
        dataRefresh={dataRefresh}
      />

      <CalculationResultModal
        calculation={selectedCalculation}
        bridge={calculationBridge}
        isOpen={selectedCalculation !== null}
        onClose={() => {
          setSelectedCalculation(null);
          setCalculationBridge(null);
        }}
        onOpenReport={(calcId) => {
          setSelectedCalculation(null);
          setCalculationBridge(null);
          onOpenReport?.(calcId);
        }}
        previousCalculation={selectedCalculation ? modalData.calculations
          .filter(c => c.bridgeId === selectedCalculation.bridgeId && c.id !== selectedCalculation.id)
          .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0] : null}
      />
    </div>
  );
}
