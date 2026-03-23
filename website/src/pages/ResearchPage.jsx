import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { runMultiModel } from '../api'
import './PageShared.css'
import './ResearchPage.css'

const MODELS = ['deepseek', 'perplexity', 'mistral', 'llama', 'gemma']
const MODEL_COLORS = {
  deepseek:   '#6366f1',
  perplexity: '#10b981',
  mistral:    '#f59e0b',
  llama:      '#38bdf8',
  gemma:      '#a78bfa',
}
const MODEL_LABELS = {
  deepseek:   'DeepSeek',
  perplexity: 'Perplexity',
  mistral:    'Mistral',
  llama:      'Llama 3',
  gemma:      'Gemma 3',
}

export default function ResearchPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeModel, setActiveModel] = useState(null)
  const navigate = useNavigate()

  const charCount = input.length
  const isValid = charCount >= 10 && charCount <= 5000

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || loading) return
    setError(null)
    setLoading(true)

    // Animate model dots
    let i = 0
    const ticker = setInterval(() => {
      setActiveModel(MODELS[i % MODELS.length])
      i++
    }, 400)

    try {
      const data = await runMultiModel(input)
      clearInterval(ticker)
      setActiveModel(null)
      // Store results for ResultsPage
      sessionStorage.setItem('pf_results', JSON.stringify(data))
      sessionStorage.setItem('pf_input', input)
      navigate('/results')
    } catch (err) {
      clearInterval(ticker)
      setActiveModel(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page research-page">
      {/* Header */}
      <div className="page-header animate-fadeUp">
        <div className="research-hero">
          <div className="research-hero__glow" />
          <div className="research-hero__badge badge badge--accent">Multi-Model AI Research</div>
          <h1 className="research-hero__title">
            What do you want to<br />explore today?
          </h1>
          <p className="research-hero__sub">
            Your question runs simultaneously across <strong>5 AI models</strong>.
            DeepSeek, Perplexity, Mistral, Llama &amp; Gemma answer in parallel — then we synthesize.
          </p>
        </div>
      </div>

      {/* Model indicators */}
      <div className="model-dots animate-fadeUp" style={{ animationDelay: '0.1s' }}>
        {MODELS.map(m => (
          <div
            key={m}
            className={`model-dot ${activeModel === m ? 'model-dot--active' : ''}`}
            style={{ '--mc': MODEL_COLORS[m] }}
          >
            <div className="model-dot__pulse" />
            <span className="model-dot__label">{MODEL_LABELS[m]}</span>
          </div>
        ))}
      </div>

      {/* Input form */}
      <form className="research-form animate-fadeUp" style={{ animationDelay: '0.2s' }} onSubmit={handleSubmit}>
        <div className="research-form__field">
          <textarea
            className="input research-form__textarea"
            placeholder="Describe your research problem or question in detail…&#10;&#10;Examples:&#10;• What are the most promising approaches to AI alignment?&#10;• How should a small startup decide when to raise Series A?&#10;• What are the key risks in deploying LLMs in healthcare?"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            id="research-input"
          />
          <div className="research-form__meta">
            <span className={`research-form__chars ${charCount > 5000 ? 'over' : charCount >= 10 ? 'ok' : ''}`}>
              {charCount} / 5000
            </span>
            {charCount < 10 && charCount > 0 && (
              <span className="research-form__hint">Minimum 10 characters</span>
            )}
          </div>
        </div>

        {error && (
          <div className="research-error">
            <span>⚠</span> {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--lg research-form__submit"
          disabled={!isValid || loading}
          id="submit-research"
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18 }} />
              Querying {MODEL_LABELS[activeModel] || 'models'}…
            </>
          ) : (
            <>⚡ Execute Multi-Model Research</>
          )}
        </button>
      </form>

      {/* Feature grid */}
      <div className="research-features animate-fadeUp" style={{ animationDelay: '0.3s' }}>
        {[
          { icon: '🔀', title: 'Parallel Execution', desc: '5 models answer simultaneously in 5–30 seconds' },
          { icon: '🧬', title: 'Idea Synthesis', desc: 'Semantic deduplication extracts unique insights' },
          { icon: '💾', title: 'Save & Organize', desc: 'Rate, tag and annotate ideas for later' },
          { icon: '🔁', title: 'Async Queuing', desc: 'BullMQ handles heavy workloads in the background' },
        ].map(f => (
          <div key={f.title} className="card card--glow research-feature-card">
            <div className="research-feature-card__icon">{f.icon}</div>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
