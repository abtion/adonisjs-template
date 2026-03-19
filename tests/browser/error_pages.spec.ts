import { withGlobalTransaction } from '#services/db'
import { test } from '@japa/runner'

test.group('Error pages', (group) => {
  group.each.setup(() => withGlobalTransaction())

  test('404', async ({ visit }) => {
    const page = await visit('/invalid-url')

    await page.assertTextContains('body', 'pages.errors.notFound.heading')
  })
})
