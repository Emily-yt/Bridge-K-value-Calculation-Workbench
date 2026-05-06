import { useState, useEffect } from 'react';
import { Search, MapPin, Train, Calendar, Layers, ArrowRight, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Bridge } from '../lib/types';

interface Step1Props {
  onSelect: (bridge: Bridge) => void;
}

export default function Step1BridgeSelection({ onSelect }: Step1Props) {
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBridges();
  }, []);

  async function fetchBridges() {
    setLoading(true);
    const { data, error } = await supabase
      .from('bridges')
      .select('*')
      .order('name');
    if (!error && data) {
      setBridges(data);
    }
    setLoading(false);
  }

  const filtered = bridges.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.mileage.toLowerCase().includes(q) ||
      b.line.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* 页面标题 */}
      <div className="page-heading">
        <div className="page-heading-icon">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="page-heading-title">桥梁选择</h2>
          <p className="page-heading-subtitle">
            选择需要计算K值的桥梁，支持按桥名、桥号、里程搜索
          </p>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="search-box mb-6">
        <Search className="search-box-icon" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索桥名、桥号或里程..."
          className="search-box-input py-3"
        />
      </div>

      {/* 加载状态 */}
      {loading ? (
        <div className="empty-state">
          <div className="loading-spinner mb-4" />
          <span className="text-sm text-gray-500">加载桥梁数据中...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((bridge) => (
            <div
              key={bridge.id}
              className="card-interactive p-5 group"
              onClick={() => onSelect(bridge)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-base font-semibold text-gray-800">
                      {bridge.name}
                    </h3>
                    <span className="badge-primary">{bridge.line}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Train className="w-4 h-4 text-gray-400" />
                      {bridge.direction}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {bridge.mileage}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-gray-400" />
                      {bridge.span_type} · {bridge.span_count}孔
                    </span>
                    {bridge.year_built && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {bridge.year_built}年建
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-step-active">
                  选择
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* 空状态 */}
          {filtered.length === 0 && (
            <div className="empty-state bg-gray-100 rounded-xl">
              <Building2 className="empty-state-icon" />
              <p className="empty-state-title">未找到匹配的桥梁</p>
              <p className="empty-state-desc">请尝试其他关键词搜索</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
