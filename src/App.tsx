import { useState, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Step1BridgeSelection from './steps/Step1BridgeSelection';
import Step2ParameterVerification from './steps/Step2ParameterVerification';
import type { CalculationParams } from './steps/Step2ParameterVerification';
import Step3Results from './steps/Step3Results';
import Step4Report from './steps/Step4Report';
import Step5History from './steps/Step5History';
import type { Bridge, StepId, StepStatus } from './lib/types';

function App() {
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    current: 1,
    completed: [],
  });
  const [selectedBridge, setSelectedBridge] = useState<Bridge | null>(null);
  const [calcParams, setCalcParams] = useState<CalculationParams | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const goToStep = useCallback((step: StepId) => {
    setStepStatus((prev) => ({ ...prev, current: step }));
  }, []);

  const completeStep = useCallback((step: StepId, nextStep?: StepId) => {
    setStepStatus((prev) => {
      const completed = prev.completed.includes(step)
        ? prev.completed
        : [...prev.completed, step];
      return {
        current: nextStep || prev.current,
        completed,
      };
    });
  }, []);

  function handleBridgeSelect(bridge: Bridge) {
    setSelectedBridge(bridge);
    completeStep(1, 2);
  }

  function handleCalculate(params: CalculationParams) {
    setCalcParams(params);
    completeStep(2, 3);
  }

  function handleGenerateReport() {
    completeStep(3, 4);
  }

  function renderMainContent() {
    switch (stepStatus.current) {
      case 1:
        return <Step1BridgeSelection onSelect={handleBridgeSelect} />;
      case 2:
        return selectedBridge ? (
          <Step2ParameterVerification bridge={selectedBridge} onCalculate={handleCalculate} />
        ) : (
          <div className="text-sm" style={{ color: 'var(--gray-400)' }}>请先选择桥梁</div>
        );
      case 3:
        return calcParams ? (
          <Step3Results
            params={calcParams}
            onGenerateReport={handleGenerateReport}
            onViewProcess={() => {}}
          />
        ) : (
          <div className="text-sm" style={{ color: 'var(--gray-400)' }}>请先完成参数校核</div>
        );
      case 4:
        return selectedBridge && calcParams ? (
          <Step4Report bridge={selectedBridge} params={calcParams} />
        ) : (
          <div className="text-sm" style={{ color: 'var(--gray-400)' }}>请先完成计算</div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--gray-50)' }}>
      <Header
        onHistoryClick={() => setShowHistory(true)}
      />
      <MobileNav
        currentStep={stepStatus.current}
        completedSteps={stepStatus.completed}
        onStepClick={goToStep}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar stepStatus={stepStatus} onStepClick={goToStep} currentBridge={selectedBridge?.name || null} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>
      
      {/* 历史记录弹窗 */}
      {showHistory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowHistory(false)}
        >
          <div 
            className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            style={{ backgroundColor: 'var(--gray-0)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--gray-200)' }}
            >
              <h2 
                className="text-lg font-semibold"
                style={{ color: 'var(--gray-800)' }}
              >
                历史计算记录
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ 
                  color: 'var(--gray-500)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gray-100)';
                  e.currentTarget.style.color = 'var(--gray-700)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--gray-500)';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <Step5History onViewCalculation={() => {}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
