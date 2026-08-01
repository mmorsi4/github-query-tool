import React from 'react';
import styles from './Skeleton.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.title} />
      <div className={styles.row} />
      <div className={styles.row} />
      <div className={styles.rowShort} />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
