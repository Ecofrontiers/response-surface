import { chromium } from 'playwright'

const URL = 'https://responsesurface.vercel.app'
const DIR = '/Users/pat/Desktop/1_projects/ethglobal-openagents/docs/submission'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(3000)

// 1. Dashboard view
console.log('1. Dashboard...')
await page.screenshot({ path: `${DIR}/screenshot-1-dashboard.png` })

// 2. Feed tab
console.log('2. Feed...')
await page.click('button:has-text("Feed")')
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/screenshot-2-feed.png` })

// 3. AXL Mesh tab
console.log('3. AXL Mesh...')
await page.click('button:has-text("AXL Mesh")')
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/screenshot-3-mesh.png` })

// 4. ENS Registry tab
console.log('4. ENS Registry...')
await page.click('button:has-text("ENS Registry")')
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/screenshot-4-ens.png` })

// 5. Docs modal
console.log('5. Docs...')
await page.click('button:has-text("Docs")')
await page.waitForTimeout(1000)
await page.screenshot({ path: `${DIR}/screenshot-5-docs.png` })

// Close docs
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

// 6. Go back to dashboard tab, run a cycle if the button exists
console.log('6. Checking for cycle button...')
await page.click('button:has-text("Dashboard")')
await page.waitForTimeout(500)

const cycleBtn = await page.$('button:has-text("Run Allocation Cycle")')
if (cycleBtn) {
  console.log('Running cycle...')
  await cycleBtn.click()
  // Wait for cycle to complete (watch for allocation events)
  await page.waitForTimeout(60000)

  // Screenshot dashboard with results
  console.log('7. Dashboard with results...')
  await page.click('button:has-text("Dashboard")')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${DIR}/screenshot-6-results.png` })

  // Feed with proof photos
  console.log('8. Feed with proofs...')
  await page.click('button:has-text("Feed")')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${DIR}/screenshot-7-feed-proofs.png` })

  // Try clicking View All for proof panel
  const viewAllBtn = await page.$('button:has-text("View All")')
  if (viewAllBtn) {
    console.log('9. Proof panel...')
    await viewAllBtn.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${DIR}/screenshot-8-proofs.png` })
  }
} else {
  console.log('No cycle button found — capturing as-is')
}

await browser.close()
console.log('Done!')
