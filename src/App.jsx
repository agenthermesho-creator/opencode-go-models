import { useState, useMemo } from 'react'
import models, { tiers, tagLabels } from './data/models.js'

const sortOptions = [
  { key: 'default', label: 'Default' },
  { key: 'requests-desc', label: 'Requests (high)' },
  { key: 'requests-asc', label: 'Requests (low)' },
  { key: 'cost-asc', label: 'Cost per 1K (low)' },
  { key: 'name', label: 'Name A-Z' },
]

function formatNum(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function getTierColor(tier) {
  const t = tiers.find(ti => ti.key === tier)
  return t ? t.color : '#78716c'
}
function getTierLabel(tier) {
  const t = tiers.find(ti => ti.key === tier)
  return t ? t.label : 'Extra'
}

function ModelCard({ model }) {
  const [expanded, setExpanded] = useState(false)
  const isHighlight = model.bestTag === 'BEST'
  const tierColor = getTierColor(model.tier)

  return (
    <div
      className={`model-card card-enter ${isHighlight ? 'highlight' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="card-header">
        <div className="card-header-left">
          <div className="model-name">
            {model.name}
            {isHighlight && <span className="best-badge">BEST</span>}
          </div>
          <div className="model-provider">{model.provider}</div>
        </div>
        <span
          className="tier-badge"
          style={{ background: tierColor + '18', color: tierColor }}
        >
          T{model.tier > 0 ? model.tier : '?'}
        </span>
      </div>

      <div className="card-body">
        <div className="model-desc">{model.description}</div>

        <div className="tag-row">
          {model.bestFor.map((tag) => (
            <span key={tag} className={`tag tag-${tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">/ Month</div>
            <div className="stat-value">{model.requestsPerMonth ? formatNum(model.requestsPerMonth) : '—'}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">/ 5hr</div>
            <div className="stat-value">{model.requestsPer5hr ? formatNum(model.requestsPer5hr) : '—'}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Daily</div>
            <div className="stat-value">{model.dailyHeadroom}</div>
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
              {model.detail}
            </p>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div className="stat-box">
                <div className="stat-label">Input / 1M</div>
                <div className="stat-value">{model.inputPrice}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Output / 1M</div>
                <div className="stat-value">{model.outputPrice}</div>
              </div>
            </div>
            {model.cachedPrice !== '—' && (
              <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 6 }}>
                Cached: {model.cachedPrice} / 1M tokens
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="price-col">
          <div className="price-label">Cost per 1K req</div>
          <div className="price-value per1k">{model.costPer1K}</div>
        </div>
        <div className="price-col">
          <div className="price-label">Pricing</div>
          <div className="price-value">{model.inputPrice} in / {model.outputPrice} out</div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [sortKey, setSortKey] = useState('default')

  const filtered = useMemo(() => {
    let result = [...models]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.bestFor.some(t => t.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q)
      )
    }

    // Tier filter
    if (tierFilter !== 'all') {
      const tf = parseInt(tierFilter)
      result = result.filter(m => m.tier === tf)
    }

    // Sort
    switch (sortKey) {
      case 'requests-desc':
        result.sort((a, b) => (b.requestsPerMonth || 0) - (a.requestsPerMonth || 0))
        break
      case 'requests-asc':
        result.sort((a, b) => (a.requestsPerMonth || 999999) - (b.requestsPerMonth || 999999))
        break
      case 'cost-asc': {
        const parseCost = (s) => {
          if (s === '—') return 999
          return parseFloat(s.replace('$', ''))
        }
        result.sort((a, b) => parseCost(a.costPer1K) - parseCost(b.costPer1K))
        break
      }
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        result.sort((a, b) => (a.tier || 99) - (b.tier || 99) || (a.bestTag ? -1 : 1))
    }

    return result
  }, [search, tierFilter, sortKey])

  // Group by tier
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(m => {
      const key = m.tier !== null && m.tier !== undefined ? m.tier : 0
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    })
    return groups
  }, [filtered])

  const tierKeys = Object.keys(grouped).map(Number).sort((a, b) => {
    if (a === 1 || b === 1) return b - a
    if (a === 0) return 1
    if (b === 0) return -1
    return a - b
  })

  return (
    <>
      <header className="app-header">
        <h1>OpenCode Go Models</h1>
        <div className="subtitle">$5 first month · $10/month · $60/mo usage cap</div>
      </header>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search models, providers, specialities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
          <option value="all">All tiers</option>
          <option value="1">Tier 1: Sweet Spot</option>
          <option value="2">Tier 2: Highest Competence</option>
          <option value="3">Tier 3: Budget</option>
          <option value="0">Extra (no caps)</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          {sortOptions.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="page-content">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <h3>No models match your search</h3>
            <p>Try a different filter or search term</p>
          </div>
        ) : (
          tierKeys.map(tierKey => {
            const tierMeta = tiers.find(t => t.key === tierKey)
            const tierModels = grouped[tierKey]
            if (!tierModels || tierModels.length === 0) return null
            return (
              <section key={tierKey} className="tier-section">
                <div className="tier-header">
                  <div className="tier-dot" style={{ background: getTierColor(tierKey) }} />
                  <h2>
                    {tierMeta ? tierMeta.label : 'Extra'}
                    <span className="tier-count"> — {tierMeta?.subtitle || 'No published caps'}</span>
                  </h2>
                </div>
                <div className="model-grid">
                  {tierModels.map((m, i) => (
                    <div key={m.id} style={{ animationDelay: `${(i % 6) * 0.04}s` }}>
                      <ModelCard model={m} />
                    </div>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      <footer className="app-footer">
        <span>Data from OpenCode Go docs</span>
        <span>·</span>
        <span>${'5'} first month, ${'10'} after</span>
        <span>·</span>
        <span>${'60'} monthly usage cap</span>
      </footer>
    </>
  )
}

export default App
