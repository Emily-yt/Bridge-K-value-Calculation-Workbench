import { useState, useEffect, useRef, useCallback } from 'react';
import type { StepId, StepStatus } from '../lib/types';

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: '选择桥梁' },
  { id: 2, label: '参数校核' },
  { id: 3, label: '计算结果' },
  { id: 4, label: '报告预览' },
];

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;
const STORAGE_KEY = 'sidebar-width';

interface SidebarProps {
  stepStatus: StepStatus;
  onStepClick: (step: StepId) => void;
  currentBridge: string | null;
}

export default function Sidebar({ stepStatus, onStepClick, currentBridge }: SidebarProps) {
  const progress = (stepStatus.completed.length / STEPS.length) * 100;
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  // 从 localStorage 读取保存的宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  // 保存宽度到 localStorage
  const saveWidth = useCallback((newWidth: number) => {
    localStorage.setItem(STORAGE_KEY, newWidth.toString());
  }, []);

  // 开始拖拽调整
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  // 拖拽中
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleResizeEnd = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveWidth(width);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, width, saveWidth]);

  return (
    <aside 
      ref={sidebarRef}
      className="hidden lg:flex flex-col shrink-0 bg-gray-50 border-r border-gray-200 relative"
      style={{ width: `${width}px` }}
    >
      {/* 当前桥梁 */}
      <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
        <div className="text-xs">
          <span className="text-gray-500">当前桥梁：</span>
          {currentBridge ? (
            <span className="font-semibold text-gray-800">
              {currentBridge}
            </span>
          ) : (
            <span className="text-gray-400">
              暂未选择
            </span>
          )}
        </div>
      </div>

      {/* 步骤导航 */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="text-xs font-medium text-gray-500 mb-3">计算步骤</div>
        
        <div className="relative">
          {/* 背景连接线 */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
          
          <div className="space-y-1">
            {STEPS.map((step) => {
              const isCurrent = step.id === stepStatus.current;
              const isCompleted = stepStatus.completed.includes(step.id);
              const isClickable = isCompleted || step.id <= stepStatus.current;

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    w-full flex items-center gap-3 py-2 px-2 -ml-2 text-left rounded-lg transition-all duration-200
                    ${isCurrent 
                      ? 'bg-blue-50' 
                      : isClickable 
                        ? 'hover:bg-gray-100 cursor-pointer' 
                        : 'cursor-not-allowed'
                    }
                  `}
                >
                  {/* 步骤指示点 */}
                  <div className={`
                    relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0
                    transition-all duration-200
                    ${isCurrent 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                      : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-gray-200 text-gray-400'
                    }
                  `}>
                    {isCompleted && !isCurrent ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>

                  {/* 步骤名称 */}
                  <span className={`
                    text-xs whitespace-nowrap transition-colors duration-200
                    ${isCurrent 
                      ? 'font-semibold text-blue-700' 
                      : isCompleted 
                        ? 'font-medium text-gray-700' 
                        : 'text-gray-400'
                    }
                  `}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 进度 */}
      <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">进度</span>
          <span className="text-xs font-semibold text-gray-700">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-[10px] text-gray-400 text-center">
          步骤 {stepStatus.current} / {STEPS.length}
        </div>
      </div>

      {/* 拖拽调整宽度的手柄 */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10
          hover:bg-blue-400/50 transition-colors
          ${isResizing ? 'bg-blue-500/70' : 'bg-transparent'}
        `}
        onMouseDown={handleResizeStart}
        title="拖动调整宽度"
      >
        {/* 视觉指示条 */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-0.5 h-8 rounded-full transition-colors
          ${isResizing ? 'bg-blue-600' : 'bg-gray-300/0 hover:bg-gray-400/50'}
        `} />
      </div>
    </aside>
  );
}
