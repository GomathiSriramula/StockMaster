import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Warehouse as WarehouseIcon } from 'lucide-react';
import WarehouseModal from '../components/WarehouseModal';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  is_active: boolean;
  manager_id: string;
  user_profiles?: { full_name: string };
}

export default function Warehouses() {
  const { profile } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, [profile]);

  const fetchWarehouses = async () => {
    try {
      const resp = await fetch('/api/warehouses');
      if (!resp.ok) throw new Error('Failed to load warehouses');
      const data = await resp.json();
      // Map _id to id for consistency
      const mapped = (data || []).map((w: any) => ({
        id: w._id || w.id,
        name: w.name,
        code: w.code,
        location: w.location,
        is_active: w.is_active,
        manager_id: w.manager_id,
      }));
      setWarehouses(mapped);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    fetchWarehouses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading warehouses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600 mt-1">Manage warehouse locations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Warehouse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <WarehouseIcon className="w-6 h-6 text-blue-600" />
              </div>
              <button
                onClick={() => handleEdit(warehouse)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{warehouse.name}</h3>
            <p className="text-sm text-gray-500 mb-3">Code: {warehouse.code}</p>
            <p className="text-sm text-gray-600 mb-3">{warehouse.location || 'No location'}</p>
            {warehouse.user_profiles && (
              <p className="text-sm text-gray-600 mb-3">
                Manager: {warehouse.user_profiles.full_name}
              </p>
            )}
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                warehouse.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {warehouse.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>

      {showModal && (
        <WarehouseModal warehouse={editingWarehouse} onClose={handleModalClose} />
      )}
    </div>
  );
}
