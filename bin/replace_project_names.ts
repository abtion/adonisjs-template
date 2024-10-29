#!/usr/bin/env -S node --no-warnings=ExperimentalWarning --loader ts-node/esm

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import readline from 'node:readline/promises'
import { isUtf8 } from 'node:buffer'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

class ProjectName {
  name: string

  constructor(name: string) {
    this.name = name
    this.ensureValid()
  }

  pascalCase(): string {
    return this.name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  snakeCase(): string {
    return this.name.replace(/-/g, '_')
  }

  humanCase(): string {
    return this.name
      .replace(/-/g, ' ')
      .split(/ |_/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  humanParamCase(): string {
    return this.humanCase().split(' ').join('-')
  }

  ensureValid(): void {
    const valid = /^[a-z][a-z\-]+[a-z]$/
    if (!valid.test(this.name)) {
      console.warn(`Invalid project name: ${this.name}`)
      throw new Error(
        'Project name must be "param-case". Valid chars are lowercase letters and "-"'
      )
    }
  }
}

class FileRenamer {
  static async call(): Promise<void> {
    const projectName = await this.getProjectName()
    const files = this.getFiles()

    await Promise.all(
      files.map(async (file) => {
        const replaced = [
          await this.replaceInFile('project-name-param', projectName.name, file),
          await this.replaceInFile('ProjectNamePascal', projectName.pascalCase(), file),
          await this.replaceInFile('project_name_snake', projectName.snakeCase(), file),
          await this.replaceInFile('Project Name Human', projectName.humanCase(), file),
          await this.replaceInFile('Project-Name-Human', projectName.humanParamCase(), file),
        ]

        if (replaced.some(Boolean)) {
          console.log(`Updated: ${file}`)
        }
      })
    )

    console.log(`Delete this script?`)

    let confirmed = null
    while (confirmed === null) {
      const input = (await rl.question('(y)/n: ')) || 'y'
      if (input === 'y' || input === '') {
        confirmed = true
      } else if (input === 'n') {
        confirmed = false
      }
    }

    if (confirmed) fs.unlink(import.meta.filename)
  }

  static getFiles(): string[] {
    const gitOutput = execSync('git ls-tree -r main --name-only').toString().split('\n')
    const ignoredFiles = ['README.md', 'bin/replace_project_names.ts', '']
    return gitOutput.filter(Boolean).filter((file) => !ignoredFiles.includes(file))
  }

  static async getProjectName(): Promise<ProjectName> {
    const argName = process.argv[2] || path.basename(process.cwd())
    const projectName = new ProjectName(argName)

    console.log(`Replace project names with inflections of: "${projectName.name}"?`)

    let confirmed = false
    while (!confirmed) {
      const input = (await rl.question('(y)/n: ')) || 'y'
      if (input === 'y' || input === '') {
        confirmed = true
      } else if (input === 'n') {
        throw new Error('Aborted')
      }
    }

    return projectName
  }

  static async replaceInFile(initialString: string, replacementString: string, file: string) {
    const fileBuffer = await fs.readFile(file)
    if (!isUtf8(fileBuffer)) return

    const content = fileBuffer.toString('utf8')
    const newContent = content.replace(new RegExp(initialString, 'g'), replacementString)

    if (content !== newContent) {
      await fs.writeFile(file, newContent)
      return true
    }
  }
}

FileRenamer.call()
  .catch((error) => console.error(error.message))
  .finally(() => process.exit())
