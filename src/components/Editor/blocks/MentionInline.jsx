'use client';

import { createReactInlineContentSpec } from '@blocknote/react';
import { useState, useRef } from 'react';

function MentionChip({ username, displayName, avatarUrl }) {
  const [showCard, setShowCard] = useState(false);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  const chipRef = useRef(null);
  const hoverTimer = useRef(null);

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      if (chipRef.current) {
        const rect = chipRef.current.getBoundingClientRect();
        setCardPos({ top: rect.bottom + 6, left: rect.left });
      }
      setShowCard(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    setShowCard(false);
  };

  return (
    <>
      <span
        ref={chipRef}
        className="mention-chip"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="mention-chip-avatar" />
        ) : (
          <span className="mention-chip-initial">
            {(displayName || username || '?')[0].toUpperCase()}
          </span>
        )}
        @{displayName || username}
      </span>

      {showCard && (
        <div
          style={{
            position: 'fixed',
            top: cardPos.top,
            left: cardPos.left,
            zIndex: 9999,
          }}
          className="mention-hover-card"
          onMouseEnter={() => clearTimeout(hoverTimer.current)}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#232d3f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#9ca3af',
              }}>
                {(displayName || username || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{displayName || username}</div>
              <div style={{ fontSize: 11, color: '#8896a8' }}>@{username}</div>
            </div>
          </div>
          <a
            href={`/@${username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', fontSize: 11, color: '#9b7bf7',
              textDecoration: 'none', fontWeight: 500,
            }}
          >
            View profile
          </a>
        </div>
      )}
    </>
  );
}

export const MentionInline = createReactInlineContentSpec(
  {
    type: 'mention',
    propSchema: {
      username: { default: '' },
      displayName: { default: '' },
      avatarUrl: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      const { username, displayName, avatarUrl } = inlineContent.props;
      return <MentionChip username={username} displayName={displayName} avatarUrl={avatarUrl} />;
    },
  }
);
