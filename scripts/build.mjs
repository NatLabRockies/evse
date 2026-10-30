import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const sites = {
  production: 'https://widgets.nlr.gov/intelligent-campus/evse/',
  staging: 'https://widgets-stage.tada-stage.nlr.gov/intelligent-campus/evse/',
}
const environment = process.argv[2] ?? 'production'
if (!Object.hasOwn(sites, environment)) {
  throw new Error('Build environment must be production or staging')
}

process.chdir(fileURLToPath(new URL('../', import.meta.url)))
const siteUrl = new URL(sites[environment])
const indexDirectory = `.angular/deployment/${environment}`
const source = await readFile('src/index.html', 'utf8')
let index = source.replaceAll(sites.production, siteUrl.href)
if (environment === 'staging') {
  // Staging is public, so keep it out of search results. Production must stay indexable.
  if (!index.includes('</head>')) throw new Error('src/index.html has no </head> for noindex')
  index = index.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>')
}
await mkdir(indexDirectory, { recursive: true })
// Generate the metadata before Angular builds and hashes index.html for the service worker.
await writeFile(`${indexDirectory}/index.html`, index)

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve('@angular/cli/bin/ng.js')),
    'build',
    '--configuration=production',
    `--base-href=${siteUrl.pathname}`,
    `--index=${indexDirectory}/index.html`,
    `--output-path=dist/evse-dashboard/${environment}`,
  ],
  { stdio: 'inherit' },
)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
