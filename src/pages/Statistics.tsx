import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calculator,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  FileSpreadsheet,
  FileJson,
  LayoutGrid,
  PieChart,
  LineChart,
  List,
  Target,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import { getBridges, getCalculations } from '../lib/db';
import type { Bridge, KValueCalculation } from '../lib/types';
import { QValueTooltip } from '../components/QValueTooltip';
import { getBridgeCoverage, getControlItem, getKValueLevel as assessKValueLevel, isSpanSupported } from '../lib/kValueAssessment';

// ============ 常量定义 ============
// 判定逻辑（四级分类）：
// 1. K >= 1.0：满足要求（绿色）
// 2. K < 1.0 且 Q值均满足（c80和km98都满足）：满足要求（绿色）
// 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
// 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
export const K_VALUE_LEVELS = [
  { key: 'safe', label: '满足要求', min: 1.0, color: '#10b981', bgColor: '#ecfdf5' },
  { key: 'partial', label: '部分满足', min: -Infinity, color: '#f59e0b', bgColor: '#fffbeb' },
  { key: 'danger', label: '不满足要求', min: -Infinity, color: '#ef4444', bgColor: '#fef2f2' },
] as const;

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'] as const;

// 获取 K 值等级（仅基于K值，不考虑Q值）
const getKValueLevel = (kValue: number) => {
  if (kValue >= 1.0) return K_VALUE_LEVELS[0]; // safe
  return K_VALUE_LEVELS[2]; // danger (默认，实际应根据Q值判断)
};

// 获取 K 值等级（考虑Q值）- 四级分类
// 1. K >= 1.0：满足要求（绿色）
// 2. K < 1.0 且 Q值均满足：满足要求（绿色）
// 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
// 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
const getKValueLevelWithQ = (kValue: number, qResult?: { c80: { meetsRequirement: boolean }; km98: { meetsRequirement: boolean } } | null) => {
  const level = assessKValueLevel(kValue, qResult);
  return level === 'safe' ? K_VALUE_LEVELS[0] : level === 'partial' ? K_VALUE_LEVELS[1] : K_VALUE_LEVELS[2];
};

// 获取 K 值等级标签（带颜色点）
const KValueLevelBadge = ({ kValue, showValue = true, showLabel = true }: { kValue: number; showValue?: boolean; showLabel?: boolean }) => {
  const level = getKValueLevel(kValue);
  return (
    <span className="inline-flex items-center gap-1.5">
      {showValue && <span>{kValue.toFixed(2)}</span>}
      {showLabel && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: level.bgColor, color: level.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: level.color }} />
          {level.label}
        </span>
      )}
    </span>
  );
};

// ============ 类型定义 ============
type TabId = 'overview' | 'bridge' | 'detail';
type TimeRange = 'all' | 'month' | 'quarter' | 'year';

interface BridgeKValueData {
  bridgeId: string;
  bridgeName: string;
  lineName: string;
  bridgeNo: string;
  centerMileage: string;
  spanCount: number;
  spanType: string;
  buildYear: number;
  operationStatus: string;
  bridgeKValue: number | null;
  calculatedSpans: number;
  supportedSpanCount: number;
  unsupportedSpanCount: number;
  coverageStatus: 'unevaluated' | 'partial' | 'complete';
  scopeText: string;
  shortBoardSpans: number[];
  controlComponent: string | null;
  lastCalcTime: string | null;
  spanCalculations: SpanCalculationData[];
}

interface SpanCalculationData {
  spanIndex: number;
  beamType: string;
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  kFinal: number;
  createTime: string;
  qResult?: {
    c80: { q: number; meetsRequirement: boolean };
    km98: { q: number; meetsRequirement: boolean };
  } | null;
}

// ============ 空状态组件 ============
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <Icon className="w-12 h-12 mb-3 opacity-50" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );
}

// ============ 桥梁选择器下拉框组件 ============
interface BridgeSelectorDropdownProps {
  bridges: Array<{ bridgeId: string; bridgeName: string; bridgeKValue: number }>;
  selectedIds: Set<string>;
  onChange: (selectedIds: Set<string>) => void;
}

function BridgeSelectorDropdown({ bridges, selectedIds, onChange }: BridgeSelectorDropdownProps) {
  const selectedBridge = bridges.find(b => selectedIds.has(b.bridgeId));
  const selectedId = selectedBridge?.bridgeId || '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(new Set([e.target.value]));
  };

  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={handleChange}
        className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[120px] bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right-2 bg-[length:0.7em]"
        style={{ backgroundImage: 'none' }}
      >
        {bridges.map((bridge) => (
          <option key={bridge.bridgeId} value={bridge.bridgeId}>
            {bridge.bridgeName}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ============ 主组件 ============
export default function Statistics() {
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [calculations, setCalculations] = useState<KValueCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [selectedBridgeId, setSelectedBridgeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBridgeIdsForChart, setSelectedBridgeIdsForChart] = useState<Set<string>>(new Set());
  const [kValueAggregation, setKValueAggregation] = useState<'min' | 'avg'>('min');
  const [selectedBridgeForDistribution, setSelectedBridgeForDistribution] = useState<string>('all');
  const [rankingSortBy, setRankingSortBy] = useState<'min' | 'avg'>('min');
  const [rankingOrder, setRankingOrder] = useState<'asc' | 'desc'>('asc');
  // 桥梁分析Tab新状态
  const [selectedSpanForDetail, setSelectedSpanForDetail] = useState<number | null>(null);
  const [spanSearchTerm] = useState('');
  const [spanFilterStatus] = useState<'all' | 'calculated' | 'uncalculated' | 'danger' | 'partial' | 'low'>('all');
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [spanTableSort, setSpanTableSort] = useState<{ key: 'spanIndex' | 'kFinal' | 'k1' | 'k2' | 'k3' | 'k4' | 'k5'; order: 'asc' | 'desc' }>({ key: 'spanIndex', order: 'asc' });
  // 孔跨表格筛选状态
  const [spanTableFilter, setSpanTableFilter] = useState<{
    spanIndices: number[];
    aggregation: 'min' | 'avg' | 'all';
  }>({ spanIndices: [], aggregation: 'all' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bridgesData, calculationsData] = await Promise.all([getBridges(), getCalculations()]);
      setBridges(bridgesData);
      setCalculations(calculationsData);
      // 默认选中第一座桥梁
      if (bridgesData.length > 0 && !selectedBridgeId) {
        setSelectedBridgeId(bridgesData[0].id);
      }
      // 默认选中所有桥梁用于图表显示
      if (bridgesData.length > 0 && selectedBridgeIdsForChart.size === 0) {
        setSelectedBridgeIdsForChart(new Set(bridgesData.map(b => b.id)));
      }
    } catch (error) {
      console.error('Failed to load statistics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据时间范围筛选计算记录
  const filteredCalculations = useMemo(() => {
    if (timeRange === 'all') return calculations;
    const now = new Date();
    const ranges = { month: 30, quarter: 90, year: 365 };
    const days = ranges[timeRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return calculations.filter((c) => new Date(c.createTime) >= cutoff);
  }, [calculations, timeRange]);

  // 桥梁K值数据计算
  const bridgeKValueData = useMemo((): BridgeKValueData[] => {
    return bridges.map((bridge) => {
      const supportedSpanIndices = new Set(bridge.spans.filter(isSpanSupported).map((span) => span.index));
      const bridgeCalcs = filteredCalculations.filter((c) => c.bridgeId === bridge.id && supportedSpanIndices.has(c.spanIndex));
      const spanCalculations: SpanCalculationData[] = bridgeCalcs.map((c) => ({
        spanIndex: c.spanIndex,
        beamType: c.beamType,
        k1: c.output.k1,
        k2: c.output.k2,
        k3: c.output.k3,
        k4: c.output.k4,
        k5: c.output.k5 ?? 999, // 旧数据可能没有k5，给一个默认值避免计算错误
        kFinal: c.output.kFinal,
        createTime: c.createTime,
        qResult: c.output.qResult,
      }));

      // 按孔跨分组，取每个孔跨最新的计算记录
      const spanLatestCalcs = new Map<number, SpanCalculationData>();
      spanCalculations.forEach((calc) => {
        const existing = spanLatestCalcs.get(calc.spanIndex);
        if (!existing || new Date(calc.createTime) > new Date(existing.createTime)) {
          spanLatestCalcs.set(calc.spanIndex, calc);
        }
      });

      const latestCalcs = Array.from(spanLatestCalcs.values());
      const coverage = getBridgeCoverage(bridge, filteredCalculations);
      const kFinals = latestCalcs.map((c) => c.kFinal);
      const bridgeKValue = kFinals.length > 0 ? Math.min(...kFinals) : null;

      // 短板孔跨
      const shortBoardSpans = bridgeKValue !== null
        ? latestCalcs.filter((c) => c.kFinal === bridgeKValue).map((c) => c.spanIndex)
        : [];

      // 控制分项
      let controlComponent: string | null = null;
      if (shortBoardSpans.length > 0) {
        const shortBoardCalc = latestCalcs.find((c) => c.spanIndex === shortBoardSpans[0]);
        if (shortBoardCalc) {
          const control = getControlItem(shortBoardCalc);
          controlComponent = `${control.label} ${control.description}`;
        }
      }

      // 最近计算时间
      const lastCalcTime = bridgeCalcs.length > 0
        ? new Date(Math.max(...bridgeCalcs.map((c) => new Date(c.createTime).getTime()))).toISOString().split('T')[0]
        : null;

      return {
        bridgeId: bridge.id,
        bridgeName: bridge.bridgeName,
        lineName: bridge.lineName,
        bridgeNo: bridge.bridgeNo,
        centerMileage: bridge.centerMileage,
        spanCount: bridge.spanCount,
        spanType: bridge.spanType,
        buildYear: bridge.buildYear,
        operationStatus: bridge.operationStatus,
        bridgeKValue,
        calculatedSpans: coverage.calculatedSupportedSpanCount,
        supportedSpanCount: coverage.supportedSpanCount,
        unsupportedSpanCount: coverage.unsupportedSpanCount,
        coverageStatus: coverage.status,
        scopeText: coverage.scopeText,
        shortBoardSpans,
        controlComponent,
        lastCalcTime,
        spanCalculations: latestCalcs.sort((a, b) => a.spanIndex - b.spanIndex),
      };
    });
  }, [bridges, filteredCalculations]);

  // 总览统计数据
  const overviewStats = useMemo(() => {
    const totalBridges = bridges.length;
    const evaluatedBridges = bridgeKValueData.filter((b) => b.bridgeKValue !== null);
    
    // 判定逻辑（四级分类）：
    // 1. K >= 1.0：满足要求（绿色）
    // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
    // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
    // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
    const getBridgeLevel = (bridge: BridgeKValueData): 'safe' | 'partial' | 'danger' => {
      if (bridge.bridgeKValue === null) return 'danger';
      const minKSpan = bridge.spanCalculations.reduce((min, span) => 
        span.kFinal < min.kFinal ? span : min
      );
      return assessKValueLevel(minKSpan.kFinal, minKSpan.qResult);
    };
    
    const safeBridges = evaluatedBridges.filter((b) => getBridgeLevel(b) === 'safe');
    const partialBridges = evaluatedBridges.filter((b) => getBridgeLevel(b) === 'partial');
    const dangerBridges = evaluatedBridges.filter((b) => getBridgeLevel(b) === 'danger');

    // 计算覆盖
    const calculatedBridgeCount = evaluatedBridges.length;
    const bridgeCoverage = totalBridges > 0 ? Math.round((calculatedBridgeCount / totalBridges) * 100) : 0;

    // 孔跨覆盖
    const totalSpans = bridgeKValueData.reduce((sum, b) => sum + b.supportedSpanCount, 0);
    const calculatedSpanCount = evaluatedBridges.reduce((sum, b) => sum + b.calculatedSpans, 0);
    const spanCoverage = totalSpans > 0 ? Math.round((calculatedSpanCount / totalSpans) * 100) : 0;

    // K值等级分布（按桥梁数量）- 四级分类
    const kLevelDistribution = {
      safe: safeBridges.length,
      partial: partialBridges.length,
      danger: dangerBridges.length,
    };

    // 桥梁K值排名（按桥梁K值升序）
    const bridgeRanking = [...evaluatedBridges]
      .map((b) => {
        // 计算平均K值
        const spanKValues = b.spanCalculations
          .map((s) => s.kFinal)
          .filter((k): k is number => k !== null);
        const avgKValue = spanKValues.length > 0 
          ? spanKValues.reduce((sum, k) => sum + k, 0) / spanKValues.length 
          : null;
        return {
          ...b,
          avgKValue,
        };
      })
      .sort((a, b) => {
        // 根据排序方式选择排序字段
        const aValue = rankingSortBy === 'min' ? (a.bridgeKValue ?? Infinity) : (a.avgKValue ?? Infinity);
        const bValue = rankingSortBy === 'min' ? (b.bridgeKValue ?? Infinity) : (b.avgKValue ?? Infinity);
        // 根据升序/降序返回比较结果
        return rankingOrder === 'asc' ? aValue - bValue : bValue - aValue;
      })
      .map((b, index) => ({
        rank: index + 1,
        bridgeId: b.bridgeId,
        bridgeName: b.bridgeName,
        lineName: b.lineName,
        buildYear: b.buildYear,
        bridgeKValue: b.bridgeKValue!,
        avgKValue: b.avgKValue,
        calculatedSpans: b.calculatedSpans,
        spanCount: b.supportedSpanCount,
        unsupportedSpanCount: b.unsupportedSpanCount,
        scopeText: b.scopeText,
      }));

    return {
      totalBridges,
      problemBridgeCount: dangerBridges.length,
      dangerBridgeCount: dangerBridges.length,
      bridgeCoverage,
      calculatedBridgeCount,
      spanCoverage,
      calculatedSpanCount,
      totalSpans,
      kLevelDistribution,
      bridgeRanking,
    };
  }, [bridges, bridgeKValueData, rankingSortBy, rankingOrder]);

  // 选中的桥梁数据
  const selectedBridgeData = useMemo(() => {
    if (!selectedBridgeId) return null;
    return bridgeKValueData.find((b) => b.bridgeId === selectedBridgeId) || null;
  }, [selectedBridgeId, bridgeKValueData]);

  // 趋势用于观察过程数据，阶段性检算桥梁也应可选；正式排名仍只纳入支持范围已完成的桥梁。
  const trendBridgeOptions = useMemo(() => {
    return bridgeKValueData
      .filter((bridge) => bridge.bridgeKValue !== null)
      .map((bridge) => ({
        bridgeId: bridge.bridgeId,
        bridgeName: bridge.bridgeName,
        bridgeKValue: bridge.bridgeKValue!,
      }));
  }, [bridgeKValueData]);

  // 桥梁历史趋势数据
  const bridgeTrendData = useMemo(() => {
    if (!selectedBridgeData) return [];

    // 收集该桥梁所有计算记录的时间点
    const bridgeCalcs = filteredCalculations.filter((c) => c.bridgeId === selectedBridgeId);
    const dates = Array.from(new Set(bridgeCalcs.map((c) => c.createTime.split('T')[0]))).sort();

    return dates.map((date) => {
      const dayCalcs = bridgeCalcs.filter((c) => c.createTime.startsWith(date));
      const spanKValues: Record<string, number | null> = {};
      // 记录每个孔跨的Q值结果（用于判定等级）
      const spanQResults: Record<number, SpanCalculationData['qResult']> = {};

      // 获取每个孔跨在该日期的最新K值和Q值
      selectedBridgeData.spanCalculations.forEach((span) => {
        const spanDayCalcs = dayCalcs.filter((c) => c.spanIndex === span.spanIndex);
        if (spanDayCalcs.length > 0) {
          const latest = spanDayCalcs.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0];
          spanKValues[`span_${span.spanIndex}`] = latest.output.kFinal;
          spanQResults[span.spanIndex] = latest.output.qResult;
        } else {
          spanKValues[`span_${span.spanIndex}`] = null;
        }
      });

      // 计算桥梁K值
      const kValues = Object.values(spanKValues).filter((v): v is number => v !== null);
      const bridgeK = kValues.length > 0 ? Math.min(...kValues) : null;
      
      // 找到短板孔跨的Q值结果
      let shortBoardQResult: SpanCalculationData['qResult'] = null;
      if (bridgeK !== null) {
        const shortBoardSpanIndex = selectedBridgeData.spanCalculations.find((span) => {
          const spanK = spanKValues[`span_${span.spanIndex}`];
          return spanK === bridgeK;
        })?.spanIndex;
        if (shortBoardSpanIndex !== undefined) {
          shortBoardQResult = spanQResults[shortBoardSpanIndex];
        }
      }

      return {
        date,
        bridgeK,
        shortBoardQResult,
        ...spanKValues,
      };
    });
  }, [selectedBridgeData, selectedBridgeId, filteredCalculations]);

  // K值等级分布数据（根据选择的桥梁动态计算）
  // 判定逻辑：
  // 1. K >= 1：满足"中-活载"要求
  // 2. K < 1：需计算Q值
  // 判定逻辑（四级分类）：
  // 1. K >= 1.0：满足要求（绿色）
  // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
  // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
  // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
  const kLevelDistributionData = useMemo(() => {
    // 获取K值等级（考虑Q值）- 四级分类
    const getLevel = (kFinal: number, qResult?: SpanCalculationData['qResult']) => {
      return assessKValueLevel(kFinal, qResult);
    };

    if (selectedBridgeForDistribution === 'all') {
      // 全部桥梁：按桥梁K值统计
      const evaluatedBridges = bridgeKValueData.filter((b) => b.bridgeKValue !== null);
      let safeCount = 0;
      let partialCount = 0;
      let dangerCount = 0;

      evaluatedBridges.forEach((bridge) => {
        // 找到桥梁的短板孔跨（K值最小的孔跨）
        const minKSpan = bridge.spanCalculations.reduce((min, span) => 
          span.kFinal < min.kFinal ? span : min
        );
        
        const level = getLevel(minKSpan.kFinal, minKSpan.qResult);
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
      const bridgeData = bridgeKValueData.find((b) => b.bridgeId === selectedBridgeForDistribution);
      if (!bridgeData || bridgeData.spanCalculations.length === 0) {
        return { safe: 0, partial: 0, danger: 0, isBySpan: true };
      }
      
      let safeCount = 0;
      let partialCount = 0;
      let dangerCount = 0;

      bridgeData.spanCalculations.forEach((span) => {
        const level = getLevel(span.kFinal, span.qResult);
        if (level === 'safe') safeCount++;
        else if (level === 'partial') partialCount++;
        else dangerCount++;
      });

      return {
        safe: safeCount,
        partial: partialCount,
        danger: dangerCount,
        isBySpan: true,
      };
    }
  }, [bridgeKValueData, selectedBridgeForDistribution, filteredCalculations]);

  // 明细数据
  const detailData = useMemo(() => {
    return filteredCalculations.map((calc) => {
      const bridge = bridges.find((b) => b.id === calc.bridgeId);
      // 判定逻辑（四级分类）
      // 1. K >= 1.0：满足要求（绿色）
      // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
      // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
      // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
      const level = getKValueLevelWithQ(calc.output.kFinal, calc.output.qResult);
      return {
        id: calc.id,
        bridgeName: bridge?.bridgeName || '-',
        lineName: bridge?.lineName || '-',
        spanIndex: calc.spanIndex,
        beamType: calc.beamType,
        k1: calc.output.k1,
        k2: calc.output.k2,
        k3: calc.output.k3,
        k4: calc.output.k4,
        k5: calc.output.k5 ?? 999, // 旧数据可能没有k5，给一个默认值避免计算错误
        kFinal: calc.output.kFinal,
        level: level.label,
        levelColor: level.color,
        createTime: calc.createTime,
      };
    }).sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [filteredCalculations, bridges]);

  // 导出数据
  const handleExport = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const data = {
        统计时间: new Date().toLocaleString(),
        时间范围: timeRange,
        桥梁总数: overviewStats.totalBridges,
        问题桥梁数: overviewStats.problemBridgeCount,
        计算覆盖: `${overviewStats.bridgeCoverage}%`,
        K值分布: overviewStats.kLevelDistribution,
        桥梁排名: overviewStats.bridgeRanking,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `统计分析_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['桥梁名称', '所属线路', '孔跨序号', '梁型', 'K1抗弯', 'K2抗裂', 'K3应力', 'K4抗剪', 'K5抗裂', 'K最终', 'K值等级', '计算时间'];
      const rows = detailData.map((d) => [
        d.bridgeName,
        d.lineName,
        d.spanIndex,
        d.beamType,
        d.k1,
        d.k2,
        d.k3,
        d.k4,
        d.k5,
        d.kFinal,
        d.level,
        d.createTime,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `计算明细_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Tab 配置
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: '总览', icon: LayoutGrid },
    { id: 'bridge', label: '桥梁分析', icon: Building2 },
    { id: 'detail', label: '明细数据', icon: List },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" style={{ animationDuration: '0.6s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题和Tab导航 - 固定定位 */}
      <div className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-sm px-6 pt-6 pb-0 border-b border-gray-200">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">统计分析</h1>
            <p className="text-sm text-gray-500 mt-1">桥梁K值计算数据统计与分析</p>
          </div>

          {/* Tab 导航 */}
          <div>
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="p-6 space-y-6">
        {/* ========== 总览 Tab ========== */}
        {activeTab === 'overview' && (
          <>
            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* K值等级分布饼图 */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-800">K值等级分布</h3>
                  <div className="flex items-center gap-2">
                    {/* 桥梁筛选 */}
                    <div className="relative">
                      <select
                        value={selectedBridgeForDistribution}
                        onChange={(e) => setSelectedBridgeForDistribution(e.target.value)}
                        className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[120px]"
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="all">全部桥梁</option>
                        {overviewStats.bridgeRanking.map((bridge) => (
                          <option key={bridge.bridgeId} value={bridge.bridgeId}>
                            {bridge.bridgeName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    {/* 时间筛选 */}
                    <div className="relative">
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                        className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[90px]"
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="all">全部时间</option>
                        <option value="month">近30天</option>
                        <option value="quarter">近90天</option>
                        <option value="year">近一年</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                {(kLevelDistributionData.safe + kLevelDistributionData.partial + kLevelDistributionData.danger) > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={[
                            { name: '满足要求', value: kLevelDistributionData.safe, color: K_VALUE_LEVELS[0].color },
                            { name: '部分满足', value: kLevelDistributionData.partial, color: K_VALUE_LEVELS[1].color },
                            { name: '不满足要求', value: kLevelDistributionData.danger, color: K_VALUE_LEVELS[2].color },
                          ].filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          isAnimationActive={false}
                          labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                          label={(props) => {
                            const { name, percent, index } = props;
                            // 根据索引获取对应的颜色
                            const data = [
                              { name: '满足要求', value: kLevelDistributionData.safe, color: K_VALUE_LEVELS[0].color },
                              { name: '部分满足', value: kLevelDistributionData.partial, color: K_VALUE_LEVELS[1].color },
                              { name: '不满足要求', value: kLevelDistributionData.danger, color: K_VALUE_LEVELS[2].color },
                            ].filter((d) => d.value > 0);
                            const color = data[index as number]?.color || K_VALUE_LEVELS[0].color;
                            return (
                              <text
                                x={props.x}
                                y={props.y}
                                fill={color}
                                textAnchor={props.textAnchor}
                                dominantBaseline={props.dominantBaseline}
                                style={{ fontSize: '12px', fontWeight: 500 }}
                              >
                                {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
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
                          formatter={(value) => {
                            const unit = kLevelDistributionData.isBySpan ? '孔' : '座';
                            return [`${value} ${unit}`, '数量'];
                          }}
                          labelStyle={{ color: '#374151', fontWeight: 500, fontSize: '13px' }}
                          itemStyle={{ fontSize: '12px', color: '#6b7280' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={PieChart} title="暂无数据" />
                )}
              </div>

              {/* 桥梁K值趋势折线图 */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">桥梁K值趋势</h3>
                  <div className="flex items-center gap-3">
                    {/* 桥梁选择器 - 下拉框 */}
                    <BridgeSelectorDropdown
                      bridges={trendBridgeOptions}
                      selectedIds={selectedBridgeIdsForChart}
                      onChange={setSelectedBridgeIdsForChart}
                    />
                    {/* 聚合方式选择 */}
                    <div className="relative">
                      <select
                        value={kValueAggregation}
                        onChange={(e) => setKValueAggregation(e.target.value as 'min' | 'avg')}
                        className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[90px]"
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="min">最小K值</option>
                        <option value="avg">平均K值</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                {selectedBridgeIdsForChart.size > 0 ? (() => {
                  const selectedBridgeId = Array.from(selectedBridgeIdsForChart)[0];
                  const bridge = trendBridgeOptions.find(b => b.bridgeId === selectedBridgeId);
                  if (!bridge) return <EmptyState icon={LineChart} title="请选择桥梁" />;

                  // 获取该桥梁的历史K值数据（按年月）
                  const bridgeCalcs = filteredCalculations.filter(c => c.bridgeId === selectedBridgeId);
                  const monthlyData = new Map<string, number[]>();

                  // 按月份分组收集所有K值
                  bridgeCalcs.forEach(calc => {
                    const date = new Date(calc.createTime);
                    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthlyData.has(yearMonth)) {
                      monthlyData.set(yearMonth, []);
                    }
                    monthlyData.get(yearMonth)!.push(calc.output.kFinal);
                  });

                  // 根据聚合方式计算每月的K值
                  const aggregatedData = new Map<string, number>();
                  monthlyData.forEach((kValues, yearMonth) => {
                    if (kValueAggregation === 'min') {
                      aggregatedData.set(yearMonth, Math.min(...kValues));
                    } else {
                      const avg = kValues.reduce((sum, k) => sum + k, 0) / kValues.length;
                      aggregatedData.set(yearMonth, avg);
                    }
                  });

                  const trendData = Array.from(aggregatedData.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([yearMonth, kValue]) => ({
                      yearMonth,
                      kValue,
                      level: getKValueLevel(kValue),
                    }));

                  if (trendData.length === 0) {
                    return <EmptyState icon={LineChart} title="暂无历史数据" description="该桥梁暂无K值计算记录" />;
                  }

                  return (
                    <div className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart
                          data={trendData}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis
                            dataKey="yearMonth"
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            interval={0}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                            height={20}
                            padding={{ left: 10, right: 10 }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 4]}
                            width={40}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              padding: '8px 12px',
                            }}
                            formatter={(value, _name, props) => {
                              const aggLabel = kValueAggregation === 'min' ? '最小K值' : '平均K值';
                              const level = (props?.payload as { level?: typeof K_VALUE_LEVELS[0] })?.level;
                              return [`${Number(value).toFixed(2)} (${level?.label ?? ''})`, aggLabel];
                            }}
                            labelFormatter={(label) => label}
                            labelStyle={{ color: '#374151', fontWeight: 500, fontSize: '13px' }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="kValue"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={(props) => {
                              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { level: typeof K_VALUE_LEVELS[0] } };
                              return (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={5}
                                  fill={payload.level.color}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              );
                            }}
                            activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                            animationDuration={1000}
                            animationBegin={0}
                          />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })() : (
                  <EmptyState icon={LineChart} title="请选择桥梁" description="使用上方的桥梁选择器选择要显示的桥梁" />
                )}
                </div>
              </div>
            </div>

            {/* 桥梁K值排名表 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">桥梁K值排名</h3>
                <div className="flex items-center gap-2">
                  {/* 排序方式选择 */}
                  <div className="relative">
                    <select
                      value={rankingSortBy}
                      onChange={(e) => setRankingSortBy(e.target.value as 'min' | 'avg')}
                      className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[100px]"
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="min">按最小K值</option>
                      <option value="avg">按平均K值</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  {/* 升序/降序选择 */}
                  <div className="relative">
                    <select
                      value={rankingOrder}
                      onChange={(e) => setRankingOrder(e.target.value as 'asc' | 'desc')}
                      className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[80px]"
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="asc">升序</option>
                      <option value="desc">降序</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">桥梁名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">线路</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">建成年份</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最小K值</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平均K值</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">已算/总孔</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">是否满足运营条件</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">不满足标准</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overviewStats.bridgeRanking.map((row) => {
                      // 判定逻辑（四级分类）
                      // 1. K >= 1.0：满足要求（绿色）
                      // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
                      // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
                      // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
                      const getOperationalLevel = (): { level: 'safe' | 'partial' | 'danger'; label: string; unmetStandards: string[] } => {
                        const bridgeData = bridgeKValueData.find(b => b.bridgeId === row.bridgeId);
                        if (bridgeData && bridgeData.spanCalculations.length > 0) {
                          const minKSpan = bridgeData.spanCalculations.reduce((min, span) =>
                            span.kFinal < min.kFinal ? span : min
                          );
                          const level = getKValueLevelWithQ(minKSpan.kFinal, minKSpan.qResult);
                          // 判断不满足的标准
                          const unmetStandards: string[] = [];
                          if (minKSpan.qResult) {
                            if (!minKSpan.qResult.c80.meetsRequirement) unmetStandards.push('C80');
                            if (!minKSpan.qResult.km98.meetsRequirement) unmetStandards.push('KM98');
                          }
                          return { level: level.key, label: level.label, unmetStandards };
                        }
                        return { level: 'danger', label: '不满足要求', unmetStandards: [] };
                      };
                      const operationalStatus = getOperationalLevel();
                      const levelConfig = K_VALUE_LEVELS.find(l => l.key === operationalStatus.level) || K_VALUE_LEVELS[2];
                      return (
                        <tr
                          key={row.bridgeId}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.rank}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.bridgeName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.lineName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.buildYear}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <KValueLevelBadge kValue={row.bridgeKValue} showLabel={false} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <KValueLevelBadge kValue={row.avgKValue ?? row.bridgeKValue} showLabel={false} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div>{row.calculatedSpans}/{row.spanCount}</div>
                            {row.unsupportedSpanCount > 0 && <div className="text-xs font-normal text-gray-400">另 {row.unsupportedSpanCount} 孔未纳入</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: levelConfig.bgColor, color: levelConfig.color }}
                            >
                              {operationalStatus.level === 'safe' && <CheckCircle2 className="w-3 h-3" />}
                              {operationalStatus.level === 'partial' && <AlertTriangle className="w-3 h-3" />}
                              {operationalStatus.level === 'danger' && <AlertCircle className="w-3 h-3" />}
                              {operationalStatus.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {operationalStatus.unmetStandards.length > 0
                              ? operationalStatus.unmetStandards.join('、')
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {overviewStats.bridgeRanking.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                          暂无已评估的整桥数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ========== 桥梁分析 Tab ========== */}
        {activeTab === 'bridge' && selectedBridgeData && (
          <>
            {/* 桥梁信息卡片 - 占据整个上方 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* 头部：卡片标题 */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="font-semibold text-gray-800">桥梁详细信息</h2>
              </div>

              {/* 主体内容：桥梁信息 + K值仪表盘 */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row">
                  {/* 左侧：桥梁基本信息 */}
                  <div className="lg:w-[40%] lg:pr-8">
                    <div className="space-y-3">
                      {/* 桥梁名称 + 切换 */}
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">桥梁名称</span>
                        <div className="relative">
                          <select
                            value={selectedBridgeId || ''}
                            onChange={(e) => setSelectedBridgeId(e.target.value)}
                            className="pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '14px' }}
                          >
                            {bridges.map((bridge) => (
                              <option key={bridge.id} value={bridge.id}>
                                {bridge.bridgeName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">中心里程</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBridgeData.centerMileage}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">孔跨类型</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBridgeData.spanType}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">建成年份</span>
                        <span className="text-sm font-medium text-gray-900">{selectedBridgeData.buildYear}年</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-500">运营状态</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {selectedBridgeData.operationStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 中间：K值统计 */}
                  <div className="lg:w-[30%] flex flex-col justify-center lg:px-8 lg:border-l lg:border-r border-gray-100">
                    {selectedBridgeData.bridgeKValue !== null ? (
                      <div className="space-y-4">
                        {/* 主要K值 */}
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-1">桥梁K值</p>
                          <p className="text-3xl font-bold text-gray-900">{selectedBridgeData.bridgeKValue.toFixed(2)}</p>
                          {selectedBridgeData.coverageStatus !== 'complete' && (
                            <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">阶段性结果</span>
                          )}
                          {(() => {
                            // 判定逻辑（四级分类）
                            // 1. K >= 1.0：满足要求（绿色）
                            // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
                            // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
                            // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
                            const minKSpan = selectedBridgeData.spanCalculations.reduce((min, span) =>
                              span.kFinal < min.kFinal ? span : min
                            );
                            const level = getKValueLevelWithQ(minKSpan.kFinal, minKSpan.qResult);
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2"
                                style={{ backgroundColor: level.bgColor, color: level.color }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: level.color }} />
                                {level.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* 最小/平均K值 - 卡片式 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 mb-1">最小K值</p>
                            <p className="text-lg font-semibold text-slate-700">
                              {Math.min(...selectedBridgeData.spanCalculations.map(c => c.kFinal)).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                            <p className="text-xs text-slate-500 mb-1">平均K值</p>
                            <p className="text-lg font-semibold text-slate-700">
                              {(selectedBridgeData.spanCalculations.reduce((sum, c) => sum + c.kFinal, 0) / selectedBridgeData.spanCalculations.length).toFixed(2)}
                            </p>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 py-8">
                        <Calculator className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">尚未评估</p>
                      </div>
                    )}
                  </div>

                  {/* 右侧：关键指标 */}
                  <div className="lg:w-[30%] lg:pl-8 flex flex-col justify-center">
                    {selectedBridgeData.bridgeKValue !== null ? (
                      <div className="space-y-3">
                        {/* 短板孔跨 */}
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-medium text-orange-600">短板孔跨</span>
                          </div>
                          <p className="text-sm font-semibold text-orange-700">
                            第{selectedBridgeData.shortBoardSpans.join('、')}孔
                          </p>
                        </div>

                        {/* 控制分项 */}
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">控制分项</span>
                          </div>
                          <p className="text-sm font-semibold text-blue-700">{selectedBridgeData.controlComponent}</p>
                        </div>

                        {/* 计算进度 */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">计算进度</span>
                            <span className="text-xs font-medium text-gray-700">
                              {selectedBridgeData.calculatedSpans}/{selectedBridgeData.supportedSpanCount} 孔
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${selectedBridgeData.supportedSpanCount > 0 ? (selectedBridgeData.calculatedSpans / selectedBridgeData.supportedSpanCount) * 100 : 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">{selectedBridgeData.scopeText}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">请先完成K值计算</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 第二行：孔跨K值分布图 */}
            {selectedBridgeData.spanCalculations.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">孔跨K值分布</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: K_VALUE_LEVELS[0].color }} />
                      满足要求
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: K_VALUE_LEVELS[1].color }} />
                      部分满足
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: K_VALUE_LEVELS[2].color }} />
                      不满足要求
                    </span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        // 根据筛选条件过滤孔跨
                        let spans = Array.from({ length: selectedBridgeData.spanCount }, (_, i) => i + 1);
                        if (spanSearchTerm) {
                          spans = spans.filter(s => s.toString().includes(spanSearchTerm));
                        }
                        return spans.map((spanIndex) => {
                          const spanCalc = selectedBridgeData.spanCalculations.find((c) => c.spanIndex === spanIndex);
                          const isShortBoard = selectedBridgeData.shortBoardSpans.includes(spanIndex);
                          // 判定逻辑（考虑Q值）
                          let level = null;
                          if (spanCalc) {
                            level = getKValueLevelWithQ(spanCalc.kFinal, spanCalc.qResult);
                          }
                          return {
                            spanIndex: `第${spanIndex}孔`,
                            kValue: spanCalc ? spanCalc.kFinal : 0,
                            isCalculated: !!spanCalc,
                            isShortBoard,
                            color: level?.color || '#9ca3af',
                            level: level?.label || '未计算',
                            rawIndex: spanIndex,
                          };
                        }).filter(d => {
                          if (spanFilterStatus === 'all') return true;
                          if (spanFilterStatus === 'calculated') return d.isCalculated;
                          if (spanFilterStatus === 'uncalculated') return !d.isCalculated;
                          // 判定逻辑（考虑Q值）：从color判断等级
                          if (spanFilterStatus === 'danger') return d.color === (K_VALUE_LEVELS[2]!.color);
                          if (spanFilterStatus === 'partial') return d.color === (K_VALUE_LEVELS[1]!.color);
                          if (spanFilterStatus === 'low') return d.color === (K_VALUE_LEVELS[0]!.color);
                          return true;
                        });
                      })()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="spanIndex"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 3]}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-100 rounded-lg shadow-xl p-3 min-w-[140px]">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-50">
                                  <span className="text-sm font-medium text-gray-700">{data.spanIndex}</span>
                                  {data.isShortBoard && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">短板</span>
                                  )}
                                </div>
                                {data.isCalculated ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-400">K值</span>
                                      <span className="text-sm font-semibold" style={{ color: data.color }}>{data.kValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-400">状态</span>
                                      <span className="text-xs" style={{ color: data.color }}>{data.level}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 text-center py-1">未计算</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'K=1.0（临界值）', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                      <Bar
                        dataKey="kValue"
                        radius={[4, 4, 0, 0]}
                        onClick={(data) => {
                          const d = data as { isCalculated?: boolean; rawIndex?: number };
                          if (d.isCalculated && d.rawIndex) {
                            setSelectedSpanForDetail(d.rawIndex);
                            setDetailDrawerOpen(true);
                          }
                        }}
                      >
                        {(() => {
                          let spans = Array.from({ length: selectedBridgeData.spanCount }, (_, i) => i + 1);
                          if (spanSearchTerm) {
                            spans = spans.filter(s => s.toString().includes(spanSearchTerm));
                          }
                          return spans.map((spanIndex) => {
                            const spanCalc = selectedBridgeData.spanCalculations.find((c) => c.spanIndex === spanIndex);
                            // 判定逻辑（四级分类）
                            // 1. K >= 1.0：满足要求（绿色）
                            // 2. K < 1.0 且 Q值均满足：满足要求（绿色）
                            // 3. K < 1.0 且 Q值有且仅有1个不满足：部分满足（橙黄色）
                            // 4. K < 1.0 且 Q值均不满足：不满足要求（红色）
                            let color = '#e5e7eb';
                            if (spanCalc) {
                              color = getKValueLevelWithQ(spanCalc.kFinal, spanCalc.qResult).color;
                            }
                            return (
                              <Cell
                                key={spanIndex}
                                fill={color}
                                cursor={spanCalc ? 'pointer' : 'default'}
                                opacity={spanCalc ? 1 : 0.3}
                              />
                            );
                          }).filter((_, i) => {
                            if (spanFilterStatus === 'all') return true;
                            const spanIndex = spans[i];
                            const spanCalc = selectedBridgeData.spanCalculations.find((c) => c.spanIndex === spanIndex);
                            if (spanFilterStatus === 'calculated') return !!spanCalc;
                            if (spanFilterStatus === 'uncalculated') return !spanCalc;
                            // 判定逻辑（四级分类）
                            if (!spanCalc) return false;
                            const level = getKValueLevelWithQ(spanCalc.kFinal, spanCalc.qResult);
                            const levelKey = (level as { key: string }).key;
                            if (spanFilterStatus === 'danger') return levelKey === 'danger';
                            if (spanFilterStatus === 'partial') return levelKey === 'partial';
                            if (spanFilterStatus === 'low') return levelKey === 'safe';
                            return true;
                          });
                        })()}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 第三行：K1-K5分项对比图 + 历史趋势 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* K1-K5分项对比图 */}
              {selectedBridgeData.spanCalculations.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">K1~K5 分项对比</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const calcs = selectedBridgeData.spanCalculations;
                          return [
                            { name: 'K1抗弯', value: Math.min(...calcs.map(c => c.k1)), color: '#3b82f6' },
                            { name: 'K2抗裂', value: Math.min(...calcs.map(c => c.k2)), color: '#10b981' },
                            { name: 'K3应力', value: Math.min(...calcs.map(c => c.k3)), color: '#f59e0b' },
                            { name: 'K4抗剪', value: Math.min(...calcs.map(c => c.k4)), color: '#ef4444' },
                            { name: 'K5抗裂', value: Math.min(...calcs.map(c => c.k5)), color: '#8b5cf6' },
                          ];
                        })()}
                        layout="vertical"
                        margin={{ top: 10, right: 40, left: 60, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                          domain={[0, 3.5]}
                          ticks={[0, 1, 2, 3]}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-gray-100 rounded-lg shadow-xl p-3 min-w-[120px]">
                                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-50">
                                    <span className="text-sm font-medium text-gray-700">{data.name}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">最小值</span>
                                    <span className="text-sm font-semibold" style={{ color: data.color }}>
                                      {data.value.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                          {(() => {
                            const calcs = selectedBridgeData.spanCalculations;
                            return [
                              { name: 'K1抗弯', value: Math.min(...calcs.map(c => c.k1)), color: '#3b82f6' },
                              { name: 'K2抗裂', value: Math.min(...calcs.map(c => c.k2)), color: '#10b981' },
                              { name: 'K3应力', value: Math.min(...calcs.map(c => c.k3)), color: '#f59e0b' },
                              { name: 'K4抗剪', value: Math.min(...calcs.map(c => c.k4)), color: '#ef4444' },
                              { name: 'K5抗裂', value: Math.min(...calcs.map(c => c.k5)), color: '#8b5cf6' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ));
                          })()}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 历史趋势图 */}
              {bridgeTrendData.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">历史趋势</h3>
                    <div className="flex items-center gap-3">
                      {/* 孔跨号筛选 - 使用系统自带select */}
                      <div className="relative">
                        <select
                          value={spanTableFilter.spanIndices.length === 0 ? 'all' : spanTableFilter.spanIndices[0].toString()}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'all') {
                              setSpanTableFilter(prev => ({ ...prev, spanIndices: [] }));
                            } else {
                              setSpanTableFilter(prev => ({ ...prev, spanIndices: [parseInt(value)] }));
                            }
                          }}
                          className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[90px]"
                          style={{ backgroundImage: 'none' }}
                        >
                          <option value="all">全部孔跨</option>
                          {selectedBridgeData.spanCalculations.map(calc => (
                            <option key={calc.spanIndex} value={calc.spanIndex}>
                              第{calc.spanIndex}孔
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                      
                      {/* 聚合方式选择 */}
                      <div className="relative">
                        <select
                          value={spanTableFilter.aggregation}
                          onChange={(e) => setSpanTableFilter(prev => ({ 
                            ...prev, 
                            aggregation: e.target.value as 'min' | 'avg' | 'all' 
                          }))}
                          className="appearance-none pl-2.5 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[90px]"
                          style={{ backgroundImage: 'none' }}
                        >
                          <option value="all">全部显示</option>
                          <option value="min">最小K值</option>
                          <option value="avg">平均K值</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={bridgeTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          interval={0}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                          height={20}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, 4]}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '8px 12px',
                          }}
                          formatter={(value) => [`${Number(value).toFixed(2)}`, '桥梁K值']}
                          labelFormatter={(label) => label}
                          labelStyle={{ color: '#374151', fontWeight: 500, fontSize: '13px' }}
                          itemStyle={{ fontSize: '12px', color: '#3b82f6' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="bridgeK"
                          name="桥梁K值"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props as { cx: number; cy: number; payload: { bridgeK: number; shortBoardQResult?: SpanCalculationData['qResult'] } };
                            // 判定逻辑（四级分类）
                            const level = getKValueLevelWithQ(payload.bridgeK, payload.shortBoardQResult);
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill={level.color}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            );
                          }}
                          activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                          animationDuration={1000}
                          animationBegin={0}
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* 第四行：孔跨明细表格 */}
            {selectedBridgeData.spanCalculations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">孔跨明细数据</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'spanIndex', order: spanTableSort.key === 'spanIndex' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            孔跨
                            {spanTableSort.key === 'spanIndex' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">梁型</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'k1', order: spanTableSort.key === 'k1' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            K1抗弯
                            {spanTableSort.key === 'k1' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'k2', order: spanTableSort.key === 'k2' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            K2抗裂
                            {spanTableSort.key === 'k2' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'k3', order: spanTableSort.key === 'k3' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            K3应力
                            {spanTableSort.key === 'k3' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'k4', order: spanTableSort.key === 'k4' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            K4抗剪
                            {spanTableSort.key === 'k4' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'k5', order: spanTableSort.key === 'k5' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            K5抗裂
                            {spanTableSort.key === 'k5' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => setSpanTableSort({ key: 'kFinal', order: spanTableSort.key === 'kFinal' && spanTableSort.order === 'asc' ? 'desc' : 'asc' })}
                        >
                          <div className="flex items-center gap-1">
                            K最终
                            {spanTableSort.key === 'kFinal' && (
                              spanTableSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">控制</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        // 先进行筛选
                        let filteredData = [...selectedBridgeData.spanCalculations];
                        
                        // 按孔跨号筛选
                        if (spanTableFilter.spanIndices.length > 0) {
                          filteredData = filteredData.filter(calc => 
                            spanTableFilter.spanIndices.includes(calc.spanIndex)
                          );
                        }
                        
                        // 按聚合方式筛选
                        if (spanTableFilter.aggregation === 'min' && filteredData.length > 0) {
                          const minKFinal = Math.min(...filteredData.map(c => c.kFinal));
                          filteredData = filteredData.filter(c => c.kFinal === minKFinal);
                        } else if (spanTableFilter.aggregation === 'avg' && filteredData.length > 0) {
                          const avgKFinal = filteredData.reduce((sum, c) => sum + c.kFinal, 0) / filteredData.length;
                          // 显示与平均值最接近的孔跨
                          filteredData = filteredData.sort((a, b) => 
                            Math.abs(a.kFinal - avgKFinal) - Math.abs(b.kFinal - avgKFinal)
                          ).slice(0, 1);
                        }
                        
                        // 再进行排序
                        const sortedData = filteredData.sort((a, b) => {
                          const order = spanTableSort.order === 'asc' ? 1 : -1;
                          if (spanTableSort.key === 'spanIndex') return (a.spanIndex - b.spanIndex) * order;
                          return (a[spanTableSort.key] - b[spanTableSort.key]) * order;
                        });
                        return sortedData.map((calc) => {
                          const { k1, k2, k3, k4, k5, kFinal } = calc;
                          const minK = Math.min(k1, k2, k3, k4, k5);
                          let control = '';
                          if (minK === k1) control = 'K1';
                          else if (minK === k2) control = 'K2';
                          else if (minK === k3) control = 'K3';
                          else if (minK === k4) control = 'K4';
                          else if (minK === k5) control = 'K5';
                          const isShortBoard = selectedBridgeData.shortBoardSpans.includes(calc.spanIndex);

                          return (
                            <tr 
                              key={calc.spanIndex} 
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setSelectedSpanForDetail(calc.spanIndex);
                                setDetailDrawerOpen(true);
                              }}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  第{calc.spanIndex}孔
                                  {isShortBoard && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                      短板
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{calc.beamType}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={k1 === minK ? 'font-bold text-orange-600' : 'text-gray-700'}>{k1.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={k2 === minK ? 'font-bold text-orange-600' : 'text-gray-700'}>{k2.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={k3 === minK ? 'font-bold text-orange-600' : 'text-gray-700'}>{k3.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={k4 === minK ? 'font-bold text-orange-600' : 'text-gray-700'}>{k4.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={k5 === minK ? 'font-bold text-orange-600' : 'text-gray-700'}>{k5.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                {(() => {
                                  const level = getKValueLevelWithQ(kFinal, calc.qResult);
                                  return <span style={{ color: level.color }}>{kFinal.toFixed(2)}</span>;
                                })()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  {control}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 孔跨详情抽屉 */}
            {detailDrawerOpen && selectedSpanForDetail && (
              <>
                <div
                  className="fixed inset-0 bg-black/30 z-40"
                  onClick={() => setDetailDrawerOpen(false)}
                />
                <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
                  {(() => {
                    const spanCalc = selectedBridgeData.spanCalculations.find(c => c.spanIndex === selectedSpanForDetail);
                    if (!spanCalc) return null;
                    const { k1, k2, k3, k4, k5, kFinal } = spanCalc;
                    const minK = Math.min(k1, k2, k3, k4, k5);
                    const level = getKValueLevelWithQ(kFinal, spanCalc.qResult);
                    
                    return (
                      <div className="p-6">
                        {/* 抽屉头部 */}
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">第{selectedSpanForDetail}孔详情</h2>
                            <p className="text-sm text-gray-500">{spanCalc.beamType}</p>
                          </div>
                          <button
                            onClick={() => setDetailDrawerOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>

                        {/* K值大卡片 */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 text-center">
                          <p className="text-sm text-gray-500 mb-2">最终K值</p>
                          <p className="text-4xl font-bold mb-2" style={{ color: level.color }}>{kFinal.toFixed(2)}</p>
                          <span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                            style={{ backgroundColor: level.bgColor, color: level.color }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: level.color }} />
                            {level.label}
                          </span>
                        </div>

                        {/* K1-K5 分项 */}
                        <div className="space-y-3 mb-6">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">分项指标</h3>
                          {[
                            { key: 'K1', label: '正截面抗弯强度', value: k1, color: '#3b82f6' },
                            { key: 'K2', label: '正截面抗裂性', value: k2, color: '#10b981' },
                            { key: 'K3', label: '正截面应力', value: k3, color: '#f59e0b' },
                            { key: 'K4', label: '斜截面抗剪', value: k4, color: '#ef4444' },
                            { key: 'K5', label: '斜截面抗裂性', value: k5, color: '#8b5cf6' },
                          ].map((item) => {
                            const isControl = item.value === minK;
                            return (
                              <div 
                                key={item.key}
                                className={`p-4 rounded-xl border ${isControl ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">{item.key}</span>
                                    <span className="text-xs text-gray-500">{item.label}</span>
                                  </div>
                                  {isControl && (
                                    <span className="text-xs font-medium text-red-600">控制项</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        width: `${Math.min((item.value / 3) * 100, 100)}%`,
                                        backgroundColor: isControl ? '#ef4444' : item.color
                                      }}
                                    />
                                  </div>
                                  <span className={`text-lg font-bold ${isControl ? 'text-red-600' : 'text-gray-700'}`}>
                                    {item.value.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Q值显示（当K < 1时） */}
                        {spanCalc.qResult && kFinal < 1.0 && (
                          <div className="mt-4 flex items-center">
                            <QValueTooltip qResult={spanCalc.qResult} />
                          </div>
                        )}

                        {/* 计算时间 */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 pt-4 border-t border-gray-100">
                          <Clock className="w-4 h-4" />
                          <span>计算时间: {new Date(spanCalc.createTime).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        )}

        {/* ========== 明细数据 Tab ========== */}
        {activeTab === 'detail' && (
          <>
            {/* 筛选工具栏 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">筛选条件:</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                  className="px-3 py-1.5 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                >
                  <option value="all">全部时间</option>
                  <option value="month">近30天</option>
                  <option value="quarter">近90天</option>
                  <option value="year">近一年</option>
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索桥梁名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  导出CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileJson className="w-4 h-4 text-blue-600" />
                  导出JSON
                </button>
              </div>
            </div>

            {/* 明细表格 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">计算时间</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">桥梁名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">线路</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">孔跨</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">梁型</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K1</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K2</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K3</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K4</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K5</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">K最终</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">等级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailData
                      .filter((d) => !searchTerm || d.bridgeName.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(row.createTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{row.bridgeName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.lineName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">第{row.spanIndex}孔</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.beamType}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.k1.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.k2.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.k3.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.k4.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.k5.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium" style={{ color: row.levelColor }}>{row.kFinal.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${row.levelColor}20`, color: row.levelColor }}
                            >
                              {row.level}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {detailData.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <List className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium text-gray-500">暂无计算记录</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
