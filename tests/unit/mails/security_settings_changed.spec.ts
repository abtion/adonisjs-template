import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'

import SecuritySettingsChangedMail from '#mails/security_settings_changed'

test.group('SecuritySettingsChangedMail', () => {
  test('uses fallback greeting and omits unnamed passkey detail', async () => {
    const fakeMailer = mail.fake()

    try {
      await mail.send(
        new SecuritySettingsChangedMail(
          {
            email: 'test@example.com',
            name: null,
          },
          { type: 'passkey_removed' }
        )
      )

      fakeMailer.mails.assertSentCount(SecuritySettingsChangedMail, 1)
      fakeMailer.mails.assertSent(SecuritySettingsChangedMail, (notification) => {
        notification.message.assertTo('test@example.com')
        notification.message.assertSubject('Passkey removed')
        notification.message.assertTextIncludes('Hi there,')
        notification.message.assertTextIncludes('A passkey was removed from your account.')
        return true
      })
    } finally {
      mail.restore()
    }
  })

  test('throws for an unhandled change type', ({ assert }) => {
    const notification = new SecuritySettingsChangedMail(
      {
        email: 'test@example.com',
        name: 'Tester',
      },
      { type: 'invalid' } as any
    )

    assert.throws(() => notification.prepare(), 'Unhandled change type: invalid')
  })
})
