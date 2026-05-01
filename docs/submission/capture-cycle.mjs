import puppeteer from 'puppeteer-core'

const DIR = '/Users/pat/Desktop/1_projects/ethglobal-openagents/docs/submission'
const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' })

const pages = await browser.pages()
let page = pages.find(p => p.url().includes('responsesurface')) || pages[0]
await page.setViewport({ width: 1440, height: 900 })

async function clickTab(name) {
  await page.evaluate((n) => {
    const btns = document.querySelectorAll('button')
    for (const b of btns) {
      if (b.textContent.trim().includes(n)) { b.click(); return true }
    }
    return false
  }, name)
  await new Promise(r => setTimeout(r, 2000))
}

// Go to dashboard
await clickTab('Dashboard')
await new Promise(r => setTimeout(r, 1000))

// Try to expand Response Fund section if collapsed
await page.evaluate(() => {
  const btns = document.querySelectorAll('button')
  for (const b of btns) {
    if (b.textContent.includes('Response Fund') || b.textContent.includes('RESPONSE FUND')) {
      b.click()
      break
    }
  }
})
await new Promise(r => setTimeout(r, 500))

// Click Run Cycle button using evaluate (avoid clickable point issues)
const clicked = await page.evaluate(() => {
  const btns = document.querySelectorAll('button')
  for (const b of btns) {
    const t = b.textContent.trim()
    if (t.includes('Run') && t.includes('Cycle')) {
      b.click()
      return t
    }
  }
  return null
})

if (clicked) {
  console.log(`Clicked: "${clicked}"`)
  console.log('Waiting 70s for cycle to complete...')
  await new Promise(r => setTimeout(r, 70000))

  // Screenshot dashboard with results
  console.log('Dashboard with results...')
  await clickTab('Dashboard')
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({ path: `${DIR}/screenshot-6-results.png` })

  // Feed with proofs
  console.log('Feed with proofs...')
  await clickTab('Feed')
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({ path: `${DIR}/screenshot-7-feed-proofs.png` })

  // Scroll feed down a bit to show more
  await page.evaluate(() => {
    const feed = document.querySelector('[class*="overflow-y"]')
    if (feed) feed.scrollTop = 400
  })
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({ path: `${DIR}/screenshot-8-feed-scrolled.png` })

  console.log('Done with cycle screenshots!')
} else {
  console.log('No cycle button found')
}

browser.disconnect()
