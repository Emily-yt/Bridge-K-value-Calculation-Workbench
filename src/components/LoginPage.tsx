import { FormEvent, useState } from 'react';
import { AlertCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import logo from '../static/logo.png';

interface LoginPageProps {
  onAuthenticated: () => void;
}

const configuredPassword = import.meta.env.VITE_APP_PASSWORD?.trim() ?? '';

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isPasswordConfigured = configuredPassword.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPasswordConfigured) {
      setError('系统尚未配置访问密码，请先设置 VITE_APP_PASSWORD。');
      return;
    }

    if (password === configuredPassword) {
      sessionStorage.setItem('bridge-authenticated', 'true');
      onAuthenticated();
      return;
    }

    setError('密码不正确，请重新输入。');
    setPassword('');
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gray-50 text-gray-700">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#eef6ff_42%,#f9fafb_100%)]" />
      <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <section className="w-full max-w-md animate-fade-in">
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-5 py-3 shadow-card backdrop-blur">
              <div className="h-12 w-12 overflow-hidden rounded-xl">
                <img src={logo} alt="桥梁图标" className="h-full w-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-gray-800">
                  桥梁K值计算系统
                </h1>
                <p className="text-xs text-gray-500">
                  Bridge K-value Calculation System
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/95 p-7 shadow-xl backdrop-blur">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">访问验证</h2>
              <p className="mt-2 text-sm text-gray-500">
                请输入访问密码后继续使用工作台。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-password" className="form-label">
                  访问密码
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                    className="input-field-with-icon"
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    disabled={!isPasswordConfigured}
                    autoFocus
                  />
                </div>
                {!isPasswordConfigured && (
                  <p className="form-error">
                    <AlertCircle className="h-3.5 w-3.5" />
                    未检测到 VITE_APP_PASSWORD 配置。
                  </p>
                )}
                {error && (
                  <p className="form-error">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2.5"
                disabled={!isPasswordConfigured || password.length === 0}
              >
                进入系统
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-gray-400">
              本验证用于内部访问门禁，不替代服务端安全认证。
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
