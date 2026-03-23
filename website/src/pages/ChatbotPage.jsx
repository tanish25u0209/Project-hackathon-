import './PageShared.css'
import './ChatbotPage.css'

export default function ChatbotPage() {
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
          href="http://localhost:8081"
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
          src="http://localhost:8081"
          title="PROMPTFORGE Chatbot"
          className="chatbot-frame"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      <div className="chatbot-notice animate-fadeUp" style={{ animationDelay: '0.2s' }}>
        <span>ℹ</span>
        <span>
          The chatbot runs independently on <strong className="mono">localhost:8081</strong>.
          Start it with: <code>cd chatbot &amp;&amp; .\start-local.ps1</code>
        </span>
      </div>
    </div>
  )
}
