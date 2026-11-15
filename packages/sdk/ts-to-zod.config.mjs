import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const allModel = readdirSync(join(import.meta.dirname, './src/model'), { withFileTypes: true })
  .filter(v => v.isFile())
  .map(v => v.name)

/** @type {import('ts-to-zod').TsToZodConfig} */
export default allModel.map(name => ({
  name,
  input: `src/model/${name}`,
  output: `src/model/generated/${name}`,
  getSchemaName: identifier => `s${identifier}`,
  jsDocTagFilter: tags => tags.some(tag => tag.name === 'zod'),
}))