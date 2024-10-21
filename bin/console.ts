/*
|--------------------------------------------------------------------------
| Ace entry point
|--------------------------------------------------------------------------
|
| The "console.ts" file is the entrypoint for booting the AdonisJS
| command-line framework and executing commands.
|
| Commands do not boot the application, unless the currently running command
| has "options.startApp" flag set to true.
|
*/

if (!process.env.NODE_ENV) {
  // Default to "test" node env for test command, otherwise default to "development"
  const commandName = process.argv.slice(2).find((value) => !value.startsWith('-'))
  const isTestCommand = commandName === 'test'
  process.env.NODE_ENV = isTestCommand ? 'test' : 'development'
}

if (process.argv.slice(2).includes('--coverage')) {
  // set NODE_V8_COVERAGE to enable v8 coverage for spawned processes
  process.env.NODE_V8_COVERAGE = '.v8-coverage'

  // Clear coverage folders
  const { rimrafSync } = await import('rimraf')
  rimrafSync(process.env.NODE_V8_COVERAGE)
  rimrafSync('coverage')
  let reportsPrinted = false

  // If reports are enabled, show reports when the process exits
  if (process.argv.slice(2).includes('--report-coverage')) {
    // Consume argument
    process.argv = process.argv.filter((arg) => arg !== '--report-coverage')

    const reportCoverage = (await import('#utils/printCoverage')).default

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
}

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .ace()
  .handle(process.argv.splice(2))
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
