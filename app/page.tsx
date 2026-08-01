'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';

export default function Home() {
  const router = useRouter();
  const [typedText, setTypedText] = useState('');
  const fullTitle = 'github-query-tool';

  useEffect(() => {
    let currentIdx = 0;
    const timer = setInterval(() => {
      if (currentIdx <= fullTitle.length) {
        setTypedText(fullTitle.slice(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(timer);
      }
    }, 90);

    return () => clearInterval(timer);
  }, []);

  const handleSearch = (username: string) => {
    router.push(`/user/${encodeURIComponent(username)}`);
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '820px', width: '100%' }}>
        <h1 className="hero-title">
          <span>{typedText}</span>
          <span className="blinking-cursor">|</span>
        </h1>
        <p style={{ color: '#444444', fontSize: '18px', fontWeight: 'bold' }}>
          explore repositories, analytics, and compare developers.
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
        <SearchBar
          placeholder="search username (e.g. mmorsi4)..."
          onSubmit={handleSearch}
          maxWidth="680px"
          buttonText="GO"
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/compare" className="btn btn-secondary">
          COMPARE DEVELOPERS
        </Link>
      </div>
    </div>
  );
}
