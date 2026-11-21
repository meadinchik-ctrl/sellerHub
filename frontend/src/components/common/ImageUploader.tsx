import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  aspectRatio?: 'square' | 'video' | 'cover' | 'avatar';
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label,
  hint,
  aspectRatio = 'square',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingsInfo, setSavingsInfo] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSavingsInfo(null);
    setUploading(true);

    try {
      const res = await api.uploadImage(file);
      onChange(res.url);
      if (res.compression_ratio && res.compression_ratio > 0) {
        setSavingsInfo(`Сжато на ${res.compression_ratio}% (WebP)`);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const aspectClasses = {
    square: 'aspect-square max-h-48',
    avatar: 'w-24 h-24 rounded-full',
    cover: 'aspect-[3/1] w-full min-h-[140px]',
    video: 'aspect-video w-full',
  }[aspectRatio];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/bmp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {value ? (
          <div className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 group bg-slate-100 dark:bg-slate-800 ${aspectClasses}`}>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/90 text-slate-900 hover:bg-white shadow"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setSavingsInfo(null);
                }}
                className="p-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 shadow"
                title="Удалить"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl transition-all p-4 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:text-blue-600 cursor-pointer ${
              aspectRatio === 'avatar' ? 'w-24 h-24 rounded-full' : 'w-full sm:w-auto sm:min-w-[200px] py-6'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-1" />
                <span className="text-xs font-medium">Сжимаем фото...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 mb-1 text-slate-400 group-hover:text-blue-500" />
                <span className="text-xs font-medium">Загрузить с устройства</span>
                <span className="text-[10px] text-slate-400 mt-0.5">ПК или телефон (WebP)</span>
              </>
            )}
          </button>
        )}

        <div className="flex-1 w-full space-y-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {value ? 'Выбрать другой файл' : 'Загрузить файл'}
            </button>

            {value && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Загружено
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Или вставьте прямую ссылку (https://...)"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {savingsInfo && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ⚡ {savingsInfo}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          {hint && !error && !savingsInfo && (
            <p className="text-[11px] text-slate-400">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
};
