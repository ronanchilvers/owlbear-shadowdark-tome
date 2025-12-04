import './style.css'

const SHADOWDARK_URL = 'https://shadowdark.ronanchilvers.com/index.html'

document.querySelector('#app').innerHTML = `
  <iframe 
    src="${SHADOWDARK_URL}" 
    id="shadowdark-frame"
    title="Shadowdark Database"
    frameborder="0"
    allowfullscreen
  ></iframe>
`
