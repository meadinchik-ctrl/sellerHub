import React from 'react';
import { Store, Send, Mail, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                SELLER <span className="text-blue-600">HUB</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Универсальная SaaS-платформа для управления товарами, витринами и связью с покупателями напрямую. Без посредников и комиссий.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Продукт</h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#features" className="hover:text-blue-600">Витрины и каталоги</a></li>
              <li><a href="#import" className="hover:text-blue-600">Импорт Excel / CSV</a></li>
              <li><a href="#telegram" className="hover:text-blue-600">Telegram-бот помощник</a></li>
              <li><a href="#pricing" className="hover:text-blue-600">Тарифы и возможности</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Для продавцов</h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="/auth" className="hover:text-blue-600">Вход в личный кабинет</a></li>
              <li><a href="/auth?tab=register" className="hover:text-blue-600">Регистрация магазина</a></li>
              <li><a href="#features" className="hover:text-blue-600">Прямые продажи в Telegram</a></li>
              <li><a href="#features" className="hover:text-blue-600">Компактные прайс-листы</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Поддержка</h4>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="https://t.me/sellerhub_support"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-blue-600"
                >
                  <Send className="w-4 h-4 text-sky-500" />
                  <span>Telegram-поддержка</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@sellerhub.com"
                  className="inline-flex items-center gap-2 hover:text-blue-600"
                >
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span>support@sellerhub.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} SELLER HUB. Все права защищены.</p>
          <p className="flex items-center gap-1">
            Платформа для независимых продавцов
          </p>
        </div>
      </div>
    </footer>
  );
};
