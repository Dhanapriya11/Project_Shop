import React from 'react';
import { useAuth } from '../lib/auth-context';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  PiggyBank,
  FileText,
  LogOut,
  Menu,
  Store,
  TrendingUp,
  Truck,
  CreditCard,
  ScanLine,
  Sparkles
} from 'lucide-react';

type Page = 'dashboard' | 'inventory' | 'sales' | 'expenses' | 'savings' | 'reports' | 'dailypl' | 'suppliers' | 'credit' | 'scanner' | 'forecast' | 'advisor';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'டாஷ்போர்டு', icon: LayoutDashboard },
  { id: 'inventory' as Page, label: 'சரக்கு பட்டியல்', icon: Package },
  { id: 'sales' as Page, label: 'விற்பனை', icon: ShoppingCart },
  { id: 'expenses' as Page, label: 'செலவுகள்', icon: Receipt },
  { id: 'savings' as Page, label: 'சேமிப்பு', icon: PiggyBank },
  { id: 'suppliers' as Page, label: 'சப்ளையர்கள்', icon: Truck },
  { id: 'credit' as Page, label: 'கடன் கணக்கு', icon: CreditCard },
  { id: 'scanner' as Page, label: 'OCR ஸ்கேனர்', icon: ScanLine },
  { id: 'forecast' as Page, label: 'கணிப்பு', icon: TrendingUp },
  { id: 'advisor' as Page, label: 'AI ஆலோசகர்', icon: Sparkles },
  { id: 'reports' as Page, label: 'அறிக்கைகள்', icon: FileText },
  { id: 'dailypl' as Page, label: 'லாப/நட்டம்', icon: TrendingUp },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">கடை உதவியாளர்</h1>
                <p className="text-sm text-gray-500">Shop Assistant</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`nav-link w-full ${
                    isActive ? 'nav-link-active' : 'nav-link-inactive'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={signOut}
              className="nav-link w-full text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              வெளியேறு
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-100 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">கடை உதவியாளர்</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
