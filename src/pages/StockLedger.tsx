import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText } from 'lucide-react';

interface LedgerEntry {
  id: string;
  transaction_type: string;
  reference_number: string;
  quantity_change: number;
  quantity_after: number;
  created_at: string;
  products: { name: string; unit: string };
  warehouses: { name: string };
  user_profiles: { full_name: string };
}

export default function StockLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_ledger')
        .select('*, products(name, unit), warehouses(name), user_profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading ledger...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Stock Ledger</h1>
        <p className="text-gray-600 mt-1">Complete history of all stock transactions</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {entry.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{entry.products.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{entry.warehouses.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`font-medium ${
                          entry.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {entry.quantity_change > 0 ? '+' : ''}
                        {entry.quantity_change} {entry.products.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.quantity_after} {entry.products.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.user_profiles?.full_name || 'System'}
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
