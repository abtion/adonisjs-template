import mail from '@adonisjs/mail/services/main'
import { MailersList } from '@adonisjs/mail/types'
import SendMailJob from '#jobs/send_mail_job'

// add queue handler for sending emails via `sendLater`
mail.setMessenger((mailer) => ({
  async queue(mailMessage, config) {
    await SendMailJob.dispatch(
      {
        mailerName: mailer.name as keyof MailersList,
        mailMessage,
        config,
      },
      { queueName: 'mails' }
    )
  },
}))
