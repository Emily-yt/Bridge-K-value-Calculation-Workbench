import { useState, useEffect } from 'react';
import { RotateCcw, Play, ChevronDown, ChevronUp, Zap, Layers, Shield, Cog } from 'lucide-react';
import type { Bridge } from '../lib/types';
import { DRAWING_OPTIONS, LOAD_TYPE_OPTIONS, MATERIAL_MAP } from '../lib/types';

interface Step2Props {
  bridge: Bridge;
  onCalculate: (params: CalculationParams) => void;
}

export interface CalculationParams {
  drawingNumber: string;
  loadCase: string;
  loadType: string;
  eccentricity: number;
  ballastThickness: number;
  secondaryDeadLoad: number;
  capacityCoefficient: number;
  materialGrade: string;
  elasticModulus: number;
  poissonRatio: number;
  thermalCoeff: number;
  strength: number;
  manualOverride: boolean;
}

export default function Step2ParameterVerification({ bridge, onCalculate }: Step2Props) {
  const [drawingNumber, setDrawingNumber] = useState(bridge.drawing_number || DRAWING_OPTIONS[0]);
  const [loadCase, setLoadCase] = useState('中荷载');
  const [loadType, setLoadType] = useState('场80');
  const [eccentricity, setEccentricity] = useState(0);
  const [ballastThickness, setBallastThickness] = useState(0.45);
  const [secondaryDeadLoad, setSecondaryDeadLoad] = useState(8.5);
  const [manualOverride, setManualOverride] = useState(false);
  const [capacityCoefficient, setCapacityCoefficient] = useState(1.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const material = MATERIAL_MAP[drawingNumber] || MATERIAL_MAP['专桥2059'];

  useEffect(() => {
    if (!manualOverride) {
      const calculated = ballastThickness * 18.89;
      setSecondaryDeadLoad(Math.round(calculated * 100) / 100);
    }
  }, [ballastThickness, manualOverride]);

  function handleReset() {
    setDrawingNumber(bridge.drawing_number || DRAWING_OPTIONS[0]);
    setLoadCase('中荷载');
    setLoadType('场80');
    setEccentricity(0);
    setBallastThickness(0.45);
    setManualOverride(false);
    setCapacityCoefficient(1.0);
    setShowAdvanced(false);
  }

  function handleCalculate() {
    onCalculate({
      drawingNumber,
      loadCase,
      loadType,
      eccentricity,
      ballastThickness,
      secondaryDeadLoad,
      capacityCoefficient,
      materialGrade: material.grade,
      elasticModulus: material.E,
      poissonRatio: material.v,
      thermalCoeff: material.alpha,
      strength: material.strength,
      manualOverride,
    });
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 focus:outline-none";
  const inputStyle = {
    backgroundColor: 'var(--gray-100)',
    border: '1px solid var(--gray-200)',
    color: 'var(--gray-800)'
  };

  const sectionClass = "rounded-xl overflow-hidden transition-all duration-200";
  const sectionStyle = {
    backgroundColor: 'var(--gray-0)',
    border: '1px solid var(--gray-200)',
    boxShadow: 'var(--shadow-sm)'
  };

  return (
    <div className="animate-fadeIn max-w-4xl">
      <div className="space-y-4">
        {/* 结构与荷载 */}
        <div className={sectionClass} style={sectionStyle}>
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>结构与荷载</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>主梁图号</label>
              <select
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {DRAWING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>活载工况</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--gray-700)' }}>
                  <input
                    type="radio"
                    name="loadCase"
                    checked={loadCase === '中荷载'}
                    onChange={() => setLoadCase('中荷载')}
                    style={{ accentColor: 'var(--primary-600)' }}
                  />
                  中荷载
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--gray-700)' }}>
                  <input
                    type="radio"
                    name="loadCase"
                    checked={loadCase === '运营荷载'}
                    onChange={() => setLoadCase('运营荷载')}
                    style={{ accentColor: 'var(--primary-600)' }}
                  />
                  运营荷载
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>荷载类型</label>
              <select
                value={loadType}
                onChange={(e) => setLoadType(e.target.value)}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {LOAD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>向量偏心 (m)</label>
              <input
                type="number"
                step="0.01"
                value={eccentricity}
                onChange={(e) => setEccentricity(parseFloat(e.target.value) || 0)}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* 二期恒载 */}
        <div className={sectionClass} style={sectionStyle}>
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <Layers className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>二期恒载</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>道砟厚度 (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ballastThickness}
                  onChange={(e) => setBallastThickness(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>二恒集度 (kN/m)</label>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-200"
                    style={{
                      backgroundColor: manualOverride ? 'var(--warning)' : 'var(--gray-100)',
                      border: `1px solid ${manualOverride ? 'var(--warning)' : 'var(--gray-200)'}`,
                      color: manualOverride ? 'white' : 'var(--gray-800)'
                    }}
                  >
                    {manualOverride ? (
                      <input
                        type="number"
                        step="0.01"
                        value={secondaryDeadLoad}
                        onChange={(e) => setSecondaryDeadLoad(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent focus:outline-none text-white"
                      />
                    ) : (
                      <span style={{ color: 'var(--success)', fontWeight: 500 }}>{secondaryDeadLoad.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs" style={{ color: 'var(--gray-500)' }}>
                {manualOverride ? '手动输入模式' : '自动计算：二恒集度 = 道砟厚度 x 18.89'}
              </div>
              <button
                onClick={() => setManualOverride(!manualOverride)}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--primary-600)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary-700)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--primary-600)';
                }}
              >
                {manualOverride ? '恢复自动计算' : '手动覆盖输入'}
              </button>
            </div>
          </div>
        </div>

        {/* 能力修正 */}
        <div className={sectionClass} style={sectionStyle}>
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <Shield className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>能力修正</h3>
          </div>
          <div className="p-5">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-600)' }}>能力检定系数</label>
              <input
                type="number"
                step="0.01"
                value={capacityCoefficient}
                onChange={(e) => setCapacityCoefficient(parseFloat(e.target.value) || 1)}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-100)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* 材料参数 */}
        <div className={sectionClass} style={sectionStyle}>
          <div 
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <Cog className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>材料参数</h3>
          </div>
          <div className="p-5">
            <div className="text-sm" style={{ color: 'var(--gray-700)' }}>
              材料：<span style={{ color: 'var(--success)', fontWeight: 500 }}>{material.grade}</span>
              <span className="ml-2" style={{ color: 'var(--gray-500)' }}>（根据图号 {drawingNumber} 自动匹配）</span>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--primary-600)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary-700)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--primary-600)';
              }}
            >
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showAdvanced ? '收起高级参数' : '展开高级参数'}
            </button>
            {showAdvanced && (
              <div 
                className="mt-3 grid grid-cols-2 gap-3 pl-4"
                style={{ borderLeft: '2px solid var(--gray-200)' }}
              >
                <div className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  E：<span style={{ color: 'var(--gray-800)' }}>{material.E} MPa</span>
                </div>
                <div className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  v：<span style={{ color: 'var(--gray-800)' }}>{material.v}</span>
                </div>
                <div className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  a：<span style={{ color: 'var(--gray-800)' }}>{material.alpha}</span>
                </div>
                <div className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  强度：<span style={{ color: 'var(--gray-800)' }}>{material.strength} MPa</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={handleReset}
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
          <RotateCcw className="w-4 h-4" />
          重置
        </button>
        <button
          onClick={handleCalculate}
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
          <Play className="w-4 h-4" />
          开始计算K值
        </button>
      </div>
    </div>
  );
}
