import React from 'react';
import { GitHubUser } from '@/types/github';
import { RobotIcon } from './icons/RobotIcon';
import { PencilIcon } from './icons/PencilIcon';
import styles from './UserCard.module.css';

interface UserCardProps {
  user: GitHubUser;
  onRobotClick?: () => void;
  onNoteClick?: () => void;
}

export function UserCard({ user, onRobotClick, onNoteClick }: UserCardProps) {
  const formattedDate = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={styles.card}>
      <div className={styles.actionButtons}>
        {onNoteClick && (
          <button
            onClick={onNoteClick}
            className={styles.actionBtn}
            title="Toggle developer notes sticky window"
            aria-label="Toggle developer notes sticky window"
          >
            <PencilIcon size={20} />
          </button>
        )}
        {onRobotClick && (
          <button
            onClick={onRobotClick}
            className={styles.actionBtn}
            title="Summarize and analyze user with AI"
            aria-label="Summarize and analyze user with AI"
          >
            <RobotIcon size={22} />
          </button>
        )}
      </div>

      <div className={styles.avatarContainer}>
        <img
          src={user.avatar_url}
          alt={`Avatar for ${user.login}`}
          className={styles.avatar}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.name}>{user.name || user.login}</h1>
          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.login}
          >
            @{user.login}
          </a>
        </div>

        {user.bio && <p className={styles.bio}>{user.bio}</p>}

        <div className={styles.meta}>
          {user.location && <span className={styles.metaItem}>Location: {user.location}</span>}
          {user.company && <span className={styles.metaItem}>Company: {user.company}</span>}
          {user.blog && (
            <span className={styles.metaItem}>
              Web:{' '}
              <a
                href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {user.blog}
              </a>
            </span>
          )}
          <span className={styles.metaItem}>Joined {formattedDate}</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{user.public_repos.toLocaleString()}</span>
            <span className={styles.statLabel}>Repositories</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{user.followers.toLocaleString()}</span>
            <span className={styles.statLabel}>Followers</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{user.following.toLocaleString()}</span>
            <span className={styles.statLabel}>Following</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{user.public_gists.toLocaleString()}</span>
            <span className={styles.statLabel}>Gists</span>
          </div>
        </div>
      </div>
    </div>
  );
}
