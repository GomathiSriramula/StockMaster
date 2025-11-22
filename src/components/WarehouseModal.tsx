import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, MapPin } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  manager_id: string;
  is_active: boolean;
}

interface WarehouseModalProps {
  warehouse: Warehouse | null;
  onClose: () => void;
}

export default function WarehouseModal({ warehouse, onClose }: WarehouseModalProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    manager_id: '',
    is_active: true,
  });
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Skip fetching users for now - can be implemented later if needed
    if (warehouse) {
      setFormData({
        name: warehouse.name,
        code: warehouse.code,
        location: warehouse.location || '',
        manager_id: warehouse.manager_id || '',
        is_active: warehouse.is_active,
      });
      
      // Parse location - expect format "address|lat,lng"
      if (warehouse.location) {
        if (warehouse.location.includes('|')) {
          const [address, coords] = warehouse.location.split('|');
          setLocationAddress(address);
          const [lat, lng] = coords.split(',').map(s => s.trim());
          setLatitude(lat);
          setLongitude(lng);
        } else if (warehouse.location.includes(',')) {
          // Legacy format: just coordinates
          const [lat, lng] = warehouse.location.split(',').map(s => s.trim());
          setLatitude(lat);
          setLongitude(lng);
        } else {
          // Just an address
          setLocationAddress(warehouse.location);
        }
      }
    }
  }, [warehouse, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Format location as "address|lat,lng" if we have coordinates
      let location = locationAddress;
      if (latitude && longitude) {
        location = locationAddress 
          ? `${locationAddress}|${latitude},${longitude}`
          : `${latitude},${longitude}`;
      }
      
      const locationData = {
        ...formData,
        location
      };

      if (warehouse) {
        const resp = await fetch(`/api/warehouses/${warehouse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData),
        });

        if (!resp.ok) {
          const data = await resp.json();
          throw new Error(data.error || 'Failed to update warehouse');
        }
      } else {
        const resp = await fetch('/api/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData),
        });

        if (!resp.ok) {
          const data = await resp.json();
          throw new Error(data.error || 'Failed to create warehouse');
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {warehouse ? 'Edit Warehouse' : 'Add Warehouse'}
          </h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warehouse Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <div className="space-y-3">
              {/* Address/Description Field */}
              <div>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Enter address or location description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Coordinates Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g., 40.712800"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g., -74.006000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                💡 You can get coordinates from Google Maps or any mapping service
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Manager Name</label>
            <input
              type="text"
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter manager name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.value === 'true' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
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
              {loading ? 'Saving...' : warehouse ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
