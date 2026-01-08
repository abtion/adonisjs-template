import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import SendMailJob from '#jobs/send_mail_job'
import sinon from 'sinon'

test.group('SendMailJob', () => {
  test('handle sends compiled mail message', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const sendCompiledStub = sinon.stub(fakeMailer, 'sendCompiled')
    sendCompiledStub.resolves()

    const job = new SendMailJob()
    const payload = {
      mailerName: 'smtp' as const,
      mailMessage: {
        message: {
          to: ['test@example.com'],
          from: 'noreply@example.com',
          subject: 'Test email',
          text: 'Hello world',
        },
        views: {},
      },
      config: { someOption: true },
    }

    await job.handle(payload)

    assert.isTrue(sendCompiledStub.calledWith(payload.mailMessage, payload.config))
    sendCompiledStub.restore()
    mail.restore()
  })
})
