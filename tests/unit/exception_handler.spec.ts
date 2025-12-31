import { test } from '@japa/runner'
import HttpExceptionHandler from '#exceptions/handler'
import { AuthorizationResponse, errors as bouncerErrors } from '@adonisjs/bouncer'
import { HttpContext } from '@adonisjs/core/http'
import sinon from 'sinon'

test.group('HttpExceptionhandler', () => {
  test('it handles authorization errors with session and inertia', async () => {
    const handler = new HttpExceptionHandler()
    const authResponse = AuthorizationResponse.deny()
    const error = new bouncerErrors.E_AUTHORIZATION_FAILURE(authResponse)

    const mockSession = {
      flashErrors: sinon.fake(),
    }
    const mockResponse = {
      redirect: sinon.fake(),
    }
    const mockRequest = {
      header: sinon.fake((_name) => '1'),
    }

    await handler.handle(error, {
      session: mockSession,
      response: mockResponse,
      request: mockRequest,
    } as unknown as HttpContext)

    sinon.assert.calledWith(mockRequest.header, 'x-inertia')
    sinon.assert.calledWith(mockSession.flashErrors, { base: 'Access denied' })
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
    const mockRequest = {
      header: sinon.fake((_name) => '1'),
    }
    mockResponse.status = sinon.fake(() => mockResponse)

    await handler.handle(error, {
      response: mockResponse,
      request: mockRequest,
    } as unknown as HttpContext)

    sinon.assert.calledWith(mockResponse.status, 403)
    sinon.assert.calledWith(mockResponse.send, { field: 'base', message: error.message })
  })
})
