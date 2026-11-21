import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Layers,
  Store,
  Users,
  Check,
  ShieldAlert
} from 'lucide-react';

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        api.getPlans(),
        api.getCurrentSubscription()
      ]);
      setPlans(plansRes || []);
      setSub(subRes || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSelectPlan = async (name: string) => {
    try {
      const res = await api.selectPlan(name);
      setMessage(res.message);
      await loadPlans();
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Тарифные планы</h1>
        <p className="text-xs text-slate-500">
          Управление лимитами товаров, магазинов и доступными возможностями
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Current Subscription & Usage Bars */}
      {sub && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Текущий тариф</span>
              <h2 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 uppercase">
                {sub.plan_name}
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold uppercase">
              {sub.status === 'active' ? 'Активен' : sub.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">Товары</span>
                <span>{sub.current_products_count} из {sub.max_products}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (sub.current_products_count / sub.max_products) * 100)}%` }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">Магазины</span>
                <span>{sub.current_stores_count} из {sub.max_stores}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (sub.current_stores_count / sub.max_stores) * 100)}%` }}
                  className="h-full bg-indigo-600 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">Сотрудники</span>
                <span>{sub.current_employees_count} из {sub.max_employees}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${sub.max_employees > 0 ? Math.min(100, (sub.current_employees_count / sub.max_employees) * 100) : 0}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isCurrent = sub?.plan_name === p.name;
          return (
            <div
              key={p.id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-2 border-blue-600 shadow-xl shadow-blue-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase">
                  {p.name}
                </h3>
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {p.price === 0 ? '0 ₽' : `${p.price * 95} ₽`}
                  </span>
                  <span className="text-slate-400 text-xs ml-1">/ месяц</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>До <b>{p.max_products.toLocaleString()}</b> товаров</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>До <b>{p.max_stores}</b> магазинов</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>До <b>{p.max_employees}</b> сотрудников</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Импорт Excel / CSV</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Telegram-бот</span>
                  </li>
                </ul>
              </div>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs text-center cursor-default"
                >
                  Текущий тариф
                </button>
              ) : user?.is_admin ? (
                <button
                  onClick={() => handleSelectPlan(p.name)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                >
                  Перейти на {p.name.toUpperCase()} (Админ)
                </button>
              ) : (
                <div className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 text-[11px] text-center font-medium border border-slate-200 dark:border-slate-700">
                  Выдается администратором
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
