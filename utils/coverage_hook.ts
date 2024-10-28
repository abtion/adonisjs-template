import { existsSync } from 'node:fs'

const supportedCoverageArguments = [
  '--coverage', // Collect and report coverage
  '--collect-coverage', // Collect coverage
]

export default async function coverageHook() {
  // Grab and consume coverage arguments
  const args = process.argv.filter((arg) => supportedCoverageArguments.includes(arg))
  if (!args.length) return
  process.argv = process.argv.filter((arg) => !supportedCoverageArguments.includes(arg))

  // set NODE_V8_COVERAGE to enable v8 coverage for spawned processes
  process.env.NODE_V8_COVERAGE = '.v8_coverage'
  process.env.NYC_COVERAGE = '.nyc_output'

  // Clear coverage folders
  const { rimrafSync } = await import('rimraf')
  rimrafSync(process.env.NODE_V8_COVERAGE)
  rimrafSync(process.env.NYC_COVERAGE)
  rimrafSync('coverage')
  let reportsPrinted = false

  // If reports are enabled, show reports when the process exits
  if (args.includes('--coverage')) {
    process.on('beforeExit', async () => {
      if (reportsPrinted) return
      reportsPrinted = true
      reportCoverage({
        backendCoverageFolder: process.env.NODE_V8_COVERAGE,
        frontendCoverageFolder: '.nyc_output',
        reportDir: 'coverage',
      })
    })
  }

  type Config = {
    backendCoverageFolder: string
    frontendCoverageFolder: string
    reportDir: string
  }

  const defaultConfig: Config = {
    backendCoverageFolder: '.v8-coverage',
    frontendCoverageFolder: '.nyc_output',
    reportDir: 'coverage',
  }

  async function reportCoverage(partialConfig: Partial<Config> = {}) {
    const { backendCoverageFolder, frontendCoverageFolder, reportDir } = {
      ...defaultConfig,
      ...partialConfig,
    }

    const { exec } = await import('node:child_process')
    const { promisify } = await import('node:util')

    const execute = promisify(exec)
    const coverageCommandEnv = { ...process.env, FORCE_COLOR: '3' }

    const reportCommands: Record<string, string> = {
      backend: `npx c8 report --all --temp-dir ${backendCoverageFolder} -r text -r html --reports-dir ${reportDir}/backend`,
    }

    if (existsSync(frontendCoverageFolder)) {
      reportCommands.frontend = `npx nyc report --temp-dir .nyc_output -r text -r html --report-dir ${reportDir}/frontend`
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
        console.log(`Coverage report: ${type}`.toUpperCase())
        console.log(output)
      }
    }
  }
}
