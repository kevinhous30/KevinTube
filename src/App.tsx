import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import KevinTube from './KevinTube';
import AutoPricing from './AutoPricing';
import ChargingStations from './ChargingStations';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kevintube" element={<KevinTube />} />
        <Route path="/auto-pricing" element={<AutoPricing />} />
        <Route path="/charging-stations" element={<ChargingStations />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
