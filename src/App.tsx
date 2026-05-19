import { useState, useCallback } from 'react';
import Header from './components/Header';
import Sidebar, { type ViewId } from './components/Sidebar';
import MobileNav from './components/MobileNav';
import CalculationDrawer from './components/CalculationDrawer';
import ReportPreviewModal from './components/ReportPreviewModal';
import Dashboard from './pages/Dashboard';
import KValueCalculation from './pages/KValueCalculation';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import type { Bridge } from './lib/types';

function App() {
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');
  const [isCalcDrawerOpen, setIsCalcDrawerOpen] = useState(false);
  const [calcTargetBridge, setCalcTargetBridge] = useState<Bridge | null>(null);
  const [calcTargetSpanIndex, setCalcTargetSpanIndex] = useState<number | undefined>(undefined);
  const [dataRefresh, setDataRefresh] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCalcId, setReportCalcId] = useState<string | null>(null);

  const handleViewChange = useCallback((view: ViewId) => {
    setCurrentView(view);
  }, []);

  const handleCalculate = useCallback((bridge: Bridge, spanIndex?: number) => {
    setCalcTargetBridge(bridge);
    setCalcTargetSpanIndex(spanIndex);
    setIsCalcDrawerOpen(true);
  }, []);

  const handleCalcComplete = useCallback(() => {
    setDataRefresh((n) => n + 1);
  }, []);

  const handleOpenReport = useCallback((calculationId: string) => {
    setReportCalcId(calculationId);
    setReportModalOpen(true);
  }, []);

  const handleCloseReport = useCallback(() => {
    setReportModalOpen(false);
    setReportCalcId(null);
  }, []);

  const renderMainContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard dataRefresh={dataRefresh} onCalculate={handleCalculate} onOpenReport={handleOpenReport} />;
      case 'bridges':
        return (
          <KValueCalculation
            dataRefresh={dataRefresh}
            onCalculate={handleCalculate}
          />
        );
      case 'statistics':
        return <Statistics />;
      case 'users':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header />
      <MobileNav
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
        />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {renderMainContent()}
        </main>
      </div>

      <CalculationDrawer
        bridge={calcTargetBridge}
        initialSpanIndex={calcTargetSpanIndex}
        isOpen={isCalcDrawerOpen}
        onClose={() => {
          setIsCalcDrawerOpen(false);
          setCalcTargetSpanIndex(undefined);
        }}
        onComplete={handleCalcComplete}
        onOpenReport={handleOpenReport}
      />

      <ReportPreviewModal
        calculationId={reportCalcId}
        isOpen={reportModalOpen}
        onClose={handleCloseReport}
      />
    </div>
  );
}

export default App;
