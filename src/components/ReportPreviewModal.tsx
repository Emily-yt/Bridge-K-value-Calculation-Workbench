import { useEffect, useState, useRef } from 'react';
import { X, Download, FileText, Edit2, Save, CheckCircle } from 'lucide-react';
import type { KValueCalculation, Bridge } from '../lib/types';
import { getCalculationById, getCalculationsByBridge, saveReport } from '../lib/db';

interface ReportPreviewModalProps {
  calculationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CalculationWithBridge extends KValueCalculation {
  bridge?: Bridge;
}

export default function ReportPreviewModal({ calculationId, isOpen, onClose }: ReportPreviewModalProps) {
  const [calculation, setCalculation] = useState<CalculationWithBridge | null>(null);
  const [prevCalculation, setPrevCalculation] = useState<KValueCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && calculationId) {
      setLoading(true);
      setIsEditing(false);
      setSaveSuccess(false);
      getCalculationById(calculationId).then(async (data) => {
        if (data) {
          setCalculation(data);
          setSavedHtml(data.report?.htmlContent || null);
          const bridgeCalcs = await getCalculationsByBridge(data.bridgeId);
          const prev = bridgeCalcs
            .filter(c => c.id !== data.id && new Date(c.createTime) < new Date(data.createTime))
            .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0];
          setPrevCalculation(prev || null);
        }
        setLoading(false);
      });
    } else {
      setCalculation(null);
      setPrevCalculation(null);
      setSavedHtml(null);
    }
  }, [isOpen, calculationId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditing) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isEditing]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getDefaultConclusion = (k: number) => {
    if (k >= 2.0) {
      return `该桥梁检定承载系数K=${k.toFixed(2)}，满足规范要求，承载能力充裕。`;
    } else if (k >= 1.5) {
      return `该桥梁检定承载系数K=${k.toFixed(2)}，虽不满足规范≥2.0的要求，但K≥1.5，满足运营要求。建议加强日常监测。`;
    } else if (k >= 1.0) {
      return `该桥梁检定承载系数K=${k.toFixed(2)}，承载能力偏低。建议限制通行荷载，加强监测，尽快安排加固处理。`;
    } else {
      return `该桥梁检定承载系数K=${k.toFixed(2)}，不满足运营要求。建议立即限制通行，安排专项检测和加固处理。`;
    }
  };

  const isSatisfied = (k: number, limit: number) => k >= limit;

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (reportRef.current) {
        reportRef.current.focus();
      }
    }, 50);
  };

  const handleSaveEdit = async () => {
    if (!calculation || !reportRef.current) return;
    const htmlContent = reportRef.current.innerHTML;
    try {
      await saveReport(calculation.id, { htmlContent });
      setSavedHtml(htmlContent);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      alert('保存失败，请重试');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = reportRef.current ? reportRef.current.innerHTML : '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>检定承载系数计算报告</title>
          <style>
            @page { size: A4; margin: 25mm; }
            body { font-family: 'SimSun', '宋体', serif; font-size: 11pt; line-height: 1.6; padding: 25mm; }
            h1 { font-family: 'SimHei', '黑体', sans-serif; font-size: 18pt; text-align: center; margin-bottom: 30px; }
            h2 { font-family: 'SimHei', '黑体', sans-serif; font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #333; padding: 8px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .info-row { display: flex; margin: 5px 0; }
            .info-label { width: 120px; color: #666; }
            .conclusion { text-indent: 2em; margin: 15px 0; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
            [contenteditable] { outline: none; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  if (!isOpen) return null;

  const k = calculation?.output.kFinal || 0;
  const k1 = calculation?.output.k1 || 0;
  const k2 = calculation?.output.k2 || 0;
  const k3 = calculation?.output.k3 || 0;
  const k4 = calculation?.output.k4 || 0;

  const renderReportContent = () => {
    if (savedHtml && !isEditing) {
      return <div dangerouslySetInnerHTML={{ __html: savedHtml }} />;
    }

    return (
      <>
        <h1 className="text-center text-xl font-bold mb-8" style={{ fontFamily: 'SimHei, sans-serif' }}>
          {calculation?.bridge?.lineName || '朔黄铁路'}跨度{calculation?.spanLength}m梁检定承载系数计算报告
        </h1>

        <div className="mb-6">
          <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3" style={{ fontFamily: 'SimHei, sans-serif' }}>
            一、桥梁概况
          </h2>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="w-24 text-gray-600">桥梁名称：</span>
              <span>{calculation?.bridge?.bridgeName || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">桥号：</span>
              <span>{calculation?.bridge?.bridgeNo || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">中心里程：</span>
              <span>{calculation?.bridge?.centerMileage || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">孔跨式样：</span>
              <span>{calculation?.bridge?.spanType || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">建成年度：</span>
              <span>{calculation?.bridge?.buildYear ? `${calculation.bridge.buildYear}年` : '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">图号：</span>
              <span>{calculation?.beamType || '专桥2059'}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3" style={{ fontFamily: 'SimHei, sans-serif' }}>
            二、检算依据
          </h2>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>《铁路桥梁检定规范》（铁运函[2004]120号）</li>
            <li>《铁路桥涵设计规范》（TBJ 2-85）</li>
            <li>《铁路桥涵混凝土结构设计规范》（TB10092-2017）</li>
            <li>委托方提供的其他相关资料</li>
          </ol>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3" style={{ fontFamily: 'SimHei, sans-serif' }}>
            三、计算参数
          </h2>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="w-24 text-gray-600">梁体类型：</span>
              <span>{calculation?.input.beamPosition || '直线梁'}</span>
            </div>
            {calculation?.input.beamPosition === '曲线梁' && (
              <div className="flex">
                <span className="w-24 text-gray-600">曲线半径：</span>
                <span>{calculation.input.curveRadius ? `${calculation.input.curveRadius} m` : '-'}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-24 text-gray-600">线梁偏心：</span>
              <span>{calculation?.input.eccentricityE || 0} mm</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">道砟超厚：</span>
              <span>{calculation?.input.ballastThicknessT || 0} cm</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">冲击系数：</span>
              <span>{calculation?.input.impactFactor || 0}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">二恒集度：</span>
              <span>22.3 kN/m</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">活载工况：</span>
              <span>中-活载</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-600">计算孔跨：</span>
              <span>第{calculation?.spanIndex}孔</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3" style={{ fontFamily: 'SimHei, sans-serif' }}>
            四、计算结果
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2">检算项目</th>
                <th className="border border-gray-400 px-3 py-2">计算值</th>
                <th className="border border-gray-400 px-3 py-2">规范限值</th>
                <th className="border border-gray-400 px-3 py-2">是否满足</th>
                <th className="border border-gray-400 px-3 py-2">备注</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 px-3 py-2">K1 正截面抗弯强度</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{k1.toFixed(2)}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">≥2.0</td>
                <td className={`border border-gray-400 px-3 py-2 text-center ${isSatisfied(k1, 2.0) ? 'text-green-600' : 'text-red-600'}`}>
                  {isSatisfied(k1, 2.0) ? '是' : '否'}
                </td>
                <td className="border border-gray-400 px-3 py-2"></td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-2">K2 正截面抗裂性</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{k2.toFixed(2)}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">≥1.2</td>
                <td className={`border border-gray-400 px-3 py-2 text-center ${isSatisfied(k2, 1.2) ? 'text-green-600' : 'text-red-600'}`}>
                  {isSatisfied(k2, 1.2) ? '是' : '否'}
                </td>
                <td className="border border-gray-400 px-3 py-2"></td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-2">K3 正截面应力</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{k3.toFixed(2)}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">≥2.0</td>
                <td className={`border border-gray-400 px-3 py-2 text-center ${isSatisfied(k3, 2.0) ? 'text-green-600' : 'text-red-600'}`}>
                  {isSatisfied(k3, 2.0) ? '是' : '否'}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center">取最小值</td>
              </tr>
              <tr>
                <td className="border border-gray-400 px-3 py-2">K4 斜截面抗剪</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{k4.toFixed(2)}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">≥2.0</td>
                <td className={`border border-gray-400 px-3 py-2 text-center ${isSatisfied(k4, 2.0) ? 'text-green-600' : 'text-red-600'}`}>
                  {isSatisfied(k4, 2.0) ? '是' : '否'}
                </td>
                <td className="border border-gray-400 px-3 py-2"></td>
              </tr>
              <tr className="bg-yellow-50 font-semibold">
                <td className="border border-gray-400 px-3 py-2">整体检定承载系数K</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{k.toFixed(2)}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">≥2.0</td>
                <td className={`border border-gray-400 px-3 py-2 text-center ${isSatisfied(k, 2.0) ? 'text-green-600' : 'text-red-600'}`}>
                  {isSatisfied(k, 2.0) ? '是' : '否'}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center">取K3最小值</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3" style={{ fontFamily: 'SimHei, sans-serif' }}>
            五、结论与建议
          </h2>
          <p className="text-sm leading-relaxed text-justify" style={{ textIndent: '2em' }}>
            {getDefaultConclusion(k)}
          </p>
          <div className="mt-4">
            <span className="text-sm text-gray-600">备注：</span>
            <span className="text-sm">{calculation?.report?.notes || '无'}</span>
          </div>
        </div>

        {prevCalculation && (
          <div className="mb-6">
            <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3" style={{ fontFamily: 'SimHei, sans-serif' }}>
              六、历史对比
            </h2>
            <div className="text-sm space-y-1">
              <div className="flex">
                <span className="w-24 text-gray-600">上次计算：</span>
                <span>{formatDate(prevCalculation.createTime)} K={prevCalculation.output.kFinal.toFixed(2)}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-gray-600">变化趋势：</span>
                <span>
                  {(k - prevCalculation.output.kFinal).toFixed(2)} {' '}
                  {k > prevCalculation.output.kFinal ? '↑' : k < prevCalculation.output.kFinal ? '↓' : '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-gray-300">
          <div className="flex justify-between text-sm">
            <div>计算：{calculation?.creator || '当前用户'}</div>
            <div>审核：{calculation?.report?.reviewer || '__________'}</div>
            <div>日期：{calculation ? formatDate(calculation.createTime) : ''}</div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gray-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col m-4">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">检定承载系数计算报告</h2>
            {isEditing && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">编辑中</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                保存成功
              </span>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              下载PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : calculation ? (
            <div
              ref={reportRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              className={`bg-white mx-auto shadow-lg outline-none ${isEditing ? 'ring-2 ring-blue-400 ring-offset-2 cursor-text' : ''}`}
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '25mm',
                boxSizing: 'border-box',
              }}
            >
              {renderReportContent()}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">未找到计算记录</div>
          )}
        </div>
      </div>
    </div>
  );
}