import { Job } from 'adonisjs-jobs'
import { MailersList, MessageBodyTemplates, NodeMailerMessage } from '@adonisjs/mail/types'
import mail from '@adonisjs/mail/services/main'

interface MailJobPayload {
  mailerName: keyof MailersList
  mailMessage: {
    message: NodeMailerMessage
    views: MessageBodyTemplates
  }
  config: unknown
}

export default class SendMailJob extends Job {
  async handle({ mailerName, mailMessage, config }: MailJobPayload) {
    await mail.use(mailerName).sendCompiled(mailMessage, config)
  }
}
