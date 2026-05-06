import { Check } from 'lucide-react';
import type { StepId } from '../lib/types';

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: '选桥' },
  { id: 2, label: '参数' },
  { id: 3, label: '结果' },
  { id: 4, label: '报告' },
];

interface MobileNavProps {
  currentStep: StepId;
  completedSteps: StepId[];
  onStepClick: (step: StepId) => void;
}

export default function MobileNav({ currentStep, completedSteps, onStepClick }: MobileNavProps) {
  return (
    <div 
      className="lg:hidden flex items-center justify-center gap-1 px-4 py-3"
      style={{ 
        backgroundColor: 'var(--gray-0)',
        borderBottom: '1px solid var(--gray-200)'
      }}
    >
      {STEPS.map((step, i) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const nextAvailable = (Math.max(...completedSteps, 0) + 1) as StepId;
        const isClickable = isCompleted || isCurrent || step.id <= nextAvailable;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: isCurrent 
                  ? 'var(--primary-600)' 
                  : isCompleted 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'var(--gray-100)',
                color: isCurrent 
                  ? 'white' 
                  : isCompleted 
                  ? 'var(--success)' 
                  : 'var(--gray-500)',
                boxShadow: isCurrent ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                cursor: isClickable ? 'pointer' : 'not-allowed',
              }}
            >
              {isCompleted ? <Check className="w-3 h-3" /> : step.id}
              <span>{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div 
                className="w-4 h-px mx-1" 
                style={{ 
                  backgroundColor: isCompleted ? 'var(--success)' : 'var(--gray-300)' 
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
