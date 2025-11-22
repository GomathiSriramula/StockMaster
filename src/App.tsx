import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import StockReceipts from './pages/StockReceipts';
import Deliveries from './pages/Deliveries';
import StockLedger from './pages/StockLedger';
import LowStockAlerts from './pages/LowStockAlerts';
import Layout from './components/Layout';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'warehouses':
        return <Warehouses />;
      case 'receipts':
        return <StockReceipts />;
      case 'deliveries':
        return <Deliveries />;
      case 'ledger':
        return <StockLedger />;
      case 'alerts':
        return <LowStockAlerts />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
