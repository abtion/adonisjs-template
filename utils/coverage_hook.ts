import { existsSync } from 'node:fs'
import c8Config from '../.c8rc.json' with { type: 'json' }
import nycConfig from '../.nycrc.json' with { type: 'json' }

const supportedCoverageArguments = [
  '--collect-coverage', // Collect coverage
  '--coverage-text', // Collect coverage and generate TEXT reports
  '--coverage-html', // Collect coverage and generate HTML reports
]

export default async function coverageHook() {
  // Grab and consume coverage arguments
  const args = process.argv.filter((arg) => supportedCoverageArguments.includes(arg))
  if (!args.length) return
  process.argv = process.argv.filter((arg) => !supportedCoverageArguments.includes(arg))

  // set NODE_V8_COVERAGE to enable v8 coverage for spawned processes
  process.env.NODE_V8_COVERAGE = c8Config.tempDirectory
  process.env.NYC_COVERAGE = nycConfig.tempDirectory

  // Clear coverage folders
  const { rimrafSync } = await import('rimraf')
  rimrafSync([
    c8Config.tempDirectory,
    c8Config.reportDir,
    nycConfig.tempDirectory,
    nycConfig.reportDir,
  ])
  let reportsPrinted = false

  // Generate report args up front, so that we can use them to decide whether or not we need to
  // generate any reports
  const reportsArgs = [
    args.includes('--coverage-text') && '-r text',
    args.includes('--coverage-html') && '-r html',
  ].filter(Boolean)

  if (reportsArgs.length) {
    process.on('beforeExit', async () => {
      if (reportsPrinted) return
      reportsPrinted = true
      reportCoverage()
    })
  }

  async function reportCoverage() {
    const { exec } = await import('node:child_process')
    const { promisify } = await import('node:util')

    const execute = promisify(exec)
    const coverageCommandEnv = { ...process.env, FORCE_COLOR: '3' }

    const reportCommands: Record<string, string> = {
      backend: `npx c8 report ${reportsArgs.join(' ')}`,
    }

    if (existsSync(nycConfig.tempDirectory)) {
      reportCommands.frontend = `npx nyc report ${reportsArgs.join(' ')}`
    } else {
      console.log('No front-end coverage found')
    }

    const reportPromises = Object.entries(reportCommands).map(async ([type, command]) => {
      let output = ''
      let error = ''
      await execute(command, { env: coverageCommandEnv })
        .then(({ stdout }) => {
          console.log(output)
          output = stdout
        })
        .catch((reason) => {
          console.log(reason)
          error = reason
        })
      return [type, { output, error }] as const
    })

    const results = await Promise.all(reportPromises)

    for (const [type, { output, error }] of results) {
      if (error) {
        console.log(`Coverage report failed for: ${type}`.toUpperCase())
        console.error(error)
      } else {
        console.log(`Coverage report generated for: ${type}`.toUpperCase())
        if (output) console.log(output)
      }
    }
  }
}
