import './style.css'
import bestiaryData from '../data/bestiary_data.json'
import spellData from '../data/spell_data.json'
import itemData from '../data/item_data.json'

// Normalize data with type field
const bestiary = bestiaryData.map(item => ({ ...item, _type: 'bestiary' }))
const spells = spellData.map(item => ({ ...item, _type: 'spell' }))
const items = itemData.map(item => ({ ...item, _type: 'item' }))
const allData = [...bestiary, ...spells, ...items]

// State
let currentCategory = 'all'
let currentSearch = ''
let selectedItem = null

// DOM Elements
const app = document.querySelector('#app')

// Render the main layout
function renderApp() {
  app.innerHTML = `
    <div class="container">
      <header class="header">
        <input type="text" id="search" class="search-input" placeholder="Search..." autocomplete="off" />
        <nav class="tabs">
          <button class="tab active" data-category="all">All</button>
          <button class="tab" data-category="bestiary">Bestiary</button>
          <button class="tab" data-category="spell">Spells</button>
          <button class="tab" data-category="item">Items</button>
        </nav>
      </header>
      <main class="main">
        <div id="results" class="results"></div>
        <div id="detail" class="detail hidden"></div>
      </main>
    </div>
  `

  // Bind events
  document.getElementById('search').addEventListener('input', handleSearch)
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', handleTabClick)
  })

  renderResults()
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

function getFilteredData() {
  let data = currentCategory === 'all' ? allData : allData.filter(item => item._type === currentCategory)

  if (currentSearch) {
    data = data.filter(item => {
      const name = (item.name || '').toLowerCase()
      const description = (item.description || '').toLowerCase()
      return name.includes(currentSearch) || description.includes(currentSearch)
    })
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
    resultsEl.innerHTML = '<div class="no-results">No results found</div>'
    return
  }

  resultsEl.innerHTML = filtered.map((item, index) => `
    <div class="result-item" data-index="${index}">
      <span class="result-name">${escapeHtml(item.name)}</span>
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

  let content = `
    <button class="back-btn" id="back-btn">← Back</button>
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
  let html = `
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

  if (item.classes && item.classes.length > 0) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Classes:</span>
        <span>${item.classes.map(c => escapeHtml(c)).join(', ')}</span>
      </div>
    `
  }

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

// Initialize
renderApp()
