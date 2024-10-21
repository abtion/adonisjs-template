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

export default async function reportCoverage(partialConfig: Partial<Config> = {}) {
  const { backendCoverageFolder, frontendCoverageFolder, reportDir } = {
    ...defaultConfig,
    ...partialConfig,
  }

  const { exec } = (await import('child_process')).default
  const utils = (await import('util')).default

  const execute = utils.promisify(exec)
  const [beReport, feReport] = await Promise.allSettled([
    execute(
      `npx c8 report --all --temp-dir ${backendCoverageFolder} -r text -r html --reports-dir ${reportDir}/backend`,
      {
        env: { ...process.env, FORCE_COLOR: '3' },
      }
    ),
    execute(
      `npx nyc report --temp-dir .nyc_output -r text -r html --report-dir ${frontendCoverageFolder}/frontend`,
      {
        env: { ...process.env, FORCE_COLOR: '3' },
      }
    ),
  ])

  if (beReport.status === 'fulfilled') {
    console.log('BACKEND CODE COVERAGE')
    console.log(beReport.value.stdout)
  } else {
    console.error(beReport.reason)
  }

  if (feReport.status === 'fulfilled') {
    console.log('FRONTEND CODE COVERAGE')
    console.log(feReport.value.stdout)
  } else {
    console.error(feReport.reason)
  }
}
