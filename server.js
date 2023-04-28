// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

export async function createServer(
  root = process.cwd(),
  hmrPort,
) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const resolve = (p) => path.resolve(__dirname, p)

  const indexProd = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
  const manifest = JSON.parse(fs.readFileSync(resolve('dist/client/ssr-manifest.json'), 'utf-8'))

  const app = express()

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite
    app.use((await import('compression')).default())
    app.use(
      '/test/',
      (await import('serve-static')).default(resolve('dist/client'), {
        index: false,
      }),
    )

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl.replace('/test/', '/')

      let template, render
        template = indexProd
        // @ts-ignore
        render = (await import('./dist/server/entry-server.js')).render

      const [appHtml, preloadLinks] = await render(url, manifest)

      const html = template
        .replace(`<!--preload-links-->`, preloadLinks)
        .replace(`<!--app-html-->`, appHtml)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      vite && vite.ssrFixStacktrace(e)
      console.log(e.stack)
      res.status(500).end(e.stack)
    }
  })

  return { app, vite }
}
