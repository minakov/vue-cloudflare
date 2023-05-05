import { createRouter as _createRouter, createMemoryHistory, createWebHistory } from 'vue-router'

// Auto generates routes from vue files under ./pages
// https://vitejs.dev/guide/features.html#glob-import
const pages = import.meta.glob('./pages/*.vue', { eager: true })

const routes = Object.entries(pages).map(([path, component]) => {
  const name = path.match(/\.\/pages(.*)\.vue$/)[1].toLowerCase()
  return {
    path: name === '/home' ? '/' : name,
    component
  }
})

export function createRouter() {
  return _createRouter({
    // use appropriate history implementation for server/client
    // import.meta.env.SSR is injected by Vite.
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes
  })
}
