import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatDateTimeRU } from '../utils/formatters';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Clock,
  ArrowRight,
  RefreshCw,
  Sliders,
  Sparkles
} from 'lucide-react';

export const ImportExportPage: React.FC = () => {
  const { activeStore } = useAuth();

  // Import flow state: 'idle' | 'analyzing' | 'mapping' | 'importing' | 'completed'
  const [step, setStep] = useState<'idle' | 'analyzing' | 'mapping' | 'importing' | 'completed'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip' | 'duplicate'>('update');
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // History & Export
  const [history, setHistory] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const TARGET_FIELDS = [
    { value: '', label: '— Пропустить колонку —' },
    { value: 'name', label: 'Название товара (обязательно)' },
    { value: 'sku', label: 'Артикул (SKU)' },
    { value: 'price', label: 'Цена продажи' },
    { value: 'old_price', label: 'Старая цена' },
    { value: 'category', label: 'Категория' },
    { value: 'stock_quantity', label: 'Остаток' },
    { value: 'description', label: 'Описание' },
    { value: 'image_url', label: 'Ссылка на изображение' },
  ];

  const loadHistory = async () => {
    if (!activeStore) return;
    try {
      const res = await api.getImportHistory();
      setHistory(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeStore]);

  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setStep('analyzing');

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await api.analyzeImportFile(formData);
      setAnalysis(res);
      // Initialize mappings from suggested
      const initialMap: Record<string, string> = {};
      Object.entries(res.suggested_mappings || {}).forEach(([col, target]) => {
        initialMap[col] = (target as string) || '';
      });
      setColumnMappings(initialMap);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Ошибка анализа файла');
      setStep('idle');
    }
  };

  const handleExecuteImport = async () => {
    // Validate that 'name' is mapped
    const hasName = Object.values(columnMappings).includes('name');
    if (!hasName) {
      setError('Необходимо сопоставить хотя бы одну колонку с полем «Название товара»');
      return;
    }

    setError(null);
    setStep('importing');

    try {
      const job = await api.executeImport({
        file_id: analysis.file_id,
        column_mappings: columnMappings,
        duplicate_strategy: duplicateStrategy,
      });
      setImportResult(job);
      setStep('completed');
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Ошибка при импорте данных');
      setStep('mapping');
    }
  };

  const handleExport = () => {
    if (!activeStore) return;
    const token = localStorage.getItem('sellerhub_token');
    const url = `/api/import-export/export?format=${exportFormat}`;
    // Trigger download with auth token
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Store-Id': activeStore.id
      }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${activeStore.slug}-catalog.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Ошибка при экспорте: ' + err.message));
  };

  const resetImport = () => {
    setStep('idle');
    setFile(null);
    setAnalysis(null);
    setColumnMappings({});
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Импорт и экспорт</h1>
        <p className="text-xs text-slate-500">
          Загружайте любые таблицы Excel/CSV или скачивайте актуальный каталог товаров
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Import Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {step === 'idle' && (
          <div className="text-center max-w-xl mx-auto py-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Загрузите таблицу с товарами
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Поддерживаются файлы <b>.xlsx</b>, <b>.xls</b> и <b>.csv</b> до 25 МБ произвольной структуры.
              Система автоматически распознает колонки и сопоставит их.
            </p>

            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 cursor-pointer transition-all active:scale-95">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Выбрать файл Excel / CSV</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileDrop}
                className="hidden"
              />
            </label>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Анализ структуры таблицы...
            </h3>
            <p className="text-xs text-slate-500 mt-1">Определяем заголовки и вероятные поля</p>
          </div>
        )}

        {step === 'mapping' && analysis && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span>Сопоставление колонок</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Файл: <b>{analysis.filename}</b> ({analysis.total_rows} строк)
                </p>
              </div>

              {/* Duplicate Strategy */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">При совпадении SKU:</span>
                <select
                  value={duplicateStrategy}
                  onChange={(e: any) => setDuplicateStrategy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="update">Обновлять существующие товары</option>
                  <option value="skip">Пропускать дубликаты</option>
                  <option value="duplicate">Создавать новые (копии)</option>
                </select>
              </div>
            </div>

            {/* Mappings Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.columns.map((col: string) => (
                <div
                  key={col}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {col}
                    </span>
                    <span className="text-[10px] text-slate-400">Колонка в файле</span>
                  </div>

                  <select
                    value={columnMappings[col] || ''}
                    onChange={(e) =>
                      setColumnMappings({ ...columnMappings, [col]: e.target.value })
                    }
                    className="w-48 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    {TARGET_FIELDS.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={resetImport}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95"
              >
                <span>Запустить импорт</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Импорт товаров...
            </h3>
            <p className="text-xs text-slate-500 mt-1">Обрабатываем строки, категории и обновляем цены</p>
          </div>
        )}

        {step === 'completed' && importResult && (
          <div className="text-center max-w-lg mx-auto py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
              Импорт успешно завершен!
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Все данные из таблицы синхронизированы с каталогом магазина.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <div className="text-xl font-bold text-emerald-600">
                  {importResult.created_rows}
                </div>
                <div className="text-[11px] text-slate-500">Создано новых</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <div className="text-xl font-bold text-blue-600">
                  {importResult.updated_rows}
                </div>
                <div className="text-[11px] text-slate-500">Обновлено</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <div className="text-xl font-bold text-slate-500">
                  {importResult.skipped_rows}
                </div>
                <div className="text-[11px] text-slate-500">Пропущено</div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={resetImport}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Загрузить другой файл
              </button>
              <a
                href="/dashboard/products"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Посмотреть товары
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Экспорт каталога</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Скачайте полную таблицу со всеми товарами, категориями, ценами, остатками и ссылками на фото.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={exportFormat}
            onChange={(e: any) => setExportFormat(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
          >
            <option value="xlsx">Формат Excel (.xlsx)</option>
            <option value="csv">Формат CSV (.csv)</option>
          </select>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Скачать</span>
          </button>
        </div>
      </div>

      {/* Import History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">История импортов</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 font-bold uppercase tracking-wider">
                <th className="p-4">Дата</th>
                <th className="p-4">Файл</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Всего строк</th>
                <th className="p-4">Создано</th>
                <th className="p-4">Обновлено</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    История импортов пуста.
                  </td>
                </tr>
              ) : (
                history.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 text-slate-500 font-mono">
                      {formatDateTimeRU(job.created_at)}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {job.filename}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {job.status === 'completed' ? 'Успешно' : 'Ошибка'}
                      </span>
                    </td>
                    <td className="p-4 font-bold">{job.total_rows}</td>
                    <td className="p-4 text-emerald-600 font-bold">+{job.created_rows}</td>
                    <td className="p-4 text-blue-600 font-bold">~{job.updated_rows}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
