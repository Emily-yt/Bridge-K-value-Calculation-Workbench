export default function Header() {
  return (
    <header className="h-16 flex items-center px-6 shrink-0 bg-white border-b border-gray-200">
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
    </header>
  );
}
