import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface StockOperationModalProps {
  type: 'receipt' | 'delivery' | 'transfer' | 'adjustment';
  onClose: () => void;
}

export default function StockOperationModal({ type, onClose }: StockOperationModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState<any>({
    product_id: '',
    warehouse_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: 0,
    unit_cost: 0,
    supplier_name: '',
    customer_name: '',
    reason: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodResp, whResp] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/warehouses'),
      ]);
      const prodData = prodResp.ok ? await prodResp.json() : [];
      const whData = whResp.ok ? await whResp.json() : [];
      setProducts(prodData || []);
      setWarehouses(whData || []);
    } catch (err) {
      console.warn('Failed to load products or warehouses', err);
      setProducts([]);
      setWarehouses([]);
    }
  };

  const generateNumber = () => {
    const prefix = type === 'receipt' ? 'RCP' : type === 'delivery' ? 'DEL' : type === 'transfer' ? 'TRF' : 'ADJ';
    const timestamp = Date.now().toString().slice(-8);
    return `${prefix}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const operationNumber = generateNumber();
      const created_by = user?.id ?? null;

      if (type === 'receipt') {
        const resp = await fetch('/api/stock_receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receipt_number: operationNumber,
            product_id: formData.product_id,
            warehouse_id: formData.warehouse_id,
            quantity: formData.quantity,
            unit_cost: formData.unit_cost,
            supplier_name: formData.supplier_name,
            notes: formData.notes,
            created_by,
          }),
        });
        if (!resp.ok) throw new Error('Failed to create receipt');
      } else if (type === 'delivery') {
        const resp = await fetch('/api/stock_deliveries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delivery_number: operationNumber,
            product_id: formData.product_id,
            warehouse_id: formData.warehouse_id,
            quantity: formData.quantity,
            customer_name: formData.customer_name,
            notes: formData.notes,
            created_by,
          }),
        });
        if (!resp.ok) throw new Error('Failed to create delivery');
      } else if (type === 'transfer') {
        const resp = await fetch('/api/stock_transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transfer_number: operationNumber,
            product_id: formData.product_id,
            from_warehouse_id: formData.from_warehouse_id,
            to_warehouse_id: formData.to_warehouse_id,
            quantity: formData.quantity,
            notes: formData.notes,
            created_by,
          }),
        });
        if (!resp.ok) throw new Error('Failed to create transfer');
      } else if (type === 'adjustment') {
        const resp = await fetch('/api/stock_adjustments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adjustment_number: operationNumber,
            product_id: formData.product_id,
            warehouse_id: formData.warehouse_id,
            quantity_change: formData.quantity,
            reason: formData.reason,
            notes: formData.notes,
            created_by,
          }),
        });
        if (!resp.ok) throw new Error('Failed to create adjustment');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'receipt': return 'New Stock Receipt';
      case 'delivery': return 'New Delivery';
      case 'transfer': return 'New Transfer';
      case 'adjustment': return 'New Adjustment';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Warehouse *
                </label>
                <select
                  value={formData.from_warehouse_id}
                  onChange={(e) => setFormData({ ...formData, from_warehouse_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Warehouse *
                </label>
                <select
                  value={formData.to_warehouse_id}
                  onChange={(e) => setFormData({ ...formData, to_warehouse_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse *</label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity {type === 'adjustment' && '(+/-)'}  *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              min={type === 'adjustment' ? undefined : 1}
            />
          </div>

          {type === 'receipt' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name</label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </>
          )}

          {type === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {type === 'adjustment' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
