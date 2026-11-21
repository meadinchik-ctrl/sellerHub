import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Package,
  Eye,
  Send,
  FolderTree,
  ExternalLink,
  Plus,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  Share2,
  Check,
  Sparkles
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { activeStore } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const res = await api.getAnalyticsOverview(period);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStore, period]);

  const copyStoreLink = () => {
    if (!activeStore) return;
    const url = `${window.location.origin}/shop/${activeStore.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeStore) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Магазин не выбран</h2>
        <p className="text-slate-500 mt-2">Создайте первый магазин в настройках.</p>
      </div>
    );
  }

  const storeUrl = `${window.location.origin}/shop/${activeStore.slug}`;

  return (
    <div className="space-y-6">
      {/* Top Banner: Store Link & Quick Actions */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Публичная витрина магазина</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{activeStore.name}</h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl truncate">
            {storeUrl}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={copyStoreLink}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold transition-colors active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Скопировано!' : 'Скопировать ссылку'}</span>
          </button>
          <a
            href={`/shop/${activeStore.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <span>Открыть витрину</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Показатели витрины</h2>
          <p className="text-xs text-slate-500">Реальные посещения и клики покупателей</p>
        </div>

        {/* Period Selector */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-xs font-semibold">
          {[
            { id: 'today', label: 'Сегодня' },
            { id: '7d', label: '7 дней' },
            { id: '30d', label: '30 дней' },
            { id: '90d', label: '90 дней' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === item.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Товары в каталоге</span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.total_products || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Активных: <span className="text-emerald-500 font-semibold">{data?.active_products || 0}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Просмотры витрины</span>
            <Eye className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.store_views || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Товаров просмотрено: {data?.product_views || 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Переходы к продавцу</span>
            <Send className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.contact_clicks || 0}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            Прямые обращения
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Категории</span>
            <FolderTree className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.total_categories || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Структурированных разделов
          </div>
        </div>
      </div>

      {/* Dynamics Chart & Popular Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Динамика активности</h3>
              <p className="text-xs text-slate-400">Просмотры каталога по дням</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Просмотры</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Лиды (клики)</span>
              </div>
            </div>
          </div>

          {/* Simple Visual Bar Chart */}
          <div className="h-48 flex items-end gap-2 sm:gap-4 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            {data?.views_by_day?.map((day: any, idx: number) => {
              const maxViews = Math.max(...data.views_by_day.map((d: any) => d.views), 10);
              const heightPercent = Math.min(100, Math.max(12, (day.views / maxViews) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20">
                    {day.date}: {day.views} просм., {day.clicks} кликов
                  </div>
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[18px] bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all"
                    />
                    {day.clicks > 0 && (
                      <div
                        style={{ height: `${Math.min(100, Math.max(10, (day.clicks / maxViews) * 100))}%` }}
                        className="w-full max-w-[18px] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate max-w-[36px]">
                    {day.date.split('-').slice(1).join('.')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Products */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Популярные товары</h3>
            <p className="text-xs text-slate-400 mb-4">Чаще всего открывали покупатели</p>

            <div className="space-y-3">
              {data?.popular_products?.length > 0 ? (
                data.popular_products.map((p: any, idx: number) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.price} {p.currency}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-2">
                      {p.views} просм.
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Пока нет статистики просмотров товаров.
                </div>
              )}
            </div>
          </div>

          <Link
            to="/dashboard/products"
            className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-center hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 transition-colors"
          >
            Все товары магазина
          </Link>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/products?new=true"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center gap-4 group shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              Добавить товар
            </h4>
            <p className="text-xs text-slate-500">Создать позицию с фото и вариантами</p>
          </div>
        </Link>

        <Link
          to="/dashboard/import"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all flex items-center gap-4 group shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              Импорт из Excel
            </h4>
            <p className="text-xs text-slate-500">Загрузить прайс-лист XLSX или CSV</p>
          </div>
        </Link>

        <Link
          to="/dashboard/store"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all flex items-center gap-4 group shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              Настройки витрины
            </h4>
            <p className="text-xs text-slate-500">Логотип, обложка, контакты Telegram</p>
          </div>
        </Link>
      </div>
    </div>
  );
};
