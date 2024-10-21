import { ApplicationService } from '@adonisjs/core/types'
import { Suite } from '@japa/runner/core'
import { PluginFn } from '@japa/runner/types'
import path from 'path'
import { writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { BrowserContext, Page } from 'playwright'
import { rimraf } from 'rimraf'
import { mkdir } from 'fs/promises'
import { CoverageReport } from 'monocart-coverage-reports'

type Config = {
  coverageFolder: string
  runInSuites: string[]
}

const defaultConfig: Config = {
  coverageFolder: '.nyc_output',
  runInSuites: ['browser'],
}

export default (app: ApplicationService, config?: Partial<Config>): PluginFn => {
  const usedConfig: Config = {
    ...defaultConfig,
    ...config,
  }

  return (japa) => {
    let isFirstSuite = true
    // const coverageFolder = app.makePath(usedConfig.coverageFolder)
    // const coverageFolder = app.makePath(process.env.NODE_V8_COVERAGE)
    const coverageFolder = app.makePath('.c8')

    function generateUUID(): string {
      return randomBytes(16).toString('hex')
    }

    async function prepareCoverageFolder() {
      await rimraf(coverageFolder)
      await mkdir(coverageFolder, { recursive: true })
    }

    async function collectCoverage(browserContext: BrowserContext) {
      for (const page of browserContext.pages()) {
        // @ts-expect-error The function will be executed inside the browser
        const coverage = await page.evaluate(() => window.__coverage__)

        if (coverage) {
          writeFileSync(
            path.join(coverageFolder, `playwright_coverage_${generateUUID()}.json`),
            JSON.stringify(coverage)
          )
        }
      }
    }

    japa.runner.onSuite(async (suite: Suite) => {
      // Only run if the runner includes one of the specified suites
      if (!usedConfig.runInSuites.includes(suite.name)) return

      if (isFirstSuite) {
        await prepareCoverageFolder()
        isFirstSuite = false
      }

      /**
       * Hooks for all the tests inside a group
       */
      suite.onGroup((group) => {
        group.each.setup((test) => {
          let page: Page
          const handlePage = (p: Page) => {
            page = p
            page.coverage.startJSCoverage()
          }

          test.context.browserContext.on('page', handlePage)

          return async () => {
            test.context.browserContext.off('page', handlePage)
            const coverage = (await page.coverage.stopJSCoverage())
              .map((c) => {
                c.url = c.url.replace('http://localhost:4000/', '')
                return c
              })
              .filter((c) => c.url.startsWith('inertia'))
              .map((c) => {
                c.url = app.makePath(c.url)
                return c
              })

            writeFileSync(
              path.join(coverageFolder, `playwright_coverage_${generateUUID()}.json`),
              JSON.stringify({ result: coverage })
            )
          }
        })
      })

      /**
       * Hooks for all top level tests inside a suite
       */
      // suite.onTest((t) => {
      //   t.setup((test) => () => collectCoverage(test.context.browserContext))
      // })
    })
  }
}
