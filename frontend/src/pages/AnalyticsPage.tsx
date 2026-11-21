import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  BarChart3,
  Eye,
  Send,
  TrendingUp,
  Percent,
  Calendar,
  Layers
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { activeStore } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
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
    loadAnalytics();
  }, [activeStore, period]);

  const conversion = data?.store_views > 0
    ? ((data.contact_clicks / data.store_views) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Аналитика и трафик</h1>
          <p className="text-xs text-slate-500">
            Реальные показатели интереса покупателей к вашим товарам
          </p>
        </div>

        {/* Period Selector */}
        <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-sm">
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Визиты витрины</span>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.store_views || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Открытий магазина</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Просмотры товаров</span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.product_views || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Кликов по карточкам</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Лиды (клики к продавцу)</span>
            <Send className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {data?.contact_clicks || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Переходов в Telegram</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold">Конверсия в контакт</span>
            <Percent className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {conversion}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Из визита в обращение</div>
        </div>
      </div>

      {/* Dynamics Chart */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
          График посещаемости и конверсий
        </h3>
        <p className="text-xs text-slate-400 mb-6">Динамика по выбранному периоду</p>

        <div className="h-56 flex items-end gap-2 sm:gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          {data?.views_by_day?.map((day: any, idx: number) => {
            const maxViews = Math.max(...data.views_by_day.map((d: any) => d.views), 10);
            const heightPercent = Math.min(100, Math.max(12, (day.views / maxViews) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none z-20 whitespace-nowrap">
                  {day.date}: {day.views} просм., {day.clicks} кликов
                </div>
                <div className="w-full flex items-end justify-center gap-1 h-44">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[20px] bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all"
                  />
                  {day.clicks > 0 && (
                    <div
                      style={{ height: `${Math.min(100, Math.max(12, (day.clicks / maxViews) * 100))}%` }}
                      className="w-full max-w-[20px] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all"
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
    </div>
  );
};
