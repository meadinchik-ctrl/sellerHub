import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatDateRU } from '../utils/formatters';
import {
  Shield,
  Users,
  Store,
  Package,
  Eye,
  Send,
  Lock,
  Unlock,
  Settings,
  Save,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'stores' | 'config'>('stats');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, stRes, cRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminStores(),
        api.getAdminConfig()
      ]);
      setStats(sRes);
      setUsersList(uRes.items || []);
      setStoresList(stRes.items || []);
      setConfig(cRes);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (userId: string) => {
    try {
      const res = await api.toggleAdminUserStatus(userId);
      setMessage(res.message);
      const uRes = await api.getAdminUsers();
      setUsersList(uRes.items || []);
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleChangePlan = async (userId: string, planName: string) => {
    try {
      const res = await api.setAdminUserSubscription(userId, planName);
      setMessage(res.message);
      const uRes = await api.getAdminUsers();
      setUsersList(uRes.items || []);
      setTimeout(() => setMessage(null), 3500);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateAdminConfig(config);
      setMessage(res.message);
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="p-12 text-center text-rose-500 font-bold">
        Доступ разрешен только администраторам платформы.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Панель администратора</h1>
          <p className="text-xs text-slate-500">Управление пользователями, магазинами и глобальной конфигурацией</p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800 text-xs font-semibold w-fit">
        {[
          { id: 'stats', label: 'Статистика' },
          { id: 'users', label: 'Пользователи' },
          { id: 'stores', label: 'Магазины' },
          { id: 'config', label: 'Глобальный config.json' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* STATS TAB */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-400 font-semibold block mb-2">Пользователи</span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total_users}</span>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-400 font-semibold block mb-2">Магазины</span>
              <span className="text-3xl font-extrabold text-blue-600">{stats.total_stores}</span>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-400 font-semibold block mb-2">Товары платформы</span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total_products}</span>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-400 font-semibold block mb-2">Визиты витрин</span>
              <span className="text-3xl font-extrabold text-indigo-600">{stats.total_visits}</span>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-400 font-semibold block mb-2">Лиды (переходы)</span>
              <span className="text-3xl font-extrabold text-emerald-600">{stats.total_contact_clicks}</span>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Пользователь</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Дата регистрации</th>
                  <th className="p-4">Тариф / Подписка</th>
                  <th className="p-4">Роль</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {u.full_name || 'Без имени'}
                    </td>
                    <td className="p-4 text-slate-500">{u.email || 'OAuth'}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">
                      {formatDateRU(u.created_at)}
                    </td>
                    <td className="p-4">
                      <select
                        value={u.plan_name || 'free'}
                        onChange={(e) => handleChangePlan(u.id, e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 uppercase focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="free">FREE</option>
                        <option value="start">START</option>
                        <option value="pro">PRO</option>
                        <option value="business">BUSINESS</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {u.is_admin ? (
                        <span className="font-bold text-purple-600">Администратор</span>
                      ) : (
                        <span>Продавец</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {u.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                            u.is_active
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? 'Заблокировать' : 'Разблокировать'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STORES TAB */}
      {activeTab === 'stores' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Магазин</th>
                  <th className="p-4">Адрес (slug)</th>
                  <th className="p-4">Товаров</th>
                  <th className="p-4">Режим</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4 text-right">Витрина</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {storesList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="p-4 font-mono text-xs text-blue-600">/shop/{s.slug}</td>
                    <td className="p-4 font-bold">{s.total_products}</td>
                    <td className="p-4 text-slate-500">{s.catalog_mode}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {s.is_published ? 'Опубликован' : 'Скрыт'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href={`/shop/${s.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Открыть
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIG TAB (CENTRAL CONFIG.JSON EDITOR) */}
      {activeTab === 'config' && config && (
        <form onSubmit={handleSaveConfig} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Центральная конфигурация (config.json)
            </h3>
            <p className="text-xs text-slate-500">
              Изменение параметров платформы без редактирования исходного кода
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Название платформы
              </label>
              <input
                type="text"
                value={config.platform_name || ''}
                onChange={(e) => setConfig({ ...config, platform_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Название магазина по умолчанию
              </label>
              <input
                type="text"
                value={config.default_store_name || ''}
                onChange={(e) => setConfig({ ...config, default_store_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telegram-бот username
              </label>
              <input
                type="text"
                value={config.telegram_bot?.bot_username || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    telegram_bot: { ...config.telegram_bot, bot_username: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email службы поддержки
              </label>
              <input
                type="email"
                value={config.support?.email || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    support: { ...config.support, email: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ссылка на Telegram поддержки
              </label>
              <input
                type="text"
                value={config.support?.telegram || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    support: { ...config.support, telegram: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={config.maintenance_mode || false}
                onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <label htmlFor="maintenance_mode" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Режим технического обслуживания (Maintenance mode)
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить в config.json</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
