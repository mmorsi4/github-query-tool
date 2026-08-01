'use client';

import React, { useState, useEffect } from 'react';
import { useToken } from './TokenProvider';
import { GearIcon } from './icons/GearIcon';
import styles from './TokenModal.module.css';

export function TokenModal() {
  const { token, setToken, isModalOpen, closeModal } = useToken();
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    setInputVal(token || '');
  }, [token, isModalOpen]);

  if (!isModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToken(inputVal.trim() ? inputVal.trim() : null);
    closeModal();
  };

  const handleClear = () => {
    setToken(null);
    setInputVal('');
  };

  const isTokenSet = Boolean(token);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>API AUTHENTICATION</h2>
        <p className={styles.description}>
          GitHub allows <strong>60 unauthenticated requests/hour</strong> per IP. Enter a Personal Access Token (PAT) to increase your rate limit to <strong>5,000 requests/hour</strong>.
          <br /><br />
          Tokens are stored locally in your browser&apos;s <code>localStorage</code>.
          <br /><br />
          You can generate a free public read-only token on the{' '}
          <a
            href="https://github.com/settings/tokens/new?description=GitHub%20Profile%20Explorer&scopes="
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            GitHub Developer Settings page
          </a>.
        </p>

        {isTokenSet && (
          <div className={styles.status}>
            [SET] Current Token: {token?.slice(0, 4)}...{token?.slice(-4)}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className={styles.inputWrapper}>
            <input
              type="password"
              placeholder="ghp_xxxx or github_pat_xxxx..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.actions}>
            {isTokenSet && (
              <button
                type="button"
                onClick={handleClear}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Clear Token
              </button>
            )}
            <button
              type="button"
              onClick={closeModal}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Close
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GearButton() {
  const { openModal } = useToken();
  return (
    <div className="settings-bar">
      <button onClick={openModal} className="gear-btn" title="API Authentication Settings" aria-label="Open Authentication Settings">
        <GearIcon size={24} />
      </button>
    </div>
  );
}
