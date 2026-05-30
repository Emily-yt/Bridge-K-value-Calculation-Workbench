import logo from '../static/logo.png';

export default function Header() {
  return (
    <header className="h-16 flex items-center px-6 shrink-0 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden">
          <img src={logo} alt="桥梁图标" className="w-full h-full object-cover" />
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
