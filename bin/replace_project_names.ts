#!/usr/bin/env -S node --no-warnings=ExperimentalWarning --loader ts-node/esm

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import readline from 'node:readline/promises'

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

    files.forEach((file) => {
      this.replaceInFile('project-name-param', projectName.name, file)
      this.replaceInFile('ProjectNamePascal', projectName.pascalCase(), file)
      this.replaceInFile('project_name_snake', projectName.snakeCase(), file)
      this.replaceInFile('Project Name Human', projectName.humanCase(), file)
      this.replaceInFile('Project-Name-Human', projectName.humanParamCase(), file)
    })
  }

  static getFiles(): string[] {
    const gitOutput = execSync('git ls-tree -r main --name-only').toString().split('\n')
    const ignoredFiles = ['README.md', 'bin/replace_project_names', '']
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

  static replaceInFile(initialString: string, replacementString: string, file: string): void {
    const content = fs.readFileSync(file, 'utf-8')
    const newContent = content.replace(new RegExp(initialString, 'g'), replacementString)
    // fs.writeFileSync(file, newContent)
  }
}

FileRenamer.call()
  .catch((error) => console.error(error.message))
  .finally(() => process.exit())
