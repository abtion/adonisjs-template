import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import sinon from 'sinon'

import { queueSecuritySettingsChangedMail } from '#services/security_settings_notifications'

test.group('Security settings notifications service', () => {
  test('logs when the notification cannot be queued', async ({ assert }) => {
    const sendLaterStub = sinon.stub(mail, 'sendLater').rejects(new Error('mail queue failed'))
    const loggerErrorStub = sinon.stub(logger, 'error')

    await queueSecuritySettingsChangedMail(
      {
        id: 1,
        email: 'test@example.com',
        name: 'Tester',
      },
      { type: 'totp_enabled' }
    )

    assert.isTrue(sendLaterStub.calledOnce)
    assert.isTrue(loggerErrorStub.calledOnce)
    assert.deepInclude(loggerErrorStub.firstCall.args[0], {
      userId: 1,
      change: 'totp_enabled',
    })
    assert.equal(
      loggerErrorStub.firstCall.args[1],
      'Unable to queue security settings notification email'
    )
  })
})
