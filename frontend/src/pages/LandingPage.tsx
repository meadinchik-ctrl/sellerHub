import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Send,
  Zap,
  ShieldCheck,
  Smartphone,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  Boxes
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [demoTab, setDemoTab] = useState<'apparel' | 'electronics' | 'services'>('apparel');

  const demoProducts = {
    apparel: [
      { name: 'Oversize Худи «Graphite»', price: '4 990 ₽', oldPrice: '6 500 ₽', category: 'Одежда', inStock: true, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=60' },
      { name: 'Карго-брюки с карманами', price: '5 490 ₽', oldPrice: '', category: 'Одежда', inStock: true, image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=60' },
      { name: 'Кроссовки Street Runner', price: '8 900 ₽', oldPrice: '11 200 ₽', category: 'Обувь', inStock: false, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60' },
    ],
    electronics: [
      { name: 'Беспроводные наушники Pro ANC', price: '12 990 ₽', oldPrice: '15 000 ₽', category: 'Аудио', inStock: true, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60' },
      { name: 'Механическая клавиатура RGB', price: '7 490 ₽', oldPrice: '8 990 ₽', category: 'Аксессуары', inStock: true, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60' },
      { name: 'Смарт-часы Titanium Elite', price: '19 900 ₽', oldPrice: '', category: 'Гаджеты', inStock: true, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60' },
    ],
    services: [
      { name: 'Дизайн логотипа и фирстиля', price: '25 000 ₽', oldPrice: '35 000 ₽', category: 'Дизайн', inStock: true, image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop&q=60' },
      { name: 'Аудит рекламных кампаний', price: '15 000 ₽', oldPrice: '', category: 'Маркетинг', inStock: true, image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60' },
      { name: 'Разработка Telegram-бота', price: '40 000 ₽', oldPrice: '50 000 ₽', category: 'IT-услуги', inStock: true, image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60' },
    ]
  };

  const faqs = [
    {
      q: 'Берет ли платформа комиссию с продаж?',
      a: 'Нет! SELLER HUB не берет никаких процентов или комиссий с ваших сделок. Покупатель связывается с вами напрямую в Telegram или по телефону, и вы рассчитываетесь удобным для вас способом.'
    },
    {
      q: 'Как работает импорт из Excel и CSV?',
      a: 'Вы можете загрузить таблицу с любой структурой. Наша система автоматически определит названия колонок (цена, название, артикул, категория, остаток) и позволит проверить предпросмотр перед загрузкой. Повторный импорт обновляет цены и остатки без создания дубликатов.'
    },
    {
      q: 'Нужно ли программировать или настраивать сервер?',
      a: 'Никаких технических навыков не требуется. Регистрация занимает 30 секунд. Вы сразу получаете готовую ссылку на магазин и Telegram-бота.'
    },
    {
      q: 'Можно ли использовать платформу для услуг или цифровых товаров?',
      a: 'Да! Платформа идеально подходит для любых товаров и услуг: одежда, электроника, курсы, аккаунты, фриланс, консультации и опт.'
    },
    {
      q: 'Что умеет Telegram-бот?',
      a: 'Бот позволяет проверять статистику, быстро менять цены товаров, включать или выключать публикацию витрины, а также принимать файл Excel прямо в переписке для мгновенного обновления каталога.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-100 dark:border-slate-800">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-8 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Платформа прямого контакта без посредников и комиссий</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.1]">
              Универсальный каталог товаров и услуг для <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">вашего бизнеса</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Загрузите таблицу Excel или CSV, получите адаптивную витрину и принимайте заказы от покупателей напрямую в Telegram. Никаких удержаний и скрытых условий.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth?tab=register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Создать магазин бесплатно</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold text-base transition-colors"
              >
                Посмотреть демо
              </a>
            </div>

            {/* Trust points */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>0% комиссии с продаж</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Импорт произвольных Excel/CSV</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Управление через Telegram-бот</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Режим витрины и прайс-листа</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DEMO CATALOG */}
        <section id="demo" className="py-20 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold mb-3">
                Интерактивный предпросмотр
              </h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                Так будет выглядеть витрина вашего магазина
              </p>
              <p className="mt-3 text-slate-600 dark:text-slate-400">
                Покупатель выбирает товар и нажимает «Связаться с продавцом» — сразу открывается чат в Telegram с готовым текстом заказа.
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex p-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  onClick={() => setDemoTab('apparel')}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    demoTab === 'apparel'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Одежда и бренд
                </button>
                <button
                  onClick={() => setDemoTab('electronics')}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    demoTab === 'electronics'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Электроника
                </button>
                <button
                  onClick={() => setDemoTab('services')}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    demoTab === 'services'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Услуги и IT
                </button>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {demoProducts[demoTab].map((p, idx) => (
                <div
                  key={idx}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-semibold">
                      {p.category}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                          {p.price}
                        </span>
                        {p.oldPrice && (
                          <span className="text-sm line-through text-slate-400">
                            {p.oldPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href="https://t.me"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>Связаться с продавцом</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* KEY CAPABILITIES */}
        <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold mb-3">
              Почему SELLER HUB
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Всё, что нужно для продаж, без лишней бюрократии
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-6">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Умный импорт таблиц
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Загрузите любую таблицу Excel или CSV. Алгоритм сам определит заголовки, сопоставит поля и обновит существующие товары по SKU без дублей.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mb-6">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Прямой контакт в Telegram
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Клик по кнопке «Связаться» открывает диалог с продавцом с предзаполненным сообщением (название, артикул, выбранный вариант).
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-6">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                2 режима: Витрина и Прайс-лист
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Для розницы — яркие карточки с фото и вариациями. Для опта и сервисов — компактный прайс-лист со мгновенным поиском.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Telegram-бот ассистент
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Проверяйте просмотры, переходы и изменяйте цены на ходу. Отправьте файл Excel прямо боту в чат для мгновенного обновления каталога!
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Встроенная CRM и Аналитика
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Отслеживайте просмотры витрины, популярные позиции и сохраняйте контакты обратившихся клиентов с заметками и тегами.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                100% Мобильная адаптивность
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Каталог и личный кабинет идеально отображаются на любых экранах — от смартфона 360px до широкоформатных мониторов.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 bg-slate-50/50 dark:bg-slate-900/40 border-t border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold mb-3">
                Тарифы
              </h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                Прозрачные условия для любого масштаба
              </p>
              <p className="mt-3 text-slate-600 dark:text-slate-400">
                Начните бесплатно прямо сейчас и расширяйте лимиты по мере роста бизнеса.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Free */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">FREE</h3>
                  <p className="text-xs text-slate-500 mt-1">Для старта и частных продавцов</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">0 ₽</span>
                    <span className="text-slate-500 text-xs ml-1">/ навсегда</span>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> До 30 товаров</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1 магазин</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Базовый импорт</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Telegram-бот</li>
                  </ul>
                </div>
                <Link
                  to="/auth?tab=register"
                  className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Начать бесплатно
                </Link>
              </div>

              {/* Start */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">START</h3>
                  <p className="text-xs text-slate-500 mt-1">Для небольших магазинов</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">490 ₽</span>
                    <span className="text-slate-500 text-xs ml-1">/ мес.</span>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> До 300 товаров</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1 магазин</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Расширенный импорт</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2 сотрудника</li>
                  </ul>
                </div>
                <Link
                  to="/auth?tab=register"
                  className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Выбрать Start
                </Link>
              </div>

              {/* Pro */}
              <div className="relative p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-600 flex flex-col justify-between shadow-xl shadow-blue-500/10">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider">
                  Популярный
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">PRO</h3>
                  <p className="text-xs text-slate-500 mt-1">Для активных интернет-магазинов</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-blue-600">1 190 ₽</span>
                    <span className="text-slate-500 text-xs ml-1">/ мес.</span>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" /> <b>До 3 000 товаров</b></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" /> 3 магазина</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" /> До 10 сотрудников</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" /> Аналитика 90 дней</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" /> Настройка тем и стилей</li>
                  </ul>
                </div>
                <Link
                  to="/auth?tab=register"
                  className="mt-8 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center shadow-md shadow-blue-500/25 transition-all"
                >
                  Выбрать Pro
                </Link>
              </div>

              {/* Business */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">BUSINESS</h3>
                  <p className="text-xs text-slate-500 mt-1">Для крупных каталогов и сетей</p>
                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">2 490 ₽</span>
                    <span className="text-slate-500 text-xs ml-1">/ мес.</span>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <b>До 20 000 товаров</b></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> До 10 магазинов</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> До 50 сотрудников</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Полный доступ к API</li>
                  </ul>
                </div>
                <Link
                  to="/auth?tab=register"
                  className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Выбрать Business
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold mb-3">
              Вопросы и ответы
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Часто задаваемые вопросы
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((f, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-base text-slate-900 dark:text-white"
                >
                  <span>{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 bg-blue-600 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Готовы запустить свой каталог за пару минут?
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-2xl mx-auto">
              Зарегистрируйтесь бесплатно, загрузите первую таблицу и делитесь ссылкой с покупателями.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/auth?tab=register"
                className="px-8 py-4 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-base shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Создать магазин бесплатно
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
