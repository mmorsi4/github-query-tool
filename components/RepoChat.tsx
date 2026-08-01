'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useToken } from './TokenProvider';
import { RobotIcon } from './icons/RobotIcon';
import styles from './RepoChat.module.css';

interface ToolCallInfo {
  name: string;
  params: Record<string, unknown>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallInfo[];
}

interface RepoChatProps {
  repoFullName: string;
  isOpen: boolean;
  onClose: () => void;
}

function cleanAndExtractTools(msg: { role: string; content: string; toolCalls?: ToolCallInfo[] }): Message {
  let text = msg.content || '';
  const foundTools: ToolCallInfo[] = [...(msg.toolCalls || [])];
  
  const toolRegex = /\[(Tool Executed|Tool Use|Tool Used):\s*([a-zA-Z0-9_-]+)\s*(?:\|?\s*(?:params\s*->|\(params:|\()\s*([^\]]+))?\]/gi;
  let match;
  while ((match = toolRegex.exec(text)) !== null) {
    const toolName = match[2];
    const paramRaw = match[3] ? match[3].replace(/\)$/, '').trim() : '';
    const paramObj: Record<string, unknown> = {};
    if (paramRaw) {
      paramRaw.split(',').forEach((p) => {
        const parts = p.split(/[:=]/);
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
          paramObj[k] = v;
        } else {
          paramObj['arg'] = p.trim();
        }
      });
    }
    if (!foundTools.some((t) => t.name === toolName && JSON.stringify(t.params) === JSON.stringify(paramObj))) {
      foundTools.push({ name: toolName, params: paramObj });
    }
  }
  
  text = text.replace(/\[(Tool Executed|Tool Use|Tool Used):[^\]]+\]/gi, '').trim();
  
  if (!text && foundTools.length > 0) {
    text = "Executed file inspection tool to gather repository information.";
  }
  
  return {
    role: msg.role as 'user' | 'assistant',
    content: text || (msg.role === 'assistant' ? 'No detailed explanation provided by agent.' : ''),
    toolCalls: foundTools.length > 0 ? foundTools : undefined,
  };
}

export function RepoChat({ repoFullName, isOpen, onClose }: RepoChatProps) {
  const { token } = useToken();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const messageBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !repoFullName || typeof window === 'undefined') return;

    setLoadingHistory(true);
    try {
      const saved = window.localStorage.getItem(`convo_${repoFullName}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((m: { role: string; content: string; toolCalls?: ToolCallInfo[] }) =>
            cleanAndExtractTools(m)
          );
          setMessages(cleaned);
          window.localStorage.setItem(`convo_${repoFullName}`, JSON.stringify(cleaned));
        }
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [isOpen, repoFullName]);

  useEffect(() => {
    if (messageBoxRef.current) {
      messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  if (!isOpen || !mounted || typeof window === 'undefined' || !document.body) {
    return null;
  }

  const handleClearChat = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(`convo_${repoFullName}`);
    } catch {
      // Ignore storage errors
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsgText = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsgText }];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      window.localStorage.setItem(`convo_${repoFullName}`, JSON.stringify(newMessages));
    } catch {
      // Fallback if storage fails
    }

    try {
      const res = await fetch('/api/ai/repo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          userMessage: userMsgText,
          conversationHistory: newMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          githubToken: token,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        const errReply = `Error communicating with AI: ${err || res.statusText}`;
        const updated: Message[] = [...newMessages, { role: 'assistant', content: errReply }];
        setMessages(updated);
        try { window.localStorage.setItem(`convo_${repoFullName}`, JSON.stringify(updated)); } catch {}
        return;
      }

      const data = await res.json();
      const cleanReply = (data.reply || 'No reply generated.').trim();
      const toolCalls = Array.isArray(data.toolCalls) ? data.toolCalls : undefined;

      const receivedMessage = cleanAndExtractTools({
        role: 'assistant',
        content: cleanReply,
        toolCalls,
      });

      const updatedWithReply: Message[] = [...newMessages, receivedMessage];
      setMessages(updatedWithReply);

      try {
        window.localStorage.setItem(`convo_${repoFullName}`, JSON.stringify(updatedWithReply));
      } catch {
        // Fallback silently if storage fails
      }
    } catch (error) {
      const errMsg = `Error: ${error instanceof Error ? error.message : 'Unknown network error'}`;
      setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsThinking(false);
    }
  };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <RobotIcon size={24} />
            <span>REPO AI AGENT</span>
            <span className={styles.repoBadge}>{repoFullName}</span>
          </div>
          <div className={styles.headerActions}>
            <button type="button" onClick={handleClearChat} className={styles.clearBtn} title="Clear conversation memory">
              CLEAR CHAT
            </button>
            <button type="button" onClick={onClose} className={styles.closeBtn}>
              CLOSE [X]
            </button>
          </div>
        </div>

        <div className={styles.messageBox} ref={messageBoxRef}>
          {loadingHistory ? (
            <div className={styles.loadingText}>Loading conversation history...</div>
          ) : messages.length === 0 ? (
            <div className={styles.loadingText}>
              Ask any question about this repository! The agent can inspect commits, architecture, and read exact source files.
            </div>
          ) : (
            messages.map((msg, idx) => (
              <React.Fragment key={idx}>
                {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className={styles.toolsContainer}>
                    {msg.toolCalls.map((tc, tIdx) => {
                      const paramText = Object.entries(tc.params || {})
                        .map(([k, v]) => `${k}: "${String(v)}"`)
                        .join(', ');
                      return (
                        <div key={tIdx} className={styles.toolBadge}>
                          <span>[TOOL EXECUTED]: {tc.name}</span>
                          {paramText && <span className={styles.toolParams}>| params -&gt; {paramText}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
                  <div className={styles.roleHeader}>{msg.role === 'user' ? 'YOU:' : 'AGENT:'}</div>
                  <div className={styles.markdownBody}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </React.Fragment>
            ))
          )}
          {isThinking && (
            <div className={styles.loadingBadge}>
              <div className={styles.spinner}></div>
              <span>AGENT IS THINKING AND INSPECTING REPO...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className={styles.inputForm}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about code structure, dependencies, or files..."
            className={styles.input}
            disabled={isThinking}
            aria-label="Repository question input"
          />
          <button type="submit" className={styles.sendBtn} disabled={isThinking || !input.trim()}>
            {isThinking ? 'THINKING...' : 'SEND'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
