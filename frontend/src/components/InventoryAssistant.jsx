import { useEffect, useRef, useState } from 'react';
import { request } from '../services/api.js';

const STARTER_QUESTIONS = [
  '¿Qué materiales debo reponer hoy?',
  '¿Qué órdenes parecen duplicadas?',
  '¿Cuánto stock hay de cemento?',
];

export default function InventoryAssistant() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (open && ready === null) {
      request('/assistant/status')
        .then((result) => setReady(result.configured))
        .catch(() => setReady(false));
    }
  }, [open, ready]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending, open]);

  const send = async (text = draft) => {
    const prompt = text.trim();
    if (!prompt || pending || !ready) return;
    const userMessage = { role: 'user', content: prompt };
    const conversation = [...messages.slice(-10), userMessage];
    setMessages(conversation);
    setDraft('');
    setError('');
    setPending(true);
    try {
      const result = await request('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: conversation }),
      });
      setMessages([...conversation, { role: 'assistant', content: result.reply }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        className="assistant-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de inventario'}
      >
        <span>✦</span>{open ? 'Cerrar asistente' : 'Asistente IA'}
      </button>
      {open && (
        <section className="assistant-panel" aria-label="Asistente de inventario">
          <header className="assistant-header">
            <div className="assistant-avatar">✦</div>
            <div>
              <b>Asistente de inventario</b>
              <small><i className={ready ? 'ready' : ''} />{ready ? 'Conectado a tus datos' : 'Ayuda con inventario y compras'}</small>
            </div>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
          </header>
          <div className="assistant-context">Consulta de solo lectura · No crea ni modifica registros</div>
          <div className="assistant-messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="assistant-welcome">
                <h3>¿Qué necesitas revisar?</h3>
                <p>Puedo consultar tus materiales, niveles de reposición, historial y órdenes sospechosas.</p>
                <div className="assistant-suggestions">
                  {STARTER_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      disabled={!ready || pending}
                      onClick={() => send(question)}
                    >
                      {question}<span>→</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map((message, index) => (
              <div
                key={index}
                className={'assistant-message ' + (message.role === 'user' ? 'user' : 'bot')}
              >
                {message.content}
              </div>
            ))}
            {pending && <div className="assistant-message bot typing">Consultando inventario…</div>}
          </div>
          {!ready && (
            <div className="assistant-setup">
              Configura <code>GEMINI_API_KEY</code> en tu archivo <code>.env</code> y reinicia la API para activar el asistente.
            </div>
          )}
          {error && <div className="assistant-error">{error}</div>}
          <form
            className="assistant-compose"
            onSubmit={(event) => { event.preventDefault(); send(); }}
          >
            <textarea
              value={draft}
              maxLength={1200}
              disabled={!ready || pending}
              placeholder={ready ? 'Pregunta sobre existencias o compras…' : 'Activa la conexión de IA para conversar'}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <button type="submit" disabled={!ready || pending || !draft.trim()} aria-label="Enviar pregunta">↑</button>
          </form>
          <div className="assistant-foot">
            Las preguntas y los datos consultados se envían a Gemini. Verifica las respuestas antes de decidir.
          </div>
        </section>
      )}
    </>
  );
}
