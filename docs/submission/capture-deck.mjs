import puppeteer from 'puppeteer-core'

const DIR = '/Users/pat/Desktop/1_projects/ethglobal-openagents/docs'
const DECK = `file:///Users/pat/Desktop/1_projects/ethglobal-openagents/docs/submission/deck.html`

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
await page.goto(DECK, { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 1000))

const slides = [
  { name: 'pipeline', index: 2 },   // slide 3: How It Works
  { name: 'techstack', index: 3 },  // slide 4: Tech Stack
  { name: 'proofgate', index: 4 },  // slide 5: Proof Gate
]

for (const s of slides) {
  // Navigate to slide
  for (let i = 0; i < s.index; i++) {
    await page.keyboard.press('ArrowRight')
    await new Promise(r => setTimeout(r, 300))
  }
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: `${DIR}/${s.name}.png` })
  console.log(`Captured ${s.name}.png`)
  // Reset to slide 1
  for (let i = 0; i < s.index; i++) {
    await page.keyboard.press('ArrowLeft')
    await new Promise(r => setTimeout(r, 100))
  }
}

await page.close()
browser.disconnect()
console.log('Done!')
