'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { GitHubUser, GitHubRepo } from '@/types/github';
import { RobotIcon } from './icons/RobotIcon';
import styles from './ProfileSummary.module.css';

interface ProfileSummaryProps {
  user: GitHubUser;
  repos: GitHubRepo[];
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSummary({ user, repos, isOpen, onClose }: ProfileSummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      hasStartedRef.current = false;
      return;
    }

    if (hasStartedRef.current || summary.length > 0) {
      return;
    }

    hasStartedRef.current = true;
    setIsThinking(true);
    setSummary('');

    const fetchSummary = async () => {
      try {
        const top20 = repos.slice(0, 20).map((r) => ({
          name: r.name,
          description: r.description,
        }));

        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.login,
            name: user.name,
            bio: user.bio,
            location: user.location,
            created_at: user.created_at,
            repos: top20,
            websiteUrl: user.blog,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          setSummary(`Error generating summary: ${errText || res.statusText}`);
          setIsThinking(false);
          return;
        }

        const rawReply = await res.text();
        const cleanReply = rawReply.trim() || 'No analysis returned.';
        setSummary(cleanReply);
      } catch (err) {
        setSummary(`Error generating summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsThinking(false);
      }
    };

    fetchSummary();
  }, [isOpen, user, repos]);

  if (!isOpen) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.title}>
          <RobotIcon size={28} />
          <span>AI PROFILE ANALYSIS</span>
        </div>
        <button onClick={onClose} className={styles.closeBtn}>
          CLOSE [X]
        </button>
      </div>
      <div className={styles.content}>
        {summary ? (
          <div className={styles.markdownBody}>
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        ) : (
          <span className={styles.loadingText}>analyzing developer repositories and profile data...</span>
        )}
      </div>
    </div>
  );
}
