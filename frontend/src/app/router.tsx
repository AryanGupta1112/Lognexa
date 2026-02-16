import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routes/route-tree'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadDelay: 150
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
