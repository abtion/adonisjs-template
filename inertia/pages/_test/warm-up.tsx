// Load all modules in order to:
// - Get coverage for all frontend files (also those that are otherwise not loaded)
// - Warm up vite, to make the other tests faster
import.meta.glob(['../**/**/*.tsx', '!**/*test.tsx', '!../app/*.tsx'], { eager: true })

export default () => null
