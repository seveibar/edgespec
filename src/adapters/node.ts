import http from "node:http"
import { transformToNodeBuilder } from "src/edge-runtime/transform-to-node.ts"
import type { Middleware } from "src/middleware/index.ts"
import type { EdgeSpecAdapter } from "src/types/edge-spec.ts"

export interface EdgeSpecNodeAdapterOptions {
  middleware?: Middleware[]
  port?: number
}

export const startServer: EdgeSpecAdapter<
  [EdgeSpecNodeAdapterOptions],
  Promise<http.Server>
> = async (edgeSpec, { port, middleware = [] }) => {
  const transformToNode = transformToNodeBuilder({
    defaultOrigin: `http://localhost${port ? `:${port}` : ""}`,
  })

  const server = http.createServer(
    transformToNode((req) =>
      edgeSpec.makeRequest(req, {
        middleware,
      })
    )
  )

  await new Promise<void>((resolve) => server.listen(port, resolve))

  return server
}
