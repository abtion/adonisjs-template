import { Runner } from '@japa/runner/core'
import { exec } from 'child_process'
import utils from 'util'

type Config = {
  runInSuites: string[]
  coverageFolder: string
}

const defaultConfig: Config = {
  coverageFolder: '.nyc_output',
  runInSuites: ['browser'],
}

export default function summarizeCoverage(config?: Partial<Config>) {
  const { runInSuites, coverageFolder } = {
    ...defaultConfig,
    ...config,
  }

  return async function (runner: Runner) {
    if (!runner.suites.some((suite) => runInSuites.includes(suite.name))) return

    const execute = utils.promisify(exec)
    const { stdout } = await execute(
      `npx nyc report --all --temp-dir ${coverageFolder} --reporter text`,
      { env: { ...process.env, FORCE_COLOR: '3' } }
    )

    console.log('Frontend code coverage')
    console.log(stdout)
  }
}
