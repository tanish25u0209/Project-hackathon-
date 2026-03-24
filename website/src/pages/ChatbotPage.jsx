import './PageShared.css'
import './ChatbotPage.css'

export default function ChatbotPage() {
  const chatbotUrl = import.meta.env.VITE_CHATBOT_URL || 'http://localhost:8081'
  return (
    <div className="chatbot-page">
      <div className="chatbot-header animate-fadeUp">
        <div>
          <h1 className="page-title">⚡ PROMPTFORGE Chat</h1>
          <p className="page-subtitle">
            The original PROMPTFORGE chatbot interface — multi-model interactive chat
          </p>
        </div>
        <a
          href={chatbotUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn--ghost btn--sm"
        >
          ↗ Open in full window
        </a>
      </div>

      <div className="chatbot-frame-wrap animate-fadeUp" style={{ animationDelay: '0.1s' }}>
        <iframe
          id="chatbot-iframe"
          src={chatbotUrl}
          title="PROMPTFORGE Chatbot"
          className="chatbot-frame"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <div className="chatbot-notice animate-fadeUp" style={{ animationDelay: '0.2s' }}>
        <span>ℹ</span>
        <span>
          The chatbot service: <strong className="mono">{chatbotUrl}</strong>
        </span>
      </div>
    </div>
  )
}
