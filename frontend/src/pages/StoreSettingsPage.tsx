import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ImageUploader } from '../components/common/ImageUploader';
import {
  Store as StoreIcon,
  Save,
  Send,
  Phone,
  Mail,
  Palette,
  ExternalLink,
  Sliders,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  AlertTriangle,
  Briefcase,
  Layers,
  Calendar,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export const StoreSettingsPage: React.FC = () => {
  const { activeStore, refreshStores } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCreateMode = searchParams.get('create') === 'true';

  // Danger Zone deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    default_currency: 'USD',
    theme_color: '#3b82f6',
    catalog_mode: 'store',
    business_type: 'retail',
    enabled_features: {
      products: true,
      services: false,
      booking: false,
      portfolio: false,
      briefs: false,
      reviews: false
    },
    contact_telegram: '',
    contact_phone: '',
    contact_whatsapp: '',
    contact_email: '',
    logo_url: '',
    cover_url: '',
    is_published: true
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeStore && !isCreateMode) {
      setFormData({
        name: activeStore.name || '',
        slug: activeStore.slug || '',
        description: activeStore.description || '',
        default_currency: activeStore.default_currency || 'USD',
        theme_color: activeStore.theme_color || '#3b82f6',
        catalog_mode: activeStore.catalog_mode || 'store',
        business_type: activeStore.business_type || 'retail',
        enabled_features: {
          products: true,
          services: false,
          booking: false,
          portfolio: false,
          briefs: false,
          reviews: false,
          ...(activeStore.enabled_features || {})
        },
        contact_telegram: activeStore.contact_telegram || '',
        contact_phone: activeStore.contact_phone || '',
        contact_whatsapp: activeStore.contact_whatsapp || '',
        contact_email: activeStore.contact_email || '',
        logo_url: activeStore.logo_url || '',
        cover_url: activeStore.cover_url || '',
        is_published: activeStore.is_published
      });
    } else if (isCreateMode) {
      setFormData({
        name: '',
        slug: '',
        description: '',
        default_currency: 'USD',
        theme_color: '#3b82f6',
        catalog_mode: 'store',
        business_type: 'retail',
        enabled_features: {
          products: true,
          services: false,
          booking: false,
          portfolio: false,
          briefs: false,
          reviews: false
        },
        contact_telegram: '',
        contact_phone: '',
        contact_whatsapp: '',
        contact_email: '',
        logo_url: '',
        cover_url: '',
        is_published: true
      });
    }
  }, [activeStore, isCreateMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isCreateMode) {
        await api.createStore(formData);
        await refreshStores();
        searchParams.delete('create');
        setSearchParams(searchParams);
        setSuccess('Магазин успешно создан!');
      } else if (activeStore) {
        await api.updateStore(activeStore.id, formData);
        await refreshStores();
        setSuccess('Настройки магазина сохранены!');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения настроек');
    } finally {
      setLoading(false);
    }
  };

  const THEME_PRESETS = [
    { label: 'Синий', color: '#3b82f6' },
    { label: 'Индиго', color: '#6366f1' },
    { label: 'Фиолетовый', color: '#8b5cf6' },
    { label: 'Изумрудный', color: '#10b981' },
    { label: 'Темный', color: '#0f172a' },
    { label: 'Оранжевый', color: '#f97316' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {isCreateMode ? 'Создание нового магазина' : 'Настройки витрины магазина'}
        </h1>
        <p className="text-xs text-slate-500">
          Управление контактами для связи с покупателями, внешним видом и режимом каталога
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Store Info */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Основная информация
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Название магазина *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: BRAND STORE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Адрес витрины (slug)
              </label>
              <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="px-3 py-2.5 bg-slate-50 dark:bg-slate-850 text-slate-400 text-xs border-r border-slate-200 dark:border-slate-700 flex items-center">
                  /shop/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="my-store"
                  className="w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Основная валюта цен
              </label>
              <input
                type="text"
                value={formData.default_currency}
                onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                placeholder="RUB, USD, EUR, UAH..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_published" className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                Витрина открыта и доступна покупателям
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Описание или слоган
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание ассортимента, графика работы и условий доставки"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Business Type & Modular Features */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Направление бизнеса и активные модули
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Включайте только те функции, которые нужны вашей сфере, чтобы не перегружать витрину и панель лишними полями.
            </p>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Быстрый профиль настройки:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'retail',
                  label: '🛍 Магазин товаров',
                  sub: 'Одежда, обувь, розница/опт',
                  features: { products: true, services: false, booking: false, portfolio: false, briefs: false, reviews: false }
                },
                {
                  id: 'services',
                  label: '💆 Бьюти и косметология',
                  sub: 'Процедуры, запись по времени, До/После',
                  features: { products: false, services: true, booking: true, portfolio: true, briefs: false, reviews: true }
                },
                {
                  id: 'design',
                  label: '🎨 Дизайн и фриланс',
                  sub: 'Портфолио, кейсы, брифы, оценка',
                  features: { products: false, services: true, booking: false, portfolio: true, briefs: true, reviews: true }
                },
                {
                  id: 'universal',
                  label: '⚡ Универсальный',
                  sub: 'Товары + услуги + запись вместе',
                  features: { products: true, services: true, booking: true, portfolio: true, briefs: true, reviews: true }
                }
              ].map((preset) => {
                const isActive = formData.business_type === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        business_type: preset.id,
                        enabled_features: { ...preset.features }
                      });
                    }}
                    className={`p-3 text-left rounded-2xl border transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {preset.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Feature Toggles */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Точечное управление модулями:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'products', title: '📦 Модуль товаров и склада', desc: 'Учет остатков, артикулы (SKU), физические товары' },
                { key: 'services', title: '⏱ Модуль услуг и процедур', desc: 'Длительность сеанса, форматы (онлайн/салон/выезд), цены "от..."' },
                { key: 'booking', title: '📅 Онлайн-запись и календарь слотов', desc: 'Клиенты выбирают свободную дату и время прямо в витрине' },
                { key: 'portfolio', title: '🖼 Портфолио и слайдер "До / После"', desc: 'Галерея работ, сравнение До/После и кейсы для дизайнеров/мастеров' },
                { key: 'briefs', title: '📝 Брифы и сбор ТЗ', desc: 'Анкетирование клиентов перед заказом услуги или разработкой' },
                { key: 'reviews', title: '⭐ Отзывы и блок экспертности', desc: 'Дипломы, лицензии и отзывы клиентов с оценками' },
              ].map((feat) => {
                const isEnabled = !!(formData.enabled_features as any)?.[feat.key];
                return (
                  <label
                    key={feat.key}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isEnabled
                        ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          business_type: 'custom',
                          enabled_features: {
                            ...formData.enabled_features,
                            [feat.key]: e.target.checked
                          }
                        });
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {feat.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {feat.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Display Mode & Styling */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Режим отображения и дизайн витрины
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Формат каталога для покупателей
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setFormData({ ...formData, catalog_mode: 'store' })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.catalog_mode === 'store'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  🛍 Витрина интернет-магазина
                </div>
                <p className="text-xs text-slate-500">
                  Красивая сетка карточек с фото, категориями, ценами и кнопкой заказа. Идеально для одежды, гаджетов, подарков.
                </p>
              </div>

              <div
                onClick={() => setFormData({ ...formData, catalog_mode: 'price_list' })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.catalog_mode === 'price_list'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  📄 Компактный прайс-лист
                </div>
                <p className="text-xs text-slate-500">
                  Табличный список с моментальным поиском и быстрым переходом к заказу. Идеально для опта, запчастей, услуг.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Фирменный акцентный цвет витрины
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setFormData({ ...formData, theme_color: p.color })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:scale-105 transition-transform"
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.label}</span>
                </button>
              ))}
              <input
                type="color"
                value={formData.theme_color}
                onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer border-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <ImageUploader
              label="Логотип или аватар бренда"
              hint="Квадратное фото. Сжимается и оптимизируется в WebP."
              aspectRatio="avatar"
              value={formData.logo_url}
              onChange={(url) => setFormData({ ...formData, logo_url: url })}
            />
            <ImageUploader
              label="Фоновая обложка витрины (баннер)"
              hint="Широкоформатное фото в шапке магазина."
              aspectRatio="cover"
              value={formData.cover_url}
              onChange={(url) => setFormData({ ...formData, cover_url: url })}
            />
          </div>
        </div>

        {/* Contacts (Direct buyer contact) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Прямые контакты для покупателей
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              По кнопке «Связаться с продавцом» клиент будет перенаправлен в выбранный канал
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telegram (основной канал связи) *
              </label>
              <div className="relative">
                <Send className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" />
                <input
                  type="text"
                  value={formData.contact_telegram}
                  onChange={(e) => setFormData({ ...formData, contact_telegram: e.target.value })}
                  placeholder="@username или ссылка t.me/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={formData.contact_whatsapp}
                onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                placeholder="+7 (999) 000-00-00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Телефон для звонков
              </label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+7 (999) 000-00-00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="store@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Сохранение...' : isCreateMode ? 'Создать магазин' : 'Сохранить настройки'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {!isCreateMode && activeStore && (
        <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-300">
                Опасная зона (Danger Zone)
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 leading-relaxed">
                Удаление магазина приведет к безвозвратной очистке всех его товаров, категорий, аналитики, истории обращений покупателей и настроек витрины. Данное действие невозможно отменить.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmName('');
                setDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить магазин</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && activeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
              Удалить магазин «{activeStore.name}»?
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Это действие <b>необратимо</b>. Все товары, категории и данные витрины будут навсегда удалены из базы данных.
            </p>

            <div className="mb-6 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Для подтверждения введите точное название магазина: <b className="text-rose-600">{activeStore.name}</b>
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={activeStore.name}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleteConfirmName.trim() !== activeStore.name.trim() || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api.deleteStore(activeStore.id);
                    await refreshStores();
                    setDeleteModalOpen(false);
                    navigate('/dashboard');
                  } catch (err: any) {
                    alert(err.message || 'Ошибка удаления магазина');
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:hover:bg-rose-600"
              >
                {deleting ? 'Удаление...' : 'Да, удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
