import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InstallAppModal } from './components/InstallAppModal';
import { Scene3D } from './scene/Scene3D';
import { InstallPromptProvider, useInstallPrompt } from './context/InstallPromptContext';
import { DeviceAppProvider } from './context/DeviceAppContext';

import { AuditPage } from './pages/AuditPage';
import { ReportPage } from './pages/ReportPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { AppHubPage } from './pages/AppHubPage';
import { MyAppsPage } from './pages/MyAppsPage';
import { PermissionsPage } from './pages/PermissionsPage';
import { RuntimeMonitorPage } from './pages/RuntimeMonitorPage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoryPage } from './pages/HistoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { SearchPage } from './pages/SearchPage';
import { ParentPortalPage } from './pages/ParentPortalPage';

// Scroll to top upon navigating routes
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { isOpen: isModalOpen } = useInstallPrompt();

  const [auditProgressState, setAuditProgressState] = useState<'home' | 'auditing' | 'report'>('home');
  const [reportScore, setReportScore] = useState<number>(0);
  const [riskColor, setRiskColor] = useState<string>('#06b6d4');

  // Derive sceneMode directly during render
  const sceneMode: 'home' | 'auditing' | 'report' = location.pathname.startsWith('/report/')
    ? 'report'
    : location.pathname === '/' && auditProgressState === 'auditing'
    ? 'auditing'
    : 'home';

  const handleScoreUpdate = (score: number, color: string) => {
    setReportScore(score);
    setRiskColor(color);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-cyan-500/25 selection:text-cyan-200">
      <ScrollToTop />

      {/* 3D WebGL Background Scene with responsive fallback */}
      <Scene3D
        mode={sceneMode}
        score={reportScore}
        riskColor={riskColor}
        isModalOpen={isModalOpen}
      />

      {/* Accessible Sticky Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-grow z-10">
        <Routes>
          {/* Web APK Audit Routes */}
          <Route
            path="/"
            element={<AuditPage onStateChange={setAuditProgressState} />}
          />
          <Route
            path="/report/:id"
            element={<ReportPage onScoreUpdate={handleScoreUpdate} />}
          />
          <Route path="/how-scoring-works" element={<MethodologyPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* PrivacyGuard On-Device App Suite Routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/parent/portal/:token" element={<ParentPortalPage />} />
          <Route path="/app" element={<AppHubPage />} />
          <Route path="/apps" element={<MyAppsPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/runtime" element={<RuntimeMonitorPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/history" element={<HistoryPage />} />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />

      {/* Install App Modal */}
      <InstallAppModal />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <InstallPromptProvider>
        <DeviceAppProvider>
          <MainLayout />
        </DeviceAppProvider>
      </InstallPromptProvider>
    </BrowserRouter>
  );
}

export default App;
