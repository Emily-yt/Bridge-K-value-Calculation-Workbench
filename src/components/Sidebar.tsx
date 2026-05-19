import { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, Calculator, BarChart3, Settings } from 'lucide-react';

export type ViewId = 'dashboard' | 'bridges' | 'statistics' | 'users';

const MENU_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '首页', icon: LayoutDashboard },
  { id: 'bridges', label: 'K值计算', icon: Calculator },
  { id: 'statistics', label: '统计分析', icon: BarChart3 },
];

const SYSTEM_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'users', label: '系统设置', icon: Settings },
];

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 220;
const STORAGE_KEY = 'sidebar-width';

interface SidebarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  const saveWidth = useCallback((newWidth: number) => {
    localStorage.setItem(STORAGE_KEY, newWidth.toString());
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

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

  const MenuItem = ({ item }: { item: typeof MENU_ITEMS[0] }) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    
    return (
      <button
        onClick={() => onViewChange(item.id)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-blue-50 text-blue-700 font-medium' 
            : 'text-gray-600 hover:bg-gray-100'
          }
        `}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
        <span className="text-[14px]">{item.label}</span>
        {isActive && (
          <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />
        )}
      </button>
    );
  };

  return (
    <aside 
      ref={sidebarRef}
      className="hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-200 relative"
      style={{ width: `${width}px` }}
    >
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <nav className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </nav>

        <div className="flex-1" />

        <div className="pt-4 border-t border-gray-200">
          <nav className="space-y-1">
            {SYSTEM_ITEMS.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </nav>
        </div>
      </div>

      <div
        className={`
          absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10
          hover:bg-blue-400/50 transition-colors
          ${isResizing ? 'bg-blue-500/70' : 'bg-transparent'}
        `}
        onMouseDown={handleResizeStart}
        title="拖动调整宽度"
      >
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-0.5 h-8 rounded-full transition-colors
          ${isResizing ? 'bg-blue-600' : 'bg-gray-300/0 hover:bg-gray-400/50'}
        `} />
      </div>
    </aside>
  );
}
