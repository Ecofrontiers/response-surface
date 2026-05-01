import puppeteer from 'puppeteer-core'

const DIR = '/Users/pat/Desktop/1_projects/ethglobal-openagents/docs/submission'
const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' })

const pages = await browser.pages()
let page = pages.find(p => p.url().includes('responsesurface')) || pages[0]

if (!page.url().includes('responsesurface')) {
  await page.goto('https://responsesurface.vercel.app', { waitUntil: 'networkidle2', timeout: 30000 })
}

await page.setViewport({ width: 1440, height: 900 })
await new Promise(r => setTimeout(r, 5000))

async function clickTab(name) {
  const btns = await page.$$('button')
  for (const btn of btns) {
    const text = await btn.evaluate(el => el.textContent.trim())
    if (text.includes(name)) {
      await btn.click()
      await new Promise(r => setTimeout(r, 2000))
      return true
    }
  }
  console.log(`  Tab "${name}" not found`)
  return false
}

// 1. Dashboard
console.log('1. Dashboard...')
await clickTab('Dashboard')
await new Promise(r => setTimeout(r, 1000))
await page.screenshot({ path: `${DIR}/screenshot-1-dashboard.png` })

// 2. Feed
console.log('2. Feed...')
await clickTab('Feed')
await page.screenshot({ path: `${DIR}/screenshot-2-feed.png` })

// 3. AXL Mesh
console.log('3. AXL Mesh...')
await clickTab('AXL Mesh')
await page.screenshot({ path: `${DIR}/screenshot-3-mesh.png` })

// 4. ENS Registry
console.log('4. ENS Registry...')
await clickTab('ENS Registry')
await page.screenshot({ path: `${DIR}/screenshot-4-ens.png` })

// 5. Docs
console.log('5. Docs...')
await clickTab('Docs')
await new Promise(r => setTimeout(r, 1000))
await page.screenshot({ path: `${DIR}/screenshot-5-docs.png` })

// Close docs modal (press Escape)
await page.keyboard.press('Escape')
await new Promise(r => setTimeout(r, 500))

// 6. Run a cycle if button exists
console.log('6. Checking for cycle button...')
await clickTab('Dashboard')
await new Promise(r => setTimeout(r, 500))

const cycleBtn = await page.$('button')
const allBtns = await page.$$('button')
let foundCycle = false
for (const btn of allBtns) {
  const text = await btn.evaluate(el => el.textContent.trim())
  if (text.includes('Run') && text.includes('Cycle')) {
    console.log('   Running cycle...')
    await btn.click()
    await new Promise(r => setTimeout(r, 60000))
    foundCycle = true
    break
  }
}

if (foundCycle) {
  console.log('7. Dashboard with results...')
  await clickTab('Dashboard')
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({ path: `${DIR}/screenshot-6-results.png` })

  console.log('8. Feed with proofs...')
  await clickTab('Feed')
  await new Promise(r => setTimeout(r, 1000))
  await page.screenshot({ path: `${DIR}/screenshot-7-feed-proofs.png` })
}

browser.disconnect()
console.log('Done!')
