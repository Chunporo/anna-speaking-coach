# Local browser verification — 2026-11-01

Tested an isolated Chrome context against the local application and a dedicated PostgreSQL database. The production frontend build used the temporary API at localhost:8011. No production accounts, credentials or recordings were used.

## Passed interactions

- Registration creates an account, logs it in, and loads dashboard progress.
- An incorrect password leaves the user on login with an error message.
- Login restores access; logout returns to login.
- Shared questions load and link to practice pages.
- Custom questions can be created and opened in their own practice page.
- Starting a mock test opens its selected question and recording controls.
- Account navigation works with keyboard-focusable buttons and labelled icon links.

## Layout checks

The dashboard, custom-question listing, question practice and mock-test pages were checked at representative widths: 375, 768 and 1440 pixels. The checked layouts fit the page width after repairs. The activity calendar scrolls within its container. A mobile mock-test screenshot was inspected at /tmp/anna-mock-mobile.png.

There is no committed screenshot baseline, so automated visual-regression comparison is inconclusive. These checks are not a full accessibility audit or Safari/device test. Login fields now have associated labels, the account menu uses a button, and the document language matches the Vietnamese UI.

## Repairs from the check

- Fixed custom-tab API selection, invalid part=0 filtering and missing creation form.
- Added private custom-question retrieval, analysis submission and separate practice history.
- Made the answered-question filter functional.
- Fixed sidebar and content overflow on mobile.
- Fixed recorder reset/stop races, playback URL cleanup and late microphone permission after unmount.

## Automated verification

- Seven PostgreSQL integration regressions pass, including custom-question and recording ownership.
- Three recorder lifecycle tests pass using controlled MediaRecorder and permission events.
- TypeScript checking and the frontend production build pass.
- CI runs the recorder tests alongside the existing build and backend checks.

The final production mock-test page had no console errors. Earlier development checks encountered a missing favicon and a cache conflict caused by running next dev and next build against the same output directory. The cache conflict was resolved by stopping the development server and rebuilding before browser verification.

## Still requires deployment/device verification

Real Google OAuth, Google Speech, Gemini, optional local models, physical microphone recording, Safari, performance measurements and a complete accessibility audit remain unverified. Local provider tests mock AI responses. No release or deployment was performed.
