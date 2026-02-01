'use client';

import { forwardRef } from 'react';

export interface NoteCardData {
  title: string;
  points: string[];
  author?: string;
  date?: string;
}

interface NoteCardTemplateProps {
  data: NoteCardData;
  theme?: 'light' | 'dark';
}

export const NoteCardTemplate = forwardRef<HTMLDivElement, NoteCardTemplateProps>(
  function NoteCardTemplate({ data, theme = 'light' }, ref) {
    const { title, points, author, date } = data;

    const isDark = theme === 'dark';

    return (
      <div
        ref={ref}
        style={{
          width: '400px',
          padding: '16px',
          background: isDark ? '#1a1a1a' : '#f4f1ea',
          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
          position: 'relative',
        }}
      >
        {/* Paper texture overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        />

        {/* Inner card */}
        <div
          style={{
            background: isDark ? '#252525' : '#fffef9',
            border: `2px solid ${isDark ? '#3a3a3a' : '#d4cfc4'}`,
            padding: '32px',
            position: 'relative',
            boxShadow: `4px 4px 0 ${isDark ? '#0a0a0a' : '#d4cfc4'}`,
          }}
        >
          {/* Title */}
          <h2
            style={{
              fontFamily: "'Special Elite', 'IBM Plex Mono', monospace",
              fontSize: '1.4rem',
              color: isDark ? '#e8e4db' : '#2a2a2a',
              marginBottom: '24px',
              paddingBottom: '12px',
              borderBottom: `1px dashed ${isDark ? '#3a3a3a' : '#d4cfc4'}`,
            }}
          >
            {title}
            <span
              style={{
                animation: 'blink 1s step-end infinite',
              }}
            >
              _
            </span>
          </h2>

          {/* Points */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              marginBottom: '28px',
            }}
          >
            {points.map((point, index) => (
              <li
                key={index}
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 2,
                  color: isDark ? '#ccc' : '#3a3a3a',
                  paddingLeft: '20px',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: isDark ? '#c4a77d' : '#8b7355',
                  }}
                >
                  &gt;
                </span>
                {point}
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: `1px solid ${isDark ? '#3a3a3a' : '#e8e4db'}`,
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: '#999',
                letterSpacing: '0.05em',
              }}
            >
              {author || '@voice-builder'}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                color: '#bbb',
              }}
            >
              {date || new Date().toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>

        {/* CSS for blink animation - will be included via style tag */}
        <style>
          {`
            @keyframes blink {
              50% { opacity: 0; }
            }
          `}
        </style>
      </div>
    );
  }
);
