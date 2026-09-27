import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/appState';
import NavBar from './components/NavBar';
import DashboardPage from './pages/DashboardPage';
import SimulatePage from './pages/SimulatePage';
import ImpactMapPage from './pages/ImpactMapPage';
import ApprovalPage from './pages/ApprovalPage';
import RepairPage from './pages/RepairPage';
import ValidationPage from './pages/ValidationPage';
import './App.css';

export default function App() {
  const basename = import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <AppProvider>
      <BrowserRouter basename={basename}>
        <div className="app-layout">
          <NavBar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/simulate" element={<SimulatePage />} />
              <Route path="/impact-map" element={<ImpactMapPage />} />
              <Route path="/approve" element={<ApprovalPage />} />
              <Route path="/repair" element={<RepairPage />} />
              <Route path="/validate" element={<ValidationPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
