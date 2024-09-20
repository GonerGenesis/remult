export const DATABASES = {
  json: { display: 'JSON' },
  postgres: {
    display: 'Postgres',
    dependencies: {
      pg: '^8.3.0',
    },
    imports: [
      {
        from: 'remult/postgres',
        imports: ['createPostgresDataProvider'],
      },
    ],
    code: `createPostgresDataProvider({
  connectionString: process.env["DATABASE_URL"]    
})`,
  },
  mysql: {
    display: 'MySQL',
    dependencies: {
      knex: '^2.4.0',
      mysql2: '^3.9.8',
    },
    imports: [
      {
        from: 'remult/remult-knex',
        imports: ['createKnexDataProvider'],
      },
    ],
    code: `createKnexDataProvider({
  client: "mysql2",
  connection: {
    host: process.env['MYSQL_HOST'],
    database: process.env['MYSQL_DATABASE'],
    user: process.env['MYSQL_USER'],
    password: process.env['MYSQL_PASSWORD'],
    port: process.env['MYSQL_PORT'] ? Number(process.env['MYSQL_PORT']) : undefined,
  },
})`,
  },
  mongodb: {
    display: 'MongoDB',
    dependencies: {
      mongodb: '^4.17.1',
    },
    imports: [
      {
        from: 'mongodb',
        imports: ['MongoClient'],
      },
      {
        from: 'remult/remult-mongo',
        imports: ['MongoDataProvider'],
      },
    ],
    code: `async () => {
  const client = new MongoClient(process.env['MONGO_URL']!)
  await client.connect()
  return new MongoDataProvider(client.db(process.env['MONGO_DB']), client)
},`,
  },
  bettersqlite3: {
    display: 'Better SQLite3',
    dependencies: {
      'better-sqlite3': '^9.1.1',
    },
    imports: [
      {
        from: 'remult',
        imports: ['SqlDatabase'],
      },
      {
        from: 'better-sqlite3',
        imports: ['Database'],
        defaultImport: true,
      },
      {
        from: 'remult/remult-better-sqlite3',
        imports: ['BetterSqlite3DataProvider'],
      },
    ],
    code: `new SqlDatabase( 
  new BetterSqlite3DataProvider(new Database('./mydb.sqlite')), 
), `,
  },
  sqlite3: {
    display: 'SQLite3',
    dependencies: {
      sqlite3: '^5.1.7',
    },
    imports: [
      {
        from: 'remult',
        imports: ['SqlDatabase'],
      },
      {
        from: 'sqlite3',
        imports: ['sqlite3'],
        defaultImport: true,
      },
      {
        from: 'remult/remult-sqlite3',
        imports: ['Sqlite3DataProvider '],
      },
    ],
    code: `new SqlDatabase( 
  new Sqlite3DataProvider (new sqlite3.Database('./mydb.sqlite')), 
), `,
  },
  mssql: {
    display: 'MSSQL',
    dependencies: {
      tedious: '^18.2.0',
      knex: '^2.4.0',
    },
    imports: [
      {
        from: 'remult/remult-knex',
        imports: ['createKnexDataProvider'],
      },
    ],
    code: `createKnexDataProvider({
  client: "mssql",
  connection: {
    server: process.env["MSSQL_SERVER"],
    database: process.env["MSSQL_DATABASE"],
    user: process.env["MSSQL_USER"],
    password: process.env["MSSQL_PASSWORD"],
    options: {
      enableArithAbort: true,
      encrypt: false,
      instanceName: process.env["MSSQL_INSTANCE"],
    },
  }
})`,
  },
} satisfies Record<string, DatabaseType>

export const databaseTypes = Object.keys(
  DATABASES,
) as (keyof typeof DATABASES)[]
type Import = { from: string; imports: string[]; defaultImport?: boolean }
export type DatabaseType = {
  display: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  imports?: Import[]
  code?: string
}
