import {TaggedTemplateLiteralInvocationType} from 'slonik'
import * as path from 'path'
import * as fs from 'fs'

/** - query: `select id, n from test_table where id = $1 and n = $2` */
export interface TestTable {
  /** postgres type: `integer` */
  id: number | null

  /** postgres type: `integer` */
  n: number | null
}

/**
 * Helper which reads the file system synchronously to get a query object for ../test-table.sql.
 * (query: `select id, n from test_table where id = $1 and n = $2`)
 *
 * Uses `fs` by default and caches the result so the disk is only accessed once. You can pass in a custom `readFileSync` function for use-cases where disk access is not possible.
 *
 * @example
 * ```
 * import {createPool} from 'slonik'
 * import {getTestTableQuerySync} from './path/to/test-table.sql'
 *
 * async function () {
 *   const pool = createPool('...connection string...')
 *
 *   const result = await pool.query(getTestTableQuerySync())
 *
 *   return result.rows.map(r => [r.id, r.n])
 * }
 * ```
 */
export const getTestTableQuerySync = ({
  readFileSync = defaultReadFileSync,
  params,
}: GetTestTableQuerySyncOptions): TaggedTemplateLiteralInvocationType<TestTable> => ({
  sql: readFileSync(sqlPath).toString(),
  type: 'SLONIK_TOKEN_SQL',
  values: [params['$1'], params['$2']],
})

/**
 * Helper which reads the file system asynchronously to get a query object for ../test-table.sql.
 * (query: `select id, n from test_table where id = $1 and n = $2`)
 *
 * Uses `fs` by default and caches the result so the disk is only accessed once. You can pass in a custom `readFile` function for use-cases where disk access is not possible.
 *
 * @example
 * ```
 * import {createPool} from 'slonik'
 * import {getTestTableQueryAsync} from './path/to/test-table.sql'
 *
 * async function () {
 *   const pool = createPool('...connection string...')
 *
 *   const result = await pool.query(await getTestTableQueryAsync())
 *
 *   return result.rows.map(r => [r.id, r.n])
 * }
 * ```
 */
export const getTestTableQueryAync = async ({
  readFile = defaultReadFileAsync,
  params,
}: GetTestTableQueryAsyncOptions): Promise<TaggedTemplateLiteralInvocationType<TestTable>> => ({
  sql: (await readFile(sqlPath)).toString(),
  type: 'SLONIK_TOKEN_SQL',
  values: [params['$1'], params['$2']],
})
const sqlPath = path.join(__dirname, '../test-table.sql')

export interface FileContent {
  toString(): string
}

export interface GetTestTableQueryParams {
  $1: number
  $2: number
}

export interface GetTestTableQuerySyncOptions {
  readFileSync?: (filepath: string) => FileContent
  params: GetTestTableQueryParams
}

export interface GetTestTableQueryAsyncOptions {
  readFile?: (filepath: string) => Promise<FileContent>
  params: GetTestTableQueryParams
}

export const _queryCache = new Map<string, string>()

export const defaultReadFileSync: GetTestTableQuerySyncOptions['readFileSync'] = (filepath: string) => {
  const cached = _queryCache.get(filepath)
  if (cached) {
    return cached
  }
  const content = fs.readFileSync(filepath).toString()
  _queryCache.set(filepath, content)
  return content
}

export const defaultReadFileAsync: GetTestTableQueryAsyncOptions['readFile'] = async (filepath: string) => {
  const cached = _queryCache.get(filepath)
  if (cached) {
    return cached
  }
  const content = (await fs.promises.readFile(filepath)).toString()
  _queryCache.set(filepath, content)
  return content
}
