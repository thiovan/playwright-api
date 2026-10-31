import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'primary' | 'warning';
}

interface ToastMethods {
  (message: string, title?: string): void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

interface NotificationContextType {
  toast: ToastMethods;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  // Remove toast by id
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Add toast
  const addToast = useCallback(
    (type: ToastItem['type'], message: string, title?: string, duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, message, title, duration };

      setToasts((prev) => {
        const next = [...prev, newToast];
        if (next.length > 5) return next.slice(next.length - 5);
        return next;
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  // Toast helper object
  const toast: ToastMethods = Object.assign(
    (message: string, title?: string) => addToast('info', message, title),
    {
      success: (message: string, title?: string) => addToast('success', message, title),
      error: (message: string, title?: string) => addToast('error', message, title),
      info: (message: string, title?: string) => addToast('info', message, title),
      warning: (message: string, title?: string) => addToast('warning', message, title),
    }
  );

  // Confirm helper function (returns Promise)
  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const normalizedOptions: ConfirmOptions =
        typeof options === 'string'
          ? {
              message: options,
              title: 'Konfirmasi Tindakan',
              confirmText: 'Lanjutkan',
              cancelText: 'Batal',
              variant: 'primary',
            }
          : {
              title: options.title || 'Konfirmasi Tindakan',
              message: options.message,
              confirmText: options.confirmText || (options.variant === 'destructive' ? 'Hapus' : 'Konfirmasi'),
              cancelText: options.cancelText || 'Batal',
              variant: options.variant || 'primary',
            };

      setConfirmDialog({
        open: true,
        options: normalizedOptions,
        resolve: (val: boolean) => {
          setConfirmDialog(null);
          resolve(val);
        },
      });
    });
  }, []);

  // Handle ESC or Enter key on confirm modal
  useEffect(() => {
    if (!confirmDialog?.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        confirmDialog.resolve(false);
      } else if (e.key === 'Enter') {
        confirmDialog.resolve(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog]);

  return (
    <NotificationContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Container - Bottom Right */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
                isSuccess
                  ? 'bg-card/95 border-emerald-500/40 text-foreground'
                  : isError
                  ? 'bg-card/95 border-rose-500/40 text-foreground'
                  : isWarning
                  ? 'bg-card/95 border-amber-500/40 text-foreground'
                  : 'bg-card/95 border-primary/40 text-foreground'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {isInfo && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-semibold leading-tight mb-0.5 text-foreground">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm Modal */}
      {confirmDialog?.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => confirmDialog.resolve(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  confirmDialog.options.variant === 'destructive'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : confirmDialog.options.variant === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {confirmDialog.options.variant === 'destructive' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  {confirmDialog.options.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => confirmDialog.resolve(false)}
              >
                {confirmDialog.options.cancelText}
              </Button>
              <Button
                type="button"
                size="sm"
                className={`text-xs ${
                  confirmDialog.options.variant === 'destructive'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : confirmDialog.options.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
                onClick={() => confirmDialog.resolve(true)}
              >
                {confirmDialog.options.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useToast must be used within a NotificationProvider');
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useConfirm must be used within a NotificationProvider');
  return ctx.confirm;
}

