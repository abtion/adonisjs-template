// NEEDED FOR FULL COVERAGE
// The front-end test coverage setup can only provided coverage information for files built by vite.
// This file - which we only include in our test build - imports all FE files into the built.

import.meta.glob(['./**/*.tsx', '!**/*test.tsx'], { eager: true })
