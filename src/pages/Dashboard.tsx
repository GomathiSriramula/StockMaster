import { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Repeat,
  Warehouse,
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  totalWarehouses: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStock: 0,
    lowStockItems: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    pendingTransfers: 0,
    totalWarehouses: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products, stock, alerts, warehouses, ledger and deliveries from our local API
      const [productsRes, stockRes, alertsRes, warehousesRes, ledgerRes, deliveriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/stock'),
        fetch('/api/low_stock_alerts'),
        fetch('/api/warehouses'),
        fetch('/api/stock_ledger'),
        fetch('/api/deliveries'),
      ]);

      const productsData = (await productsRes.json()) || [];
      const stockData = (await stockRes.json()) || [];
      const alertsData = (await alertsRes.json()) || [];
      const warehousesData = (await warehousesRes.json()) || [];
      const ledgerData = (await ledgerRes.json()) || [];
      const deliveriesData = (await deliveriesRes.json()) || [];

      const totalStock = stockData.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
      
      // Count pending deliveries (Picked or Packed status)
      const pendingDeliveries = (deliveriesData || []).filter(
        (d: any) => d.status === 'Picked' || d.status === 'Packed'
      ).length || 0;

      setStats({
        totalProducts: productsData.length || 0,
        totalStock,
        lowStockItems: (alertsData || []).filter((a: any) => !a.is_acknowledged).length || 0,
        // pending counts are not implemented on the local API yet
        pendingReceipts: 0,
        pendingDeliveries,
        pendingTransfers: 0,
        totalWarehouses: warehousesData.length || 0,
      });

      const activities: RecentActivity[] = (ledgerData || []).slice(0, 10).map((item: any) => ({
        id: item._id || item.id,
        type: item.type || item.transaction_type || 'activity',
        description: `${(item.type || item.transaction_type || '').replace(/_/g, ' ')} - ${item.product_id?.name || item.products?.name || ''} at ${item.warehouse_id?.name || item.warehouses?.name || ''}`,
        timestamp: item.created_at,
      }));

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Stock',
      value: stats.totalStock.toLocaleString(),
      icon: Package,
      color: 'bg-green-500',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Warehouses',
      value: stats.totalWarehouses,
      icon: Warehouse,
      color: 'bg-purple-500',
    },
    {
      title: 'Pending Receipts',
      value: stats.pendingReceipts,
      icon: TrendingDown,
      color: 'bg-orange-500',
    },
    {
      title: 'Pending Deliveries',
      value: stats.pendingDeliveries,
      icon: TrendingUp,
      color: 'bg-teal-500',
    },
    {
      title: 'Pending Transfers',
      value: stats.pendingTransfers,
      icon: Repeat,
      color: 'bg-cyan-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your inventory management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <TrendingDown className="w-6 h-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">New Receipt</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
              <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">New Delivery</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
              <Repeat className="w-6 h-6 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">Transfer Stock</p>
            </button>
            <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition text-left">
              <Package className="w-6 h-6 text-orange-600 mb-2" />
              <p className="font-medium text-gray-900">Add Product</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
