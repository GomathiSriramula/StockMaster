import { useEffect, useState } from 'react';
// ProductModal now uses local API endpoints instead of Supabase for product/category CRUD
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  unit: string;
  reorder_level: number;
  description: string;
  is_active: boolean;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit: 'pcs',
    reorder_level: 0,
    description: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only try to load categories when an authenticated session exists.
    // The `categories` table has RLS enabled so anonymous requests will be
    // denied (404). If you want public categories, change your DB policy.
    // Always try to fetch categories from the local API. If it fails, fall back to local list.
    fetchCategories();

    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        category_id: product.category_id,
        unit: product.unit,
        reorder_level: product.reorder_level,
        description: product.description || '',
        is_active: product.is_active,
      });
    }
  }, [product, user]);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const resp = await fetch('/api/categories');
      if (!resp.ok) throw new Error(`Categories API error: ${resp.status}`);
      const data = await resp.json();
      // Map MongoDB _id to id for consistency
      const mapped = (data || []).map((cat: any) => ({
        id: cat._id || cat.id,
        name: cat.name,
      }));
      setCategories(mapped);
      return;
    } catch (err) {
      console.warn('Categories API failed, falling back to local list', err);

      const hint = `Could not load categories from API. Using a local fallback list so you can continue.\n`;
      setCategoriesError(hint + 'Run the server and seed the database to persist categories.');

      const fallback = [
        { id: 'local:electronics', name: 'Electronics' },
        { id: 'local:office-supplies', name: 'Office Supplies' },
        { id: 'local:food-beverage', name: 'Food & Beverage' },
        { id: 'local:cleaning', name: 'Cleaning' },
        { id: 'local:clothing', name: 'Clothing' },
        { id: 'local:accessories', name: 'Accessories' },
        { id: 'local:hardware', name: 'Hardware' },
      ];
      setCategories(fallback);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use auth context `user` for created_by when available
      const currentUser = user;

      // If the user selected a local (fallback) category, we can't reference a DB FK.
      // Instead, clear category_id and append a note to the description so the
      // product record still saves without a broken foreign key.
      const payload = { ...formData } as any;
      if (payload.category_id && String(payload.category_id).startsWith('local:')) {
        const localName = categories.find((c) => c.id === payload.category_id)?.name;
        payload.category_id = null;
        const note = localName ? `\nCategory (unsaved): ${localName}` : '\nCategory (unsaved)';
        payload.description = (payload.description || '') + note;
      }

      if (product) {
        const resp = await fetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error('Failed to update product');
      } else {
        // send _localCategoryName to server when using local fallback so seed note can be appended
        if (payload.category_id && String(payload.category_id).startsWith('local:')) {
          payload._localCategoryName = categories.find((c) => c.id === payload.category_id)?.name;
        }
        payload.created_by = currentUser?.id ?? null;
        const resp = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => null);
          throw new Error(errBody?.error || 'Failed to create product');
        }
      }

      onClose();
    } catch (err) {
      console.error('Product save error (catch):', err);
      let msg = 'An error occurred while saving the product';
      try {
        if (!err) {
          msg = 'Unknown error';
        } else if (typeof err === 'string') {
          msg = err;
        } else if (err instanceof Error) {
          msg = err.message;
        } else if ((err as any).message) {
          msg = (err as any).message as string;
        } else if ((err as any).error) {
          msg = JSON.stringify((err as any).error);
        } else {
          msg = JSON.stringify(err);
        }
      } catch (e) {
        msg = 'An unexpected error occurred';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              {categoriesLoading ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600">Loading categories...</div>
              ) : categories.length > 0 ? (
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700">
                    No categories available.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={fetchCategories}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Reload categories
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Create categories from the Categories page or in Supabase dashboard.')}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                    >
                      How to add
                    </button>
                  </div>
                  {categoriesError && (
                    <p className="text-xs text-red-600">{categoriesError}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              >
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="ltr">Liters</option>
                <option value="box">Box</option>
                <option value="carton">Carton</option>
                <option value="dozen">Dozen</option>
                <option value="meter">Meter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                value={formData.reorder_level}
                onChange={(e) =>
                  setFormData({ ...formData, reorder_level: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              {loading ? 'Saving...' : product ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
