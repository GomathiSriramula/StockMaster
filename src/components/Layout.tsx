import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Package,
  LayoutDashboard,
  Box,
  TrendingDown,
  TrendingUp,
  Repeat,
  Settings,
  Warehouse,
  FileText,
  AlertCircle,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
    { name: 'Products', icon: Box, page: 'products' },
    { name: 'Warehouses', icon: Warehouse, page: 'warehouses' },
    { name: 'Stock Receipts', icon: TrendingDown, page: 'receipts' },
    { name: 'Deliveries', icon: TrendingUp, page: 'deliveries' },
    { name: 'Transfers', icon: Repeat, page: 'transfers' },
    { name: 'Adjustments', icon: Settings, page: 'adjustments' },
    { name: 'Stock Ledger', icon: FileText, page: 'ledger' },
    { name: 'Low Stock Alerts', icon: AlertCircle, page: 'alerts' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-gray-900">StockMaster</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white shadow-lg z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">StockMaster</h1>
                <p className="text-xs text-gray-500">Inventory System</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      onNavigate(item.page);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gray-300 rounded-full p-2">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">
                      {profile?.full_name || (user?.user_metadata as any)?.full_name || user?.email || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role || 'staff'}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
