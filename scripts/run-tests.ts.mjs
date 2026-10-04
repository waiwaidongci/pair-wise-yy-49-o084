// 用 esbuild 将 TS 测试与源码打成 ESM，交给 Node 内置 node:test 运行
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const entry = path.resolve(process.argv[2] ?? 'tests/recon.test.ts')
const outfile = path.join(os.tmpdir(), `recon-test-${process.pid}.mjs`)

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile,
})

process.on('exit', () => {
  rm(outfile, { force: true }).catch(() => {})
})

await import(pathToFileURL(outfile).href)
