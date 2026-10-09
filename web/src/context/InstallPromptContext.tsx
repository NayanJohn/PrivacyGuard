import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type LockedFeature = 
  | 'My Applications'
  | 'Permission Dashboard'
  | 'Alerts'
  | 'History'
  | 'Runtime Monitor';

interface InstallPromptContextType {
  isOpen: boolean;
  activeFeature: string | null;
  openInstallModal: (featureName?: string, triggerEl?: HTMLElement | null) => void;
  closeInstallModal: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextType | undefined>(undefined);

export const InstallPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openInstallModal = useCallback((featureName?: string, triggerEl?: HTMLElement | null) => {
    setActiveFeature(featureName || 'Mobile Privacy Tools');
    if (triggerEl) {
      triggerRef.current = triggerEl;
    } else if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
    setIsOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsOpen(false);
    // Return focus to trigger element for accessibility
    setTimeout(() => {
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    }, 50);
  }, []);

  return (
    <InstallPromptContext.Provider
      value={{
        isOpen,
        activeFeature,
        openInstallModal,
        closeInstallModal,
      }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
};

export function useInstallPrompt(): InstallPromptContextType {
  const context = useContext(InstallPromptContext);
  if (!context) {
    throw new Error('useInstallPrompt must be used within an InstallPromptProvider');
  }
  return context;
}
