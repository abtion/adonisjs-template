import postcss, { Plugin } from 'postcss'

// PostCSS plugin for wrapping matching CSS files in a cascade layer
type Options = {
  fileNameMatcher?: RegExp
}
export const referencePrefixer = ({ fileNameMatcher }: Options): Plugin => ({
  postcssPlugin: 'postcss-layer',
  Once(root) {
    if (!root.source?.input.file) return

    // Ignore files that don't match the file matcher
    if (!fileNameMatcher?.test(root.source.input.file)) return

    const referenceRule = postcss.atRule({ name: 'reference', params: '"../../css/app.scss"' })
    root.prepend(referenceRule)

    console.log(root.toString())
  },
})
