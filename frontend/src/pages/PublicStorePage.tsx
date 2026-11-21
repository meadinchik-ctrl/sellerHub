import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import {
  Send,
  Phone,
  Mail,
  Search,
  Filter,
  Package,
  Layers,
  Store,
  ExternalLink,
  MessageCircle,
  SlidersHorizontal,
  CheckCircle2,
  X,
  Sparkles,
  ShoppingBag,
  Calendar,
  Clock,
  Check,
  CheckCircle,
  Briefcase,
  ZoomIn
} from 'lucide-react';

export const PublicStorePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active public tab for modular view
  const [activeTab, setActiveTab] = useState<'catalog' | 'portfolio' | 'booking'>('catalog');

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingProduct, setBookingProduct] = useState<any | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_phone: '',
    client_telegram: '',
    booking_date: new Date().toISOString().split('T')[0],
    booking_time: '14:00',
    notes: ''
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Filters & display mode
  const [mode, setMode] = useState<'store' | 'price_list'>('store');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Selected Product for modal
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadStoreData();
  }, [slug]);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const [stRes, catRes] = await Promise.all([
        api.getPublicStore(slug!),
        api.getPublicCategories(slug!)
      ]);
      setStore(stRes);
      setCategories(catRes || []);
      setMode(stRes.catalog_mode || 'store');

      if (stRes.enabled_features?.portfolio) {
        api.getPublicPortfolio(slug!).then(res => setPortfolio(res || [])).catch(() => {});
      }

      // Track store visit event
      api.trackPublicEvent(slug!, {
        event_type: 'store_visit',
        referrer: document.referrer
      }).catch(() => {});

      await loadProducts(stRes.slug);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (storeSlug: string) => {
    try {
      const res = await api.getPublicProducts(storeSlug, {
        query: search,
        category_id: selectedCategory || undefined,
        in_stock_only: inStockOnly,
        page_size: 50
      });
      setProducts(res.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (store) {
      loadProducts(store.slug);
    }
  }, [search, selectedCategory, inStockOnly]);

  const openProductModal = async (productId: string) => {
    try {
      const detail = await api.getPublicProductDetail(store.slug, productId);
      setSelectedProduct(detail);
      setSelectedVariant(detail.variants?.length > 0 ? detail.variants[0] : null);
      setModalOpen(true);

      // Track product view event
      api.trackPublicEvent(store.slug, {
        event_type: 'product_view',
        product_id: productId
      }).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const handleContactSeller = (product?: any, variant?: any) => {
    if (!store) return;
    const item = product || selectedProduct;
    const v = variant || selectedVariant;

    let text = `Здравствуйте! Меня интересует товар из вашего магазина «${store.name}»: ${item ? item.name : 'Ассортимент'}`;
    if (v) {
      text += ` (Вариант: ${v.title}, Цена: ${v.price} ${item.currency})`;
    } else if (item) {
      text += ` (Артикул: ${item.sku || 'б/н'}, Цена: ${item.price} ${item.currency})`;
    }

    // Track contact click in analytics and record CRM lead
    api.trackPublicEvent(store.slug, {
      event_type: 'contact_click',
      product_id: item?.id,
      channel: 'telegram',
      customer_info: {
        message: text
      }
    }).catch(() => {});

    // Open Telegram
    if (store.contact_telegram) {
      const cleanTg = store.contact_telegram.replace('@', '').replace('https://t.me/', '');
      const url = `https://t.me/${cleanTg}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else if (store.contact_whatsapp) {
      const cleanPhone = store.contact_whatsapp.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else if (store.contact_phone) {
      window.location.href = `tel:${store.contact_phone}`;
    }
  };

  if (loading && !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-950">
        <Store className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Магазин не найден</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Возможно, адрес указан неверно или владелец временно скрыл витрину.
        </p>
      </div>
    );
  }

  const brandColor = store.theme_color || '#3b82f6';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Brand Header Banner */}
      <div className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-md border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
                {store.logo_url ? (
                  <img src={store.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div
                    style={{ backgroundColor: brandColor }}
                    className="w-full h-full rounded-xl flex items-center justify-center text-white font-extrabold text-2xl uppercase"
                  >
                    {store.name.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {store.name}
                </h1>
                {store.description && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    {store.description}
                  </p>
                )}
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {store.contact_telegram && (
                <button
                  onClick={() => handleContactSeller()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>Написать в Telegram</span>
                </button>
              )}

              {store.contact_whatsapp && (
                <a
                  href={`https://wa.me/${store.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  WhatsApp
                </a>
              )}

              {store.contact_phone && (
                <a
                  href={`tel:${store.contact_phone}`}
                  className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  title="Позвонить"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Navigation Tabs if store has Portfolio or Booking */}
        {(store.enabled_features?.portfolio || store.enabled_features?.booking) && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{store.enabled_features?.services && !store.enabled_features?.products ? 'Прайс услуг' : 'Каталог'}</span>
            </button>

            {store.enabled_features?.portfolio && (
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'portfolio'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Портфолио и работы ({portfolio.length})</span>
              </button>
            )}

            {store.enabled_features?.booking && (
              <button
                onClick={() => {
                  setBookingProduct(null);
                  setBookingModalOpen(true);
                }}
                className="pb-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 ml-auto"
              >
                <Calendar className="w-4 h-4" />
                <span>Записаться на удобное время</span>
              </button>
            )}
          </div>
        )}

        {/* Portfolio Section Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
                  {item.is_before_after ? (
                    <div className="grid grid-cols-2 gap-0.5 aspect-video bg-slate-100 dark:bg-slate-800 relative">
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
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Sparkles className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.description}</p>
                      )}
                    </div>
                    {item.project_url && (
                      <a
                        href={item.project_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Смотреть весь проект
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls Bar: Search, Category Tabs, Mode Toggle (Only when Catalog tab is active) */}
        {activeTab === 'catalog' && (
        <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или описанию..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
                <button
                  onClick={() => setMode('store')}
                  style={mode === 'store' ? { backgroundColor: brandColor } : {}}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mode === 'store'
                      ? 'text-white shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Витрина
                </button>
                <button
                  onClick={() => setMode('price_list')}
                  style={mode === 'price_list' ? { backgroundColor: brandColor } : {}}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mode === 'price_list'
                      ? 'text-white shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Прайс-лист
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Только в наличии</span>
              </label>
            </div>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('')}
                style={selectedCategory === '' ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === ''
                    ? 'text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Все категории
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  style={selectedCategory === c.id ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {c.name} ({c.product_count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MODE 1: RICH CARDS STORE */}
        {mode === 'store' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Товары не найдены
                </h3>
                <p className="text-xs text-slate-400 mt-1">Попробуйте изменить параметры поиска или фильтры.</p>
              </div>
            ) : (
              products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openProductModal(p.id)}
                  className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {p.cover_image ? (
                      <>
                        <img
                          src={p.cover_image}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomImage(p.cover_image);
                          }}
                          className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          title="Увеличить фото"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package className="w-10 h-10" />
                      </div>
                    )}

                    {p.category_name && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-bold">
                        {p.category_name}
                      </div>
                    )}

                    {p.stock_quantity === 0 && (
                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center text-white text-xs font-bold uppercase">
                        Нет в наличии
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </h3>

                      {p.item_type === 'service' && p.service_duration_min && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-2">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>{p.service_duration_min} минут</span>
                          {p.service_format === 'online' && <span>(Онлайн)</span>}
                        </div>
                      )}

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {p.price_prefix && <span className="text-xs font-normal text-slate-400 mr-1">{p.price_prefix}</span>}
                          {p.price} {p.currency}
                        </span>
                        {p.old_price && (
                          <span className="text-xs line-through text-slate-400">
                            {p.old_price} {p.currency}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {p.item_type === 'service' && store.enabled_features?.booking ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingProduct(p);
                            setBookingModalOpen(true);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Записаться онлайн</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactSeller(p);
                        }}
                        style={{ backgroundColor: brandColor }}
                        className="w-full py-2.5 px-3 rounded-xl hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{p.item_type === 'service' ? 'Написать мастеру' : 'Связаться с продавцом'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MODE 2: COMPACT PRICE LIST */}
        {mode === 'price_list' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Товар</th>
                    <th className="p-4">Артикул</th>
                    <th className="p-4">Категория</th>
                    <th className="p-4">Цена</th>
                    <th className="p-4">Остаток</th>
                    <th className="p-4 text-right">Заказ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => openProductModal(p.id)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{p.category_name || '—'}</td>
                      <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                        {p.price} {p.currency}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.stock_quantity > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                          {p.stock_quantity > 0 ? `${p.stock_quantity} шт.` : 'Под заказ'}
                        </span>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleContactSeller(p)}
                          style={{ backgroundColor: brandColor }}
                          className="px-3.5 py-1.5 rounded-xl hover:opacity-90 text-white font-bold text-xs shadow-sm active:scale-95"
                        >
                          Заказать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={selectedProduct.name}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Gallery */}
            {selectedProduct.images?.length > 0 && (
              <div className="space-y-3">
                {/* Active Main Cover Preview */}
                <div
                  onClick={() => setZoomImage(selectedProduct.images[0].image_url)}
                  className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-zoom-in group shadow-sm border border-slate-200 dark:border-slate-800"
                >
                  <img
                    src={selectedProduct.images[0].image_url}
                    alt=""
                    className="w-full h-full object-contain sm:object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 shadow-lg">
                      <ZoomIn className="w-4 h-4 text-blue-600" />
                      Увеличить фото
                    </span>
                  </div>
                </div>

                {/* Additional thumbnails */}
                {selectedProduct.images.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {selectedProduct.images.map((img: any) => (
                      <div
                        key={img.id}
                        onClick={() => setZoomImage(img.image_url)}
                        className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-zoom-in hover:ring-2 hover:ring-blue-500 transition-all border border-slate-200 dark:border-slate-800"
                      >
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Price and Stock */}
            <div className="flex items-baseline justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {selectedVariant ? selectedVariant.price : selectedProduct.price} {selectedProduct.currency}
                </span>
                {selectedProduct.old_price && !selectedVariant && (
                  <span className="ml-2 text-sm line-through text-slate-400">
                    {selectedProduct.old_price} {selectedProduct.currency}
                  </span>
                )}
              </div>
              <div>
                {selectedVariant ? (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${selectedVariant.stock_quantity > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'}`}>
                    {selectedVariant.stock_quantity > 0 ? `В наличии: ${selectedVariant.stock_quantity} шт.` : 'Нет в наличии'}
                  </span>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${selectedProduct.stock_quantity > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'}`}>
                    {selectedProduct.stock_quantity > 0 ? `В наличии: ${selectedProduct.stock_quantity} шт.` : 'Под заказ'}
                  </span>
                )}
              </div>
            </div>

            {/* Variants Picker */}
            {selectedProduct.variants?.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Выберите вариант:
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.variants.map((v: any) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      style={selectedVariant?.id === v.id ? { backgroundColor: brandColor } : {}}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedVariant?.id === v.id
                          ? 'text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {v.title} ({v.price} {selectedProduct.currency})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedProduct.description && (
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Описание
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedProduct.description}
                </p>
              </div>
            )}

            {/* Custom Attributes */}
            {selectedProduct.attributes?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                  Характеристики
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedProduct.attributes.map((a: any) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[10px]">{a.name}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{a.value_text || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Big Contact Action Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {selectedProduct.item_type === 'service' && store.enabled_features?.booking && (
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setBookingProduct(selectedProduct);
                    setBookingModalOpen(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Записаться на эту процедуру</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleContactSeller(selectedProduct, selectedVariant)}
                style={{ backgroundColor: brandColor }}
                className="w-full py-3.5 rounded-2xl hover:opacity-90 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Send className="w-5 h-5 fill-white" />
                <span>{selectedProduct.item_type === 'service' ? 'Написать мастеру в Telegram' : 'Связаться с продавцом и оформить заказ'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                Откроется чат с продавцом с предзаполненным сообщением
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Online Booking Modal */}
      {bookingModalOpen && (
        <Modal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setBookingSuccess(false);
          }}
          title={bookingSuccess ? 'Успешная запись!' : 'Онлайн-запись'}
          maxWidth="max-w-md"
        >
          {bookingSuccess ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Заявка принята!
              </h3>
              <p className="text-xs text-slate-500">
                Мы свяжемся с вами в ближайшее время для подтверждения записи.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBookingModalOpen(false);
                  setBookingSuccess(false);
                }}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold"
              >
                Отлично
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBookingSubmitting(true);
                try {
                  await api.bookPublicService(store.slug, {
                    ...bookingForm,
                    product_id: bookingProduct?.id || null
                  });
                  setBookingSuccess(true);
                } catch (err: any) {
                  alert(err.message || 'Ошибка записи');
                } finally {
                  setBookingSubmitting(false);
                }
              }}
              className="space-y-3.5"
            >
              {bookingProduct && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Выбранная услуга:</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{bookingProduct.name}</span>
                  </div>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    {bookingProduct.price} {bookingProduct.currency}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ваше имя *
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.client_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, client_name: e.target.value })}
                  placeholder="Анна"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Телефон <span className="text-[10px] text-slate-400 font-normal">(или Telegram)</span>
                  </label>
                  <input
                    type="tel"
                    value={bookingForm.client_phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, client_phone: e.target.value })}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telegram <span className="text-[10px] text-slate-400 font-normal">(или телефон)</span>
                  </label>
                  <input
                    type="text"
                    value={bookingForm.client_telegram}
                    onChange={(e) => setBookingForm({ ...bookingForm, client_telegram: e.target.value })}
                    placeholder="@username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Желаемая дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.booking_date}
                    onChange={(e) => setBookingForm({ ...bookingForm, booking_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Удобное время *
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingForm.booking_time}
                    onChange={(e) => setBookingForm({ ...bookingForm, booking_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Комментарий или пожелания
                </label>
                <textarea
                  rows={2}
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Дополнительные детали"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all"
                >
                  {bookingSubmitting ? 'Отправка...' : 'Записаться'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Lightbox / Zoom Image Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
            title="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImage}
            alt="Увеличенное изображение"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        Каталог работает на платформе <span className="font-bold text-slate-600 dark:text-slate-300">SELLER HUB</span>
      </footer>
    </div>
  );
};
