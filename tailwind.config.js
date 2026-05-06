/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 自定义颜色 - 与 CSS 变量同步
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#6366f1',
      },
      // 自定义阴影
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'input-focus': '0 0 0 3px rgba(59, 130, 246, 0.15)',
        'button': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'button-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'step-active': '0 2px 8px rgba(37, 99, 235, 0.25)',
      },
      // 自定义圆角
      borderRadius: {
        'card': '12px',
        'button': '10px',
        'input': '10px',
        'badge': '9999px',
      },
      // 自定义过渡
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'bounce-custom': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // 自定义动画
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 1s linear infinite',
      },
    },
  },
  plugins: [
    // 添加自定义工具类
    function({ addComponents, addUtilities, theme }) {
      // 卡片组件
      addComponents({
        '.card': {
          backgroundColor: '#ffffff',
          borderRadius: theme('borderRadius.card'),
          border: '1px solid #e4e7eb',
          boxShadow: theme('boxShadow.card'),
          transition: 'all 200ms ease',
        },
        '.card-hover': {
          '&:hover': {
            borderColor: '#7dd3fc',
            boxShadow: theme('boxShadow.card-hover'),
            transform: 'translateY(-2px)',
          },
        },
        '.card-interactive': {
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#7dd3fc',
            boxShadow: theme('boxShadow.card-hover'),
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      });

      // 输入框组件
      addComponents({
        '.input-base': {
          width: '100%',
          padding: '0.625rem 1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          backgroundColor: '#f4f5f7',
          border: '1px solid #e4e7eb',
          borderRadius: theme('borderRadius.input'),
          color: '#1f2937',
          transition: 'all 200ms ease',
          '&:focus': {
            outline: 'none',
            borderColor: '#3b82f6',
            backgroundColor: '#ffffff',
            boxShadow: theme('boxShadow.input-focus'),
          },
          '&::placeholder': {
            color: '#9ca3af',
          },
        },
        '.input-with-icon': {
          paddingLeft: '2.75rem',
        },
      });

      // 按钮组件
      addComponents({
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          borderRadius: theme('borderRadius.button'),
          transition: 'all 200ms ease',
          cursor: 'pointer',
          border: 'none',
          '&:focus': {
            outline: 'none',
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
          },
        },
        '.btn-primary': {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          boxShadow: theme('boxShadow.button'),
          '&:hover:not(:disabled)': {
            backgroundColor: '#1d4ed8',
            boxShadow: theme('boxShadow.button-hover'),
          },
          '&:active:not(:disabled)': {
            backgroundColor: '#1e40af',
          },
        },
        '.btn-secondary': {
          backgroundColor: '#f4f5f7',
          color: '#374151',
          '&:hover:not(:disabled)': {
            backgroundColor: '#e4e7eb',
          },
        },
        '.btn-ghost': {
          backgroundColor: 'transparent',
          color: '#6b7280',
          '&:hover:not(:disabled)': {
            backgroundColor: '#f4f5f7',
            color: '#374151',
          },
        },
        '.btn-danger': {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          '&:hover:not(:disabled)': {
            backgroundColor: '#dc2626',
          },
        },
      });

      // 徽章组件
      addComponents({
        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.125rem 0.625rem',
          fontSize: '0.75rem',
          fontWeight: '500',
          borderRadius: theme('borderRadius.badge'),
        },
        '.badge-primary': {
          backgroundColor: '#e0f2fe',
          color: '#2563eb',
        },
        '.badge-success': {
          backgroundColor: '#d1fae5',
          color: '#059669',
        },
        '.badge-warning': {
          backgroundColor: '#fef3c7',
          color: '#d97706',
        },
        '.badge-error': {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
        },
      });

      // 页面标题组件
      addComponents({
        '.page-header': {
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        },
        '.page-header-icon': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.5rem',
          backgroundColor: '#e0f2fe',
          color: '#2563eb',
        },
        '.page-title': {
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
        },
        '.page-subtitle': {
          fontSize: '0.875rem',
          color: '#6b7280',
        },
      });

      // 分节标题组件
      addComponents({
        '.section-header': {
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e4e7eb',
        },
        '.section-title': {
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937',
        },
      });

      // 步骤指示器组件
      addComponents({
        '.step-indicator': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1.75rem',
          height: '1.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '600',
          transition: 'all 200ms ease',
        },
        '.step-current': {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          boxShadow: theme('boxShadow.step-active'),
        },
        '.step-completed': {
          backgroundColor: '#10b981',
          color: '#ffffff',
        },
        '.step-pending': {
          backgroundColor: '#e4e7eb',
          color: '#6b7280',
        },
      });

      // 状态指示器
      addComponents({
        '.status-dot': {
          width: '0.5rem',
          height: '0.5rem',
          borderRadius: '9999px',
        },
        '.status-success': {
          backgroundColor: '#10b981',
        },
        '.status-warning': {
          backgroundColor: '#f59e0b',
        },
        '.status-error': {
          backgroundColor: '#ef4444',
        },
      });

      // 结果展示组件
      addComponents({
        '.result-highlight': {
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: theme('borderRadius.card'),
          backgroundColor: '#f0f7ff',
          border: '1px solid #bae6fd',
        },
        '.result-value': {
          fontSize: '2.5rem',
          fontWeight: '700',
          lineHeight: '1',
          letterSpacing: '-0.025em',
        },
        '.result-label': {
          fontSize: '0.875rem',
          color: '#6b7280',
        },
      });

      // 表单组组件
      addComponents({
        '.form-group': {
          marginBottom: '1rem',
        },
        '.form-label': {
          display: 'block',
          marginBottom: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '500',
          color: '#4b5563',
        },
        '.form-hint': {
          marginTop: '0.375rem',
          fontSize: '0.75rem',
          color: '#9ca3af',
        },
        '.form-error': {
          marginTop: '0.375rem',
          fontSize: '0.75rem',
          color: '#ef4444',
        },
      });

      // 工具类
      addUtilities({
        '.animate-delay-100': {
          animationDelay: '100ms',
        },
        '.animate-delay-200': {
          animationDelay: '200ms',
        },
        '.animate-delay-300': {
          animationDelay: '300ms',
        },
        '.text-balance': {
          textWrap: 'balance',
        },
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#d1d5db',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#9ca3af',
          },
        },
      });
    },
  ],
};
