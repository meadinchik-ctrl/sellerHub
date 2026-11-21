import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Send,
  Check,
  AlertCircle,
  ExternalLink,
  Shield,
  Unlink
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Telegram bot state
  const [tgStatus, setTgStatus] = useState<any>(null);
  const [botDeepLink, setBotDeepLink] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
    }
    loadTgStatus();
  }, [user]);

  const loadTgStatus = async () => {
    try {
      const res = await api.getTelegramConnectionStatus();
      setTgStatus(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await api.updateProfile({ full_name: fullName, avatar_url: avatarUrl });
      await refreshProfile();
      setMessage('Профиль успешно обновлен!');
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      setMessage('Пароль успешно изменен!');
    } catch (err: any) {
      setError(err.message || 'Ошибка изменения пароля');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (provider: string) => {
    if (!window.confirm(`Отвязать способ входа ${provider}?`)) return;
    try {
      await api.unlinkProvider(provider);
      await refreshProfile();
      setMessage(`Способ входа ${provider} отвязан`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateBotLink = async () => {
    try {
      const res = await api.getTelegramBotLinkToken();
      setBotDeepLink(res.deep_link);
      // Attempt window.open; also deepLink is displayed below if popups are blocked
      const win = window.open(res.deep_link, '_blank');
      if (!win) {
        setMessage('Ссылка сгенерирована! Нажмите на неё ниже, чтобы перейти в Telegram.');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка генерации ссылки на Telegram-бота');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await api.getGoogleAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setError('Не удалось запустить подключение Google');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Настройки аккаунта</h1>
        <p className="text-xs text-slate-500">
          Управление профилем, безопасностью и интеграцией с Telegram-ботом
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-600 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Telegram Bot Integration Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 border border-sky-200 dark:border-sky-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2AABEE] text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
              <Send className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Telegram-бот ассистент
              </h3>
              <p className="text-xs text-slate-500">
                {tgStatus?.connected
                  ? `Бот привязан к аккаунту: @${tgStatus.telegram_username || 'пользователь'}`
                  : 'Подключите бота для получения уведомлений, изменения цен и импорта файлов прямо в чате'}
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateBotLink}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs font-bold shadow-md shadow-sky-500/20 active:scale-95 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{tgStatus?.connected ? 'Переподключить бота' : 'Подключить бота'}</span>
          </button>
        </div>

        {botDeepLink && (
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 border border-sky-100 dark:border-sky-800">
            Ссылка для привязки: <a href={botDeepLink} target="_blank" rel="noreferrer" className="text-blue-600 font-mono underline break-all">{botDeepLink}</a>
          </div>
        )}
      </div>

      {/* Linked Providers */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Способы авторизации
        </h3>
        <p className="text-xs text-slate-500">
          Вы можете привязать несколько способов входа в один аккаунт для удобства
        </p>

        <div className="space-y-3">
          {/* Email / Password Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Email и пароль</p>
                <p className="text-[11px] text-slate-500">{user?.email || 'Не привязан'}</p>
              </div>
            </div>
            {user?.linked_providers?.includes('email') && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                Активен
              </span>
            )}
          </div>

          {/* Google Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Google аккаунт</p>
                <p className="text-[11px] text-slate-500">
                  {user?.linked_providers?.includes('google') ? 'Привязан к аккаунту' : 'Не привязан'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.linked_providers?.includes('google') ? (
                <>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                    Подключен
                  </span>
                  {user.linked_providers.length > 1 && (
                    <button
                      onClick={() => handleUnlink('google')}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 ml-2"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Отвязать</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  Подключить Google
                </button>
              )}
            </div>
          </div>

          {/* Telegram Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2AABEE] flex items-center justify-center text-white">
                <Send className="w-4 h-4 fill-white" />
              </div>
              <div>
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Telegram аккаунт</p>
                <p className="text-[11px] text-slate-500">
                  {user?.linked_providers?.includes('telegram') || tgStatus?.connected
                    ? tgStatus?.telegram_username ? `@${tgStatus.telegram_username}` : 'Привязан'
                    : 'Не привязан'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.linked_providers?.includes('telegram') || tgStatus?.connected ? (
                <>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                    Подключен
                  </span>
                  {user?.linked_providers && user.linked_providers.length > 1 && (
                    <button
                      onClick={() => handleUnlink('telegram')}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 ml-2"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Отвязать</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleGenerateBotLink}
                  className="px-3 py-1.5 rounded-lg bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs font-semibold"
                >
                  Подключить Telegram
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Личные данные
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Имя пользователя
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              disabled
              value={user?.email || 'Не привязан'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25"
          >
            Сохранить профиль
          </button>
        </div>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handleChangePassword} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Смена пароля
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Текущий пароль
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Новый пароль (от 6 символов)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs shadow-md"
          >
            Обновить пароль
          </button>
        </div>
      </form>
    </div>
  );
};
