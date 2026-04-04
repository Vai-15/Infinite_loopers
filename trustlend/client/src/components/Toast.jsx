import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

function ToastItem({ toast, onClose }) {
    const tones = {
        success: "border-emerald-400/40 bg-emerald-500/20 text-emerald-200",
        error: "border-red-400/40 bg-red-500/20 text-red-100",
        pending: "border-yellow-400/40 bg-yellow-500/20 text-yellow-100"
    };

    return (
        <div
            className={`mb-3 min-w-[280px] rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${tones[toast.type]}`}
            role="status"
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{toast.message}</p>
                <button
                    onClick={() => onClose(toast.id)}
                    className="text-xs font-bold uppercase tracking-wide opacity-80"
                >
                    close
                </button>
            </div>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (type, message) => {
            const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            setToasts((prev) => [...prev, { id, type, message }]);
            setTimeout(() => removeToast(id), 5000);
            return id;
        },
        [removeToast]
    );

    const value = useMemo(
        () => ({
            success: (message) => showToast("success", message),
            error: (message) => showToast("error", message),
            pending: (message) => showToast("pending", message)
        }),
        [showToast]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed right-4 top-4 z-[100]">
                <div className="pointer-events-auto">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }

    return context;
}
