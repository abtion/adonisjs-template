import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import encryption from '@adonisjs/core/services/encryption'
import hash from '@adonisjs/core/services/hash'
import adonis2fa from '@nulix/adonis-2fa/services/main'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('TOTP Setup', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('set up totp from profile page', async ({ browserContext, visit }) => {
    const user = await createUser({
      email: 'user@example.com',
      password: await hash.make('password'),
    })
    await browserContext.loginAs(user)

    const page = await visit('/profile')

    await page.getByRole('button', { name: 'components.totp.setupButton' }).click()

    // Confirm with password
    await page.getByLabel('fields.password').fill('password')
    await page
      .getByRole('button', { name: 'components.securityConfirmation.confirmButton' })
      .click()

    const secretElement = page.getByLabel('components.totp.orKeyManual')
    const secret = await secretElement.inputValue()

    const validOtp = adonis2fa.generateToken(secret!)!
    await page.getByPlaceholder('components.totp.otpPlaceholder').fill(validOtp)
    await page.getByRole('button', { name: 'components.totp.verifyButton' }).click()

    await expect(page.getByText('components.totp.configured')).toBeVisible()
    await expect(page.getByRole('button', { name: 'components.totp.disableButton' })).toBeVisible()
  })

  test('disable totp from profile page', async ({ browserContext, visit }) => {
    const totpSecret = await adonis2fa.generateSecret('user@example.com')

    const user = await createUser({
      email: 'user@example.com',
      password: await hash.make('password'),
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
      totpRecoveryCodesEncrypted: encryption.encrypt(['RECOVERY-CODE-1']),
    })
    await browserContext.loginAs(user)

    const page = await visit('/profile')
    await page.getByRole('button', { name: 'components.totp.disableButton' }).click()

    // Confirm with password
    await page.getByLabel('fields.password').fill('password')
    await page
      .getByRole('button', { name: 'components.securityConfirmation.confirmButton' })
      .click()

    await expect(page.getByText('components.totp.notSetUp')).toBeVisible()
    await expect(page.getByRole('button', { name: 'components.totp.setupButton' })).toBeVisible()
  })

  test('regenerate recovery codes', async ({ browserContext, visit }) => {
    const totpSecret = await adonis2fa.generateSecret('user@example.com')

    const user = await createUser({
      email: 'user@example.com',
      password: await hash.make('password'),
      totpEnabled: true,
      totpSecretEncrypted: encryption.encrypt(totpSecret.secret),
      totpRecoveryCodesEncrypted: encryption.encrypt(['OLD-CODE-1', 'OLD-CODE-2']),
    })
    await browserContext.loginAs(user)

    const page = await visit('/profile')

    // Click generate new recovery codes button
    await page.getByRole('button', { name: 'components.totp.generateButton' }).click()

    // Confirm with password
    await page.getByLabel('fields.password').fill('password')
    await page
      .getByRole('button', { name: 'components.securityConfirmation.confirmButton' })
      .click()

    // New recovery codes should be displayed
    await expect(page.getByText('components.totp.saveAndDownload')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'components.totp.downloadRecoveryCodes' })
    ).toBeVisible()
  })
})
