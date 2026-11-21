import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Store, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, Send, Sparkles, Loader2, ExternalLink } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loginWithTokens, refreshProfile } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telegram bot login modal & polling state
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [tgBotUrl, setTgBotUrl] = useState<string | null>(null);
  const [tgToken, setTgToken] = useState<string | null>(null);
  const [tgWaiting, setTgWaiting] = useState(false);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'register') {
        const res = await api.register({
          email,
          password,
          full_name: fullName.trim() || undefined,
        });
        await loginWithTokens(res.access_token, res.user);
      } else {
        const res = await api.login({
          email,
          password,
        });
        await loginWithTokens(res.access_token, res.user);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации. Проверьте введенные данные.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const res = await api.getGoogleAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      // Fallback to direct development flow if Google client id is unconfigured
      try {
        const devRes = await api.googleLogin({
          email: email || 'seller@example.com',
          name: fullName || 'Google Seller',
        });
        await loginWithTokens(devRes.access_token, devRes.user);
        navigate('/dashboard');
      } catch (e: any) {
        setError(e.message || 'Ошибка подключения Google');
      }
    }
  };

  const startTelegramBotAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestTelegramAuth();
      setTgBotUrl(res.bot_url);
      setTgToken(res.token);
      setTgModalOpen(true);
      setTgWaiting(true);

      // Start polling status every 2 seconds
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const check = await api.checkTelegramAuth(res.token);
          if (check.confirmed && check.access_token) {
            clearInterval(pollTimerRef.current);
            setTgWaiting(false);
            setTgModalOpen(false);
            await loginWithTokens(check.access_token, check.user);
            navigate('/dashboard');
          }
        } catch (e) {
          // ignore transient polling errors
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Не удалось запустить авторизацию через Telegram-бота');
    } finally {
      setLoading(false);
    }
  };

  const closeTelegramModal = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setTgModalOpen(false);
    setTgWaiting(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Store className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
            SELLER <span className="text-blue-600">HUB</span>
          </span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {tab === 'login' ? 'Вход в личный кабинет' : 'Регистрация продавца'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {tab === 'login'
            ? 'Управляйте товарами, витринами и обращениями покупателей'
            : 'Создайте магазин и получите готовую ссылку за 1 минуту'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800">
          {/* Tab buttons */}
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                tab === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                tab === 'register'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Регистрация
            </button>
          </div>

          {/* Social OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Продолжить с Google</span>
            </button>

            <button
              type="button"
              onClick={startTelegramBotAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4 fill-white" />
              <span>Войти через Telegram</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">
                или по email
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ваше имя или название магазина
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Например: Иван или Brand Store"
                    className="block w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Электронная почта
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="block w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Выполняется...</span>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт бесплатно'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Telegram Bot Auth Modal */}
      {tgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#2AABEE]/10 text-[#2AABEE] flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 fill-[#2AABEE]" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Вход через Telegram-бота
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Откройте официального бота Seller Hub и нажмите кнопку <b>«Подтвердить вход»</b>:
            </p>

            {tgBotUrl && (
              <a
                href={tgBotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-sm shadow-md transition-all mb-4"
              >
                <span>Перейти в Telegram</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
              <Loader2 className="w-4 h-4 animate-spin text-[#2AABEE]" />
              <span>Ожидаем подтверждения в боте...</span>
            </div>

            <button
              type="button"
              onClick={closeTelegramModal}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
