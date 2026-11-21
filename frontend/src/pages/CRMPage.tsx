import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { formatDateRU, formatDateTimeRU } from '../utils/formatters';
import {
  Users,
  Search,
  Tag,
  MessageSquare,
  Phone,
  Mail,
  Send,
  Edit2,
  Trash2,
  Clock,
  Plus
} from 'lucide-react';

export const CRMPage: React.FC = () => {
  const { activeStore } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const res = await api.getCustomers({ query: search });
      setCustomers(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [activeStore, search]);

  const openCustomerDetails = async (c: any) => {
    try {
      const detailed = await api.getCustomer(c.id);
      setSelectedCustomer(detailed);
      setNotes(detailed.notes || '');
      setTags(detailed.tags || []);
      setModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      await api.updateCustomer(selectedCustomer.id, { notes, tags });
      setModalOpen(false);
      loadCustomers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Удалить контакт клиента?')) return;
    try {
      await api.deleteCustomer(id);
      loadCustomers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const addTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    setTags([...tags, newTag.trim()]);
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">База клиентов (CRM)</h1>
          <p className="text-xs text-slate-500">
            Покупатели, перешедшие к вам с витрины ({total} контактов)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, Telegram, телефону или заметкам..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Клиент</th>
                <th className="p-4">Telegram</th>
                <th className="p-4">Контакты</th>
                <th className="p-4">Метки</th>
                <th className="p-4">Обращений</th>
                <th className="p-4">Последняя активность</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Загрузка базы клиентов...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Клиентов пока нет</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Контакты покупателей появляются здесь при клике по кнопке «Связаться с продавцом».
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openCustomerDetails(c)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {c.name || 'Покупатель'}
                    </td>
                    <td className="p-4 text-sky-600 dark:text-sky-400 font-medium">
                      {c.telegram_username ? `@${c.telegram_username}` : '—'}
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {c.phone || c.email || '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.map((t: string) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                      {c.total_inquiries}
                    </td>
                    <td className="p-4 text-slate-400 text-xs font-mono">
                      {formatDateRU(c.updated_at)}
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Клиент: ${selectedCustomer.name || 'Покупатель'}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Contact details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Telegram</span>
                <span className="font-bold text-sky-600 text-sm">
                  {selectedCustomer.telegram_username ? `@${selectedCustomer.telegram_username}` : 'Не указан'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Телефон / Email</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {selectedCustomer.phone || selectedCustomer.email || 'Не указан'}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Метки клиента (сегментация)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold"
                  >
                    <span>{t}</span>
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Добавить метку (VIP, Опт, Ждет ответ...)"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
                >
                  Добавить
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Заметки о клиенте (договоренности, предпочтения)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: Покупает оптом от 10 штук, просил скидку на следующий заказ..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Inquiries History */}
            {selectedCustomer.inquiries?.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                  История обращений через витрину
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCustomer.inquiries.map((inq: any) => (
                    <div key={inq.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                        <span>Канал: {inq.channel}</span>
                        <span>{formatDateTimeRU(inq.created_at)}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200">{inq.message || 'Клик «Связаться с продавцом»'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
