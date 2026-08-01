'use client';

import React, { useState } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
  onSubmit: (username: string) => void;
  maxWidth?: string;
  buttonText?: string;
}

export function SearchBar({
  initialValue = '',
  placeholder = 'Search GitHub username...',
  onSubmit,
  maxWidth = '680px',
  buttonText = 'GO',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className={styles.wrapper} style={{ maxWidth }}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            required
            aria-label="GitHub username search input"
          />
        </div>
        <button type="submit" className="btn btn-go" style={{ flexShrink: 0, minWidth: '100px' }}>
          {buttonText}
        </button>
      </form>
    </div>
  );
}
