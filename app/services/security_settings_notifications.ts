import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'

import SecuritySettingsChangedMail, {
  type SecuritySettingsChange,
} from '#mails/security_settings_changed'

type SecurityNotificationRecipient = {
  id: number
  email: string
  name: string | null
}

export async function queueSecuritySettingsChangedMail(
  user: SecurityNotificationRecipient,
  change: SecuritySettingsChange
) {
  try {
    await mail.sendLater(new SecuritySettingsChangedMail(user, change))
  } catch (error) {
    logger.error(
      {
        err: error,
        userId: user.id,
        change: change.type,
      },
      'Unable to queue security settings notification email'
    )
  }
}
