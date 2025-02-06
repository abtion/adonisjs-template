import { InitOptions } from 'i18next'
import en from '../../resources/lang/en.json'

const i18nextOptions: Partial<InitOptions> = {
  // Use same interpolation syntax as AdonisJS to provide some interoperability
  interpolation: { prefix: '{', suffix: '}' },
  fallbackLng: process.env.NODE_ENV === 'test' ? 'dev' : 'en',
  resources: {
    en: { translation: en },
  },
}

export default i18nextOptions
