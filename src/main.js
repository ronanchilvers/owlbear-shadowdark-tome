import './style.css'
import bestiaryData from '../data/bestiary_data.json'
import spellData from '../data/spell_data.json'
import itemData from '../data/item_data.json'

// Normalize data with type field
const bestiary = bestiaryData.map(item => ({ ...item, _type: 'bestiary' }))
const spells = spellData.map(item => ({ ...item, _type: 'spell' }))
const items = itemData.map(item => ({ ...item, _type: 'item' }))
const allData = [...bestiary, ...spells, ...items]

// Bookmarks storage key
const BOOKMARKS_KEY = 'shadowdark-bookmarks'

// State
let currentCategory = 'all'
let currentSearch = ''
let selectedItem = null
let bookmarks = loadBookmarks()

// Bookmark functions
function loadBookmarks() {
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.error('Failed to load bookmarks:', e)
    return []
  }
}

function saveBookmarks() {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks))
  } catch (e) {
    console.error('Failed to save bookmarks:', e)
  }
}

function getItemId(item) {
  return `${item._type}:${item.name}`
}

function isBookmarked(item) {
  return bookmarks.includes(getItemId(item))
}

function toggleBookmark(item) {
  const id = getItemId(item)
  if (bookmarks.includes(id)) {
    bookmarks = bookmarks.filter(b => b !== id)
  } else {
    bookmarks.push(id)
  }
  saveBookmarks()
}

// DOM Elements
const app = document.querySelector('#app')

// Render the main layout
function renderApp() {
  app.innerHTML = `
    <div class="container">
      <header class="header">
        <div class="search-row">
          <input type="text" id="search" class="search-input" placeholder="Search..." autocomplete="off" />
          <button class="help-btn" id="help-btn" title="Search help">?</button>
        </div>
        <nav class="tabs">
          <button class="tab active" data-category="all">All</button>
          <button class="tab" data-category="bestiary">Bestiary</button>
          <button class="tab" data-category="spell">Spells</button>
          <button class="tab" data-category="item">Items</button>
          <button class="tab" data-category="bookmarks">Bookmarks</button>
        </nav>
      </header>
      <main class="main">
        <div id="results" class="results"></div>
        <div id="detail" class="detail hidden"></div>
      </main>
      <div id="help-overlay" class="help-overlay hidden">
        <div class="help-content">
          <div class="help-header">
            <h2>Search Help</h2>
            <button class="help-close-btn" id="help-close-btn">×</button>
          </div>
          <p>Type to search by name or description. You can also use filters:</p>
          <table class="help-table">
            <tr><td><code>tier:1</code></td><td>Spells by tier</td></tr>
            <tr><td><code>level:3</code> or <code>lv:3</code></td><td>Monsters by level</td></tr>
            <tr><td><code>class:wizard</code></td><td>Spells by class</td></tr>
            <tr><td><code>type:armor</code></td><td>Items by type</td></tr>
            <tr><td><code>alignment:chaotic</code></td><td>Monsters by alignment</td></tr>
            <tr><td><code>source:core</code></td><td>Any item by source</td></tr>
          </table>
          <p><strong>Combine filters with text:</strong></p>
          <p><code>tier:1 fire</code> — Tier 1 spells containing "fire"</p>
        </div>
      </div>
    </div>
  `

  // Bind events
  document.getElementById('search').addEventListener('input', handleSearch)
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', handleTabClick)
  })
  document.getElementById('help-btn').addEventListener('click', showHelp)
  document.getElementById('help-close-btn').addEventListener('click', hideHelp)
  document.getElementById('help-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'help-overlay') hideHelp()
  })

  renderResults()
}

function showHelp() {
  document.getElementById('help-overlay').classList.remove('hidden')
}

function hideHelp() {
  document.getElementById('help-overlay').classList.add('hidden')
}

function handleSearch(e) {
  currentSearch = e.target.value.toLowerCase().trim()
  selectedItem = null
  renderResults()
}

function handleTabClick(e) {
  currentCategory = e.target.dataset.category
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  e.target.classList.add('active')
  selectedItem = null
  renderResults()
}

// Parse search string for filters like "tier:1" or "level:3"
function parseSearch(searchString) {
  const filters = {}
  let textSearch = searchString

  // Match patterns like "key:value"
  const filterPattern = /(\w+):(\w+)/g
  let match

  while ((match = filterPattern.exec(searchString)) !== null) {
    const key = match[1].toLowerCase()
    const value = match[2].toLowerCase()
    filters[key] = value
    // Remove the filter from the text search
    textSearch = textSearch.replace(match[0], '')
  }

  return {
    filters,
    textSearch: textSearch.trim().toLowerCase()
  }
}

// Check if an item matches the given filters
function matchesFilters(item, filters) {
  for (const [key, value] of Object.entries(filters)) {
    switch (key) {
      case 'tier':
        if (item._type !== 'spell' || String(item.tier) !== value) return false
        break
      case 'level':
      case 'lv':
        if (item._type !== 'bestiary' || String(item.level) !== value) return false
        break
      case 'class':
        if (item._type !== 'spell' || !item.classes?.some(c => c.toLowerCase() === value)) return false
        break
      case 'type':
        if (item._type !== 'item' || !item.item_type?.toLowerCase().includes(value)) return false
        break
      case 'alignment':
        if (item._type !== 'bestiary' || !item.alignment?.toLowerCase().includes(value)) return false
        break
      case 'source':
        if (!item.source?.toLowerCase().includes(value)) return false
        break
      default:
        // Unknown filter, ignore
        break
    }
  }
  return true
}

function getFilteredData() {
  let data

  if (currentCategory === 'all') {
    data = allData
  } else if (currentCategory === 'bookmarks') {
    data = allData.filter(item => isBookmarked(item))
  } else {
    data = allData.filter(item => item._type === currentCategory)
  }

  if (currentSearch) {
    const { filters, textSearch } = parseSearch(currentSearch)

    // Apply filters
    if (Object.keys(filters).length > 0) {
      data = data.filter(item => matchesFilters(item, filters))
    }

    // Apply text search
    if (textSearch) {
      data = data.filter(item => {
        const name = (item.name || '').toLowerCase()
        const description = (item.description || '').toLowerCase()
        return name.includes(textSearch) || description.includes(textSearch)
      })
    }
  }

  // Sort alphabetically by name
  return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

function renderResults() {
  const resultsEl = document.getElementById('results')
  const detailEl = document.getElementById('detail')

  if (selectedItem) {
    resultsEl.classList.add('hidden')
    detailEl.classList.remove('hidden')
    renderDetail()
    return
  }

  resultsEl.classList.remove('hidden')
  detailEl.classList.add('hidden')

  const filtered = getFilteredData()

  if (filtered.length === 0) {
    const message = currentCategory === 'bookmarks'
      ? 'No bookmarks yet'
      : 'No results found'
    resultsEl.innerHTML = `<div class="no-results">${message}</div>`
    return
  }

  resultsEl.innerHTML = filtered.map((item, index) => `
    <div class="result-item" data-index="${index}">
      <span class="result-name">
        ${isBookmarked(item) ? '<span class="bookmark-indicator">★</span>' : ''}
        ${escapeHtml(item.name)}
      </span>
      <span class="result-type type-${item._type}">${getTypeLabel(item)}</span>
    </div>
  `).join('')

  // Store filtered data for click handling
  resultsEl._filteredData = filtered

  resultsEl.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      const index = parseInt(el.dataset.index)
      selectedItem = resultsEl._filteredData[index]
      renderResults()
    })
  })
}

function getTypeLabel(item) {
  switch (item._type) {
    case 'bestiary':
      return `Lv ${item.level || '?'}`
    case 'spell':
      return `Tier ${item.tier || '?'}`
    case 'item':
      return item.item_type || 'Item'
    default:
      return item._type
  }
}

function renderDetail() {
  const detailEl = document.getElementById('detail')

  if (!selectedItem) return

  const bookmarked = isBookmarked(selectedItem)

  let content = `
    <div class="detail-header">
      <button class="back-btn" id="back-btn">← Back</button>
      <button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}" id="bookmark-btn">
        ${bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
      </button>
    </div>
    <h1 class="detail-title">${escapeHtml(selectedItem.name)}</h1>
    <span class="detail-type type-${selectedItem._type}">${getTypeLabel(selectedItem)}</span>
  `

  switch (selectedItem._type) {
    case 'bestiary':
      content += renderBestiaryDetail(selectedItem)
      break
    case 'spell':
      content += renderSpellDetail(selectedItem)
      break
    case 'item':
      content += renderItemDetail(selectedItem)
      break
  }

  detailEl.innerHTML = content

  document.getElementById('back-btn').addEventListener('click', () => {
    selectedItem = null
    renderResults()
  })

  document.getElementById('bookmark-btn').addEventListener('click', () => {
    toggleBookmark(selectedItem)
    renderDetail()
  })
}

function renderBestiaryDetail(item) {
  let html = `
    <p class="detail-description">${escapeHtml(item.description || '')}</p>
    <div class="stat-grid">
      <div class="stat-block">
        <span class="stat-label">AC</span>
        <span class="stat-value">${item.ac || '-'}${item.armor_type ? ` (${item.armor_type})` : ''}</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">HP</span>
        <span class="stat-value">${item.hp || '-'}</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">Level</span>
        <span class="stat-value">${item.level || '-'}</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">Alignment</span>
        <span class="stat-value">${item.alignment || '-'}</span>
      </div>
    </div>
    <div class="detail-row">
      <span class="detail-label">Attack:</span>
      <span>${escapeHtml(item.attack || '-')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Movement:</span>
      <span>${escapeHtml(item.movement || '-')}</span>
    </div>
  `

  if (item.stats) {
    html += `
      <div class="stats-row">
        <div class="ability"><span class="ability-name">STR</span><span class="ability-value">${item.stats.str || '-'}</span></div>
        <div class="ability"><span class="ability-name">DEX</span><span class="ability-value">${item.stats.dex || '-'}</span></div>
        <div class="ability"><span class="ability-name">CON</span><span class="ability-value">${item.stats.con || '-'}</span></div>
        <div class="ability"><span class="ability-name">INT</span><span class="ability-value">${item.stats.int || '-'}</span></div>
        <div class="ability"><span class="ability-name">WIS</span><span class="ability-value">${item.stats.wis || '-'}</span></div>
        <div class="ability"><span class="ability-name">CHA</span><span class="ability-value">${item.stats.cha || '-'}</span></div>
      </div>
    `
  }

  if (item.actions && item.actions.length > 0) {
    html += `<div class="actions-section"><h3>Actions</h3>`
    item.actions.forEach(action => {
      html += `
        <div class="action">
          <span class="action-name">${escapeHtml(action.name || '')}</span>
          <span class="action-desc">${escapeHtml(action.description || '')}</span>
        </div>
      `
    })
    html += `</div>`
  }

  if (item.source) {
    html += `<div class="source">Source: ${escapeHtml(item.source)}</div>`
  }

  return html
}

function renderSpellDetail(item) {
  let html = '';
  if (item.classes && item.classes.length > 0) {
    item.classes.forEach(cls => {
      html += `
        <div class="detail-type type-spell">
          ${titleCase(escapeHtml(cls))}
        </div>
      `
    })
  }

  html += `
    <p class="detail-description">${escapeHtml(item.description || '')}</p>
    <div class="stat-grid">
      <div class="stat-block">
        <span class="stat-label">Tier</span>
        <span class="stat-value">${item.tier || '-'}</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">DC</span>
        <span class="stat-value">${item.dc || '-'}</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">Duration</span>
        <span class="stat-value">${escapeHtml(item.duration || '-')}</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">Range</span>
        <span class="stat-value">${escapeHtml(item.range || '-')}</span>
      </div>
    </div>
  `

  if (item.source) {
    html += `<div class="source">Source: ${escapeHtml(item.source)}</div>`
  }

  return html
}

function renderItemDetail(item) {
  let html = `<p class="detail-description">${escapeHtml(item.description || '')}</p>`

  if (item.Bonus) {
    html += `
      <div class="detail-section">
        <span class="detail-label">Bonus:</span>
        <span>${escapeHtml(item.Bonus)}</span>
      </div>
    `
  }

  if (item.Benefit) {
    html += `
      <div class="detail-section benefit">
        <span class="detail-label">Benefit:</span>
        <span>${escapeHtml(item.Benefit)}</span>
      </div>
    `
  }

  if (item.Curse) {
    html += `
      <div class="detail-section curse">
        <span class="detail-label">Curse:</span>
        <span>${escapeHtml(item.Curse)}</span>
      </div>
    `
  }

  if (item.Personality) {
    html += `
      <div class="detail-section">
        <span class="detail-label">Personality:</span>
        <span>${escapeHtml(item.Personality)}</span>
      </div>
    `
  }

  if (item.item_type) {
    html += `<div class="source">Type: ${escapeHtml(item.item_type)}</div>`
  }

  return html
}

function escapeHtml(str) {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function titleCase(str) {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Initialize
renderApp()
