'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useToken } from '@/components/TokenProvider';
import { fetchUser, fetchRepos, fetchEvents, buildComparisonMetrics } from '@/lib/github';
import { ComparisonMetrics } from '@/types/github';
import { SkeletonCard } from '@/components/Skeleton';
import styles from './page.module.css';

export default function ComparePage() {
  const { token, openModal } = useToken();
  const [userAInput, setUserAInput] = useState('torvalds');
  const [userBInput, setUserBInput] = useState('octocat');

  const [metricsA, setMetricsA] = useState<ComparisonMetrics | null>(null);
  const [metricsB, setMetricsB] = useState<ComparisonMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanA = userAInput.trim();
    const cleanB = userBInput.trim();
    if (!cleanA || !cleanB) return;

    setLoading(true);
    setError(null);
    setMetricsA(null);
    setMetricsB(null);

    try {
      const [userA, reposAData, eventsA, userB, reposBData, eventsB] = await Promise.all([
        fetchUser(cleanA, token),
        fetchRepos(cleanA, 1, token),
        fetchEvents(cleanA, token),
        fetchUser(cleanB, token),
        fetchRepos(cleanB, 1, token),
        fetchEvents(cleanB, token),
      ]);

      const aMetrics = buildComparisonMetrics(userA, reposAData.repos, eventsA);
      const bMetrics = buildComparisonMetrics(userB, reposBData.repos, eventsB);

      setMetricsA(aMetrics);
      setMetricsB(bMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching comparison data.');
    } finally {
      setLoading(false);
    }
  };

  const isAWinner = (valA: number, valB: number) => valA > valB;
  const isBWinner = (valA: number, valB: number) => valB > valA;

  return (
    <div className="container">
      <nav className={styles.headerNav}>
        <Link href="/" className={styles.backButton}>
          BACK TO HOME
        </Link>
      </nav>

      <h1 className={styles.title}>DEVELOPER ARENA</h1>

      <div className={styles.formContainer}>
        <form onSubmit={handleCompare} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Challenger 1</label>
            <input
              type="text"
              className="input"
              value={userAInput}
              onChange={(e) => setUserAInput(e.target.value)}
              placeholder="Username A..."
              required
            />
          </div>

          <div className={styles.vs}>VS</div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Challenger 2</label>
            <input
              type="text"
              className="input"
              value={userBInput}
              onChange={(e) => setUserBInput(e.target.value)}
              placeholder="Username B..."
              required
            />
          </div>

          <div className={styles.submitWrapper}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'ANALYZING...' : 'COMPARE METRICS'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <h3>COMPARISON ERROR</h3>
          <p>{error}</p>
          {error.includes('Rate Limit') && (
            <button onClick={openModal} className="btn" style={{ marginTop: '16px' }}>
              Provide PAT Token
            </button>
          )}
        </div>
      )}

      {loading && (
        <div>
          <SkeletonCard />
        </div>
      )}

      {metricsA && metricsB && !loading && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>METRIC</th>
                  <th className={styles.th}>
                    <Link href={`/user/${metricsA.username}`} className={styles.userLink}>
                      @{metricsA.username}
                    </Link>
                  </th>
                  <th className={styles.th}>
                    <Link href={`/user/${metricsB.username}`} className={styles.userLink}>
                      @{metricsB.username}
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Avatar</td>
                  <td className={styles.td}>
                    <img src={metricsA.avatarUrl} alt={metricsA.username} className={styles.avatar} />
                  </td>
                  <td className={styles.td}>
                    <img src={metricsB.avatarUrl} alt={metricsB.username} className={styles.avatar} />
                  </td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Public Repos</td>
                  <td className={`${styles.td} ${isAWinner(metricsA.publicRepos, metricsB.publicRepos) ? styles.winner : ''}`}>
                    {metricsA.publicRepos.toLocaleString()} {isAWinner(metricsA.publicRepos, metricsB.publicRepos) && '[W]'}
                  </td>
                  <td className={`${styles.td} ${isBWinner(metricsA.publicRepos, metricsB.publicRepos) ? styles.winner : ''}`}>
                    {metricsB.publicRepos.toLocaleString()} {isBWinner(metricsA.publicRepos, metricsB.publicRepos) && '[W]'}
                  </td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Followers</td>
                  <td className={`${styles.td} ${isAWinner(metricsA.followers, metricsB.followers) ? styles.winner : ''}`}>
                    {metricsA.followers.toLocaleString()} {isAWinner(metricsA.followers, metricsB.followers) && '[W]'}
                  </td>
                  <td className={`${styles.td} ${isBWinner(metricsA.followers, metricsB.followers) ? styles.winner : ''}`}>
                    {metricsB.followers.toLocaleString()} {isBWinner(metricsA.followers, metricsB.followers) && '[W]'}
                  </td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Following</td>
                  <td className={styles.td}>{metricsA.following.toLocaleString()}</td>
                  <td className={styles.td}>{metricsB.following.toLocaleString()}</td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Total Stars (Top Repos)</td>
                  <td className={`${styles.td} ${isAWinner(metricsA.totalStars, metricsB.totalStars) ? styles.winner : ''}`}>
                    Stars: {metricsA.totalStars.toLocaleString()} {isAWinner(metricsA.totalStars, metricsB.totalStars) && '[W]'}
                  </td>
                  <td className={`${styles.td} ${isBWinner(metricsA.totalStars, metricsB.totalStars) ? styles.winner : ''}`}>
                    Stars: {metricsB.totalStars.toLocaleString()} {isBWinner(metricsA.totalStars, metricsB.totalStars) && '[W]'}
                  </td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Total Forks (Top Repos)</td>
                  <td className={`${styles.td} ${isAWinner(metricsA.totalForks, metricsB.totalForks) ? styles.winner : ''}`}>
                    Forks: {metricsA.totalForks.toLocaleString()} {isAWinner(metricsA.totalForks, metricsB.totalForks) && '[W]'}
                  </td>
                  <td className={`${styles.td} ${isBWinner(metricsA.totalForks, metricsB.totalForks) ? styles.winner : ''}`}>
                    Forks: {metricsB.totalForks.toLocaleString()} {isBWinner(metricsA.totalForks, metricsB.totalForks) && '[W]'}
                  </td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Recent Commits (90d Activity)</td>
                  <td className={`${styles.td} ${isAWinner(metricsA.recentCommits, metricsB.recentCommits) ? styles.winner : ''}`}>
                    {metricsA.recentCommits.toLocaleString()} {isAWinner(metricsA.recentCommits, metricsB.recentCommits) && '[W]'}
                  </td>
                  <td className={`${styles.td} ${isBWinner(metricsA.recentCommits, metricsB.recentCommits) ? styles.winner : ''}`}>
                    {metricsB.recentCommits.toLocaleString()} {isBWinner(metricsA.recentCommits, metricsB.recentCommits) && '[W]'}
                  </td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Top Languages</td>
                  <td className={styles.td}>{metricsA.topLanguages.join(', ')}</td>
                  <td className={styles.td}>{metricsB.topLanguages.join(', ')}</td>
                </tr>

                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.metricLabel}`}>Account Age</td>
                  <td className={styles.td}>{metricsA.accountAge}</td>
                  <td className={styles.td}>{metricsB.accountAge}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            Note: Recent Commit frequency reflects public activity over the last 90 days (up to 300 events) as returned by GitHub&apos;s Events API.
          </p>
        </>
      )}
    </div>
  );
}
