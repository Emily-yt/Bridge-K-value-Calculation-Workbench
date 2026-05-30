import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Bridge, KValueCalculation } from '../lib/types';
import { getAssessmentText } from '../lib/kValueAssessment';

interface BridgeCardProps {
  bridge: Bridge;
  calculations: KValueCalculation[];
  onSpanClick: (bridge: Bridge, spanIndex: number) => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onCardClick?: (bridge: Bridge) => void;
}

// 解析 spanType 为跨径组合和结构形式
function parseSpanType(spanType: string): { spanCombination: string; structureType: string } {
  const lastDashIndex = spanType.lastIndexOf('-');
  if (lastDashIndex === -1) {
    return { spanCombination: spanType, structureType: '' };
  }

  const spanPart = spanType.substring(0, lastDashIndex);
  const structurePart = spanType.substring(lastDashIndex + 1);

  // 将 1-24m/15-32m 转换为 1×24m + 15×32m
  const spanCombination = spanPart
    .split('/')
    .map(part => part.replace('-', '×'))
    .join(' + ');

  return { spanCombination, structureType: structurePart };
}

// 获取跨径段的分组
function getSpanGroups(spans: Bridge['spans']): { start: number; end: number; length: number; count: number }[] {
  if (spans.length === 0) return [];

  const groups: { start: number; end: number; length: number; count: number }[] = [];
  let currentLength = spans[0].beamLength;
  let groupStart = spans[0].index;
  let count = 1;

  for (let i = 1; i < spans.length; i++) {
    if (spans[i].beamLength !== currentLength) {
      groups.push({ start: groupStart, end: spans[i - 1].index, length: currentLength, count });
      currentLength = spans[i].beamLength;
      groupStart = spans[i].index;
      count = 1;
    } else {
      count++;
    }
  }

  // 添加最后一组
  groups.push({ start: groupStart, end: spans[spans.length - 1].index, length: currentLength, count });

  return groups;
}

export default function BridgeCard({ bridge, calculations, onSpanClick, isSelected = false, onSelect, onCardClick }: BridgeCardProps) {
  const [hoveredSpan, setHoveredSpan] = useState<number | null>(null);

  const { spanCombination, structureType } = useMemo(() =>
    parseSpanType(bridge.spanType),
    [bridge.spanType]
  );

  const spanGroups = useMemo(() =>
    getSpanGroups(bridge.spans),
    [bridge.spans]
  );

  // 获取每孔的计算状态
  const getSpanStatus = (spanIndex: number): { calculated: boolean; kValue?: number } => {
    const calc = calculations.find(c => c.spanIndex === spanIndex);
    return {
      calculated: !!calc,
      kValue: calc?.output?.kFinal,
    };
  };

  // 计算总跨径长度用于比例缩放
  const totalLength = useMemo(() => {
    return bridge.spans.reduce((sum, span) => sum + span.beamLength, 0);
  }, [bridge.spans]);

  // 获取 tooltip 内容
  const getTooltipContent = (spanIndex: number) => {
    const span = bridge.spans.find(s => s.index === spanIndex);
    const status = getSpanStatus(spanIndex);

    if (!span) return null;

    let kValueText = '';
    if (status.kValue !== undefined) {
      const calculation = calculations.find(c => c.spanIndex === spanIndex);
      kValueText = `K值：${status.kValue.toFixed(2)}（${getAssessmentText(status.kValue, calculation?.output.qResult)}）`;
    }

    return (
      <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap z-50">
        <div className="font-medium mb-1">第{spanIndex}孔</div>
        <div className="text-gray-300">跨径：{span.beamLength}m</div>
        <div className="text-gray-300">梁型：{span.beamType}</div>
        <div className={status.calculated ? 'text-green-400' : 'text-gray-400'}>
          状态：{status.calculated ? '已计算' : '未计算'}
        </div>
        {kValueText && <div className="text-green-400">{kValueText}</div>}
      </div>
    );
  };

  const isOperationActive = bridge.operationStatus === '运营中';

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(bridge);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
      }`}
      onClick={handleCardClick}
    >
      {/* 主布局：左侧信息区 + 右侧跨式图谱 */}
      <div className="flex gap-4">
        {/* 左侧：复选框 + 桥梁基本信息 */}
        <div className="flex-shrink-0 flex gap-3" style={{ width: '340px' }}>
          {/* 复选框 */}
          {onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(!isSelected);
              }}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-1 ${
                isSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
          )}

          {/* 桥梁信息 */}
          <div className="flex-1 min-w-0">
            {/* 桥号 + 桥名 + 状态 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-blue-600 font-bold text-lg">{bridge.bridgeNo}</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {bridge.bridgeName}
              </h3>
              <span className={`flex-shrink-0 px-2 py-0.5 text-[11px] rounded font-medium ${
                isOperationActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {bridge.operationStatus}
              </span>
            </div>

            {/* 里程和结构 */}
            <div className="flex items-center gap-3 text-[13px] text-gray-600 mt-1.5">
              <span>{bridge.centerMileage}</span>
              {structureType && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>{structureType}</span>
                </>
              )}
            </div>

            {/* 跨式和建造年份 */}
            <div className="flex items-center gap-3 text-[13px] text-gray-600 mt-1">
              <span>{spanCombination}</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">{bridge.buildYear}年</span>
            </div>


          </div>
        </div>

        {/* 右侧：跨式图谱 */}
        <div className="flex-1 border-l border-gray-200 pl-4 flex items-center">
          {/* 跨式图谱可视化 */}
          <div className="relative w-full">
            {/* 跨度图示 - 按 beamLength 比例缩放 */}
            <div className="flex items-center gap-1">
              {spanGroups.map((group, groupIdx) => {
                const groupSpans = bridge.spans.filter(s => s.index >= group.start && s.index <= group.end);
                // 计算该组在总长度中的比例
                const groupTotalLength = groupSpans.reduce((sum, s) => sum + s.beamLength, 0);
                const widthPercent = (groupTotalLength / totalLength) * 100;

                return (
                  <div 
                    key={groupIdx} 
                    className="flex flex-col items-center"
                    style={{ width: `${widthPercent}%` }}
                  >
                    {/* 跨度块 */}
                    <div className="flex w-full gap-0.5">
                      {groupSpans.map((span) => {
                        const status = getSpanStatus(span.index);
                        const isHovered = hoveredSpan === span.index;

                        return (
                          <div
                            key={span.index}
                            className="relative flex-1"
                            onMouseEnter={() => setHoveredSpan(span.index)}
                            onMouseLeave={() => setHoveredSpan(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSpanClick(bridge, span.index);
                              }}
                              className={`w-full h-8 rounded-sm flex items-center justify-center transition-all border-2 ${
                                status.calculated
                                  ? 'bg-green-100 border-green-300 hover:bg-green-200'
                                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              {status.calculated ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <span className={`text-xs font-medium ${status.calculated ? 'text-white' : 'text-blue-600'}`}>
                                  {span.index}
                                </span>
                              )}
                            </button>

                            {/* Tooltip */}
                            {isHovered && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                                {getTooltipContent(span.index)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 跨径标注 */}
                    <div className="text-[10px] text-gray-500 mt-1">
                      {group.length}m
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
