import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronRight, CheckCircle2, Clock, MapPin, Calendar, Ruler } from 'lucide-react';
import type { Bridge } from '../lib/types';
import { getBridges, getCalculations } from '../lib/db';
import BridgeDetailModal from '../components/BridgeDetailModal';

type FilterStatus = 'all' | 'calculated' | 'pending';
type SortField = 'calcTime' | 'kValue';

interface BridgeWithCalc extends Bridge {
  lastCalcTime?: string;
  kValue?: number;
  calcStatus?: 'calculated' | 'pending';
}

interface BridgeListProps {
  dataRefresh: number;
  onCalculate: (bridge: Bridge) => void;
}

export default function BridgeList({ dataRefresh, onCalculate }: BridgeListProps) {
  const [bridges, setBridges] = useState<BridgeWithCalc[]>([]);
  const [filteredBridges, setFilteredBridges] = useState<BridgeWithCalc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField] = useState<SortField>('calcTime');
  const [currentPage, setCurrentPage] = useState(1);
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [selectedBridgeForDetail, setSelectedBridgeForDetail] = useState<Bridge | null>(null);
  const pageSize = 7;

  useEffect(() => {
    loadBridges();
  }, [dataRefresh]);

  const loadBridges = async () => {
    try {
      const [bridgeData, calculations] = await Promise.all([
        getBridges(),
        getCalculations()
      ]);
      
      const bridgesWithCalc = bridgeData.map(bridge => {
        const bridgeCalcs = calculations.filter(c => c.bridgeId === bridge.id);
        const latestCalc = bridgeCalcs.sort((a, b) => 
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        )[0];
        
        // 只有当所有桥洞都完成计算时才显示已计算
        const uniqueSpanIndices = new Set(bridgeCalcs.map(c => c.spanIndex));
        const calcStatus: BridgeWithCalc['calcStatus'] = uniqueSpanIndices.size >= bridge.spanCount ? 'calculated' : 'pending';
        
        return {
          ...bridge,
          lastCalcTime: latestCalc?.createTime,
          kValue: latestCalc?.output.kFinal,
          calcStatus,
        };
      });
      
      setBridges(bridgesWithCalc);
    } catch (error) {
      console.error('加载桥梁数据失败:', error);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...bridges];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.bridgeName.toLowerCase().includes(query) ||
        b.bridgeNo.toLowerCase().includes(query)
      );
    }
    
    if (filterStatus !== 'all') {
      result = result.filter(b => b.calcStatus === filterStatus);
    }
    
    if (lineFilter !== 'all') {
      result = result.filter(b => b.lineName === lineFilter);
    }
    
    result.sort((a, b) => {
      switch (sortField) {
        case 'calcTime':
          if (!a.lastCalcTime) return 1;
          if (!b.lastCalcTime) return -1;
          return new Date(b.lastCalcTime).getTime() - new Date(a.lastCalcTime).getTime();
        case 'kValue':
          if (!a.kValue) return 1;
          if (!b.kValue) return -1;
          return b.kValue - a.kValue;
        default:
          return 0;
      }
    });
    
    setFilteredBridges(result);
    setCurrentPage(1);
  }, [bridges, searchQuery, filterStatus, lineFilter, sortField]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const lineOptions = useMemo(() => {
    const lines = new Set(bridges.map(b => b.lineName));
    return ['all', ...Array.from(lines)];
  }, [bridges]);

  const totalPages = Math.ceil(filteredBridges.length / pageSize);
  const paginatedBridges = filteredBridges.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const StatusBadge = ({ status }: { status?: BridgeWithCalc['calcStatus'] }) => {
    if (status === 'calculated') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          已计算
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <Clock className="w-3.5 h-3.5" />
        未计算
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">桥梁列表</h2>
          <p className="text-sm text-gray-500 mt-1">桥梁列表、K值计算与结果管理</p>
        </div>

      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索桥名、桥号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        <select
          value={lineFilter}
          onChange={(e) => setLineFilter(e.target.value)}
          className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-no-repeat bg-right"
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
        >
          <option value="all">全部线路</option>
          {lineOptions.filter(l => l !== 'all').map(line => (
            <option key={line} value={line}>{line}</option>
          ))}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-no-repeat bg-right"
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
        >
          <option value="all">全部状态</option>
          <option value="calculated">已计算</option>
          <option value="pending">未计算</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100 min-h-[600px]">
          {paginatedBridges.map((bridge) => (
            <div
              key={bridge.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative"
              onClick={() => setSelectedBridgeForDetail(bridge)}
            >
              <div className="flex items-center gap-4">
                {/* 左侧：桥梁编号 */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{bridge.bridgeNo.replace('#', '')}</span>
                </div>

                {/* 中间：主要信息 */}
                <div className="flex-1 min-w-0">
                  {/* 第一行：桥梁名称 + 线路 + 状态 */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-gray-900 truncate">{bridge.bridgeName}</h3>
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {bridge.lineName}
                    </span>
                    <StatusBadge status={bridge.calcStatus} />
                  </div>

                  {/* 第二行：详细信息 */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {bridge.centerMileage}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      {bridge.spanCount}孔 · {bridge.spanType}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {bridge.buildYear}年
                    </span>
                  </div>
                </div>

                {/* 右侧：操作按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCalculate(bridge);
                  }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                >
                  <span>{bridge.calcStatus === 'pending' ? '计算' : '重算'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {paginatedBridges.length < pageSize && paginatedBridges.length > 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              没有更多了
            </div>
          )}
        </div>
        
        {filteredBridges.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">未找到符合条件的桥梁</p>
          </div>
        )}
      </div>

      {filteredBridges.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            共 {filteredBridges.length} 条 | 第 {currentPage}/{totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`
                  w-8 h-8 text-sm rounded-lg font-medium
                  ${currentPage === page 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      <BridgeDetailModal
        bridge={selectedBridgeForDetail}
        isOpen={selectedBridgeForDetail !== null}
        onClose={() => setSelectedBridgeForDetail(null)}
        onCalculate={onCalculate}
        dataRefresh={dataRefresh}
      />
    </div>
  );
}
