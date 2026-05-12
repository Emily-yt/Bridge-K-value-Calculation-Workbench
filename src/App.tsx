import { useState, useCallback } from 'react';
import Header from './components/Header';
import Sidebar, { type ViewId } from './components/Sidebar';
import MobileNav from './components/MobileNav';
import CalculationDrawer from './components/CalculationDrawer';
import ReportPreviewModal from './components/ReportPreviewModal';
import Dashboard from './pages/Dashboard';
import BridgeList from './pages/BridgeList';
import Settings from './pages/Settings';
import type { Bridge } from './lib/types';

function App() {
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');
  const [isCalcDrawerOpen, setIsCalcDrawerOpen] = useState(false);
  const [calcTargetBridge, setCalcTargetBridge] = useState<Bridge | null>(null);
  const [dataRefresh, setDataRefresh] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCalcId, setReportCalcId] = useState<string | null>(null);

  const handleViewChange = useCallback((view: ViewId) => {
    setCurrentView(view);
  }, []);

  const handleCalculate = useCallback((bridge: Bridge) => {
    setCalcTargetBridge(bridge);
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
        return <Dashboard dataRefresh={dataRefresh} onViewChange={handleViewChange} onCalculate={handleCalculate} onOpenReport={handleOpenReport} />;
      case 'bridges':
        return (
          <BridgeList
            dataRefresh={dataRefresh}
            onCalculate={handleCalculate}
          />
        );
      case 'statistics':
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">统计分析</h2>
              <p className="text-gray-500">功能开发中...</p>
            </div>
          </div>
        );
      case 'templates':
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">报告模板</h2>
              <p className="text-gray-500">功能开发中...</p>
            </div>
          </div>
        );
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
        isOpen={isCalcDrawerOpen}
        onClose={() => setIsCalcDrawerOpen(false)}
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
