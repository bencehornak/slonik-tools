import * as fsSyncer from 'fs-syncer'
import * as typegen from '../src'
import {defaultWriteTypes} from '../src/write'
import {getHelper} from './helper'
import * as fs from 'fs'
import * as path from 'path'

export const {typegenOptions, logger, poolHelper: helper} = getHelper({__filename})

jest.mock('prettier')

const mockFormat = jest.spyOn(require('prettier'), 'format')

beforeEach(async () => {
  await helper.pool.query(helper.sql`
    create table test_table(
      id int primary key,
      n int
    );
  `)
})

test('prettier is optional', async () => {
  const syncer = fsSyncer.jestFixture({
    targetState: {
      'index.ts': `
        import {sql} from 'slonik'

        export default sql\`select id, n from test_table\`
      `,
    },
  })

  syncer.sync()

  mockFormat.mockImplementationOnce(() => {
    throw Object.assign(new Error('prettier not found'), {code: 'MODULE_NOT_FOUND'})
  })
  const mockWarn = jest.spyOn(console, 'warn').mockReset()

  await typegen.generate(typegenOptions(syncer.baseDir))

  expect(mockWarn).toBeCalledTimes(1)
  expect(mockWarn.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "prettier failed to run; Your output might be ugly! Install prettier to fix this. prettier not found",
    ]
  `)

  expect(syncer.yaml()).toMatchInlineSnapshot(`
    "---
    index.ts: |-
      import {sql} from 'slonik'
      
      export default sql<queries.TestTable>\`select id, n from test_table\`
      
      export declare namespace queries {
          // Generated by @slonik/typegen
      
          /** - query: \`select id, n from test_table\` */
          export interface TestTable {
      
              /** column: \`ugly_test.test_table.id\`, not null: \`true\`, regtype: \`integer\` */
              id: number;
      
              /** column: \`ugly_test.test_table.n\`, regtype: \`integer\` */
              n: (number) | null;
          }
      }
      "
  `)
})

test('prettier can fail', async () => {
  const syncer = fsSyncer.jestFixture({
    targetState: {
      'index.ts': `
        import {sql} from 'slonik'

        export default sql\`select id, n from test_table\`
      `,
    },
  })

  syncer.sync()

  mockFormat.mockImplementationOnce(() => {
    throw new Error('Syntax error on line 1234')
  })
  const mockWarn = jest.spyOn(console, 'warn').mockReset()

  await typegen.generate(typegenOptions(syncer.baseDir))

  expect(mockWarn).toBeCalledTimes(1)
  expect(mockWarn.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "prettier failed to run; Your output might be ugly! Error below:
    Syntax error on line 1234",
    ]
  `)

  expect(syncer.yaml()).toMatchInlineSnapshot(`
    "---
    index.ts: |-
      import {sql} from 'slonik'
      
      export default sql<queries.TestTable>\`select id, n from test_table\`
      
      export declare namespace queries {
          // Generated by @slonik/typegen
      
          /** - query: \`select id, n from test_table\` */
          export interface TestTable {
      
              /** column: \`ugly_test.test_table.id\`, not null: \`true\`, regtype: \`integer\` */
              id: number;
      
              /** column: \`ugly_test.test_table.n\`, regtype: \`integer\` */
              n: (number) | null;
          }
      }
      "
  `)
})

test('no prettier warning for custom writeTypes', async () => {
  const syncer = fsSyncer.jestFixture({
    targetState: {
      'index.ts': `
        import {sql} from 'slonik';

        export default sql\`select id, n from test_table\`;
      `,
    },
  })

  syncer.sync()

  mockFormat.mockImplementationOnce(() => {
    throw Object.assign(new Error('prettier not found'), {code: 'MODULE_NOT_FOUND'})
  })
  const mockWarn = jest.spyOn(console, 'warn').mockReset()

  const options = typegenOptions(syncer.baseDir)
  await typegen.generate({
    ...options,
    writeTypes: queries => {
      return defaultWriteTypes({
        writeFile: async (filepath, content) => {
          await fs.promises.mkdir(path.dirname(filepath), {recursive: true})
          // dummy lint
          const linted = content.replace(/;/g, '')
          await fs.promises.writeFile(filepath, linted)
        },
      })(queries)
    },
  })

  expect(mockWarn).not.toHaveBeenCalled()

  expect(syncer.yaml()).toMatchInlineSnapshot(`
    "---
    index.ts: |-
      import {sql} from 'slonik'
      
      export default sql<queries.TestTable>\`select id, n from test_table\`
      
      export declare namespace queries {
          // Generated by @slonik/typegen
      
          /** - query: \`select id, n from test_table\` */
          export interface TestTable {
      
              /** column: \`ugly_test.test_table.id\`, not null: \`true\`, regtype: \`integer\` */
              id: number
      
              /** column: \`ugly_test.test_table.n\`, regtype: \`integer\` */
              n: (number) | null
          }
      }
      "
    `)
})
