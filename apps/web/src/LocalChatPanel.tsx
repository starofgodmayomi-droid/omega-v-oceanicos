import { useState, type FormEvent } from 'react';
import './LocalChatPanel.css';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type ChatState = { status: 'OBSERVED' | 'UNKNOWN'; response?: string; reason?: string; model?: string };

export function LocalChatPanel() {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<ChatState | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/local`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: value }),
      });
      const payload = await response.json().catch(() => ({}));
      setState(response.ok ? payload : { status: 'UNKNOWN', reason: payload.reason ?? `HTTP ${response.status}` });
    } catch (error) {
      setState({ status: 'UNKNOWN', reason: error instanceof Error ? error.message : 'local chat unavailable' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="local-chat-panel" aria-label="Local Ollama chat">
      <div className="local-chat-heading">
        <div><span className="local-chat-kicker">LOCAL BRAIN · OLLAMA</span><h2>Private local chat</h2></div>
        <span className={`local-chat-status local-chat-status--${state?.status?.toLowerCase() ?? 'unknown'}`}>{state?.status ?? 'UNKNOWN'}</span>
      </div>
      {state?.status === 'OBSERVED' ? <p className="local-chat-response">{state.response}</p> : <p className="local-chat-response local-chat-muted">{state?.reason ?? 'No local Ollama observation yet.'}</p>}
      <form onSubmit={submit} className="local-chat-form">
        <input aria-label="Local prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask the local model…" maxLength={4000} />
        <button type="submit" disabled={loading || !prompt.trim()}>{loading ? '…' : 'Send'}</button>
      </form>
      {state?.model && <small className="local-chat-muted">model {state.model} · response observed locally, not external truth</small>}
    </section>
  );
}
