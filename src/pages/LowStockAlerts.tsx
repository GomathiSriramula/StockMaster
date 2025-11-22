import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Check } from 'lucide-react';

interface Alert {
  id: string;
  current_quantity: number;
  reorder_level: number;
  is_acknowledged: boolean;
  created_at: string;
  products: { name: string; sku: string; unit: string };
  warehouses: { name: string };
}

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active'>('active');

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('low_stock_alerts')
        .select('*, products(name, sku, unit), warehouses(name)')
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.eq('is_acknowledged', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('low_stock_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('Failed to acknowledge alert');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Low Stock Alerts</h1>
          <p className="text-gray-600 mt-1">Products below reorder level</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'active'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No alerts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reorder Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{alert.products.name}</div>
                        <div className="text-sm text-gray-500">{alert.products.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{alert.warehouses.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-red-600">
                        {alert.current_quantity} {alert.products.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {alert.reorder_level} {alert.products.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          alert.is_acknowledged
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {alert.is_acknowledged ? 'Acknowledged' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!alert.is_acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                        >
                          <Check className="w-4 h-4" />
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
