import { useState, useEffect } from 'react';
import { Clock, Eye, Trash2, Download, FileText, Search, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Calculation, Bridge } from '../lib/types';

interface Step5Props {
  onViewCalculation: (calc: Calculation & { bridge: Bridge }) => void;
}

export default function Step5History({ onViewCalculation }: Step5Props) {
  const [calculations, setCalculations] = useState<(Calculation & { bridge: Bridge })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('calculations')
      .select('*, bridge:bridges(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      setCalculations(data as (Calculation & { bridge: Bridge })[]);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('calculations').delete().eq('id', id);
    setCalculations((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = calculations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.bridge?.name?.toLowerCase().includes(q);
  });

  function getStatusColor(k: number | null) {
    if (!k) return { color: 'var(--gray-500)' };
    if (k >= 3.0) return { color: 'var(--success)' };
    if (k >= 2.0) return { color: 'var(--warning)' };
    return { color: 'var(--error)' };
  }

  return (
    <div className="animate-fadeIn">
      {/* 搜索栏 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
            style={{ color: 'var(--gray-400)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索桥梁名称..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg text-sm transition-all duration-200 focus:outline-none"
            style={{
              backgroundColor: 'var(--gray-100)',
              border: '1px solid transparent',
              color: 'var(--gray-800)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-500)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
              e.currentTarget.style.backgroundColor = 'var(--gray-0)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = 'var(--gray-100)';
            }}
          />
        </div>
      </div>

      {/* 表格容器 */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--gray-0)',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gray-500)' }}
                >
                  时间
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gray-500)' }}
                >
                  桥梁名称
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gray-500)' }}
                >
                  控制K值
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gray-500)' }}
                >
                  控制规范
                </th>
                <th 
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gray-500)' }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--gray-200)' }}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
                    <div className="flex items-center justify-center gap-2">
                      <div 
                        className="w-5 h-5 border-2 rounded-full animate-spin"
                        style={{
                          borderColor: 'var(--gray-200)',
                          borderTopColor: 'var(--primary-500)'
                        }}
                      />
                      加载历史记录...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td 
                    colSpan={5} 
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: 'var(--gray-500)' }}
                  >
                    {calculations.length === 0 ? '暂无计算记录，完成一次K值计算后将在此显示' : '未找到匹配记录'}
                  </td>
                </tr>
              ) : (
                filtered.map((calc) => (
                  <tr 
                    key={calc.id} 
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--gray-100)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--gray-600)' }}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" style={{ color: 'var(--gray-400)' }} />
                        {new Date(calc.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </td>
                    <td 
                      className="px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--gray-800)' }}
                    >
                      {calc.bridge?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="text-sm font-semibold"
                        style={getStatusColor(calc.controlling_k)}
                      >
                        {calc.controlling_k?.toFixed(2) || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {calc.controlling_code || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewCalculation(calc)}
                          className="p-1.5 rounded transition-all duration-200"
                          style={{ color: 'var(--gray-400)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--primary-600)';
                            e.currentTarget.style.backgroundColor = 'var(--primary-50)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--gray-400)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(calc.id)}
                          className="p-1.5 rounded transition-all duration-200"
                          style={{ color: 'var(--gray-400)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--error)';
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--gray-400)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <button 
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
          style={{ 
            backgroundColor: 'var(--gray-100)',
            color: 'var(--gray-700)',
            border: '1px solid var(--gray-200)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--gray-200)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--gray-100)';
          }}
        >
          <Download className="w-4 h-4" />
          导出记录
        </button>
        <button 
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
          style={{ 
            backgroundColor: 'var(--primary-600)',
            color: 'white'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-700)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-600)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <FileText className="w-4 h-4" />
          批量生成报告
        </button>
      </div>
    </div>
  );
}
