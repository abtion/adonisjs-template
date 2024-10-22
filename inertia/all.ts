// NEEDED FOR FULL COVERAGE
// The front-end istanbul coverage setup can only provide coverage for files built by vite.
// This file - which we only include in our test build - imports all FE files, so that we get
// coverage even for unused files

import.meta.glob(['./**/*.tsx', '!**/*test.tsx'], { eager: true })
