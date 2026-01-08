import { test } from '@japa/runner'
import sinon from 'sinon'
import mail from '@adonisjs/mail/services/main'
import SendMailJob from '#jobs/send_mail_job'

test.group('Mail queue', () => {
  test('mail.sendLater queues a bull job via SendMailJob', async ({ assert }) => {
    const dispatchStub = sinon.stub(SendMailJob, 'dispatch').resolves()

    await mail.sendLater((message) => {
      message.to('test@example.com')
      message.from('noreply@example.com')
      message.subject('Test email')
      message.text('Hello world')
    })

    assert.isTrue(dispatchStub.calledOnce)

    const [payload, options] = dispatchStub.firstCall.args
    assert.equal(payload.mailerName, 'smtp')
    assert.isDefined(payload.mailMessage)
    assert.equal(options!.queueName, 'mails')
  })
})
