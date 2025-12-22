import { test } from '@japa/runner'

test.group('Colors controller', () => {
  test('returns CSS colors', async ({ client, assert }) => {
    const response = await client.get('/colors.css')

    response.assertStatus(200)
    const contentType = response.header('content-type')
    assert.isTrue(
      contentType?.includes('text/css'),
      `Expected content-type to include 'text/css', got: ${contentType}`
    )
    assert.isTrue(response.text().includes('--color-'))
  })

  test('caches CSS colors on subsequent requests', async ({ client, assert }) => {
    const firstResponse = await client.get('/colors.css')
    const secondResponse = await client.get('/colors.css')

    firstResponse.assertStatus(200)
    secondResponse.assertStatus(200)
    // Both responses should have the same content (cached)
    assert.equal(firstResponse.text(), secondResponse.text())
  })
})
