import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import QuotationWizard from './pages/QuotationWizard';
import QuotationList from './pages/QuotationList';
import AdminCatalog from './pages/AdminCatalog';
import AdminPricing from './pages/AdminPricing';
import AdminDestinations from './pages/AdminDestinations';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<QuotationList />} />
            <Route path="new" element={<QuotationWizard />} />
            <Route path="edit/:id" element={<QuotationWizard />} />
            <Route path="admin/catalog" element={<AdminCatalog />} />
            <Route path="admin/pricing" element={<AdminPricing />} />
            <Route path="admin/destinations" element={<AdminDestinations />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
