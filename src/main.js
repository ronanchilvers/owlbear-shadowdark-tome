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
          <button class="button button--help" id="help-btn" title="Search help">?</button>
        </div>
        <nav class="tabs">
          <button class="button button--tab active" data-category="all">All</button>
          <button class="button button--tab" data-category="bestiary">Bestiary</button>
          <button class="button button--tab" data-category="spell">Spells</button>
          <button class="button button--tab" data-category="item">Items</button>
          <button class="button button--tab" data-category="bookmarks">Bookmarks</button>
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
            <button class="button button--close" id="help-close-btn">×</button>
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
          <p><code>tier:1 fire</code> - Tier 1 spells containing "fire"</p>
          <p><code>lv:4 wolf</code> - Level 4 monsters "wolf"</p>
        </div>
      </div>
    </div>
  `

  // Bind events
  document.getElementById('search').addEventListener('input', handleSearch)
  document.querySelectorAll('.button--tab').forEach(tab => {
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
  document.querySelectorAll('.button--tab').forEach(t => t.classList.remove('active'))
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
      <span class="tag tag--${item._type}">${getTypeLabel(item)}</span>
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
      return `Level ${item.level || '?'}`
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
    <div class="detail-row detail-row--header">
      <button class="button button--with-icon button--back" id="back-btn">Back</button>
      <button class="button button--with-icon button--bookmark ${bookmarked ? 'bookmarked' : ''}" id="bookmark-btn">
        ${bookmarked ? 'Bookmarked' : 'Bookmark'}
      </button>
    </div>
    <div class="detail-row detail-row--title"><h1>${escapeHtml(selectedItem.name)}</h1></div>
    <div class="detail-row detail-row--tags">${renderDetailTags(selectedItem)}</div>
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

  if (selectedItem.source) {
    content += `<div class="detail-row detail-row--footer"><p>Source: ${escapeHtml(selectedItem.source)}</p></div>`
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

function renderDetailTags(item) {
  switch (item._type) {
    case 'bestiary':
      return renderBestiaryTags(item)
    case 'spell':
      return renderSpellTags(item)
    case 'item':
      return renderItemTags(item)
    default:
      return ''
  }
}

function renderBestiaryTags(item) {
  let html = '';
  html += `<span class="tag tag--bestiary">Level ${item.level || '?'}</span>`
  return html;
}

function renderSpellTags(item) {
  let html = `<span class="tag tag--spell">Tier ${item.tier || '?'}</span>`
  if (item.classes && item.classes.length > 0) {
    item.classes.forEach(cls => {
      html += `<span class="tag tag--spell">${titleCase(escapeHtml(cls))}</span>`
    })
  }
  return html
}

function renderItemTags(item) {
  return `<span class="tag tag--item">${escapeHtml(item.item_type || 'Item')}</span>`
}

function renderBestiaryDetail(item) {
  let html = `
    <div class="detail-row detail-row--description"><p>${escapeHtml(item.description || '')}</p></div>
    <div class="detail-row stat stat--grid">
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
      <p>Attack: ${escapeHtml(item.attack || '-')}</p>
      <p>Movement: ${escapeHtml(item.movement || '-')}</p>
    </div>
  `

  if (item.stats) {
    html += `
      <div class="detail-row stat stat--abilities">
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
    html += `<div class="detail-row actions-section"><h3 class="actions-title">Actions</h3>`
    item.actions.forEach(action => {
      html += `
        <div class="action">
          <div class="action-name">${escapeHtml(action.name || '')}</div>
          <div class="action-desc">${escapeHtml(action.description || '')}</div>
        </div>
      `
    })
    html += `</div>`
  }

  return html
}

function renderSpellDetail(item) {
  let html = `
    <div class="detail-row detail-row--description"><p>${escapeHtml(item.description || '')}</p></div>
    <div class="detail-row stat stat--grid">
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

  return html
}

function renderItemDetail(item) {
  let html = `<div class="detail-row detail-row--description"><p>${escapeHtml(item.description || '')}</p></div>`

  let actions = "";
  if (item.Bonus) {
    actions += `
      <div class="action action--bonus">
        <div class="action-name">Bonus:</div>
        <div class="action-desc">${escapeHtml(item.Bonus)}</div>
      </div>
    `
  }

  if (item.Benefit) {
    actions += `
      <div class="action action--benefit">
        <div class="action-name">Benefit:</div>
        <div class="action-desc">${escapeHtml(item.Benefit)}</div>
      </div>
    `
  }

  if (item.Personality) {
    actions += `
      <div class="action action--personality">
        <div class="action-name">Personality:</div>
        <div class="action-desc">${escapeHtml(item.Personality)}</div>
      </div>
    `
  }

  if (item.Curse) {
    actions += `
      <div class="action action--curse">
        <div class="action-name">Curse:</div>
        <div class="action-desc">${escapeHtml(item.Curse)}</div>
      </div>
    `
  }

  if (actions.length > 0) {
    html += `<div class="actions-section">${actions}</div>`
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
