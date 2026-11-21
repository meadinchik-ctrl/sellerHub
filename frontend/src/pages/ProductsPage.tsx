import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ImageUploader } from '../components/common/ImageUploader';
import { Modal } from '../components/common/Modal';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { activeStore } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    price: '' as string | number,
    old_price: '',
    currency: 'USD',
    stock_quantity: '' as string | number,
    item_type: 'product',
    service_duration_min: '' as string | number,
    price_prefix: '',
    service_format: 'in_person',
    is_published: true,
    description: '',
    images: [] as { image_url: string; is_cover: boolean }[],
    variants: [] as { title: string; sku: string; price: string | number; stock_quantity: string | number }[],
    attributes: [] as { name: string; type: string; value_text: string }[]
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts({
          query: searchQuery,
          category_id: selectedCategory || undefined,
          is_published: selectedStatus === 'published' ? true : selectedStatus === 'hidden' ? false : undefined,
          page_size: 50
        }),
        api.getCategories()
      ]);
      setProducts(prodRes.items || []);
      setTotal(prodRes.total || 0);
      setCategories(catRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStore, searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openCreateModal();
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      price: '',
      old_price: '',
      currency: activeStore?.default_currency || 'USD',
      stock_quantity: '',
      item_type: activeStore?.enabled_features?.services && !activeStore?.enabled_features?.products ? 'service' : 'product',
      service_duration_min: '',
      price_prefix: '',
      service_format: 'in_person',
      is_published: true,
      description: '',
      images: [],
      variants: [],
      attributes: []
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || '',
      category_id: p.category_id || '',
      price: p.price !== undefined && p.price !== null ? String(p.price) : '',
      old_price: p.old_price !== null && p.old_price !== undefined ? String(p.old_price) : '',
      currency: p.currency,
      stock_quantity: p.stock_quantity !== undefined && p.stock_quantity !== null ? String(p.stock_quantity) : '',
      item_type: p.item_type || 'product',
      service_duration_min: p.service_duration_min !== null && p.service_duration_min !== undefined ? String(p.service_duration_min) : '',
      price_prefix: p.price_prefix || '',
      service_format: p.service_format || 'in_person',
      is_published: p.is_published,
      description: p.description || '',
      images: p.images || [],
      variants: (p.variants || []).map((v: any) => ({
        ...v,
        price: v.price !== undefined && v.price !== null ? String(v.price) : '',
        stock_quantity: v.stock_quantity !== undefined && v.stock_quantity !== null ? String(v.stock_quantity) : ''
      })),
      attributes: p.attributes || []
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = parseFloat(String(formData.price));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Укажите корректную цену товара (не менее 0)');
      return;
    }

    const parsedOldPrice = formData.old_price !== '' ? parseFloat(String(formData.old_price)) : null;
    if (parsedOldPrice !== null && (isNaN(parsedOldPrice) || parsedOldPrice < 0)) {
      setFormError('Старая цена должна быть положительным числом');
      return;
    }

    const parsedStock = formData.item_type === 'service'
      ? 9999
      : (formData.stock_quantity !== '' ? parseInt(String(formData.stock_quantity), 10) : 0);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setFormError('Количество на складе не может быть отрицательным');
      return;
    }

    // Validate variants
    const validatedVariants = formData.variants.map((v) => {
      const vPrice = v.price !== '' ? parseFloat(String(v.price)) : parsedPrice;
      const vStock = v.stock_quantity !== '' ? parseInt(String(v.stock_quantity), 10) : 0;
      return {
        ...v,
        price: isNaN(vPrice) ? parsedPrice : Math.max(0, vPrice),
        stock_quantity: isNaN(vStock) ? 0 : Math.max(0, vStock)
      };
    });

    setSubmitting(true);

    try {
      const payload: any = {
        name: formData.name,
        sku: formData.sku || null,
        category_id: formData.category_id || null,
        price: parsedPrice,
        old_price: parsedOldPrice,
        currency: formData.currency,
        stock_quantity: parsedStock,
        item_type: formData.item_type || 'product',
        service_duration_min: formData.service_duration_min ? parseInt(String(formData.service_duration_min)) : null,
        price_prefix: formData.price_prefix || null,
        service_format: formData.service_format || 'in_person',
        is_published: formData.is_published,
        description: formData.description,
        images: formData.images,
        variants: validatedVariants,
        attributes: formData.attributes
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения товара');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) return;
    try {
      await api.deleteProduct(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDuplicateProduct = async (id: string) => {
    try {
      await api.duplicateProduct(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkProductsAction({ product_ids: selectedIds, action });
      setSelectedIds([]);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setFormData({
      ...formData,
      images: [
        ...formData.images,
        { image_url: newImageUrl.trim(), is_cover: formData.images.length === 0 }
      ]
    });
    setNewImageUrl('');
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        { title: '', sku: '', price: formData.price !== '' ? formData.price : '', stock_quantity: '' }
      ]
    });
  };

  const addAttribute = () => {
    setFormData({
      ...formData,
      attributes: [
        ...formData.attributes,
        { name: 'Материал', type: 'text', value_text: '' }
      ]
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Товары и услуги</h1>
          <p className="text-xs text-slate-500">Управление ассортиментом магазина ({total} позиций)</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить товар</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, артикулу SKU или описанию..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-initial py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 sm:flex-initial py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="published">Опубликованные</option>
            <option value="hidden">Скрытые</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
          <span>Выбрано товаров: {selectedIds.length}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('publish')}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Опубликовать
            </button>
            <button
              onClick={() => handleBulkAction('unpublish')}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              Скрыть
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              Удалить
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === products.length && products.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(products.map((p) => p.id));
                      else setSelectedIds([]);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="p-4">Товар / Услуга</th>
                <th className="p-4">Артикул</th>
                <th className="p-4">Категория</th>
                <th className="p-4">Цена</th>
                <th className="p-4">Остаток / Формат</th>
                <th className="p-4">Статус</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Загрузка каталога товаров...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Товары не найдены</p>
                    <p className="text-xs text-slate-400 mt-1">Добавьте новый товар или импортируйте таблицу Excel/CSV.</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const cover = p.images?.find((img: any) => img.is_cover)?.image_url || p.images?.[0]?.image_url;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== p.id));
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                            {cover ? (
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                              {p.name}
                            </div>
                            {p.variants?.length > 0 && (
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">
                                {p.variants.length} вар.
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-500 font-mono text-xs">
                        {p.sku || '—'}
                      </td>

                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {p.category_name || 'Без категории'}
                      </td>

                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {p.price} {p.currency}
                        {p.old_price && (
                          <span className="block text-[11px] text-slate-400 line-through">
                            {p.old_price} {p.currency}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {p.item_type === 'service' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                            ⏱ Услуга
                          </span>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              p.stock_quantity > 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {p.stock_quantity > 0 ? `${p.stock_quantity} шт.` : 'Нет на складе'}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            p.is_published
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.is_published ? 'bg-blue-600' : 'bg-slate-400'}`} />
                          {p.is_published ? 'Опубликован' : 'Скрыт'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Редактировать"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(p.id)}
                            title="Дублировать"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Удалить"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Edit / Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Редактирование товара' : 'Создание нового товара'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-6">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Item Type Selector (Товар vs Услуга) */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, item_type: 'product' })}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                formData.item_type === 'product'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📦 Физический товар
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, item_type: 'service' })}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                formData.item_type === 'service'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ⏱ Услуга / Процедура
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {formData.item_type === 'service' ? 'Название услуги / процедуры *' : 'Название товара *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.item_type === 'service' ? 'Например: Чистка лица / Разработка дизайна' : 'Например: Кроссовки Nike Air Max'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Артикул (SKU)
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-10293"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Категория
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Без категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Цена продажи *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Цена товара"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-20 px-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Старая цена (для скидки)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.old_price}
                onChange={(e) => setFormData({ ...formData, old_price: e.target.value })}
                placeholder="Старая цена"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.item_type === 'service' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Длительность процедуры / услуги
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={formData.service_duration_min}
                      onChange={(e) => setFormData({ ...formData, service_duration_min: e.target.value })}
                      placeholder="60"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="flex items-center px-3 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      минут
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Формат оказания
                  </label>
                  <select
                    value={formData.service_format}
                    onChange={(e) => setFormData({ ...formData, service_format: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="in_person">В кабинете / салоне</option>
                    <option value="online">Онлайн / удаленно</option>
                    <option value="at_client">Выезд к клиенту</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Количество на складе
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="Количество на складе"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_published" className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                Опубликовать на витрине магазина
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Описание товара
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание характеристик, преимуществ, материалов..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Images Section with Mobile/PC Upload */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Изображения {formData.item_type === 'service' ? 'услуги / кейса' : 'товара'}
            </h4>
            
            <div className="mb-4">
              <ImageUploader
                label="Загрузить новое фото (с устройства или по ссылке)"
                hint="Автоматически сжимается в WebP (экономит место и трафик)"
                aspectRatio="square"
                value=""
                onChange={(url) => {
                  if (url) {
                    setFormData({
                      ...formData,
                      images: [
                        ...formData.images,
                        { image_url: url, is_cover: formData.images.length === 0 }
                      ]
                    });
                  }
                }}
              />
            </div>

            {formData.images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group shadow-sm">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    {img.is_cover ? (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold">
                        Обложка
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.images.map((im, i) => ({ ...im, is_cover: i === idx }));
                          setFormData({ ...formData, images: updated });
                        }}
                        className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Сделать главной
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Варианты товара (модификации)</h4>
                <p className="text-[11px] text-slate-500">Укажите размер, цвет или модель с индивидуальной ценой и остатком</p>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить вариант</span>
              </button>
            </div>

            {formData.variants.length > 0 && (
              <div className="space-y-3">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  <div className="col-span-6 sm:col-span-5">Вариант *</div>
                  <div className="col-span-3 sm:col-span-3">Цена ({formData.currency})</div>
                  <div className="col-span-3 sm:col-span-3">Остаток на складе</div>
                  <div className="hidden sm:block sm:col-span-1 text-center"></div>
                </div>

                {formData.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="col-span-6 sm:col-span-5">
                      <label className="block sm:hidden text-[10px] text-slate-500 mb-0.5">Вариант</label>
                      <input
                        type="text"
                        value={v.title}
                        onChange={(e) => {
                          const updated = [...formData.variants];
                          updated[idx].title = e.target.value;
                          setFormData({ ...formData, variants: updated });
                        }}
                        placeholder="Например: XL / Черный"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <label className="block sm:hidden text-[10px] text-slate-500 mb-0.5">Цена</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...formData.variants];
                          updated[idx].price = e.target.value;
                          setFormData({ ...formData, variants: updated });
                        }}
                        placeholder="Цена"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <label className="block sm:hidden text-[10px] text-slate-500 mb-0.5">Остаток</label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock_quantity}
                        onChange={(e) => {
                          const updated = [...formData.variants];
                          updated[idx].stock_quantity = e.target.value;
                          setFormData({ ...formData, variants: updated });
                        }}
                        placeholder="Остаток"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== idx) })}
                        title="Удалить вариант"
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 disabled:opacity-50"
            >
              {submitting ? 'Сохранение...' : editingProduct ? 'Сохранить изменения' : 'Создать товар'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
