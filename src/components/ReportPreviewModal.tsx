import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Download, Edit2, FileText, Save, X } from 'lucide-react';
import { getCalculationById, getCalculationsByBridge, saveReport } from '../lib/db';
import { getAssessmentConclusion, getControlItem, getKValueLevel, K_VALUE_ITEMS } from '../lib/kValueAssessment';
import type { Bridge, KValueCalculation } from '../lib/types';

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
  const [notes, setNotes] = useState('');
  const [reviewer, setReviewer] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !calculationId) {
      setCalculation(null);
      setPrevCalculation(null);
      return;
    }
    setLoading(true);
    setIsEditing(false);
    setSaveSuccess(false);
    getCalculationById(calculationId).then(async (data) => {
      if (data) {
        setCalculation(data);
        setNotes(data.report?.notes || '');
        setReviewer(data.report?.reviewer || '');
        const bridgeCalcs = await getCalculationsByBridge(data.bridgeId);
        setPrevCalculation(
          bridgeCalcs
            .filter((item) => item.id !== data.id && new Date(item.createTime) < new Date(data.createTime))
            .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0] || null
        );
      }
      setLoading(false);
    });
  }, [isOpen, calculationId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isEditing) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, isEditing, onClose]);

  const handleSave = async () => {
    if (!calculation) return;
    try {
      const saved = await saveReport(calculation.id, { notes, reviewer });
      setCalculation((current) => current ? { ...current, report: saved.report } : current);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      alert('保存失败，请重试');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportRef.current) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>检定承载系数计算报告</title>
      <style>@page{size:A4;margin:25mm}body{font-family:SimSun,serif;font-size:11pt;line-height:1.6}h1{text-align:center;font-size:18pt}h2{font-size:14pt;border-bottom:1px solid #333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:8px;text-align:center}</style>
      </head><body>${reportRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;
  const output = calculation?.output;
  const control = output ? getControlItem(output) : null;
  const level = output ? getKValueLevel(output.kFinal, output.qResult) : null;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gray-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col m-4">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">检定承载系数计算报告</h2>
            {isEditing && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">编辑备注</span>}
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle className="w-4 h-4" />保存成功</span>}
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">取消</button>
                <button onClick={handleSave} className="px-3 py-1.5 bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm"><Save className="w-4 h-4" />保存</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg flex items-center gap-2 text-sm"><Edit2 className="w-4 h-4" />编辑备注</button>
            )}
            <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm"><Download className="w-4 h-4" />下载PDF</button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {loading ? <div className="py-20 text-center text-gray-500">加载中...</div> : calculation && output ? (
            <div ref={reportRef} className="bg-white mx-auto shadow-lg" style={{ width: '210mm', minHeight: '297mm', padding: '25mm', boxSizing: 'border-box' }}>
              <h1 className="text-center text-xl font-bold mb-8">{calculation.bridge?.lineName || '朔黄铁路'}跨度{calculation.spanLength}m梁检定承载系数计算报告</h1>
              <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3">一、桥梁概况</h2>
              <div className="text-sm space-y-1 mb-6">
                <div>桥梁名称：{calculation.bridge?.bridgeName || '-'}</div><div>桥号：{calculation.bridge?.bridgeNo || '-'}</div>
                <div>中心里程：{calculation.bridge?.centerMileage || '-'}</div><div>孔跨式样：{calculation.bridge?.spanType || '-'}</div>
                <div>图号：{calculation.beamType}</div><div>计算孔跨：第{calculation.spanIndex}孔</div>
              </div>
              <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3">二、检算依据</h2>
              <ol className="text-sm list-decimal list-inside mb-6"><li>《铁路桥梁检定规范》（铁运函[2004]120号）</li><li>《铁路桥涵设计规范》（TBJ 2-85）</li><li>《铁路桥涵混凝土结构设计规范》（TB10092-2017）</li></ol>
              <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3">三、计算结果</h2>
              <table className="w-full border-collapse text-sm mb-4">
                <thead><tr className="bg-gray-100"><th className="border p-2">检算项目</th><th className="border p-2">计算值</th><th className="border p-2">判定标准</th><th className="border p-2">结果</th><th className="border p-2">备注</th></tr></thead>
                <tbody>
                  {K_VALUE_ITEMS.map((item) => <tr key={item.key}><td className="border p-2">{item.label} {item.description}</td><td className="border p-2 text-center">{output[item.key].toFixed(2)}</td><td className="border p-2 text-center">&ge;1.0</td><td className={`border p-2 text-center ${output[item.key] >= 1 ? 'text-green-600' : 'text-red-600'}`}>{output[item.key] >= 1 ? '是' : '否'}</td><td className="border p-2 text-center">{control?.key === item.key ? '控制项' : ''}</td></tr>)}
                  <tr className="bg-yellow-50 font-semibold"><td className="border p-2">整体检定承载系数 K</td><td className="border p-2 text-center">{output.kFinal.toFixed(2)}</td><td className="border p-2 text-center">&ge;1.0 或通过运行列车补充检算</td><td className="border p-2 text-center">{level === 'safe' ? '满足' : level === 'partial' ? '部分满足' : '不满足'}</td><td className="border p-2 text-center">取{control?.label}最小值</td></tr>
                </tbody>
              </table>
              {output.kFinal < 1 && output.qResult && <div className="text-sm mb-6"><strong>运行列车补充检算：</strong> C80 Q={output.qResult.c80.q.toFixed(4)}（{output.qResult.c80.meetsRequirement ? '满足' : '不满足'}）；KM98 Q={output.qResult.km98.q.toFixed(4)}（{output.qResult.km98.meetsRequirement ? '满足' : '不满足'}）。</div>}
              <h2 className="text-base font-bold border-b border-gray-800 pb-1 mb-3">四、结论与建议</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ textIndent: '2em' }}>{getAssessmentConclusion(output)}</p>
              <div className="text-sm">备注：{isEditing ? <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 w-full border rounded p-2" rows={3} /> : notes || '无'}</div>
              {prevCalculation && <div className="mt-6 text-sm"><strong>历史对比：</strong>{formatDate(prevCalculation.createTime)} K={prevCalculation.output.kFinal.toFixed(2)}；变化 {(output.kFinal - prevCalculation.output.kFinal).toFixed(2)}</div>}
              <div className="mt-12 pt-8 border-t flex justify-between text-sm"><div>计算：{calculation.creator}</div><div>审核：{isEditing ? <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} className="border rounded px-2 py-1" /> : reviewer || '__________'}</div><div>日期：{formatDate(calculation.createTime)}</div></div>
            </div>
          ) : <div className="py-20 text-center text-gray-500">未找到计算记录</div>}
        </div>
      </div>
    </div>
  );
}
