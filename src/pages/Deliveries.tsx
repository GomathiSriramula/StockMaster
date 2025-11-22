import { useEffect, useState } from 'react';
import { Package, Plus, PackageCheck, Truck, Trash2 } from 'lucide-react';
import DeliveryModal from '../components/DeliveryModal';

interface Product {
  _id: string;
  name: string;
  unit: string;
}

interface Warehouse {
  _id: string;
  name: string;
}

interface Delivery {
  _id: string;
  delivery_number: string;
  product_id: Product;
  warehouse_id: Warehouse;
  quantity: number;
  status: 'Picked' | 'Packed' | 'Delivered';
  notes?: string;
  picked_at?: string;
  packed_at?: string;
  delivered_at?: string;
  createdAt: string;
}

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/deliveries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch deliveries');
      
      const data = await response.json();
      setDeliveries(data);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePack = async (deliveryId: string) => {
    setProcessingId(deliveryId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${deliveryId}/pack`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pack delivery');
      }

      await fetchDeliveries();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to pack delivery');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeliver = async (deliveryId: string) => {
    if (!confirm('Are you sure you want to mark this delivery as delivered? Stock will be reduced.')) {
      return;
    }

    setProcessingId(deliveryId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${deliveryId}/deliver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deliver');
      }

      await fetchDeliveries();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to deliver');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (deliveryId: string) => {
    if (!confirm('Are you sure you want to delete this delivery?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/deliveries/${deliveryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete delivery');
      }

      await fetchDeliveries();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete delivery');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Picked':
        return 'bg-blue-100 text-blue-800';
      case 'Packed':
        return 'bg-purple-100 text-purple-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-gray-600 mt-1">Manage delivery orders with 3-step workflow</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Delivery
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No deliveries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Delivery #
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {delivery.delivery_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {delivery.product_id?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {delivery.warehouse_id?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {delivery.quantity} {delivery.product_id?.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(delivery.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {delivery.status === 'Picked' && (
                          <button
                            onClick={() => handlePack(delivery._id)}
                            disabled={processingId === delivery._id}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                            title="Pack Items"
                          >
                            <PackageCheck className="w-4 h-4" />
                          </button>
                        )}
                        {delivery.status === 'Packed' && (
                          <button
                            onClick={() => handleDeliver(delivery._id)}
                            disabled={processingId === delivery._id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Validate & Deliver"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                        {delivery.status !== 'Delivered' && (
                          <button
                            onClick={() => handleDelete(delivery._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <DeliveryModal
          onClose={() => {
            setShowModal(false);
            fetchDeliveries();
          }}
        />
      )}
    </div>
  );
}
