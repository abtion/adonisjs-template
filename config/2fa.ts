import env from '#start/env'
import { defineConfig } from '@nulix/adonis-2fa'

const adonis2faConfig = defineConfig({
  issuer: env.get('APP_ISSUER', 'App Name Human'),
})

export default adonis2faConfig
