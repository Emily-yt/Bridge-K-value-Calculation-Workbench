import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, Calculator, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import type { Bridge, KValueCalculation as KValueCalculationType } from '../lib/types';
import { deleteBridge, getBridges, getCalculations } from '../lib/db';
import BridgeCard from '../components/BridgeCard';
import BridgeDetailModal from '../components/BridgeDetailModal';
import CalculationResultModal from '../components/CalculationResultModal';
import CreateBridgeDrawer from '../components/CreateBridgeDrawer';
import { getBridgeCoverage, isSpanSupported } from '../lib/kValueAssessment';

// Toast 提示组件
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'warning' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-amber-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type === 'success' ? CheckCircle : AlertTriangle;

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

type FilterStatus = 'all' | 'calculated' | 'pending';

interface KValueCalculationProps {
  dataRefresh: number;
  onCalculate: (bridge: Bridge, spanIndex?: number) => void;
  onOpenReport?: (calculationId: string) => void;
}

export default function KValueCalculation({ dataRefresh, onCalculate, onOpenReport }: KValueCalculationProps) {
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [calculations, setCalculations] = useState<KValueCalculationType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  // 选中的桥梁（单选）
  const [selectedBridgeId, setSelectedBridgeId] = useState<string | null>(null);

  // 用于查看计算结果的弹窗
  const [selectedCalculation, setSelectedCalculation] = useState<KValueCalculationType | null>(null);
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);

  // 用于查看桥梁详情的弹窗
  const [selectedBridgeForDetail, setSelectedBridgeForDetail] = useState<Bridge | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Toast 提示状态
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadData();
  }, [dataRefresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bridgeData, calcData] = await Promise.all([
        getBridges(),
        getCalculations()
      ]);
      setBridges(bridgeData);
      setCalculations(calcData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取桥梁的计算状态
  const getBridgeCalcStatus = useCallback((bridge: Bridge): 'calculated' | 'pending' => {
    return getBridgeCoverage(bridge, calculations).status === 'complete' ? 'calculated' : 'pending';
  }, [calculations]);

  // 获取桥梁未计算的孔位
  const getPendingSpanIndices = useCallback((bridge: Bridge): number[] => {
    const calculatedIndices = new Set(calculations.filter(c => c.bridgeId === bridge.id).map(c => c.spanIndex));
    return bridge.spans
      .filter(span => isSpanSupported(span) && !calculatedIndices.has(span.index))
      .map(span => span.index);
  }, [calculations]);

  // 线路选项
  const lineOptions = useMemo(() => {
    const lines = new Set(bridges.map(b => b.lineName));
    return ['all', ...Array.from(lines)];
  }, [bridges]);

  // 搜索和筛选过滤
  const filteredBridges = useMemo(() => {
    let result = [...bridges];

    // 搜索过滤（仅支持桥名和桥号）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(bridge =>
        bridge.bridgeName.toLowerCase().includes(query) ||
        bridge.bridgeNo.toLowerCase().includes(query)
      );
    }

    // 线路筛选
    if (lineFilter !== 'all') {
      result = result.filter(bridge => bridge.lineName === lineFilter);
    }

    // 计算状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(bridge => getBridgeCalcStatus(bridge) === statusFilter);
    }

    return result;
  }, [bridges, searchQuery, lineFilter, statusFilter, getBridgeCalcStatus]);

  // 获取桥梁的计算记录
  const getBridgeCalculations = useCallback((bridgeId: string): KValueCalculationType[] => {
    return calculations.filter(c => c.bridgeId === bridgeId);
  }, [calculations]);

  // 处理复选框选择（单选）
  const handleBridgeSelect = (bridgeId: string, selected: boolean) => {
    setSelectedBridgeId(selected ? bridgeId : null);
  };

  // 处理开始计算
  const handleStartCalculation = () => {
    if (!selectedBridgeId) return;

    const bridge = bridges.find(b => b.id === selectedBridgeId);
    if (!bridge) return;

    // 获取第一个未计算的孔位
    const pendingSpans = getPendingSpanIndices(bridge);
    const firstPendingSpan = pendingSpans.length > 0 ? pendingSpans[0] : bridge.spans[0]?.index;

    // 打开计算抽屉
    onCalculate(bridge, firstPendingSpan);
    // 清空选择
    setSelectedBridgeId(null);
  };

  // 处理孔位点击
  const handleSpanClick = (bridge: Bridge, spanIndex: number) => {
    const calc = calculations.find(c => c.bridgeId === bridge.id && c.spanIndex === spanIndex);

    if (calc) {
      // 已计算，显示结果
      setSelectedCalculation(calc);
      setSelectedBridge(bridge);
    } else {
      // 未计算，检查桥孔是否支持计算
      const span = bridge.spans.find(s => s.index === spanIndex);
      if (span && !isSpanSupported(span)) {
        // 不支持计算，显示 toast 提示
        setToast({
          message: `当前暂不支持 ${span.beamType} 梁长 ${span.beamLength}m 的桥孔计算`,
          type: 'warning'
        });
        return;
      }
      // 支持计算，打开计算抽屉
      onCalculate(bridge, spanIndex);
    }
  };

  // 关闭结果弹窗
  const handleCloseResultModal = () => {
    setSelectedCalculation(null);
    setSelectedBridge(null);
  };

  // 处理卡片点击 - 打开桥梁详情
  const handleCardClick = (bridge: Bridge) => {
    setSelectedBridgeForDetail(bridge);
    setIsDetailModalOpen(true);
  };

  // 关闭详情弹窗
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBridgeForDetail(null);
  };

  // 处理详情弹窗中的计算按钮
  const handleCalculateFromDetail = (bridge: Bridge) => {
    handleCloseDetailModal();
    onCalculate(bridge);
  };

  const handleDeleteBridge = async (bridge: Bridge) => {
    const result = await deleteBridge(bridge.id);
    setSelectedBridgeId((current) => current === bridge.id ? null : current);
    setSelectedCalculation((current) => current?.bridgeId === bridge.id ? null : current);
    setSelectedBridge((current) => current?.id === bridge.id ? null : current);
    handleCloseDetailModal();
    setToast({
      message: `桥梁“${bridge.bridgeName}”已删除，同时清理 ${result.deletedCalculations} 条计算记录`,
      type: 'success',
    });
    await loadData();
    return result;
  };

  // 获取上一期计算结果（用于对比）
  const getPreviousCalculation = useCallback((bridgeId: string, currentCalcId: string): KValueCalculationType | undefined => {
    return calculations
      .filter(c => c.bridgeId === bridgeId && c.id !== currentCalcId)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0];
  }, [calculations]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  const hasSelectedBridge = selectedBridgeId !== null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">K值计算</h2>
          <p className="text-sm text-gray-500 mt-1">桥梁列表、K值计算与结果管理</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          新建桥梁
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-3 mb-6">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索桥名、桥号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 线路筛选 */}
        <div className="relative">
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[120px]"
          >
            <option value="all">全部线路</option>
            {lineOptions.filter(l => l !== 'all').map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* 计算状态筛选 */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[120px]"
          >
            <option value="all">全部状态</option>
            <option value="calculated">已计算</option>
            <option value="pending">未计算</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* 开始计算按钮 */}
        <button
          onClick={handleStartCalculation}
          disabled={!hasSelectedBridge}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            hasSelectedBridge
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
              : 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed'
          }`}
        >
          <Calculator className="w-4 h-4" />
          开始计算
        </button>
      </div>

      {/* 结果统计 */}
      <div className="mb-4 text-sm text-gray-500">
        共 {filteredBridges.length} 座桥梁
      </div>

      {/* 桥梁卡片列表 */}
      {filteredBridges.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredBridges.map(bridge => (
            <BridgeCard
              key={bridge.id}
              bridge={bridge}
              calculations={getBridgeCalculations(bridge.id)}
              onSpanClick={handleSpanClick}
              isSelected={selectedBridgeId === bridge.id}
              onSelect={(selected) => handleBridgeSelect(bridge.id, selected)}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">
            {searchQuery || lineFilter !== 'all' || statusFilter !== 'all'
              ? '未找到符合条件的桥梁'
              : '暂无桥梁数据'}
          </p>
        </div>
      )}

      {/* 计算结果弹窗 */}
      {selectedCalculation && selectedBridge && (
        <CalculationResultModal
          calculation={selectedCalculation}
          bridge={selectedBridge}
          isOpen={true}
          onClose={handleCloseResultModal}
          onOpenReport={onOpenReport}
          previousCalculation={getPreviousCalculation(selectedBridge.id, selectedCalculation.id)}
        />
      )}

      {/* 桥梁详情弹窗 */}
      <BridgeDetailModal
        bridge={selectedBridgeForDetail}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onCalculate={handleCalculateFromDetail}
        onDelete={handleDeleteBridge}
        onViewResult={(calculation, bridge) => {
          setSelectedCalculation(calculation);
          setSelectedBridge(bridge);
          setIsDetailModalOpen(false);
        }}
        onViewReport={(calcId) => {
          setIsDetailModalOpen(false);
          onOpenReport?.(calcId);
        }}
        dataRefresh={dataRefresh}
      />

      <CreateBridgeDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onCreated={(bridge) => {
          setIsCreateDrawerOpen(false);
          setToast({ message: `桥梁“${bridge.bridgeName}”创建成功`, type: 'success' });
          loadData();
        }}
      />

      {/* Toast 提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
