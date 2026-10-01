import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring'));
const AIForecast = lazy(() => import('./pages/AIForecast'));
const WarningsImpact = lazy(() => import('./pages/WarningsImpact'));
const HistoricalIntelligence = lazy(() => import('./pages/HistoricalIntelligence'));
const SystemData = lazy(() => import('./pages/SystemData'));
const BasinWatch = lazy(() => import('./pages/BasinWatch'));
const EmergencyResponseConsole = lazy(() => import('./pages/EmergencyResponseConsole'));
const SatelliteIntelligence = lazy(() => import('./pages/SatelliteIntelligence'));
const ModelPerformance = lazy(() => import('./pages/ModelPerformance'));
const SDGImpactDashboard = lazy(() => import('./pages/SDGImpactDashboard'));
const CycloneVisualization = lazy(() => import('./pages/CycloneVisualization'));
import { useAlerts } from './features/alerts/alertState';

function AppContent() {
  const { unreadCount } = useAlerts();

  return (
    <>
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Live region for announcements */}
      <div 
        id="live-region" 
        className="live-region" 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {unreadCount > 0 && `${unreadCount} new alert${unreadCount !== 1 ? 's' : ''} received`}
      </div>

      <Suspense fallback={<div role="status" className="p-6">Loading workspace…</div>}><Routes>
        <Route path="/landing" element={<LandingPage />} />
        
        <Route path="/visualization" element={<CycloneVisualization />} />
        
        {/* Root opens directly to DashboardLayout */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<CommandCenter />} />
          <Route path="command" element={<CommandCenter />} />
          <Route path="live" element={<LiveMonitoring />} />
          <Route path="basin" element={<BasinWatch />} />
          <Route path="forecast" element={<AIForecast />} />
          <Route path="warnings" element={<WarningsImpact />} />
          <Route path="response" element={<EmergencyResponseConsole />} />
          <Route path="satellite" element={<SatelliteIntelligence />} />
          <Route path="sdg" element={<SDGImpactDashboard />} />
          <Route path="historical" element={<HistoricalIntelligence />} />
          <Route path="system" element={<SystemData />} />
        </Route>

        {/* Explicit /dashboard subpath routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<CommandCenter />} />
          <Route path="command" element={<CommandCenter />} />
          <Route path="live" element={<LiveMonitoring />} />
          <Route path="basin" element={<BasinWatch />} />
          <Route path="forecast" element={<AIForecast />} />
          <Route path="warnings" element={<WarningsImpact />} />
          <Route path="response" element={<EmergencyResponseConsole />} />
          <Route path="satellite" element={<SatelliteIntelligence />} />
          <Route path="sdg" element={<SDGImpactDashboard />} />
          <Route path="historical" element={<HistoricalIntelligence />} />
          <Route path="system" element={<SystemData />} />
          
          {/* Legacy aliases mapped to the 6 core pages */}
          <Route path="overview" element={<Navigate to="/dashboard/command" replace />} />
          <Route path="track" element={<Navigate to="/dashboard/forecast" replace />} />
          <Route path="intensity" element={<Navigate to="/dashboard/forecast" replace />} />
          <Route path="satellite" element={<Navigate to="/dashboard/live" replace />} />
          <Route path="environment" element={<Navigate to="/dashboard/live" replace />} />
          <Route path="environmental" element={<Navigate to="/dashboard/live" replace />} />
          <Route path="risk" element={<Navigate to="/dashboard/warnings" replace />} />
          <Route path="history" element={<Navigate to="/dashboard/historical" replace />} />
          <Route path="models" element={<ModelPerformance />} />
          <Route path="performance" element={<Navigate to="/dashboard/models" replace />} />
          <Route path="data-sources" element={<Navigate to="/dashboard/system" replace />} />
          <Route path="data" element={<Navigate to="/dashboard/system" replace />} />
          <Route path="architecture" element={<Navigate to="/dashboard/system" replace />} />
        </Route>

        {/* Legacy direct routes */}
        <Route path="/overview" element={<Navigate to="/dashboard/command" replace />} />
        <Route path="/track" element={<Navigate to="/dashboard/forecast" replace />} />
        <Route path="/intensity" element={<Navigate to="/dashboard/forecast" replace />} />
        <Route path="/satellite" element={<Navigate to="/dashboard/live" replace />} />
        <Route path="/environment" element={<Navigate to="/dashboard/live" replace />} />
        <Route path="/environmental" element={<Navigate to="/dashboard/live" replace />} />
        <Route path="/risk" element={<Navigate to="/dashboard/warnings" replace />} />
        <Route path="/history" element={<Navigate to="/dashboard/historical" replace />} />
        <Route path="/models" element={<Navigate to="/dashboard/system" replace />} />
        <Route path="/performance" element={<Navigate to="/dashboard/system" replace />} />
        <Route path="/data-sources" element={<Navigate to="/dashboard/system" replace />} />
        <Route path="/data" element={<Navigate to="/dashboard/system" replace />} />
        <Route path="/architecture" element={<Navigate to="/dashboard/system" replace />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </>
  );
}

export default function App() {
  return <AppContent />;
}