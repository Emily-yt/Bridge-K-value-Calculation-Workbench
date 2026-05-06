import { Target, BarChart3, AlertTriangle, FileText, ArrowRight, CheckCircle, XCircle, Calculator } from 'lucide-react';
import type { CalculationParams } from './Step2ParameterVerification';

interface Step3Props {
  params: CalculationParams;
  onGenerateReport: () => void;
  onViewProcess: () => void;
}

function getKStatus(k: number) {
  if (k >= 3.0) return { 
    label: '安全', 
    color: 'var(--success)', 
    bg: 'rgba(16, 185, 129, 0.1)', 
    icon: <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} /> 
  };
  if (k >= 2.0) return { 
    label: '接近临界', 
    color: 'var(--warning)', 
    bg: 'rgba(245, 158, 11, 0.1)', 
    icon: <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} /> 
  };
  return { 
    label: '不满足', 
    color: 'var(--error)', 
    bg: 'rgba(239, 68, 68, 0.1)', 
    icon: <XCircle className="w-5 h-5" style={{ color: 'var(--error)' }} /> 
  };
}

export default function Step3Results({ onGenerateReport, onViewProcess }: Step3Props) {
  const k1985 = 2.85;
  const k2017NoTension = 2.42;
  const k2017NoCrack = 2.68;
  const controllingK = Math.min(k1985, k2017NoTension, k2017NoCrack);
  const controllingCode = '2017桥规（不允许拉应力）';

  const status = getKStatus(controllingK);

  const riskNotes = [
    '抗剪安全系数不足',
    '主拉应力接近限值',
  ];

  const codeResults = [
    { code: '1985桥规', k: k1985, isControlling: false },
    { code: '2017（不拉）', k: k2017NoTension, isControlling: true },
    { code: '2017（不开裂）', k: k2017NoCrack, isControlling: false },
  ];

  const sectionClass = "rounded-xl overflow-hidden transition-all duration-200";
  const sectionStyle = {
    backgroundColor: 'var(--gray-0)',
    border: '1px solid var(--gray-200)',
    boxShadow: 'var(--shadow-sm)'
  };

  return (
    <div className="animate-fadeIn max-w-4xl">
      <div className="space-y-4">
        {/* 控制结论 */}
        <div 
          className="rounded-xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--gray-0)',
            border: '1px solid var(--warning)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}
          >
            <Target className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>控制结论</h3>
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)'
              }}
            >
              最重要
            </span>
          </div>
          <div className="p-5">
            <div className="text-sm mb-3" style={{ color: 'var(--gray-500)' }}>
              控制规范：<span style={{ color: 'var(--gray-800)' }}>{controllingCode}</span>
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="text-4xl font-bold tracking-tight"
                style={{ color: 'var(--warning)' }}
              >
                {controllingK.toFixed(2)}
              </div>
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: status.bg }}
              >
                {status.icon}
                <span 
                  className="text-sm font-medium"
                  style={{ color: status.color }}
                >
                  {status.label}
                  {controllingK >= 2.0 && controllingK < 3.0 && '（K>=2.0）'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 规范对比 */}
        <div className={sectionClass} style={sectionStyle}>
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>规范对比</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {codeResults.map((item) => {
                const itemStatus = getKStatus(item.k);
                return (
                  <div
                    key={item.code}
                    className="flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: item.isControlling ? 'rgba(245, 158, 11, 0.05)' : 'var(--gray-50)',
                      border: item.isControlling ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-28" style={{ color: 'var(--gray-700)' }}>{item.code}</span>
                      <span 
                        className="text-lg font-semibold"
                        style={{ color: itemStatus.color }}
                      >
                        K = {item.k.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.k >= 3.0 ? (
                        <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
                      ) : item.k >= 2.0 ? (
                        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                      ) : (
                        <XCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                      )}
                      {item.isControlling && (
                        <span 
                          className="text-xs font-medium"
                          style={{ color: 'var(--warning)' }}
                        >
                          {'<- 控制'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 风险提示 */}
        <div className={sectionClass} style={sectionStyle}>
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>风险提示</h3>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {riskNotes.map((note, i) => (
                <li 
                  key={i} 
                  className="flex items-start gap-2 text-sm"
                  style={{ color: 'var(--warning)' }}
                >
                  <span 
                    className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--warning)' }}
                  />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={onViewProcess}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
          style={{ 
            backgroundColor: 'var(--gray-100)',
            color: 'var(--gray-700)',
            border: '1px solid var(--gray-200)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--gray-200)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--gray-100)';
          }}
        >
          <FileText className="w-4 h-4" />
          查看计算过程
        </button>
        <button
          onClick={onGenerateReport}
          className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
          style={{ 
            backgroundColor: 'var(--primary-600)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-700)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-600)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          生成报告
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
