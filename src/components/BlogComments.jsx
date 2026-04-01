'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BlogComments({ blogId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, username }
  const [replyText, setReplyText] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setTotal(data.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [blogId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const postComment = async (content, parentId = null) => {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentId }),
      });
      if (res.ok) {
        if (parentId) { setReplyText(''); setReplyTo(null); }
        else setNewComment('');
        fetchComments();
      }
    } catch {}
    setPosting(false);
  };

  return (
    <div className="mt-10" id="comments">
      <h3 className="text-[18px] font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Comments {total > 0 && <span className="text-[14px] font-normal" style={{ color: 'var(--text-faint)' }}>({total})</span>}
      </h3>

      {/* New comment input */}
      {user ? (
        <div className="flex gap-3 mb-8">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-1" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              {(user.display_name || user.username || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 outline-none text-[14px] resize-none transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => postComment(newComment)}
                disabled={!newComment.trim() || posting}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-lg transition-colors disabled:opacity-40"
              >
                {posting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 mb-8 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            <Link href="/sign-in" className="font-medium" style={{ color: 'var(--accent)' }}>Sign in</Link> to join the conversation.
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center py-8 text-[14px]" style={{ color: 'var(--text-faint)' }}>No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-1">
          {comments.map(c => (
            <div key={c.id}>
              {/* Top-level comment */}
              <div className="flex gap-3 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
                <Link href={`/${c.username}`} className="flex-shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {(c.display_name || c.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/${c.username}`} className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.display_name || c.username}</Link>
                    <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-body)' }}>{c.content}</p>
                  {user && (
                    <button
                      onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, username: c.display_name || c.username })}
                      className="text-[12px] font-medium mt-2 transition-colors"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      {replyTo?.id === c.id ? 'Cancel' : `Reply${c.reply_count > 0 ? ` (${c.reply_count})` : ''}`}
                    </button>
                  )}

                  {/* Reply input */}
                  {replyTo?.id === c.id && (
                    <div className="flex gap-2 mt-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={`Reply to ${replyTo.username}...`}
                        rows={2}
                        className="flex-1 rounded-lg px-3 py-2 outline-none text-[13px] resize-none"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        autoFocus
                      />
                      <button
                        onClick={() => postComment(replyText, c.id)}
                        disabled={!replyText.trim() || posting}
                        className="px-3 py-2 text-[12px] font-medium text-white bg-[#9b7bf7] hover:bg-[#8b6ae6] rounded-lg self-end disabled:opacity-40"
                      >
                        Reply
                      </button>
                    </div>
                  )}

                  {/* Replies */}
                  {(c.replies || []).length > 0 && (
                    <div className="mt-3 ml-2 pl-4" style={{ borderLeft: '2px solid var(--border-default)' }}>
                      {c.replies.map(r => (
                        <div key={r.id} className="flex gap-2.5 py-3">
                          <Link href={`/${r.username}`} className="flex-shrink-0">
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                {(r.display_name || r.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Link href={`/${r.username}`} className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.display_name || r.username}</Link>
                              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{timeAgo(r.created_at)}</span>
                            </div>
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-body)' }}>{r.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
