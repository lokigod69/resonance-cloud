# Guided Today Checkpoint Testing

Quick Review appears only after a full Guided Today path is complete in the active vibe. With three completed paths, the checkpoint selector samples eight items and distributes them roughly 3/3/2 across the completed paths.

## Local Browser Fixture

Use this only in a local development browser. It writes Guided Today progress to localStorage for the currently authenticated user so `/today` can show the Quick Review card without manually completing 30 lessons.

1. Open `/today` while signed in.
2. Open the browser console.
3. Paste the fixture below.
4. Refresh `/today`.
5. Select the same vibe used by the fixture, then open `Kurze Wiederholung`.

```js
(() => {
  const vibe = 'bright'; // 'bright', 'wistful', or 'sharp'
  const now = new Date().toISOString();
  const lessonIdsByPath = {
    'english-a1-practical-1': [
      'english-a1-practical-001-first-contact',
      'english-a1-practical-002-polite-follow-up',
      'english-a1-practical-003-where-is',
      'english-a1-practical-004-id-like',
      'english-a1-practical-005-how-much',
      'english-a1-practical-006-the-train',
      'english-a1-practical-007-i-need',
      'english-a1-practical-008-i-like',
      'english-a1-practical-009-tomorrow-at-seven',
      'english-a1-practical-010-thank-you-goodbye',
    ],
    'english-a1-practical-2': [
      'english-a1-practical-2-001-i-dont-understand',
      'english-a1-practical-2-002-write-it-down',
      'english-a1-practical-2-003-show-me',
      'english-a1-practical-2-004-which-one',
      'english-a1-practical-2-005-do-you-have',
      'english-a1-practical-2-006-by-card',
      'english-a1-practical-2-007-a-receipt-please',
      'english-a1-practical-2-008-i-have-a-reservation',
      'english-a1-practical-2-009-is-this-right',
      'english-a1-practical-2-010-one-moment',
    ],
    'english-a1-practical-3': [
      'english-a1-practical-3-001-right-or-left',
      'english-a1-practical-3-002-how-far-is-it',
      'english-a1-practical-3-003-is-it-open',
      'english-a1-practical-3-004-which-bus',
      'english-a1-practical-3-005-the-next-stop',
      'english-a1-practical-3-006-a-ticket-please',
      'english-a1-practical-3-007-what-time-does-it-close',
      'english-a1-practical-3-008-the-corner',
      'english-a1-practical-3-009-by-foot-or-by-taxi',
      'english-a1-practical-3-010-i-missed-my-stop',
    ],
  };

  const userId = Object.keys(localStorage)
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null')?.user?.id;
      } catch {
        return undefined;
      }
    })
    .find(Boolean);

  if (!userId) {
    throw new Error('Could not find the authenticated user id in localStorage. Sign in, refresh, and try again.');
  }

  const courses = Object.fromEntries(Object.entries(lessonIdsByPath).map(([pathId, lessonIds]) => [
    pathId,
    {
      baseLanguage: 'German',
      targetLanguage: 'English',
      currentLessonId: lessonIds[lessonIds.length - 1],
      completedLessonIds: lessonIds,
      skippedLessonIds: [],
      lessons: Object.fromEntries(lessonIds.map((lessonId) => [
        lessonId,
        {
          status: 'completed',
          completedAt: now,
          result: {
            buildAttempts: 1,
            typeAttempts: 1,
            typeUsedFallback: false,
            speakAttempts: 1,
            speakTranscriptMatch: 1,
            speakPassed: true,
            knownMarkedCount: 0,
          },
          vibeCompletions: {
            [vibe]: {
              completedAt: now,
              result: {
                buildAttempts: 1,
                typeAttempts: 1,
                typeUsedFallback: false,
                speakAttempts: 1,
                speakTranscriptMatch: 1,
                speakPassed: true,
                knownMarkedCount: 0,
              },
            },
          },
        },
      ])),
    },
  ]));

  localStorage.setItem(`resonance_today_progress_v1_${userId}`, JSON.stringify({
    schemaVersion: 2,
    updatedAt: now,
    courses,
  }));
  localStorage.setItem('resonance_guided_vibe__english-a1-practical-1', vibe);
  localStorage.setItem('resonance_guided_vibe__english-a1-practical-2', vibe);
  localStorage.setItem('resonance_guided_vibe__english-a1-practical-3', vibe);
  console.info(`Guided Today checkpoint fixture installed for ${userId} / ${vibe}. Refresh /today.`);
})();
```

## Reset

To reset this local fixture, run:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith('resonance_today_progress_v1_') || key.startsWith('guided_checkpoint_') || key.startsWith('resonance_guided_vibe__'))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```
