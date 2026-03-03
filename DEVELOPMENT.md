# Development

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Running Tests

```bash
npm test
```

Tests use [Vitest](https://vitest.dev/) and run without any external dependencies (LeetCode API and PostgreSQL are fully mocked).

### Test structure

| File | What it covers |
|---|---|
| `src/utils/user-data/get-user-data.test.ts` | LeetCode data fetching: valid user, non-existent user (`matchedUser=null`), missing `allQuestionsCount`, null `submitStats` |
| `src/utils/data-retriever.test.ts` | Caching layer: successful fetch+cache, DB write failure resilience, DB read failure resilience, invalid cache data rejection |
| `src/app/badge/[user]/route.test.ts` | Route handler: successful SVG response, null user data, unhandled exceptions from `renderSvg` and `retrieveUserData` |

### Watch mode

```bash
npx vitest
```

### Run a single test file

```bash
npx vitest run src/utils/user-data/get-user-data.test.ts
```

## Dev Server

```bash
npm run dev
```

## Build

```bash
npm run build
```
