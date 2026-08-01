'use client';

import React, { useState } from 'react';
import { GitHubRepo } from '@/types/github';
import { RobotIcon } from './icons/RobotIcon';
import { PencilIcon } from './icons/PencilIcon';
import { RepoChat } from './RepoChat';
import { NotesPanel } from './NotesPanel';
import styles from './RepoCard.module.css';

interface RepoCardProps {
  repo: GitHubRepo;
  ownerLogin?: string;
}

export function RepoCard({ repo, ownerLogin }: RepoCardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const updatedDate = new Date(repo.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const fullRepoName = repo.full_name || (ownerLogin ? `${ownerLogin}/${repo.name}` : repo.name);

  return (
    <div className={styles.card}>
      <div className={styles.actionButtons}>
        <button
          type="button"
          onClick={() => {
            setIsNotesOpen((prev) => !prev);
            if (!isNotesOpen) setIsChatOpen(false);
          }}
          className={`${styles.actionBtn} ${isNotesOpen ? styles.activeBtn : ''}`}
          title="Toggle Repository Notes"
          aria-label="Toggle Repository Notes"
        >
          <PencilIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsChatOpen((prev) => !prev);
            if (!isChatOpen) setIsNotesOpen(false);
          }}
          className={`${styles.actionBtn} ${isChatOpen ? styles.activeBtn : ''}`}
          title="Toggle AI Repo Agent Chat"
          aria-label="Toggle AI Repo Agent Chat"
        >
          <RobotIcon size={18} />
        </button>
      </div>

      <div>
        <div className={styles.header}>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.name}
          >
            {repo.name}
            {repo.fork && <span style={{ fontSize: '13px', fontWeight: 'normal', marginLeft: '8px', color: '#666' }}>(fork)</span>}
          </a>
        </div>
        <p className={styles.description}>
          {repo.description ? repo.description : <span style={{ color: '#888', fontStyle: 'italic' }}>No description provided.</span>}
        </p>
      </div>

      <div className={styles.footer}>
        <div className={styles.stats}>
          {repo.language && (
            <span className={styles.language}>
              <span className={styles.dot} /> {repo.language}
            </span>
          )}
          <span>Stars: {repo.stargazers_count.toLocaleString()}</span>
          <span>Forks: {repo.forks_count.toLocaleString()}</span>
        </div>
        <span className={styles.updated}>Updated {updatedDate}</span>
      </div>

      {isNotesOpen && (
        <NotesPanel
          targetType="repo"
          targetId={fullRepoName}
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
        />
      )}

      {isChatOpen && (
        <RepoChat
          repoFullName={fullRepoName}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
