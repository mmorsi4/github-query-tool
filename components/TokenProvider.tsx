'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TokenContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isFirstVisit: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TOKEN_STORAGE_KEY = 'github_pat_token';
export const VISITED_STORAGE_KEY = 'github_explorer_visited';

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const hasVisited = localStorage.getItem(VISITED_STORAGE_KEY);

    if (storedToken) {
      setTokenState(storedToken);
    }

    if (!hasVisited) {
      setIsFirstVisit(true);
      setIsModalOpen(true);
    }
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setTokenState(newToken);
    localStorage.setItem(VISITED_STORAGE_KEY, 'true');
    setIsFirstVisit(false);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    localStorage.setItem(VISITED_STORAGE_KEY, 'true');
    setIsFirstVisit(false);
    setIsModalOpen(false);
  };

  return (
    <TokenContext.Provider value={{ token, setToken, isFirstVisit, isModalOpen, openModal, closeModal }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}
