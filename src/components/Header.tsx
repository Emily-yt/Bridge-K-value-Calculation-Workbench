import { History, User } from 'lucide-react';

interface HeaderProps {
  onHistoryClick: () => void;
}

export default function Header({ onHistoryClick }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 shrink-0 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-800">
          桥梁K值计算系统
        </h1>
        <p className="text-xs text-gray-500">
          Bridge K-value Calculation System
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onHistoryClick}
          className="btn-secondary"
        >
          <History className="w-4 h-4" />
          历史记录
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer bg-primary-100 text-primary-600 hover:shadow-button-hover transition-shadow">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
}
