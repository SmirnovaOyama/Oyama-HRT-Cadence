import { createContext, useContext } from 'react';

export type DialogType = 'alert' | 'confirm';

interface DialogContextType {
    showDialog: (type: DialogType, message: string, onConfirm?: () => void) => void;
}

// Keep the context and hook independent of UI modules: refreshing a child page
// must not give the provider a new context while existing consumers keep the old one.
export const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be used within DialogProvider');
    return ctx;
};
