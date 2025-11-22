import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Check } from 'lucide-react';
import StockOperationModal from '../components/StockOperationModal';

interface StockReceipt {
  id: string;
  receipt_number: string;
  quantity: number;
  unit_cost: number;
  supplier_name: string;
  notes: string;
  status: string;
  created_at: string;
  completed_at: string;
  products: { name: string; unit: string };
  warehouses: { name: string };
  user_profiles: { full_name: string };
}

export default function StockReceipts() {
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_receipts')
        .select('*, products(name, unit), warehouses(name), user_profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string, productId: string, warehouseId: string, quantity: number) => {
    try {
      const { error: updateError } = await supabase
        .from('stock_receipts')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      const { data: stockData } = await supabase
        .from('stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      if (stockData) {
        await supabase
          .from('stock')
          .update({ quantity: Number(stockData.quantity) + Number(quantity) })
          .eq('product_id', productId)
          .eq('warehouse_id', warehouseId);
      } else {
        await supabase
          .from('stock')
          .insert([{ product_id: productId, warehouse_id: warehouseId, quantity }]);
      }

      const { data: newStock } = await supabase
        .from('stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .single();

      const receipt = receipts.find((r) => r.id === id);
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('stock_ledger').insert([{
        product_id: productId,
        warehouse_id: warehouseId,
        transaction_type: 'receipt',
        reference_id: id,
        reference_number: receipt?.receipt_number,
        quantity_change: quantity,
        quantity_after: newStock?.quantity || quantity,
        created_by: user?.id,
      }]);

      fetchReceipts();
    } catch (error) {
      console.error('Error completing receipt:', error);
      alert('Failed to complete receipt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading receipts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Receipts</h1>
          <p className="text-gray-600 mt-1">Incoming stock to warehouses</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Receipt
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Receipt #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {receipt.receipt_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{receipt.products.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{receipt.warehouses.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {receipt.quantity} {receipt.products.unit}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {receipt.supplier_name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        receipt.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(receipt.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {receipt.status === 'pending' && (
                      <button
                        onClick={() => {
                          const productId = (receipt as any).product_id;
                          const warehouseId = (receipt as any).warehouse_id;
                          handleComplete(receipt.id, productId, warehouseId, receipt.quantity);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                      >
                        <Check className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <StockOperationModal type="receipt" onClose={() => { setShowModal(false); fetchReceipts(); }} />
      )}
    </div>
  );
}
