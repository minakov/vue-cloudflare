import { renderToString, type SSRContext } from 'vue/server-renderer'
import { type Fetcher, type ExportedHandler, Response } from '@cloudflare/workers-types'
import { createApp } from './main'

interface Env {
  ASSETS: Fetcher
}

function renderPreloadLinks(modules: any, manifest: Record<string, string[]>): string {
  let links = ''
  const seen = new Set()
  modules.forEach((id: string) => {
    const files = manifest[id]
    if (files) {
      files.forEach((file) => {
        if (!seen.has(file)) {
          seen.add(file)
          const filename = file.replace(/.*\//, '')
          if (manifest[filename]) {
            for (const depFile of manifest[filename]) {
              links += renderPreloadLink(depFile)
              seen.add(depFile)
            }
          }
          links += renderPreloadLink(file)
        }
      })
    }
  })
  return links
}

function renderPreloadLink(file: string): string {
  if (file.endsWith('.js')) {
    return `<link rel="modulepreload" crossorigin href="${file}">`
  } else if (file.endsWith('.css')) {
    return `<link rel="stylesheet" href="${file}">`
  } else if (file.endsWith('.woff')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  } else if (file.endsWith('.woff2')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  } else if (file.endsWith('.gif')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
  } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
  } else if (file.endsWith('.png')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`
  } else {
    // TODO
    return ''
  }
}

const handler: ExportedHandler<Env> = {
  async fetch(request, env) {
    const template = await (await env.ASSETS.fetch('http://local/template.txt')).text()
    const manifest = await (await env.ASSETS.fetch('http://local/ssr-manifest.json')).json<Record<string, string[]>>()

    let response: Response | undefined;
    try {
      response = await env.ASSETS.fetch(request.url, request.clone())
      response = response && response.status >= 200 && response.status < 400 ? new Response(response.body, response) : undefined;
    } catch {
      // no-op
    }
    if (response) {
      return response
    }

    const { app, router } = createApp()

    // set the router to the desired URL before rendering
    await router.push(request.url)
    await router.isReady()

    // passing SSR context object which will be available via useSSRContext()
    // @vitejs/plugin-vue injects code into a component's setup() that registers
    // itself on ctx.modules. After the render, ctx.modules would contain all the
    // components that have been instantiated during this render call.
    const ctx: SSRContext = {}
    const body = await renderToString(app, ctx)
    const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
    const html = template.replace(`<!--preload-links-->`, preloadLinks).replace(`<!--app-html-->`, body)

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
}

export default handler;