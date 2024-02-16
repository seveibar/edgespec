import test from "ava"
import { createWithEdgeSpec } from "src/create-with-edge-spec.ts"
import { expectTypeOf } from "expect-type"
import { EdgeSpecResponse } from "src/types/web-handler.ts"
import { z } from "zod"
import { Middleware } from "src/middleware/index.ts"
import { DEFAULT_CONTEXT } from "src/types/context.ts"

const withSessionToken: Middleware<
  {},
  { auth: { session_token: { user: "lucille" } } }
> = (req, ctx, next) => {
  req.auth = { ...req.auth, session_token: { user: "lucille" } }
  return next(req, ctx)
}

const withPat: Middleware<{}, { auth: { pat: { user: "lucille" } } }> = (
  req,
  ctx,
  next
) => {
  req.auth = { ...req.auth, pat: { user: "lucille" } }
  return next(req, ctx)
}

const withApiToken: Middleware<
  {},
  { auth: { api_token: { user: "lucille" } } }
> = (req, ctx, next) => {
  req.auth = { ...req.auth, api_token: { user: "lucille" } }
  return next(req, ctx)
}

const withName: Middleware<{}, { name: string }> = (req, ctx, next) => {
  req.name = "lucille"
  return next(req, ctx)
}

test.skip("auth none is always supported", () => {
  createWithEdgeSpec({
    authMiddleware: {},
  })({
    auth: "none",
    methods: ["GET"],
  })
})

test.skip("auth none is optional", () => {
  createWithEdgeSpec({
    authMiddleware: {},
  })({
    methods: ["GET"],
  })((req, _) => {
    expectTypeOf(req).not.toBeNever()
    return new Response()
  })
})

test.skip("auth none cannot be provided in an array", () => {
  createWithEdgeSpec({
    authMiddleware: {},
  })({
    // @ts-expect-error
    auth: ["none"],
    methods: ["GET"],
  })
})

test.skip("cannot select non-existent auth methods", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {},
  })

  withEdgeSpec({
    // @ts-expect-error
    auth: "session_token",
    methods: ["GET"],
  })

  withEdgeSpec({
    // @ts-expect-error
    auth: ["session_token"],
    methods: ["GET"],
  })
})

test.skip("can select existing middleware", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {
      session_token: (req, ctx, next) => next(req, ctx),
    },
  })

  withEdgeSpec({
    auth: "session_token",
    methods: ["GET"],
  })

  withEdgeSpec({
    auth: ["session_token"],
    methods: ["GET"],
  })
})

test.skip("middleware objects are available", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {},
    beforeAuthMiddleware: [withName],
  })

  withEdgeSpec({
    auth: "none",
    methods: ["GET"],
  })((req) => {
    expectTypeOf<(typeof req)["name"]>().toBeString()

    return new Response()
  })
})

test.skip("auth middleware objects are available as singleton", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {
      session_token: withSessionToken,
    },
  })

  withEdgeSpec({
    auth: "session_token",
    methods: ["GET"],
  })((req) => {
    expectTypeOf<(typeof req)["auth"]>().toMatchTypeOf<{
      session_token: { user: string }
    }>()

    return new Response()
  })
})

test.skip("auth middleware objects are available as union", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {
      session_token: withSessionToken,
      pat: withPat,
      api_token: withApiToken,
    },
  })

  withEdgeSpec({
    auth: ["session_token", "pat"],
    methods: ["GET"],
  })((req) => {
    expectTypeOf<(typeof req)["auth"]>().toMatchTypeOf<
      | {
          session_token: { user: string }
        }
      | {
          pat: { user: string }
        }
    >()

    return new Response()
  })
})

test.skip("route-local middlewares are available to request", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {},
  })

  withEdgeSpec({
    auth: "none",
    methods: ["GET"],
    middleware: [withName],
  })((req) => {
    expectTypeOf<(typeof req)["name"]>().toBeString()

    return new Response()
  })
})

test.skip("route-local middleware with request dependencies works", () => {
  const withFoo: Middleware<{}, { foo: string }> = (req, ctx, next) => {
    req.foo = "bar"
    return next(req, ctx)
  }

  const withName: Middleware<{ foo: string }, { name: string }> = (
    req,
    ctx,
    next
  ) => {
    req.name = "lucille"
    return next(req, ctx)
  }

  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {
      simple: withFoo,
    },
  })

  withEdgeSpec({
    // todo: should not work with none
    auth: "simple",
    methods: ["GET"],
    middleware: [withName],
  })((req) => {
    expectTypeOf<(typeof req)["name"]>().toBeString()

    return new Response()
  })
})

test.skip("custom response map types are enforced", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {},
  })

  withEdgeSpec({
    auth: "none",
    methods: ["GET"],
    customResponseMap: {
      "text/html": z.string(),
      "custom/response": z.number(),
    },
    // @ts-expect-error
  })(() => {
    return EdgeSpecResponse.custom("not a number", "custom/response")
  })({} as any, DEFAULT_CONTEXT)
})

test.skip("route param types", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {},
  })

  withEdgeSpec({
    auth: "none",
    methods: ["GET"],
    routeParams: z.object({ id: z.coerce.number() }),
  })((req) => {
    expectTypeOf(req.routeParams.id).toBeNumber()
    return new Response()
  })({} as any, DEFAULT_CONTEXT)
})

const middlewareWithInputs: Middleware<{ x: number }, { y: number }> = (
  req,
  ctx,
  next
) => next(req, ctx)

test.skip("allows middleware with inputs", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {
      test: middlewareWithInputs,
    },
  })

  withEdgeSpec({
    auth: "test",
    methods: ["GET"],
    routeParams: z.object({ id: z.coerce.number() }),
  })((req) => {
    expectTypeOf(req.y).toBeNumber()
    return new Response()
  })({} as any, DEFAULT_CONTEXT)
})

test.skip("typed ctx.json()", () => {
  const withEdgeSpec = createWithEdgeSpec({
    authMiddleware: {
      test: middlewareWithInputs,
    },
  })

  withEdgeSpec({
    auth: "test",
    methods: ["GET"],
    jsonResponse: z.object({
      id: z.number(),
    }),
    routeParams: z.object({ id: z.coerce.number() }),
  })((req) => {
    expectTypeOf(req.y).toBeNumber()
    return new Response()
  })({} as any, {} as any)
})

test.skip("middlewares have routeParams", () => {
  const _: Middleware = (req, ctx, next) => {
    expectTypeOf(req.routeParams).toMatchTypeOf<Record<string, unknown>>()
    return next(req, ctx)
  }
})

test.skip("middlewares have routeParams which can be typed", () => {
  const _: Middleware<{ routeParams: { fake: string } }> = (req, ctx, next) => {
    expectTypeOf(req.routeParams.fake).toMatchTypeOf<string>()
    return next(req, ctx)
  }
})
