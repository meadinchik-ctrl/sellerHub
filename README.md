# SELLER HUB — Универсальная SaaS-платформа для продавцов

SELLER HUB — это коммерческая платформа для управления ассортиментом, каталогами товаров и услуг с прямым выходом на покупателя без посредников и комиссий.

---

## 🌟 Ключевая концепция

- **0% комиссии:** Платформа не является платежным посредником, не удерживает балансы и не взимает процент с продаж.
- **Прямая связь:** Покупатель открывает товар и нажимает «Связаться с продавцом» — сразу открывается диалог в Telegram с предзаполненным сообщением (название товара, артикул, цена, выбранная вариация).
- **Умный импорт:** Загрузка таблиц произвольной структуры в форматах `.xlsx` и `.csv` с автоматическим определением колонок и обновлением существующих товаров по SKU без дублей.
- **2 режима каталога:** Полноценная витрина интернет-магазина (карточки, галерея) и компактный оптовый прайс-лист.
- **Telegram-бот ассистент:** Просмотр статистики, быстрое изменение цен, мгновенный импорт Excel-таблицы прямо из чата Telegram.
- **Встроенная CRM и Аналитика:** Учет просмотров витрины, переходов и автоматическая фиксация лидов покупателей с заметками и тегами.
- **Команда и роли:** Владелец, Администратор, Менеджер, Наблюдатель.
- **Централизованный `config.json`:** Основные безопасные параметры платформы настраиваются и редактируются через админ-панель без правки кода.

---

## 🏗 Архитектура и стек технологий

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), greenlet, aiosqlite / asyncpg, pandas, openpyxl, python-jose, passlib.
- **Telegram Bot:** Python 3.11, aiogram 3.x.
- **Database:** PostgreSQL (production / Docker) или SQLite (локальный запуск без сторонних служб).
- **Контейнеризация:** Docker, Docker Compose, Nginx.

---

## 🚀 Быстрый запуск для локальной разработки

### 1. Предварительные требования
- Python 3.11+
- Node.js 18+

### 2. Клонирование и настройка окружения
Файл `.env` уже создан из `.env.example`. Для работы с локальной БД используется SQLite по умолчанию:
```bash
# Проверка настроек в .env
DATABASE_URL=sqlite+aiosqlite:///./sellerhub.db
SECRET_KEY=sellerhub_dev_secret_jwt_key_998877665544332211
```

### 3. Установка зависимостей Backend
```bash
python -m pip install -r backend/requirements.txt
```

### 4. Запуск Backend API
```bash
uvicorn backend.app.main:app --reload --port 8000
```
Swagger-документация доступна по адресу: [http://localhost:8000/docs](http://localhost:8000/docs)

### 5. Установка зависимостей и запуск Frontend
```bash
cd frontend
npm install
npm run dev
```
Фронтенд будет запущен на [http://localhost:3000](http://localhost:3000).

### 6. Запуск Telegram-бота
Укажите ваш реальный токен бота от `@BotFather` в `.env`:
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_PROXY=socks5://127.0.0.1:10808
```
И запустите бота:
```bash
python -m telegram_bot.main
```
Бот подключается к Telegram через SOCKS5-прокси, указанный в `TELEGRAM_PROXY`. Для локального запуска используется `socks5://127.0.0.1:10808`.

---

## 🐳 Запуск через Docker Compose

Для продакшн-развертывания с PostgreSQL и Redis:
```bash
docker-compose up -d --build
```
В Docker Compose прокси по умолчанию доступен по адресу `socks5://host.docker.internal:10808`. Если прокси настроен иначе, задайте `TELEGRAM_PROXY` в `.env`. Прокси должен принимать подключения с Docker-хоста, а не только с loopback-интерфейса.
Все службы будут запущены автоматически:
- `http://localhost:3000` — Веб-приложение и витрины
- `http://localhost:8000` — Backend API
- `postgres:5432` — База данных PostgreSQL
- `redis:6379` — Сервер очередей Redis
- `telegram_bot` — Фоновый бот

---

## ⚙️ Центральная конфигурация (config.json)

Файл `config.json` содержит основные настройки платформы, которые можно безопасно редактировать из Панели администратора:
```json
{
  "platform_name": "SELLER HUB",
  "platform_description": "Универсальная SaaS-платформа для управления ассортиментом",
  "base_url": "http://localhost:3000",
  "api_url": "http://localhost:8000",
  "default_store_name": "Мой магазин",
  "telegram_bot": {
    "enabled": true,
    "bot_username": "SellerHubBot"
  },
  "google_oauth": {
    "enabled": true,
    "client_id": "google-client-id-placeholder.apps.googleusercontent.com"
  },
  "support": {
    "email": "support@sellerhub.com",
    "telegram": "https://t.me/sellerhub_support"
  },
  "maintenance_mode": false
}
```

---

## 🧪 Автоматическое тестирование

В проекте настроены комплексные асинхронные тесты:
```bash
python -m pytest backend/tests -v
```
Покрыты сценарии:
- Регистрация и авторизация (Email, Telegram Widget, Google OAuth)
- Привязка Telegram-бота по одноразовому токену
- Полный CRUD товаров, вариаций и пользовательских характеристик
- Дублирование товаров и массовые действия
- Импорт произвольных CSV-файлов с автоматическим определением колонок
- Экспорт каталога в форматы CSV и Excel (.xlsx)
- Публичный доступ к витрине и карточкам без авторизации
- Отслеживание аналитики и фиксация лидов в CRM
- Панель администратора и динамическое обновление `config.json`
