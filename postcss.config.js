import { cascadeLayerPrefixer } from './utils/cascade_layer_prefixer.js'
import { referencePrefixer } from './utils/reference_prefixer.js'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    referencePrefixer({ fileNameMatcher: /\/components\/.+/ }),
    // tailwindcss,
    cascadeLayerPrefixer({
      layerName: 'components',
      fileNameMatcher: /\/components\/.+/,
    }),
    autoprefixer,
  ],
}
