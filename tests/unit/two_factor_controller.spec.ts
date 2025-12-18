import { test } from '@japa/runner'
import sinon from 'sinon'
import TwoFactorController from '#controllers/two_factor_controller'
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
      redirect: sinon.fake(() => ({
        toRoute: sinon.fake(),
      })),
    },
    request: {
      validateUsing: sinon.fake(),
      input: sinon.fake(),
    },
    i18n: {
      formatMessage: sinon.fake((key: string) => key),
    },
    ...overrides,
  } as unknown as HttpContext
}

test.group('TwoFactorController (unit)', () => {
  test('generateRecoveryCodes returns unauthorized when user is null', async ({ assert }) => {
    const controller = new TwoFactorController()
    const ctx = makeMockContext()

    await controller.generateRecoveryCodes(ctx)

    assert.isTrue((ctx.response.unauthorized as sinon.SinonSpy).called)
    assert.deepEqual((ctx.response.unauthorized as sinon.SinonSpy).firstCall.args[0], {
      message: 'errors.unauthorized',
    })
  })

  test('disable returns unauthorized when user is null', async ({ assert }) => {
    const controller = new TwoFactorController()
    const ctx = makeMockContext()

    await controller.disable(ctx)

    assert.isTrue((ctx.response.unauthorized as sinon.SinonSpy).called)
    assert.deepEqual((ctx.response.unauthorized as sinon.SinonSpy).firstCall.args[0], {
      message: 'errors.unauthorized',
    })
  })

  test('verify returns unauthorized when user is null', async ({ assert }) => {
    const controller = new TwoFactorController()
    const ctx = makeMockContext()

    await controller.verify(ctx)

    assert.isTrue((ctx.response.unauthorized as sinon.SinonSpy).called)
    assert.deepEqual((ctx.response.unauthorized as sinon.SinonSpy).firstCall.args[0], {
      message: 'errors.unauthorized',
    })
  })
})
