import { test } from '@japa/runner'
import sinon from 'sinon'
import TwoFactorMiddleware from '#middleware/two_factor_middleware'

function makeCtx(overrides: Partial<any>) {
  return {
    auth: { user: null },
    route: undefined,
    request: { url: () => '/' },
    response: {
      redirect: sinon.fake(() => ({
        toRoute: sinon.fake(),
      })),
    },
    session: {
      get: () => undefined,
    },
    ...overrides,
  }
}

test.group('TwoFactorMiddleware (unit)', () => {
  test('passes through when no user', async ({ assert }) => {
    const mw = new TwoFactorMiddleware()
    const next = sinon.fake()
    const ctx = makeCtx({})

    await mw.handle(ctx as any, next as any)

    assert.isTrue(next.called)
    sinon.assert.notCalled(ctx.response.redirect as any)
  })

  test('passes through when route is 2fa.*', async ({ assert }) => {
    const mw = new TwoFactorMiddleware()
    const next = sinon.fake()
    const toRoute = sinon.fake()
    const ctx = makeCtx({
      auth: { user: { isTwoFactorEnabled: true } },
      route: { name: '2fa.challenge' },
      response: { redirect: sinon.fake(() => ({ toRoute })) },
      session: { get: () => false },
    })

    await mw.handle(ctx as any, next as any)

    assert.isTrue(next.called)
    sinon.assert.notCalled(toRoute)
  })
})
