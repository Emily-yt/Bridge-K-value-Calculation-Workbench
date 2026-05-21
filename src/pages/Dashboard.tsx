import { useEffect, useState, useMemo } from 'react';
import { Building2, Clock, TrendingDown, Calendar, X, PieChart, LineChart, Calculator, AlertCircle } from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { getBridges, getCalculations } from '../lib/db';
import type { Bridge, KValueCalculation } from '../lib/types';
import BridgeDetailModal from '../components/BridgeDetailModal';
import CalculationResultModal from '../components/CalculationResultModal';

// ============ K值等级常量定义 ============
// 判定逻辑（四级分类）：
// 1. K >= 1.0：满足要求（绿色）
// 2. K < 1.0 且 Q值均满足（c80和km98都满足）：满足要求（绿色）
// 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
// 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
const K_VALUE_LEVELS = [
  { key: 'safe', label: '满足要求', min: 1.0, color: '#10b981', bgColor: '#ecfdf5' },
  { key: 'partial', label: '部分满足', min: -Infinity, color: '#f59e0b', bgColor: '#fffbeb' },
  { key: 'danger', label: '不满足要求', min: -Infinity, color: '#ef4444', bgColor: '#fef2f2' },
] as const;

// 获取 K 值等级（仅基于K值）
const getKValueLevel = (kValue: number) => {
  if (kValue >= 1.0) return K_VALUE_LEVELS[0]; // safe
  return K_VALUE_LEVELS[2]; // danger (默认，实际应根据Q值判断)
};

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
  onCalculate?: (bridge: Bridge) => void;
  onOpenReport?: (calculationId: string) => void;
}

// 时间范围类型
type TimeRange = 'all' | 'month' | 'quarter' | 'year';

export default function Dashboard({
  dataRefresh,
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
  const [selectedBridgeForDistribution, setSelectedBridgeForDistribution] = useState<string>('all');
  const [selectedBridgeForTrend, setSelectedBridgeForTrend] = useState<string>('all');
  const [timeRangeForDistribution, setTimeRangeForDistribution] = useState<TimeRange>('all');
  const [timeRangeForTrend, setTimeRangeForTrend] = useState<TimeRange>('all');

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
        
        // 判定逻辑（考虑Q值）：检查桥梁是否有任何孔跨是 danger 状态
        const hasDangerSpan = bridgeCalcs.some(calc => {
          const k = calc.output.kFinal;
          if (k >= 1.0) return false; // K>=1 是安全的
          
          // K<1 时检查Q值
          const qResult = calc.output.qResult;
          if (!qResult) return true; // 无Q值数据，视为不满足
          
          // Q值均不满足才算 danger
          return !qResult.c80.meetsRequirement && !qResult.km98.meetsRequirement;
        });
        
        if (hasDangerSpan) {
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
          title: 'K值不满足要求桥梁列表',
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

  // 根据时间范围筛选计算记录
  const getFilteredCalculationsByTimeRange = (calculations: KValueCalculation[], timeRange: TimeRange) => {
    if (timeRange === 'all') return calculations;
    const now = new Date();
    const ranges = { month: 30, quarter: 90, year: 365 };
    const days = ranges[timeRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return calculations.filter((c) => new Date(c.createTime) >= cutoff);
  };

  // K值等级分布数据计算
  // 判定逻辑（四级分类）：
  // 1. K >= 1.0：满足要求（绿色）
  // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
  // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
  // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
  const kLevelDistributionData = useMemo(() => {
    const { bridges, calculations } = modalData;
    
    // 根据时间范围筛选计算记录
    const filteredCalculations = getFilteredCalculationsByTimeRange(calculations, timeRangeForDistribution);
    
    // 获取K值等级（考虑Q值）- 四级分类
    const getLevel = (kFinal: number, qResult?: KValueCalculation['output']['qResult']) => {
      // K >= 1.0 直接满足
      if (kFinal >= 1.0) return 'safe';
      
      // K < 1.0 时需要检查Q值
      if (!qResult) return 'danger';
      
      const c80Ok = qResult.c80.meetsRequirement;
      const km98Ok = qResult.km98.meetsRequirement;
      
      if (c80Ok && km98Ok) {
        // Q值均满足
        return 'safe';
      } else if (c80Ok || km98Ok) {
        // 有且仅有1个不满足
        return 'partial';
      } else {
        // Q值均不满足
        return 'danger';
      }
    };
    
    if (selectedBridgeForDistribution === 'all') {
      // 全部桥梁：按桥梁K值统计
      // 找到每座桥梁的最小K值（短板孔跨），并根据Q值判定
      let safeCount = 0;
      let partialCount = 0;
      let dangerCount = 0;
      
      bridges.forEach((bridge) => {
        const bridgeCalcs = filteredCalculations.filter((c) => c.bridgeId === bridge.id);
        if (bridgeCalcs.length === 0) return;
        
        // 找到最小K值的计算记录
        const minCalc = bridgeCalcs.reduce((min, calc) => 
          calc.output.kFinal < min.output.kFinal ? calc : min
        );
        
        const level = getLevel(minCalc.output.kFinal, minCalc.output.qResult);
        if (level === 'safe') safeCount++;
        else if (level === 'partial') partialCount++;
        else dangerCount++;
      });
      
      return {
        safe: safeCount,
        partial: partialCount,
        danger: dangerCount,
        isBySpan: false,
      };
    } else {
      // 特定桥梁：按孔跨K值统计
      const bridge = bridges.find((b) => b.id === selectedBridgeForDistribution);
      if (!bridge) {
        return { safe: 0, partial: 0, danger: 0, isBySpan: true };
      }
      
      // 获取每个孔跨的最新计算记录，并根据Q值判定
      let safeCount = 0;
      let partialCount = 0;
      let dangerCount = 0;
      
      for (let i = 1; i <= bridge.spanCount; i++) {
        const spanCalcs = filteredCalculations.filter(
          (c) => c.bridgeId === selectedBridgeForDistribution && c.spanIndex === i
        );
        if (spanCalcs.length > 0) {
          // 取最新的计算记录
          const latestCalc = spanCalcs.sort((a, b) => 
            new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
          )[0];
          
          const level = getLevel(latestCalc.output.kFinal, latestCalc.output.qResult);
          if (level === 'safe') safeCount++;
          else if (level === 'partial') partialCount++;
          else dangerCount++;
        }
      }
      
      return {
        safe: safeCount,
        partial: partialCount,
        danger: dangerCount,
        isBySpan: true,
      };
    }
  }, [modalData, selectedBridgeForDistribution, timeRangeForDistribution]);

  // 获取已评估的桥梁列表（用于下拉选择）
  const evaluatedBridges = useMemo(() => {
    const { bridges, calculations } = modalData;
    return bridges.filter((bridge) => {
      const bridgeCalcs = calculations.filter((c) => c.bridgeId === bridge.id);
      return bridgeCalcs.length > 0;
    });
  }, [modalData]);

  // K值趋势数据计算
  const kValueTrendData = useMemo(() => {
    const { calculations } = modalData;
    
    // 根据时间范围筛选计算记录
    const filteredCalculations = getFilteredCalculationsByTimeRange(calculations, timeRangeForTrend);
    
    if (selectedBridgeForTrend === 'all') {
      // 全部桥梁：按日期统计所有桥梁的平均K值
      const dateMap = new Map<string, number[]>();
      
      filteredCalculations.forEach((calc) => {
        const date = calc.createTime.split('T')[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }
        dateMap.get(date)!.push(calc.output.kFinal);
      });
      
      const sortedDates = Array.from(dateMap.keys()).sort();
      return sortedDates.map((date) => {
        const kValues = dateMap.get(date)!;
        const avgK = kValues.reduce((sum, k) => sum + k, 0) / kValues.length;
        const level = getKValueLevel(avgK);
        return {
          date,
          kValue: avgK,
          level: level.label,
          color: level.color,
          count: kValues.length,
        };
      });
    } else {
      // 特定桥梁：按日期统计该桥梁的K值变化
      const bridgeCalcs = filteredCalculations.filter((c) => c.bridgeId === selectedBridgeForTrend);
      const dateMap = new Map<string, number[]>();
      
      bridgeCalcs.forEach((calc) => {
        const date = calc.createTime.split('T')[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }
        dateMap.get(date)!.push(calc.output.kFinal);
      });
      
      const sortedDates = Array.from(dateMap.keys()).sort();
      return sortedDates.map((date) => {
        const kValues = dateMap.get(date)!;
        const minK = Math.min(...kValues);
        const level = getKValueLevel(minK);
        return {
          date,
          kValue: minK,
          level: level.label,
          color: level.color,
          count: kValues.length,
        };
      });
    }
  }, [modalData, selectedBridgeForTrend, timeRangeForTrend]);

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
          title="K值不满足"
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
          <div className="px-5 py-4 border-b border-gray-100 flex items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">最近计算记录</h3>
            </div>
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
                          <span className="text-sm font-semibold text-gray-700">K={record.kValue.toFixed(2)}</span>
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

        {/* 即将到期检定卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[300px] flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-800">即将到期检定</h3>
            </div>
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

      {/* 图表区域 - 两列布局 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* K值分布饼图卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">K值等级分布</h3>
            </div>
            {/* 筛选下拉框组 */}
            <div className="flex items-center gap-2">
              {/* 时间范围筛选 */}
              <div className="relative">
                <select
                  value={timeRangeForDistribution}
                  onChange={(e) => setTimeRangeForDistribution(e.target.value as TimeRange)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, 
                    backgroundPosition: 'right 8px center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '16px' 
                  }}
                >
                  <option value="all">全部时间</option>
                  <option value="month">近一月</option>
                  <option value="quarter">近三月</option>
                  <option value="year">近一年</option>
                </select>
              </div>
              {/* 桥梁筛选 */}
              <div className="relative">
                <select
                  value={selectedBridgeForDistribution}
                  onChange={(e) => setSelectedBridgeForDistribution(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, 
                    backgroundPosition: 'right 8px center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '16px' 
                  }}
                >
                  <option value="all">全部桥梁</option>
                  {evaluatedBridges.map((bridge) => (
                    <option key={bridge.id} value={bridge.id}>
                      {bridge.bridgeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {(kLevelDistributionData.safe + kLevelDistributionData.partial + kLevelDistributionData.danger) > 0 ? (
            <div className="flex items-center justify-center gap-12">
              {/* 饼图区域 */}
              <div className="h-56 w-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={[
                        { name: '满足要求', value: kLevelDistributionData.safe, color: K_VALUE_LEVELS[0].color },
                        { name: '部分满足', value: kLevelDistributionData.partial, color: K_VALUE_LEVELS[1].color },
                        { name: '不满足要求', value: kLevelDistributionData.danger, color: K_VALUE_LEVELS[2].color },
                      ].filter((d) => d.value > 0)}
                      cx="55%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                      label={(props) => {
                        const { x, y, percent, index } = props;
                        const percentValue = percent ?? 0;
                        // 根据索引获取对应的数据
                        const data = [
                          { name: '满足要求', value: kLevelDistributionData.safe, color: K_VALUE_LEVELS[0].color },
                          { name: '部分满足', value: kLevelDistributionData.partial, color: K_VALUE_LEVELS[1].color },
                          { name: '不满足要求', value: kLevelDistributionData.danger, color: K_VALUE_LEVELS[2].color },
                        ].filter((d) => d.value > 0);
                        const item = data[index as number];
                        if (!item) return null;
                        // 根据x坐标判断标签在左侧还是右侧
                           const isLeftSide = (x as number) < 160; // 饼图中心约160px
                           const labelX = isLeftSide ? 25 : 280;
                           const textAnchor = isLeftSide ? 'start' : 'end';
                        return (
                          <g>
                            <text
                              x={labelX}
                              y={(y as number) - 8}
                              fill={item.color}
                              textAnchor={textAnchor}
                              dominantBaseline="central"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                            >
                              {item.name}
                            </text>
                            <text
                              x={labelX}
                              y={(y as number) + 8}
                              fill={item.color}
                              textAnchor={textAnchor}
                              dominantBaseline="central"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                            >
                              {`${(percentValue * 100).toFixed(0)}%`}
                            </text>
                          </g>
                        );
                      }}
                      labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    >
                      {[
                        { name: '满足要求', value: kLevelDistributionData.safe, color: K_VALUE_LEVELS[0].color },
                        { name: '部分满足', value: kLevelDistributionData.partial, color: K_VALUE_LEVELS[1].color },
                        { name: '不满足要求', value: kLevelDistributionData.danger, color: K_VALUE_LEVELS[2].color },
                      ]
                        .filter((d) => d.value > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '8px 12px',
                      }}
                      formatter={(value, name) => [`${value} ${kLevelDistributionData.isBySpan ? '孔' : '座'}`, name]}
                      labelStyle={{ display: 'none' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              
              {/* 图例区域 */}
              <div className="w-36 space-y-2">
                <div className="flex items-center justify-between p-1.5 rounded-lg" style={{ backgroundColor: K_VALUE_LEVELS[0].bgColor }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: K_VALUE_LEVELS[0].color }} />
                    <span style={{ fontSize: '13px', color: '#374151' }}>满足要求</span>
                  </div>
                  <span className="font-semibold" style={{ fontSize: '13px', color: K_VALUE_LEVELS[0].color }}>{kLevelDistributionData.safe}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg" style={{ backgroundColor: K_VALUE_LEVELS[1].bgColor }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: K_VALUE_LEVELS[1].color }} />
                    <span style={{ fontSize: '13px', color: '#374151' }}>部分满足</span>
                  </div>
                  <span className="font-semibold" style={{ fontSize: '13px', color: K_VALUE_LEVELS[1].color }}>{kLevelDistributionData.partial}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg" style={{ backgroundColor: K_VALUE_LEVELS[2].bgColor }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: K_VALUE_LEVELS[2].color }} />
                    <span style={{ fontSize: '13px', color: '#374151' }}>不满足要求</span>
                  </div>
                  <span className="font-semibold" style={{ fontSize: '13px', color: K_VALUE_LEVELS[2].color }}>{kLevelDistributionData.danger}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="text-center">
                <PieChart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">暂无K值数据</p>
                <p className="text-xs text-gray-300 mt-1">请先完成桥梁K值计算</p>
              </div>
            </div>
          )}
        </div>

        {/* K值趋势折线图卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">K值变化趋势</h3>
            </div>
            {/* 筛选下拉框组 */}
            <div className="flex items-center gap-2">
              {/* 时间范围筛选 */}
              <div className="relative">
                <select
                  value={timeRangeForTrend}
                  onChange={(e) => setTimeRangeForTrend(e.target.value as TimeRange)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, 
                    backgroundPosition: 'right 8px center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '16px' 
                  }}
                >
                  <option value="all">全部时间</option>
                  <option value="month">近一月</option>
                  <option value="quarter">近三月</option>
                  <option value="year">近一年</option>
                </select>
              </div>
              {/* 桥梁筛选 */}
              <div className="relative">
                <select
                  value={selectedBridgeForTrend}
                  onChange={(e) => setSelectedBridgeForTrend(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, 
                    backgroundPosition: 'right 8px center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '16px' 
                  }}
                >
                  <option value="all">全部桥梁</option>
                  {evaluatedBridges.map((bridge) => (
                    <option key={bridge.id} value={bridge.id}>
                      {bridge.bridgeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {kValueTrendData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart
                  data={kValueTrendData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 3]}
                    ticks={[0, 1, 2, 3]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px 12px',
                    }}
                    formatter={(value) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [`${numValue.toFixed(2)}`, selectedBridgeForTrend === 'all' ? '平均K值' : '最小K值'];
                    }}
                    labelFormatter={(label) => label}
                    labelStyle={{ color: '#374151', fontWeight: 500, fontSize: '13px' }}
                    itemStyle={{ fontSize: '12px', color: '#3b82f6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="kValue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: { color: string } };
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                    isAnimationActive={false}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="text-center">
                <LineChart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">暂无趋势数据</p>
                <p className="text-xs text-gray-300 mt-1">请先完成桥梁K值计算</p>
              </div>
            </div>
          )}
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
