import BasicAuthMiddleware from '#middleware/basic_auth_middleware'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import sinon from 'sinon'

test.group('Basic auth middleware', () => {
  test('allows valid credentials', async ({ assert }) => {
    const middleware = new BasicAuthMiddleware()

    const ctx = await testUtils.createHttpContext()
    const spy = sinon.stub(ctx.request, 'header')
    spy.withArgs('authorization').returns('Basic ' + Buffer.from('admin:secret').toString('base64'))

    const nextFunction = sinon.fake()
    await middleware.handle(ctx, nextFunction, { user: 'admin', password: 'secret' })

    assert.isTrue(nextFunction.calledOnce)
  })

  test('rejects invalid credentials', async ({ assert }) => {
    const middleware = new BasicAuthMiddleware()

    const ctx = await testUtils.createHttpContext()
    const spy = sinon.stub(ctx.request, 'header')
    spy
      .withArgs('authorization')
      .returns('Basic ' + Buffer.from('wrong:credentials').toString('base64'))

    await assert.rejects(
      () => middleware.handle(ctx, async () => {}, { user: 'admin', password: 'secret' }),
      'Unauthorized'
    )
    assert.equal(ctx.response.getHeader('WWW-Authenticate'), 'Basic realm="Restricted Area"')
  })

  test('rejects malformed auth', async ({ assert }) => {
    const middleware = new BasicAuthMiddleware()
    const ctx = await testUtils.createHttpContext()
    const spy = sinon.stub(ctx.request, 'header')
    spy.withArgs('authorization').returns('!{[invalidbase64}]!')

    await assert.rejects(
      () => middleware.handle(ctx, async () => {}, { user: 'admin', password: 'secret' }),
      'Unauthorized'
    )
    assert.equal(ctx.response.getHeader('WWW-Authenticate'), 'Basic realm="Restricted Area"')
  })

  test('rejects missing auth header', async ({ assert }) => {
    const middleware = new BasicAuthMiddleware()
    const ctx = await testUtils.createHttpContext()

    await assert.rejects(
      () => middleware.handle(ctx, async () => {}, { user: 'admin', password: 'secret' }),
      'Unauthorized'
    )
    assert.equal(ctx.response.getHeader('WWW-Authenticate'), 'Basic realm="Restricted Area"')
  })
})
