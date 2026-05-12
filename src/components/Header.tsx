import { User } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-6 shrink-0 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <img src="/icons/bridge.svg" alt="桥梁图标" className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">
            桥梁K值计算系统
          </h1>
          <p className="text-sm text-gray-500">
            Bridge K-value Calculation System
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm text-gray-700">管理员</span>
        </div>
      </div>
    </header>
  );
}
