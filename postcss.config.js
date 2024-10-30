import { cascadeLayerPrefixer } from './utils/cascade_layer_prefixer.js'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    tailwindcss,
    cascadeLayerPrefixer({
      layerName: 'components',
      fileNameMatcher: /\/components\/.+/,
    }),
    autoprefixer,
  ],
}
