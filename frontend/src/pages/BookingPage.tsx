import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatDateRU, formatTime24 } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Check,
  CalendarCheck,
  ChevronRight,
  Filter
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { activeStore } = useAuth();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [quickViewNearest, setQuickViewNearest] = useState(false);

  // Manual new booking modal
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [newBooking, setNewBooking] = useState({
    product_id: '',
    client_name: '',
    client_phone: '',
    client_telegram: '',
    booking_date: new Date().toISOString().split('T')[0],
    booking_time: '12:00',
    notes: ''
  });

  const loadSlots = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const data = await api.getBookingSlots();
      setSlots(data || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки записей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
    api.getProducts({ page_size: 100 }).then(res => setProducts(res.items || [])).catch(() => {});
  }, [activeStore]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateBookingSlot(id, { status });
      setSlots(slots.map(s => s.id === id ? { ...s, status } : s));
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления');
    }
  };

  const deleteSlot = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;
    try {
      await api.deleteBookingSlot(id);
      setSlots(slots.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBookingSlot(newBooking);
      setModalOpen(false);
      loadSlots();
    } catch (err: any) {
      alert(err.message || 'Ошибка создания записи');
    }
  };

  // Sort upcoming / active slots
  const upcomingSlots = useMemo(() => {
    return [...slots]
      .filter(s => s.status !== 'cancelled' && s.status !== 'completed')
      .sort((a, b) => {
        const dtA = `${a.booking_date}T${a.booking_time || '00:00'}`;
        const dtB = `${b.booking_date}T${b.booking_time || '00:00'}`;
        return dtA.localeCompare(dtB);
      });
  }, [slots]);

  const nearestSlot = upcomingSlots[0] || null;

  const filtered = slots.filter(s => {
    if (quickViewNearest) {
      return s.status !== 'cancelled' && s.status !== 'completed';
    }
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.client_name?.toLowerCase().includes(q) ||
        s.client_phone?.toLowerCase().includes(q) ||
        s.product_name?.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    if (quickViewNearest) {
      const dtA = `${a.booking_date}T${a.booking_time || '00:00'}`;
      const dtB = `${b.booking_date}T${b.booking_time || '00:00'}`;
      return dtA.localeCompare(dtB);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const statusBadge = (st: string) => {
    switch (st) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Подтверждена</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Выполнена</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Отменена</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Ожидает подтверждения</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-blue-600" />
            Записи клиентов и бронирования
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Управление онлайн-записью на процедуры, услуги и консультации
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickViewNearest(!quickViewNearest)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
              quickViewNearest
                ? 'bg-amber-500 text-white shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{quickViewNearest ? 'Показать все заявки' : 'Ближайшие записи'}</span>
            {upcomingSlots.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/30 text-current">
                {upcomingSlots.length}
              </span>
            )}
          </button>
          <button
            onClick={loadSlots}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Добавить запись вручную
          </button>
        </div>
      </div>

      {/* Nearest Booking Highlight Banner */}
      {nearestSlot && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Следующая запись
                </span>
                <span className="font-extrabold text-sm sm:text-base">
                  {formatDateRU(nearestSlot.booking_date)} в {formatTime24(nearestSlot.booking_time)}
                </span>
              </div>
              <div className="text-xs text-blue-100 mt-1 flex flex-wrap items-center gap-3">
                <span>Клиент: <b>{nearestSlot.client_name}</b></span>
                {nearestSlot.product_name && (
                  <span>Услуга: <b>{nearestSlot.product_name}</b></span>
                )}
                {nearestSlot.client_phone && <span>Тел: {nearestSlot.client_phone}</span>}
                {nearestSlot.client_telegram && <span>TG: {nearestSlot.client_telegram}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setQuickViewNearest(true)}
            className="px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-colors shrink-0 self-start sm:self-auto"
          >
            Показать график по порядку
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону или услуге..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Все записи' },
            { id: 'pending', label: 'Ожидают' },
            { id: 'confirmed', label: 'Подтверждены' },
            { id: 'completed', label: 'Выполнены' },
            { id: 'cancelled', label: 'Отменены' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === f.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Записей пока нет</p>
            <p className="text-xs text-slate-400 mt-1">
              Когда клиенты записываются через вашу витрину, они появляются здесь
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(slot => (
              <div key={slot.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {slot.client_name}
                    </span>
                    {statusBadge(slot.status)}
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateRU(slot.booking_date)} в {formatTime24(slot.booking_time)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-4">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Услуга: {slot.product_name || 'Индивидуальная консультация'}
                    </span>
                    <a href={`tel:${slot.client_phone}`} className="hover:underline flex items-center gap-1 text-slate-500">
                      <Phone className="w-3 h-3" />
                      {slot.client_phone}
                    </a>
                    {slot.client_telegram && (
                      <a
                        href={`https://t.me/${slot.client_telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1 text-blue-500"
                      >
                        <Send className="w-3 h-3" />
                        {slot.client_telegram}
                      </a>
                    )}
                  </div>

                  {slot.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      «{slot.notes}»
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {slot.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(slot.id, 'confirmed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Подтвердить
                    </button>
                  )}
                  {slot.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(slot.id, 'completed')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Завершить
                    </button>
                  )}
                  {slot.status !== 'cancelled' && (
                    <button
                      onClick={() => updateStatus(slot.id, 'cancelled')}
                      className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/30"
                      title="Отменить запись"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Новая запись клиента
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Имя клиента *
                </label>
                <input
                  type="text"
                  required
                  value={newBooking.client_name}
                  onChange={(e) => setNewBooking({ ...newBooking, client_name: e.target.value })}
                  placeholder="Анна Смирнова"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Телефон <span className="text-[10px] text-slate-400 font-normal">(или TG)</span>
                  </label>
                  <input
                    type="tel"
                    value={newBooking.client_phone}
                    onChange={(e) => setNewBooking({ ...newBooking, client_phone: e.target.value })}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telegram <span className="text-[10px] text-slate-400 font-normal">(или тел)</span>
                  </label>
                  <input
                    type="text"
                    value={newBooking.client_telegram}
                    onChange={(e) => setNewBooking({ ...newBooking, client_telegram: e.target.value })}
                    placeholder="@username"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Услуга / Процедура
                </label>
                <select
                  value={newBooking.product_id}
                  onChange={(e) => setNewBooking({ ...newBooking, product_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">Без привязки к услуге</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price} {p.currency})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Дата *
                  </label>
                  <input
                    type="date"
                    required
                    value={newBooking.booking_date}
                    onChange={(e) => setNewBooking({ ...newBooking, booking_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Время *
                  </label>
                  <input
                    type="time"
                    required
                    value={newBooking.booking_time}
                    onChange={(e) => setNewBooking({ ...newBooking, booking_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Примечание к записи
                </label>
                <textarea
                  rows={2}
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  placeholder="Особые пожелания или детали"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                />
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
                  Записать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
