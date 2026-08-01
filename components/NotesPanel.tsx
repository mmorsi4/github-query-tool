'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PencilIcon } from './icons/PencilIcon';
import styles from './NotesPanel.module.css';

interface NoteItem {
  id: string;
  target_type: 'user' | 'repo';
  target_id: string;
  content: string;
  created_at: string;
}

interface NotesPanelProps {
  targetType: 'user' | 'repo';
  targetId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function NotesPanel({ targetType, targetId, isOpen = false, onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newNote, setNewNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 120, y: 120 });
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const storageKey = `notes_${targetType}_${targetId}`;

  useEffect(() => {
    setMounted(true);
    const defaultX = Math.min(window.innerWidth - 400, Math.max(20, 100 + Math.floor(Math.random() * 250)));
    const defaultY = Math.min(window.innerHeight - 500, Math.max(60, 80 + Math.floor(Math.random() * 180)));
    setPos({ x: defaultX, y: defaultY });
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y));
    setPos({ x: newX, y: newY });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isOpen || !targetId || typeof window === 'undefined') return;

    setLoading(true);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setNotes(parsed as NoteItem[]);
        }
      } else {
        setNotes([]);
      }
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, targetId, storageKey]);

  if (!isOpen || !mounted || typeof window === 'undefined' || !document.body) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || saving) return;

    setSaving(true);
    try {
      const created: NoteItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        target_type: targetType,
        target_id: targetId,
        content: newNote.trim(),
        created_at: new Date().toISOString(),
      };

      const updated = [created, ...notes];
      setNotes(updated);
      setNewNote('');
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      alert('Error saving note to local storage.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    try {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      alert('Failed to delete note');
    }
  };

  return createPortal(
    <div
      ref={windowRef}
      className={styles.stickyWindow}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <div className={styles.titleBar} onMouseDown={handleMouseDown}>
        <div className={styles.title} title={`Sticky Note: ${targetId}`}>
          <PencilIcon size={18} />
          <span>{targetId}</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            X
          </button>
        )}
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.notesList}>
          {loading ? (
            <div className={styles.emptyText}>Loading sticky notes...</div>
          ) : notes.length === 0 ? (
            <div className={styles.emptyText}>No notes saved yet. Type below!</div>
          ) : (
            notes.map((note) => {
              const formattedDate = new Date(note.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={note.id} className={styles.noteItem}>
                  <div className={styles.noteText}>{note.content}</div>
                  <div className={styles.noteMeta}>
                    <span className={styles.date}>{formattedDate}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className={styles.deleteBtn}
                      title="Delete Note"
                    >
                      DEL
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleAddNote} className={styles.form}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type sticky note..."
            className={styles.textarea}
            required
            aria-label="Sticky note content input"
          />
          <div className={styles.submitWrapper}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'SAVING...' : 'SAVE NOTE'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
