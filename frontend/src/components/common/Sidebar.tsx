import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  FileSpreadsheet,
  Store as StoreIcon,
  Users,
  BarChart3,
  UserCheck,
  CreditCard,
  Settings,
  Shield,
  ExternalLink,
  LogOut,
  ChevronDown,
  Plus,
  Menu,
  X,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, stores, activeStore, setActiveStore, logout } = useAuth();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  const isServicesOnly = activeStore?.enabled_features?.services && !activeStore?.enabled_features?.products;
  const isBookingEnabled = activeStore?.enabled_features?.booking;
  const isPortfolioEnabled = activeStore?.enabled_features?.portfolio;

  const navItems = [
    { label: 'Обзор', path: '/dashboard', icon: LayoutDashboard },
    { label: isServicesOnly ? 'Услуги и цены' : 'Товары и услуги', path: '/dashboard/products', icon: Package },
    ...(isBookingEnabled ? [{ label: 'Записи клиентов', path: '/dashboard/booking', icon: Calendar }] : []),
    ...(isPortfolioEnabled ? [{ label: 'Портфолио / Кейсы', path: '/dashboard/portfolio', icon: ImageIcon }] : []),
    { label: 'Категории', path: '/dashboard/categories', icon: FolderTree },
    ...(!isServicesOnly ? [{ label: 'Импорт / Экспорт', path: '/dashboard/import', icon: FileSpreadsheet }] : []),
    { label: 'Настройки магазина', path: '/dashboard/store', icon: StoreIcon },
    { label: 'Клиенты (CRM)', path: '/dashboard/crm', icon: Users },
    { label: 'Аналитика', path: '/dashboard/analytics', icon: BarChart3 },
    { label: 'Сотрудники', path: '/dashboard/team', icon: UserCheck },
    { label: 'Тарифы', path: '/dashboard/plans', icon: CreditCard },
    { label: 'Настройки', path: '/dashboard/settings', icon: Settings },
  ];

  if (user?.is_admin) {
    navItems.push({ label: 'Админ-панель', path: '/dashboard/admin', icon: Shield });
  }

  const renderNavLinks = () => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileDrawerOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-base text-slate-900 dark:text-white truncate max-w-[180px]">
            {activeStore?.name || 'SELLER HUB'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeStore && (
            <Link
              to={`/shop/${activeStore.slug}`}
              target="_blank"
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 min-h-screen">
        {/* Brand & Store Selector */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <StoreIcon className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">SELLER HUB</span>
          </Link>

          {/* Store Switcher */}
          <div className="relative">
            <button
              onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                  {activeStore?.name?.charAt(0) || 'M'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {activeStore?.name || 'Выбрать магазин'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {activeStore?.role === 'owner' ? 'Владелец' : 'Сотрудник'}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {storeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Магазины
                </div>
                {stores.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveStore(s);
                      setStoreDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left ${
                      activeStore?.id === s.id
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to="/dashboard/store?create=true"
                    onClick={() => setStoreDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Создать магазин</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderNavLinks()}
        </div>

        {/* Public Store Quick Link */}
        {activeStore && (
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800">
            <Link
              to={`/shop/${activeStore.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors"
            >
              <span className="truncate">Открыть витрину магазина</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300 shrink-0">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.full_name || 'Продавец'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={logout}
              title="Выйти"
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-72 max-w-[85%] bg-white dark:bg-slate-900 h-full flex flex-col p-4 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-3">
              <span className="font-extrabold text-lg">SELLER HUB</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavLinks()}
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
