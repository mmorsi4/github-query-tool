'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToken } from '@/components/TokenProvider';
import { fetchUser, fetchRepos } from '@/lib/github';
import { GitHubUser, GitHubRepo } from '@/types/github';
import { UserCard } from '@/components/UserCard';
import { RepoCard } from '@/components/RepoCard';
import { SkeletonCard, SkeletonGrid } from '@/components/Skeleton';
import { SearchBar } from '@/components/SearchBar';
import { ProfileSummary } from '@/components/ProfileSummary';
import { NotesPanel } from '@/components/NotesPanel';
import styles from './page.module.css';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const username = rawUsername ? decodeURIComponent(rawUsername) : '';
  
  const { token, openModal } = useToken();

  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);

  const [filterQuery, setFilterQuery] = useState<string>('');

  useEffect(() => {
    if (!username) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setPage(1);
    setIsSummaryOpen(false);
    setIsNotesOpen(false);

    Promise.all([
      fetchUser(username, token),
      fetchRepos(username, 1, token)
    ])
      .then(([userData, reposData]) => {
        if (!isMounted) return;
        setUser(userData);
        setRepos(reposData.repos);
        setHasMore(reposData.hasMore);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [username, token]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const moreData = await fetchRepos(username, nextPage, token);
      setRepos((prev) => [...prev, ...moreData.repos]);
      setPage(nextPage);
      setHasMore(moreData.hasMore);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load more repositories.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleQuickSearch = (newUsername: string) => {
    router.push(`/user/${encodeURIComponent(newUsername)}`);
  };

  const filteredRepos = repos.filter((repo) => {
    const q = filterQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(q) ||
      (repo.description && repo.description.toLowerCase().includes(q)) ||
      (repo.language && repo.language.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container">
      <nav className={styles.headerNav}>
        <Link href="/" className={styles.backButton}>
          BACK TO HOME
        </Link>

        <SearchBar
          placeholder="search another user..."
          onSubmit={handleQuickSearch}
          maxWidth="540px"
          buttonText="GO"
        />
      </nav>

      {loading ? (
        <div>
          <SkeletonCard />
          <h2 className={styles.sectionTitle} style={{ marginTop: '40px' }}>REPOSITORIES...</h2>
          <SkeletonGrid count={6} />
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <h2 className={styles.errorTitle}>OOPS! ERROR</h2>
          <p>{error}</p>
          {error.includes('Rate Limit') && (
            <button onClick={openModal} className="btn" style={{ marginTop: '20px' }}>
              Provide PAT Token
            </button>
          )}
        </div>
      ) : user ? (
        <>
          <UserCard
            user={user}
            onRobotClick={() => setIsSummaryOpen((prev) => !prev)}
            onNoteClick={() => setIsNotesOpen((prev) => !prev)}
          />

          <ProfileSummary
            user={user}
            repos={repos}
            isOpen={isSummaryOpen}
            onClose={() => setIsSummaryOpen(false)}
          />

          <NotesPanel
            targetType="user"
            targetId={user.login}
            isOpen={isNotesOpen}
            onClose={() => setIsNotesOpen(false)}
          />

          <div className={styles.sectionTitle}>
            <span>REPOSITORIES ({user.public_repos})</span>
          </div>

          <div className={styles.filterWrapper}>
            <input
              type="text"
              placeholder="Filter by name, description, language..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          {filteredRepos.length === 0 ? (
            <div className={styles.emptyState}>
              {repos.length === 0 ? 'No public repositories found for this user.' : 'No repositories match your filter.'}
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredRepos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} ownerLogin={user.login} />
              ))}
            </div>
          )}

          {hasMore && !filterQuery && (
            <div className={styles.loadMoreWrapper}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn"
                style={{ minWidth: '220px' }}
              >
                {loadingMore ? 'LOADING MORE...' : 'LOAD MORE (30)'}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
