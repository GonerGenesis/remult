import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import spawn from 'cross-spawn'
import minimist from 'minimist'
import prompts from 'prompts'
import colors from 'picocolors'
import { emptyDir } from './empty-dir'
import {
  FRAMEWORKS,
  Servers,
  type Framework,
  type ServerInfo,
} from './FRAMEWORKS'
import { DATABASES, databaseTypes, type DatabaseType } from './DATABASES'

const {
  blue,
  blueBright,
  cyan,
  green,
  greenBright,
  magenta,
  red,
  redBright,
  reset,
  yellow,
} = colors

const argv = minimist<{
  template?: string
  help?: boolean
}>(process.argv.slice(2), {
  default: { help: false },
  alias: { h: 'help', t: 'template' },
  string: ['_'],
})
const cwd = process.cwd()

// prettier-ignore
const helpMessage = `\
Usage: create-remult [OPTION]... [DIRECTORY]

Create a new Remult TypeScript project.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        use a specific template
  -d, --database NAME        use a specific database
  -s, --server NAME          use a specific server

Available templates:
${FRAMEWORKS.map((f) => `  ${f.name}`).join('\n')}

Available databases:
${databaseTypes.map(x=>'  '+x).join('\n')}

Available servers:
${Object.keys(Servers).map(x=>'  '+x).join('\n')}
`

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
}

const defaultTargetDir = 'remult-project'

async function init() {
  const argTargetDir = formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t
  const argDatabase = argv.database || argv.d
  const argServer = argv.server || argv.s

  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  let targetDir = argTargetDir || defaultTargetDir
  const getProjectName = () =>
    targetDir === '.' ? path.basename(path.resolve()) : targetDir

  let result: prompts.Answers<
    | 'projectName'
    | 'overwrite'
    | 'packageName'
    | 'framework'
    | 'server'
    | 'database'
  >

  prompts.override({
    overwrite: argv.overwrite,
  })

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'select',
          name: 'overwrite',
          message: () =>
            (targetDir === '.'
              ? 'Current directory'
              : `Target directory "${targetDir}"`) +
            ` is not empty. Please choose how to proceed:`,
          initial: 0,
          choices: [
            {
              title: 'Remove existing files and continue',
              value: 'yes',
            },
            {
              title: 'Cancel operation',
              value: 'no',
            },
            {
              title: 'Ignore files and continue',
              value: 'ignore',
            },
          ],
        },

        {
          type: (_, { overwrite }: { overwrite?: string }) => {
            if (overwrite === 'no') {
              throw new Error(red('✖') + ' Operation cancelled')
            }
            return null
          },
          name: 'overwriteChecker',
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: reset('Package name:'),
          initial: () => toValidPackageName(getProjectName()),
          validate: (dir) =>
            isValidPackageName(dir) || 'Invalid package.json name',
        },
        {
          type:
            argTemplate && FRAMEWORKS.find((x) => x.name === argTemplate)
              ? null
              : 'select',
          name: 'framework',
          message:
            typeof argTemplate === 'string' &&
            !FRAMEWORKS.find((x) => x.name === argTemplate)
              ? reset(
                  `"${argTemplate}" isn't a valid template. Please choose from below: `,
                )
              : reset('Select a framework:'),
          initial: 0,
          choices: FRAMEWORKS.map((framework) => {
            const frameworkColor = framework.color
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework,
            }
          }),
        },

        {
          type: (framework: Framework) =>
            framework &&
            !framework.serverInfo &&
            (!argServer || !Servers[argServer as keyof typeof Servers])
              ? 'select'
              : null,
          name: 'server',
          initial: 0,
          message: reset('Select a web server:'),
          choices: (framework: Framework) =>
            Object.keys(Servers).map((server) => ({
              title: Servers[server as keyof typeof Servers].display || server,
              value: Servers[server as keyof typeof Servers],
            })),
        },
        {
          type:
            argDatabase && databaseTypes.includes(argDatabase)
              ? null
              : 'select',
          name: 'database',
          message: reset('Database type:'),
          initial: 0,
          validate: (dir) =>
            databaseTypes.includes(dir) || 'Invalid database type',
          choices: databaseTypes.map((db) => {
            return {
              title: DATABASES[db].display,
              value: DATABASES[db],
            }
          }),
        },
      ],

      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled')
        },
      },
    )
  } catch (cancelled: any) {
    console.log(cancelled.message)
    return
  }

  // user choice associated with prompts
  const { framework, overwrite, packageName, database, server } = result

  const root = path.join(cwd, targetDir)

  if (overwrite === 'yes') {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  // determine template
  let template: string = framework?.name || argTemplate

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log(`\nScaffolding project in ${root}...`)

  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../..',
    `templates/${template}`,
  )

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter(
    (f) => f !== 'package.json' && !f.includes('node_modules'),
  )) {
    write(file)
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'),
  )

  pkg.name = packageName || getProjectName()
  const db: DatabaseType =
    database || DATABASES[argDatabase as keyof typeof DATABASES]
  const fw: Framework = framework || FRAMEWORKS.find((x) => x.name == template)!
  const safeServer: ServerInfo =
    fw.serverInfo ||
    server ||
    Servers[argServer as keyof typeof Servers] ||
    Servers.express

  pkg.dependencies = {
    ...pkg.dependencies,
    ...db.dependencies,
    ...safeServer.dependencies,
  }
  pkg.devDependencies = {
    ...pkg.devDependencies,
    ...db.devDependencies,
    ...safeServer.devDependencies,
  }

  write('package.json', JSON.stringify(pkg, null, 2) + '\n')

  let imports: DatabaseType['imports'] = db.imports || []

  imports.unshift({
    from: 'remult/' + safeServer.import,
    imports: [safeServer.remultServerFunction],
  })
  let api = `export const api = ${safeServer.remultServerFunction}({});`
  if (db.code) {
    api = `export const api = ${safeServer.remultServerFunction}({
  dataProvider: ${db.code.split('\n').join('\n  ')}
})`
  }

  fs.writeFileSync(
    path.join(root, safeServer.path || 'src/server/api.ts'),
    imports
      .map(({ from, imports, defaultImport }) =>
        defaultImport
          ? `import ${imports[0]} from "${from}"`
          : `import { ${imports.join(', ')} } from "${from}"`,
      )
      .join('\n') +
      '\n\n' +
      api,
  )
  if (safeServer.indexTs) {
    fs.writeFileSync(
      path.join(root, safeServer.path || 'src/server/index.ts'),
      safeServer.indexTs(fw.distLocation?.(getProjectName()) || 'dist'),
    )
  }

  const cdProjectName = path.relative(cwd, root)
  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    console.log(
      `  cd ${
        cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
      }`,
    )
  }

  console.log(`  ${pkgManager} install`)

  const envVariableRegex = /process\.env\[['"](.+?)['"]\]/g

  let match
  const envVariables = []
  while ((match = envVariableRegex.exec(db.code ?? '')) !== null) {
    envVariables.push(match[1])
  }

  // Output the array of environment variables
  const envFile = fw.envFile || '.env'
  if (envVariables.length > 0) {
    console.log(
      `  Set the following environment variables in the '${envFile}' file:`,
    )
    envVariables.forEach((env) => {
      console.log(`    ${env}`)
    })
    fs.writeFileSync(
      path.join(root, envFile),
      envVariables.map((x) => x + '=').join('\n'),
    )
  }

  if (template === 'sveltekit' || template == 'nextjs') {
    console.log(`  npm run dev`)
  } else {
    console.log(`  Open two terminals:
    Run "npm run dev" in one for the frontend.
    Run "npm run dev-node" in the other for the backend.`)
  }

  function copy(src: string, dest: string) {
    const stat = fs.statSync(src)
    if (stat.isDirectory()) {
      copyDir(src, dest)
    } else if (['.woff'].includes(path.extname(src).toLowerCase())) {
      fs.copyFileSync(src, dest)
    } else {
      fs.writeFileSync(
        dest,
        fs
          .readFileSync(src)
          .toString()
          .replaceAll('project-name-to-be-replaced', getProjectName()),
      )
    }
  }
  function copyDir(srcDir: string, destDir: string) {
    fs.mkdirSync(destDir, { recursive: true })
    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.resolve(srcDir, file)
      const destFile = path.resolve(destDir, file)
      copy(srcFile, destFile)
    }
  }
}

function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName,
  )
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

function editFile(file: string, callback: (content: string) => string) {
  const content = fs.readFileSync(file, 'utf-8')
  fs.writeFileSync(file, callback(content), 'utf-8')
}

init().catch((e) => {
  console.error(e)
  process.exit(1)
})
