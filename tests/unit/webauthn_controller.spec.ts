import { test } from '@japa/runner'
import sinon from 'sinon'
import WebauthnController from '#controllers/webauthn_controller'
import type { HttpContext } from '@adonisjs/core/http'

function makeMockContext(overrides: Partial<HttpContext> = {}): HttpContext {
  return {
    auth: { user: null },
    session: {
      get: sinon.fake(),
      put: sinon.fake(),
      forget: sinon.fake(),
    },
    response: {
      unauthorized: sinon.fake((body: any) => ({ body })),
      badRequest: sinon.fake((body: any) => ({ body })),
    },
    request: {
      input: sinon.fake(),
    },
    i18n: {
      formatMessage: sinon.fake((key: string) => key),
    },
    ...overrides,
  } as unknown as HttpContext
}

test.group('WebauthnController (unit)', () => {
  test('registerOptions returns unauthorized when user is null', async ({ assert }) => {
    const controller = new WebauthnController()
    const ctx = makeMockContext()

    const result = await controller.registerOptions(ctx)

    assert.isTrue((ctx.response.unauthorized as sinon.SinonSpy).called)
    assert.deepEqual((ctx.response.unauthorized as sinon.SinonSpy).firstCall.args[0], {
      message: 'errors.unauthorized',
    })
  })

  test('verifyRegistration returns unauthorized when user is null', async ({ assert }) => {
    const controller = new WebauthnController()
    const ctx = makeMockContext()

    const result = await controller.verifyRegistration(ctx)

    assert.isTrue((ctx.response.unauthorized as sinon.SinonSpy).called)
    assert.deepEqual((ctx.response.unauthorized as sinon.SinonSpy).firstCall.args[0], {
      message: 'errors.unauthorized',
    })
  })
})
