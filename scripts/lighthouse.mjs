import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const out = 'reports/lighthouse'
if (!process.argv.includes('--summary')) {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  for (const mode of ['mobile', 'desktop']) {
    const r = spawnSync('npx', ['lhci', 'autorun', `--config=lighthouserc.${mode}.json`], { stdio: 'inherit' })
    if (r.status !== 0) process.exit(r.status ?? 1)
  }
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const summary = { generatedAt: new Date().toISOString(), node: process.version, results: {} }
for (const mode of ['mobile', 'desktop']) {
  const dir = `${out}/${mode}`
  const runs = readdirSync(dir).filter((f) => /\.report\.json$/.test(f)).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
  summary.lighthouse ??= runs[0]?.lighthouseVersion
  summary.chrome ??= runs[0]?.environment?.hostUserAgent
  const pages = Object.groupBy(runs, (r) => new URL(r.finalDisplayedUrl ?? r.finalUrl).pathname)
  for (const [path, rs] of Object.entries(pages)) {
    const v = (id) => median(rs.map((r) => r.audits[id].numericValue))
    summary.results[`${mode} ${path}`] = {
      runs: rs.length,
      performance: median(rs.map((r) => Math.round(r.categories.performance.score * 100))),
      accessibility: median(rs.map((r) => Math.round(r.categories.accessibility.score * 100))),
      bestPractices: median(rs.map((r) => Math.round(r.categories['best-practices'].score * 100))),
      seo: median(rs.map((r) => Math.round(r.categories.seo.score * 100))),
      lcpMs: Math.round(v('largest-contentful-paint')),
      cls: +v('cumulative-layout-shift').toFixed(3),
      tbtMs: Math.round(v('total-blocking-time')),
      fcpMs: Math.round(v('first-contentful-paint')),
    }
  }
}
writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2) + '\n')
console.table(summary.results)
