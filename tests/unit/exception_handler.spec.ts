import { test } from '@japa/runner'
import HttpExceptionHandler from '#exceptions/handler'
import { AuthorizationResponse, errors as bouncerErrors } from '@adonisjs/bouncer'
import { HttpContext } from '@adonisjs/core/http'
import sinon from 'sinon'

test.group('HttpExceptionhandler', () => {
  test('it handles authorization errors with session', async () => {
    const handler = new HttpExceptionHandler()
    const authResponse = AuthorizationResponse.deny()
    const error = new bouncerErrors.E_AUTHORIZATION_FAILURE(authResponse)

    const mockSession = {
      flashErrors: sinon.fake(),
    }
    const mockResponse = {
      redirect: sinon.fake(),
    }

    await handler.handle(error, {
      session: mockSession,
      response: mockResponse,
    } as unknown as HttpContext)

    sinon.assert.calledWith(mockSession.flashErrors, { E_AUTHORIZATION_FAILURE: 'Access denied' })
    sinon.assert.calledWith(mockResponse.redirect, 'back', true)
  })

  test('it handles authorization errors without session', async () => {
    const handler = new HttpExceptionHandler()
    const authResponse = AuthorizationResponse.deny()
    const error = new bouncerErrors.E_AUTHORIZATION_FAILURE(authResponse)

    const mockResponse = {
      status: sinon.fake(),
      send: sinon.fake(),
    }
    mockResponse.status = sinon.fake(() => mockResponse)

    await handler.handle(error, {
      response: mockResponse,
    } as unknown as HttpContext)

    sinon.assert.calledWith(mockResponse.status, 403)
    sinon.assert.calledWith(mockResponse.send, 'Access denied')
  })
})
