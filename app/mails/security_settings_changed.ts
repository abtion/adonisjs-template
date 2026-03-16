import { BaseMail } from '@adonisjs/mail'

type MailRecipient = {
  email: string
  name: string | null
}

export type SecuritySettingsChange =
  | { type: 'totp_enabled' }
  | { type: 'totp_disabled' }
  | { type: 'totp_recovery_codes_regenerated' }
  | { type: 'passkey_added'; credentialName?: string | null }
  | { type: 'passkey_removed'; credentialName?: string | null }

function normalizeCredentialName(credentialName?: string | null) {
  const name = credentialName?.trim()
  return name ? name : undefined
}

function assertNever(value: never): never {
  throw new Error(`Unhandled change type: ${(value as SecuritySettingsChange).type}`)
}

export default class SecuritySettingsChangedMail extends BaseMail {
  constructor(
    protected recipient: MailRecipient,
    protected change: SecuritySettingsChange
  ) {
    super()
  }

  prepare() {
    const { subject, summary, detail } = this.getContent()
    const greetingName = this.recipient.name || 'there'

    this.message.to(this.recipient.email, this.recipient.name ?? undefined)
    this.message.subject(subject)
    this.message.text(
      [
        `Hi ${greetingName},`,
        '',
        summary,
        detail,
        '',
        'If you did not make this change, review your account security immediately.',
      ]
        .filter((line): line is string => line !== undefined)
        .join('\n')
    )
  }

  protected getContent() {
    switch (this.change.type) {
      case 'totp_enabled':
        return {
          subject: 'Two-factor authentication enabled',
          summary: 'Two-factor authentication was enabled for your account.',
        }
      case 'totp_disabled':
        return {
          subject: 'Two-factor authentication disabled',
          summary: 'Two-factor authentication was disabled for your account.',
        }
      case 'totp_recovery_codes_regenerated':
        return {
          subject: 'Recovery codes regenerated',
          summary: 'New two-factor recovery codes were generated for your account.',
        }
      case 'passkey_added':
        return {
          subject: 'Passkey added',
          summary: 'A passkey was added to your account.',
          detail: this.passkeyDetail(this.change.credentialName),
        }
      case 'passkey_removed':
        return {
          subject: 'Passkey removed',
          summary: 'A passkey was removed from your account.',
          detail: this.passkeyDetail(this.change.credentialName),
        }
      default:
        return assertNever(this.change)
    }
  }

  protected passkeyDetail(credentialName?: string | null) {
    const normalizedCredentialName = normalizeCredentialName(credentialName)
    return normalizedCredentialName ? `Passkey name: ${normalizedCredentialName}` : undefined
  }
}
