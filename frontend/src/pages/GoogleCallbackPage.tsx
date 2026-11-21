import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';

export const GoogleCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Guard flag: prevent double-call when useEffect deps change after first run
  const calledRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests (React StrictMode double-invoke or dep changes)
    if (calledRef.current) return;

    const code = searchParams.get('code');
    const err = searchParams.get('error');

    if (err) {
      calledRef.current = true;
      setError(`Ошибка Google OAuth: ${err}`);
      return;
    }

    if (!code) {
      calledRef.current = true;
      setError('Код авторизации не найден в ответе Google.');
      return;
    }

    calledRef.current = true;

    const exchangeCode = async () => {
      try {
        const res = await api.googleLogin({ code });
        await loginWithTokens(res.access_token, res.user);
        navigate('/dashboard');
      } catch (e: any) {
        setError(e.message || 'Не удалось завершить вход через Google.');
      }
    };

    exchangeCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount — code is read from URL, not from deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 text-center">
        {error ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Ошибка авторизации
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="py-2.5 px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Вернуться ко входу
            </button>
          </div>
        ) : (
          <div>
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Завершаем вход через Google...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Пожалуйста, подождите, идет синхронизация профиля.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
