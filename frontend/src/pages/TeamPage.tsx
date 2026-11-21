import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import {
  UserCheck,
  Plus,
  Mail,
  Shield,
  Trash2,
  AlertCircle,
  Crown
} from 'lucide-react';

export const TeamPage: React.FC = () => {
  const { activeStore } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTeam = async () => {
    if (!activeStore) return;
    setLoading(true);
    try {
      const res = await api.getTeamMembers();
      setMembers(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [activeStore]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.inviteTeamMember({ email, role });
      setModalOpen(false);
      setEmail('');
      loadTeam();
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки приглашения');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Удалить этого сотрудника из магазина?')) return;
    try {
      await api.removeTeamMember(id);
      loadTeam();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.updateTeamRole(id, newRole);
      loadTeam();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Сотрудники и роли</h1>
          <p className="text-xs text-slate-500">
            Управление доступом менеджеров и администраторов к магазину
          </p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setError(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Пригласить сотрудника</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Сотрудник</th>
                <th className="p-4">Email</th>
                <th className="p-4">Роль</th>
                <th className="p-4">Статус</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Загрузка команды...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    В команде пока нет приглашенных сотрудников.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {m.role === 'owner' && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                      <span>{m.full_name || 'Приглашенный'}</span>
                    </td>
                    <td className="p-4 text-slate-500">{m.email}</td>
                    <td className="p-4">
                      {m.role === 'owner' ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400">Владелец</span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                        >
                          <option value="admin">Администратор</option>
                          <option value="manager">Менеджер</option>
                          <option value="viewer">Наблюдатель</option>
                        </select>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {m.status === 'active' ? 'Активен' : 'Ожидает'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemove(m.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Пригласить сотрудника в магазин"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email сотрудника *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Роль в магазине
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="admin">Администратор (полный доступ к товарам, заказам и настройкам)</option>
              <option value="manager">Менеджер (добавление, редактирование товаров и клиентов)</option>
              <option value="viewer">Наблюдатель (только просмотр каталога и статистики)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-xs font-semibold"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
            >
              {submitting ? 'Отправка...' : 'Отправить приглашение'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
