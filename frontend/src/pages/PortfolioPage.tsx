import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ImageUploader } from '../components/common/ImageUploader';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Edit2
} from 'lucide-react';

export const PortfolioPage: React.FC = () => {
  const { activeStore } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    is_before_after: false,
    before_image_url: '',
    after_image_url: '',
    image_url: '',
    project_url: ''
  });

  const loadItems = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const data = await api.getPortfolioItems();
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [activeStore]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      is_before_after: false,
      before_image_url: '',
      after_image_url: '',
      image_url: '',
      project_url: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      is_before_after: !!item.is_before_after,
      before_image_url: item.before_image_url || '',
      after_image_url: item.after_image_url || '',
      image_url: item.image_url || '',
      project_url: item.project_url || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updatePortfolioItem(editingItem.id, formData);
      } else {
        await api.createPortfolioItem(formData);
      }
      setModalOpen(false);
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        is_before_after: false,
        before_image_url: '',
        after_image_url: '',
        image_url: '',
        project_url: ''
      });
      loadItems();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту работу из портфолио?')) return;
    try {
      await api.deletePortfolioItem(id);
      setItems(items.filter(i => i.id !== id));
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-blue-600" />
            Портфолио, Кейсы и «До / После»
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Демонстрация ваших работ, дизайн-кейсов и результатов процедур для клиентов
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Добавить работу в портфолио
        </button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">В портфолио пока пусто</p>
          <p className="text-xs text-slate-400 mt-1">
            Загрузите примеры ваших работ, дизайн-проекты или фотографии «До / После»
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col group"
            >
              {item.is_before_after ? (
                <div className="grid grid-cols-2 gap-0.5 bg-slate-100 dark:bg-slate-800 relative aspect-video">
                  <div className="relative h-full overflow-hidden">
                    <img src={item.before_image_url} alt="До" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold">
                      ДО
                    </span>
                  </div>
                  <div className="relative h-full overflow-hidden">
                    <img src={item.after_image_url} alt="После" className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold">
                      ПОСЛЕ
                    </span>
                  </div>
                </div>
              ) : (
                <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h3>
                    {item.is_before_after && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold shrink-0">
                        До / После
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  {item.project_url ? (
                    <a
                      href={item.project_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Смотреть проект
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {item.category || 'Кейс'}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Редактировать работу"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingItem ? 'Редактировать работу в портфолио' : 'Добавить работу в портфолио'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Название кейса или процедуры *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Редизайн приложения / Чистка лица"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Toggle Before/After */}
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={formData.is_before_after}
                  onChange={(e) => setFormData({ ...formData, is_before_after: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Это формат «До / После» (для бьюти, косметологов, ретуши)
                </span>
              </label>

              {formData.is_before_after ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <ImageUploader
                      label="Фото «ДО»"
                      aspectRatio="square"
                      value={formData.before_image_url}
                      onChange={(url) => setFormData({ ...formData, before_image_url: url })}
                    />
                  </div>
                  <div className="space-y-1">
                    <ImageUploader
                      label="Фото «ПОСЛЕ»"
                      aspectRatio="square"
                      value={formData.after_image_url}
                      onChange={(url) => setFormData({ ...formData, after_image_url: url })}
                    />
                  </div>
                </div>
              ) : (
                <ImageUploader
                  label="Основное изображение кейса"
                  aspectRatio="video"
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                />
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Описание работы / задачи
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Что было сделано, какие результаты достигнуты..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Категория / Ниша
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Брендинг / Косметология"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ссылка на полный проект
                  </label>
                  <input
                    type="text"
                    value={formData.project_url}
                    onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                    placeholder="https://behance.net/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
