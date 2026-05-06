import { useState } from 'react';
import { FileText, Download, Edit3, FileDown, ChevronRight, FileCheck } from 'lucide-react';
import type { Bridge } from '../lib/types';
import type { CalculationParams } from './Step2ParameterVerification';

interface Step4Props {
  bridge: Bridge;
  params: CalculationParams;
}

const REPORT_SECTIONS = [
  { id: '1', title: '项目概况' },
  { id: '2', title: '检测依据' },
  { id: '3', title: '参数取值' },
  { id: '4', title: '荷载计算' },
  { id: '5', title: 'K值计算' },
  { id: '6', title: '结果分析' },
  { id: '7', title: '结论' },
];

export default function Step4Report({ bridge, params }: Step4Props) {
  const [activeSection, setActiveSection] = useState('1');
  const [isEditing, setIsEditing] = useState(false);

  const sectionClass = "rounded-xl overflow-hidden transition-all duration-200";
  const sectionStyle = {
    backgroundColor: 'var(--gray-0)',
    border: '1px solid var(--gray-200)',
    boxShadow: 'var(--shadow-sm)'
  };

  return (
    <div className="animate-fadeIn max-w-4xl">
      {/* 标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary-100)' }}
          >
            <FileCheck className="w-5 h-5" style={{ color: 'var(--primary-600)' }} />
          </div>
          <div>
            <h2 
              className="text-xl font-semibold"
              style={{ color: 'var(--gray-800)' }}
            >
              检测报告生成器
            </h2>
            <p 
              className="text-sm"
              style={{ color: 'var(--gray-500)' }}
            >
              结构化报告预览与导出
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[400px]">
        {/* 报告目录 */}
        <div 
          className="w-full lg:w-52 shrink-0 rounded-xl overflow-hidden"
          style={sectionStyle}
        >
          <div 
            className="px-4 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <FileText className="w-4 h-4" style={{ color: 'var(--primary-600)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>报告目录</h3>
          </div>
          <nav className="p-2">
            {REPORT_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                style={{
                  backgroundColor: activeSection === section.id ? 'var(--primary-50)' : 'transparent',
                  color: activeSection === section.id ? 'var(--primary-600)' : 'var(--gray-600)',
                  fontWeight: activeSection === section.id ? 500 : 400
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                    e.currentTarget.style.color = 'var(--gray-800)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--gray-600)';
                  }
                }}
              >
                <ChevronRight 
                  className="w-3 h-3 transition-transform duration-200" 
                  style={{ 
                    transform: activeSection === section.id ? 'rotate(90deg)' : 'rotate(0deg)',
                    color: activeSection === section.id ? 'var(--primary-600)' : 'var(--gray-400)'
                  }} 
                />
                {section.id}. {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* 报告内容 */}
        <div 
          className="flex-1 rounded-xl overflow-hidden"
          style={sectionStyle}
        >
          <div 
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--gray-200)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-800)' }}>报告内容预览</h3>
            {isEditing && (
              <span 
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--warning)'
                }}
              >
                编辑模式
              </span>
            )}
          </div>
          <div className="p-6 overflow-y-auto" style={{ maxHeight: '480px' }}>
            {activeSection === '1' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>1. 项目概况</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                  <div style={{ color: 'var(--gray-600)' }}>
                    项目名称：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{bridge.name}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    线路：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{bridge.line} {bridge.direction}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    里程：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{bridge.mileage}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    跨度类型：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{bridge.span_type}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    孔数：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{bridge.span_count}孔</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    建成年份：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{bridge.year_built}年</span>
                  </div>
                </div>
              </div>
            )}
            {activeSection === '2' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>2. 检测依据</h4>
                <ul className="space-y-3 text-sm" style={{ color: 'var(--gray-700)' }}>
                  <li className="flex items-start gap-3">
                    <span style={{ color: 'var(--gray-400)' }}>-</span>
                    《铁路桥涵设计基本规范》（TB 10002-2017）
                  </li>
                  <li className="flex items-start gap-3">
                    <span style={{ color: 'var(--gray-400)' }}>-</span>
                    《铁路桥梁检定规范》（铁运函〔2004〕120号）
                  </li>
                  <li className="flex items-start gap-3">
                    <span style={{ color: 'var(--gray-400)' }}>-</span>
                    《铁路桥涵钢筋混凝土和预应力混凝土结构设计规范》（TB 10002.3-2005）
                  </li>
                </ul>
              </div>
            )}
            {activeSection === '3' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>3. 参数取值</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                  <div style={{ color: 'var(--gray-600)' }}>
                    主梁图号：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.drawingNumber}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    活载工况：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.loadCase}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    荷载类型：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.loadType}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    向量偏心：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.eccentricity} m</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    道砟厚度：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.ballastThickness} m</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    二恒集度：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.secondaryDeadLoad} kN/m</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    能力检定系数：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.capacityCoefficient}</span>
                  </div>
                  <div style={{ color: 'var(--gray-600)' }}>
                    材料等级：<span style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{params.materialGrade}</span>
                  </div>
                </div>
              </div>
            )}
            {activeSection === '4' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>4. 荷载计算</h4>
                <p className="text-sm" style={{ color: 'var(--gray-500)' }}>荷载计算详细过程与中间结果...</p>
              </div>
            )}
            {activeSection === '5' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>5. K值计算</h4>
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    backgroundColor: 'var(--gray-50)',
                    border: '1px solid var(--gray-200)'
                  }}
                >
                  <div className="text-sm mb-2" style={{ color: 'var(--gray-500)' }}>控制条件</div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: 'var(--warning)' }}
                  >
                    K = 2.42
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>2017桥规（不允许拉应力）</div>
                </div>
              </div>
            )}
            {activeSection === '6' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>6. 结果分析</h4>
                <p className="text-sm" style={{ color: 'var(--gray-500)' }}>各规范K值对比分析及安全评估...</p>
              </div>
            )}
            {activeSection === '7' && (
              <div className="space-y-4">
                <h4 className="text-base font-semibold" style={{ color: 'var(--gray-800)' }}>7. 结论</h4>
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--success)' }}>
                    满足规范要求（K &gt;= 2.0），但接近临界值，建议加强监测。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
          style={{
            backgroundColor: isEditing ? 'rgba(245, 158, 11, 0.1)' : 'var(--gray-100)',
            color: isEditing ? 'var(--warning)' : 'var(--gray-700)',
            border: isEditing ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--gray-200)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isEditing ? 'rgba(245, 158, 11, 0.15)' : 'var(--gray-200)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isEditing ? 'rgba(245, 158, 11, 0.1)' : 'var(--gray-100)';
          }}
        >
          <Edit3 className="w-4 h-4" />
          {isEditing ? '完成编辑' : '编辑内容'}
        </button>
        <button 
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
          <FileDown className="w-4 h-4" />
          导出PDF
        </button>
        <button 
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
          <Download className="w-4 h-4" />
          导出Word
        </button>
      </div>
    </div>
  );
}
