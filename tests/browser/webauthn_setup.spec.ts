import { withGlobalTransaction } from '#services/db'
import { createUser } from '#tests/support/factories/user'
import { createWebauthnCredential } from '#tests/support/factories/webauthn_credential'
import {
  addBrowserWebauthnCredential,
  initiateBrowserWebauthnAuthenticator,
} from '#tests/support/webauthn'
import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'
import { expect } from '@playwright/test'

test.group('WebAuthn Setup', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('register a single webauthn credential from profile page', async ({
    browserContext,
    visit,
  }) => {
    const user = await createUser({
      email: 'user@example.com',
      password: await hash.make('password'),
    })
    await browserContext.loginAs(user)

    const page = await visit('/profile')

    // Set up virtual authenticator
    const cdpSession = await page.context().newCDPSession(page)
    await initiateBrowserWebauthnAuthenticator(cdpSession)

    // Click register credential button
    await page.getByRole('button', { name: 'components.webauthn.registerCredentialButton' }).click()

    // Confirm with password
    await page.getByLabel('fields.password').fill('password')
    await page
      .getByRole('button', { name: 'components.securityConfirmation.confirmButton' })
      .click()

    // Should show success message and the new credential
    await expect(page.getByText('components.webauthn.credentialRegisteredSuccess')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'components.webauthn.removeButton' })
    ).toBeVisible()

    // Attempt to registor second credential
    await page.getByRole('status').getByRole('button', { name: 'Close' }).click()
    await page
      .getByRole('button', { name: 'components.webauthn.registerAnotherCredentialButton' })
      .click()
    await expect(page.getByText('The authenticator was previously registered')).toBeVisible()
  })

  test('remove webauthn credential', async ({ browserContext, visit }) => {
    const user = await createUser({
      email: 'user@example.com',
      password: await hash.make('password'),
    })
    await browserContext.loginAs(user)

    // Set up virtual authenticator
    const page = await visit('/')
    const cdpSession = await browserContext.newCDPSession(page)
    const authenticatorId = await initiateBrowserWebauthnAuthenticator(cdpSession)
    const { credentialId, publicKeyCose } = await addBrowserWebauthnCredential(
      cdpSession,
      authenticatorId
    )
    await createWebauthnCredential({
      userId: user.id,
      publicKey: publicKeyCose.toString('base64url'),
      credentialId: credentialId.toString('base64url'),
    })

    page.getByRole('link', { name: 'components.nav.profile' }).click()

    // Click remove button
    await page.getByRole('button', { name: 'components.webauthn.removeButton' }).click()

    // Confirm automatically with webauthn credential

    // Should show successf message and no credentials state
    await expect(page.getByText('components.webauthn.credentialRemovedSuccess')).toBeVisible()
    await expect(page.getByText('components.webauthn.noCredentialsRegistered')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'components.webauthn.registerCredentialButton' })
    ).toBeVisible()
  })
})
