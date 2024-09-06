import getLuminance from './getLuminance.js'

// Based on luminance, pick the best suited contrast color (dark/light) to the target color
export default function getContrastColor(target: string, dark: string, light: string) {
  const targetLuminance = getLuminance(target)
  const darkLuminance = getLuminance(dark)
  const lightLuminance = getLuminance(light)

  const darkDiff = Math.abs(targetLuminance - darkLuminance)
  const lightDiff = Math.abs(targetLuminance - lightLuminance)

  return darkDiff > lightDiff ? dark : light
}
