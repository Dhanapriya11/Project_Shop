import React from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SavingsPage } from './pages/SavingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DailyPLPage } from './pages/DailyPLPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CreditPage } from './pages/CreditPage';
import { OCRScannerPage } from './pages/OCRScannerPage';
import { ForecastPage } from './pages/ForecastPage';
import { AdvisorPage } from './pages/AdvisorPage';
import { Layout } from './components/Layout';
import { VoiceAssistant } from './components/VoiceAssistant';

type Page = 'dashboard' | 'inventory' | 'sales' | 'expenses' | 'savings' | 'reports' | 'dailypl' | 'suppliers' | 'credit' | 'scanner' | 'forecast' | 'advisor';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">ஏற்றுகிறது...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <InventoryPage onNavigate={setCurrentPage} />;
      case 'sales':
        return <SalesPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'savings':
        return <SavingsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'dailypl':
        return <DailyPLPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'credit':
        return <CreditPage />;
      case 'scanner':
        return <OCRScannerPage />;
      case 'forecast':
        return <ForecastPage />;
      case 'advisor':
        return <AdvisorPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
      <VoiceAssistant />
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
