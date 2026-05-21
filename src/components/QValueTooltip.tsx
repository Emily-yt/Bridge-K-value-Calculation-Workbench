import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface QValueTooltipProps {
  qResult: {
    c80: { q: number; meetsRequirement: boolean };
    km98: { q: number; meetsRequirement: boolean };
  };
}

export function QValueTooltip({ qResult }: QValueTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isVisible]);

  return (
    <>
      <span
        ref={triggerRef}
        className="text-[11px] text-gray-400 cursor-help border-b border-dotted border-gray-300"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        Q值详情
      </span>
      {isVisible && createPortal(
        <div
          className="fixed w-44 bg-gray-800 text-white text-[11px] rounded-lg py-2.5 px-3 shadow-xl z-[9999]"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>C80:</span>
              <span className={qResult.c80.meetsRequirement ? 'text-emerald-400' : 'text-red-400'}>
                {qResult.c80.q.toFixed(3)} {qResult.c80.meetsRequirement ? '< K' : '≥ K'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>KM98:</span>
              <span className={qResult.km98.meetsRequirement ? 'text-emerald-400' : 'text-red-400'}>
                {qResult.km98.q.toFixed(3)} {qResult.km98.meetsRequirement ? '< K' : '≥ K'}
              </span>
            </div>
          </div>
          {/* 箭头 */}
          <div
            className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"
            style={{
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%) rotate(180deg)',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
