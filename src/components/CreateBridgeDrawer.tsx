import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Copy, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { createBridge } from '../lib/db';
import type { BeamSpan, Bridge, CreateBridgeInput } from '../lib/types';
import { isSpanSupported } from '../lib/kValueAssessment';

interface CreateBridgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (bridge: Bridge) => void;
}

interface SpanSegment {
  id: number;
  count: number;
  beamLength: number;
  beamType: string;
  beamHeight: number;
  beamCenterDist: number;
}

type SegmentField = Exclude<keyof SpanSegment, 'id'>;

const DEFAULT_SEGMENT: SpanSegment = {
  id: 1,
  count: 1,
  beamLength: 32.6,
  beamType: '专桥2059',
  beamHeight: 2.64,
  beamCenterDist: 1.8,
};

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

function getNominalSpanLength(beamLength: number) {
  return Number.isInteger(beamLength) ? beamLength : Math.floor(beamLength);
}

function buildSpanTypePreview(spans: BeamSpan[], structureType: string) {
  const groups: { count: number; nominalLength: number }[] = [];
  for (const span of spans) {
    const nominalLength = getNominalSpanLength(span.beamLength);
    const last = groups[groups.length - 1];
    if (last && last.nominalLength === nominalLength) {
      last.count += 1;
    } else {
      groups.push({ count: 1, nominalLength });
    }
  }
  const combination = groups.map((group) => `${group.count}-${group.nominalLength}m`).join('/');
  return combination ? `${combination}-${structureType}` : '-';
}

export default function CreateBridgeDrawer({ isOpen, onClose, onCreated }: CreateBridgeDrawerProps) {
  const nextSegmentId = useRef(2);
  const [bridgeName, setBridgeName] = useState('');
  const [lineName, setLineName] = useState('朔黄');
  const [bridgeNo, setBridgeNo] = useState('');
  const [centerMileage, setCenterMileage] = useState('');
  const [buildYear, setBuildYear] = useState(new Date().getFullYear());
  const [operationStatus, setOperationStatus] = useState<CreateBridgeInput['operationStatus']>('运营中');
  const [structureType, setStructureType] = useState('预应力钢筋混凝土T形');
  const [segments, setSegments] = useState<SpanSegment[]>([{ ...DEFAULT_SEGMENT }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expandedSpans = useMemo(() => {
    const spans: BeamSpan[] = [];
    for (const segment of segments) {
      const count = Number.isInteger(segment.count) && segment.count > 0 ? segment.count : 0;
      for (let i = 0; i < count; i += 1) {
        const index = spans.length + 1;
        spans.push({
          index,
          beamLength: segment.beamLength,
          beamType: segment.beamType,
          beamHeight: segment.beamHeight,
          beamCenterDist: segment.beamCenterDist,
        });
      }
    }
    return spans;
  }, [segments]);

  const unsupportedCount = expandedSpans.filter((span) => !isSpanSupported(span)).length;
  const spanTypePreview = buildSpanTypePreview(expandedSpans, structureType.trim() || '结构形式');

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const resetForm = () => {
    nextSegmentId.current = 2;
    setBridgeName('');
    setLineName('朔黄');
    setBridgeNo('');
    setCenterMileage('');
    setBuildYear(new Date().getFullYear());
    setOperationStatus('运营中');
    setStructureType('预应力钢筋混凝土T形');
    setSegments([{ ...DEFAULT_SEGMENT }]);
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateSegment = (id: number, field: SegmentField, value: string) => {
    setSegments((current) =>
      current.map((segment) => {
        if (segment.id !== id) return segment;
        if (field === 'beamType') return { ...segment, beamType: value };
        return { ...segment, [field]: Number(value) };
      })
    );
  };

  const addSegment = () => {
    setSegments((current) => [
      ...current,
      { ...DEFAULT_SEGMENT, id: nextSegmentId.current++ },
    ]);
  };

  const duplicateSegment = (segment: SpanSegment) => {
    setSegments((current) => [
      ...current,
      { ...segment, id: nextSegmentId.current++ },
    ]);
  };

  const removeSegment = (id: number) => {
    setSegments((current) => current.filter((segment) => segment.id !== id));
  };

  const validate = () => {
    if (!bridgeName.trim() || !lineName.trim() || !bridgeNo.trim() || !centerMileage.trim() || !structureType.trim()) {
      return '请完整填写桥梁名称、线路、桥号、中心里程和结构形式';
    }
    if (!Number.isInteger(buildYear) || buildYear < 1800 || buildYear > new Date().getFullYear()) {
      return `建成年份必须为 1800 至 ${new Date().getFullYear()} 之间的整数`;
    }
    if (segments.length === 0 || expandedSpans.length === 0) {
      return '请至少配置一个孔跨';
    }
    if (segments.some((segment) => !Number.isInteger(segment.count) || segment.count <= 0)) {
      return '每个孔跨分段的孔数必须为正整数';
    }
    for (const span of expandedSpans) {
      if (!span.beamType.trim()) return `请填写第 ${span.index} 孔的梁型图号`;
      if (!Number.isFinite(span.beamLength) || span.beamLength <= 0) return `第 ${span.index} 孔的梁长必须大于 0`;
      if (!Number.isFinite(span.beamHeight) || span.beamHeight < 0) return `第 ${span.index} 孔的梁高不能小于 0`;
      if (!Number.isFinite(span.beamCenterDist) || span.beamCenterDist <= 0) return `第 ${span.index} 孔的梁中心距必须大于 0`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const bridge = await createBridge({
        bridgeName: bridgeName.trim(),
        lineName: lineName.trim(),
        bridgeNo: bridgeNo.trim(),
        centerMileage: centerMileage.trim(),
        buildYear,
        operationStatus,
        structureType: structureType.trim(),
        spans: expandedSpans.map((span) => ({ ...span, beamType: span.beamType.trim() })),
      });
      resetForm();
      onCreated(bridge);
    } catch (e) {
      setError(e instanceof Error ? e.message : '新建桥梁失败');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={handleClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col bg-gray-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">新建桥梁</h2>
            <p className="mt-0.5 text-sm text-gray-500">录入桥梁档案与孔跨信息，保存后即可发起 K 值计算</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Section title="基本信息">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="桥梁名称">
                <input value={bridgeName} onChange={(e) => setBridgeName(e.target.value)} className={INPUT_CLASS} placeholder="例如：清水河特大桥" />
              </FormField>
              <FormField label="所属线路">
                <input value={lineName} onChange={(e) => setLineName(e.target.value)} className={INPUT_CLASS} placeholder="例如：朔黄" />
              </FormField>
              <FormField label="桥号">
                <input value={bridgeNo} onChange={(e) => setBridgeNo(e.target.value)} className={INPUT_CLASS} placeholder="例如：59#" />
              </FormField>
              <FormField label="中心里程">
                <input value={centerMileage} onChange={(e) => setCenterMileage(e.target.value)} className={INPUT_CLASS} placeholder="例如：K149+837" />
              </FormField>
              <FormField label="建成年份">
                <input type="number" value={buildYear} onChange={(e) => setBuildYear(Number(e.target.value))} className={INPUT_CLASS} min="1800" max={new Date().getFullYear()} />
              </FormField>
              <FormField label="运营状态">
                <select value={operationStatus} onChange={(e) => setOperationStatus(e.target.value as CreateBridgeInput['operationStatus'])} className={INPUT_CLASS}>
                  <option value="运营中">运营中</option>
                  <option value="已停用">已停用</option>
                </select>
              </FormField>
              <div className="sm:col-span-2 lg:col-span-3">
                <FormField label="结构形式">
                  <input value={structureType} onChange={(e) => setStructureType(e.target.value)} className={INPUT_CLASS} placeholder="例如：预应力钢筋混凝土T形" />
                </FormField>
              </div>
            </div>
          </Section>

          <Section title="孔跨分段配置" description="相邻且参数相同的孔跨可合并录入，系统会自动展开为逐孔数据。">
            <div className="space-y-3">
              {segments.map((segment, index) => (
                <div key={segment.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">分段 {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => duplicateSegment(segment)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="复制分段">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeSegment(segment.id)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" title="删除分段">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <FormField label="孔数">
                      <input type="number" value={segment.count} onChange={(e) => updateSegment(segment.id, 'count', e.target.value)} className={INPUT_CLASS} min="1" step="1" />
                    </FormField>
                    <FormField label="梁长 (m)">
                      <input type="number" value={segment.beamLength} onChange={(e) => updateSegment(segment.id, 'beamLength', e.target.value)} className={INPUT_CLASS} min="0" step="0.1" />
                    </FormField>
                    <FormField label="梁型图号">
                      <input value={segment.beamType} onChange={(e) => updateSegment(segment.id, 'beamType', e.target.value)} className={INPUT_CLASS} placeholder="例如：专桥2059" />
                    </FormField>
                    <FormField label="梁高 (m)">
                      <input type="number" value={segment.beamHeight} onChange={(e) => updateSegment(segment.id, 'beamHeight', e.target.value)} className={INPUT_CLASS} min="0" step="0.01" />
                    </FormField>
                    <FormField label="梁中心距 (m)">
                      <input type="number" value={segment.beamCenterDist} onChange={(e) => updateSegment(segment.id, 'beamCenterDist', e.target.value)} className={INPUT_CLASS} min="0" step="0.1" />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addSegment} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100">
              <Plus className="h-4 w-4" />
              新增分段
            </button>

            <div className="mt-4 grid gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm sm:grid-cols-[100px_1fr]">
              <span className="font-medium text-blue-700">共 {expandedSpans.length} 孔</span>
              <span className="break-all text-blue-700">孔跨式样：{spanTypePreview}</span>
            </div>

            {unsupportedCount > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>其中 {unsupportedCount} 孔暂不支持 K 值计算，但可以正常保存桥梁档案。</span>
              </div>
            )}
          </Section>

        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
          <button type="button" onClick={handleClose} disabled={submitting} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
            取消
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? '保存中...' : '保存桥梁'}
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
