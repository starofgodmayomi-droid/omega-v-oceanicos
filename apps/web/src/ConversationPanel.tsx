import { useState } from 'react';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export function ConversationPanel() {
  const [draft, setDraft] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string; origin: string }>>([]);
  const [notice, setNotice] = useState('No model provider is assumed. A turn is a record until a server provider replies.');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      let id = conversationId;
      if (!id) {
        const created = await fetch(`${API_BASE_URL}/v1/conversations`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: 'dashboard conversation' }),
        });
        const createdBody = await created.json();
        if (!created.ok) throw new Error(createdBody?.error || `Conversation failed (${created.status})`);
        id = createdBody.conversation.id;
        setConversationId(id);
      }
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || `Message failed (${response.status})`);
      setMessages(body.conversation.messages);
      setDraft('');
      const status = body.completion?.status ?? 'UNKNOWN';
      setNotice(status === 'MODEL_OUTPUT'
        ? 'Model output recorded. It is not verification and it did not execute a command.'
        : status === 'FAILED'
          ? 'The model provider failed. The user turn was kept. Nothing was executed.'
          : 'User turn recorded. Model completion was not executed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="OceanicOS conversation" style={{ marginBottom: '22px', border: '1px solid #3a6d61', borderRadius: '6px', background: '#0c1816', padding: '18px' }}>
      <div style={{ color: '#8ce8c8', fontSize: '13px', fontWeight: 700 }}>OceanicOS conversation</div>
      <p style={{ color: '#87aaa2', fontSize: '11px', lineHeight: 1.5, margin: '4px 0 12px' }}>{notice}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {messages.map((message) => (
          <div key={message.id} style={{ color: message.role === 'user' ? '#efe7d2' : '#b8f5de', fontSize: '12px' }}>
            <strong>{message.role}</strong> · {message.origin} — {message.content}
          </div>
        ))}
      </div>
      <label style={{ display: 'block', color: '#9bc4bb', fontSize: '11px' }}>
        Message
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={2} style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '9px', borderRadius: '4px', border: '1px solid #285048', background: '#071c19', color: '#d9ebe7', fontFamily: 'inherit', fontSize: '12px' }} />
      </label>
      <button onClick={send} disabled={loading || !draft.trim()} style={{ marginTop: '10px', border: '1px solid #8ce8c8', background: '#123a31', color: '#b8f5de', padding: '8px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{loading ? 'RECORDING…' : 'SEND TURN'}</button>
      {error && <div role="alert" style={{ color: '#ffaaa0', fontSize: '11px', marginTop: '10px' }}>{error}</div>}
    </section>
  );
}
