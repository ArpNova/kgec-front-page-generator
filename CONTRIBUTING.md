# Contributing to KGEC Pages

Thanks for your interest in improving KGEC Pages! This is a small, student-maintained project, so the process is intentionally lightweight.

## Before you start

This repository is proprietary (see [LICENSE](LICENSE)) — it isn't open source. By submitting a pull request, you agree that your contribution may be used, modified, and distributed as part of this project under its existing license, and you confirm you have the right to submit the contribution.

If you're planning a larger change, please open an issue first to discuss the approach before investing a lot of time.

## Project structure

The site is plain HTML/CSS/JS with no build step or framework. See the "Project layout" section of the [README](README.md#project-layout) for where things live. Shared logic used by more than one page belongs in `lib/`; page-specific code stays in that page's `index.js`.

## Making a change

1. Fork the repository and create a branch off `main` for your change.
2. Open `index.html` (or the relevant page) directly in a browser, or serve the repo root with any static file server, to try your change.
3. Keep pure logic (parsing, formatting, storage access, etc.) in `lib/` functions that don't touch the DOM, so it stays easy to unit test.
4. Add or update tests in `tests/` for any logic you add or change (see below).
5. Run the test suite and make sure it passes:

   ```bash
   npm test
   ```

6. Commit your changes with a clear, descriptive message and open a pull request against `main`.

## Tests

Unit tests live in `tests/` and use Node's built-in test runner (no dependencies to install). They cover the pure/logic functions exported from `lib/` and page modules — DOM rendering and event wiring generally isn't unit tested, so keep new logic in small, exported, DOM-free functions where possible so it can be tested the same way.

- Run all tests: `npm test`
- Run a single file: `node --test tests/storage.test.js`

Every pull request and push to `main` runs `npm test` plus a JSON validation check via the `CI` workflow (`.github/workflows/ci.yml`). Please make sure both pass locally before opening a PR — a red CI check will block merges.

## Style

- Match the existing code style in the file you're editing (plain ES modules, `const`/`let`, template strings for HTML fragments).
- Avoid adding new build tooling or dependencies unless there's a strong reason — this project deliberately stays dependency-free.
- Keep pages and shared modules browser-native (no bundler, no transpilation).

## Reporting bugs / requesting features

Open a GitHub issue with steps to reproduce (for bugs) or a description of the use case (for feature requests). Screenshots are helpful for UI issues.
