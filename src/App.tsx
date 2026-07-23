/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InputSO from './pages/InputSO';
import InputPO from './pages/InputPO';
import WIPKanban from './pages/WIPKanban';
import WMSInventory from './pages/WMSInventory';
import DataGudang from './pages/DataGudang';
import BOMCosting from './pages/BOMCosting';
import MasterProduct from './pages/MasterProduct';
import Reports from './pages/Reports';
import Setup from './pages/Setup';
import MobileApp from './pages/MobileApp';
import Portal from './pages/Portal';
import Login from './pages/Login';

import UserGuide from './pages/UserGuide';
import Support from './pages/Support';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/portal" element={<Portal forceShowSelect={true} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mobile" element={<MobileApp />} />
          
          <Route path="/erp" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="bom-costing" element={<BOMCosting />} />
            <Route path="master-product" element={<MasterProduct />} />
            <Route path="input-po" element={<InputPO />} />
            <Route path="input-so" element={<InputSO />} />
            <Route path="kanban" element={<WIPKanban />} />
            <Route path="inventory" element={<WMSInventory />} />
            <Route path="gudang" element={<DataGudang />} />
            <Route path="reports" element={<Reports />} />
            <Route path="setup" element={<Setup />} />
            <Route path="user-guide" element={<UserGuide />} />
            <Route path="support" element={<Support />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
