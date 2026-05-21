import { LayoutDashboard, Calculator, BarChart3 } from 'lucide-react';
import type { ViewId } from './Sidebar';

interface MobileNavProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
}

const MOBILE_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '首页', icon: LayoutDashboard },
  { id: 'bridges', label: 'K值', icon: Calculator },
  { id: 'statistics', label: '统计', icon: BarChart3 },
];

export default function MobileNav({ currentView, onViewChange }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around py-2">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all
                ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
