import { defineLevel } from './_factory';

export const reverie = defineLevel({
  unlockIndex: 10,
  name: 'Reverie',
  biome: 'reverie',
  palette: {
    background: '#101421',
    horizon: '#252947',
    accent: '#95bfd1',
    accent2: '#b4a5d0',
    warm: '#d7bb76',
    text: '#f5f6fb',
  },
  arc: { speed: 900, gravity: 720, cardsPerArc: 7, distractorCount: 6, audioLeadMs: 340 },
  rules: { roundsToComplete: 10, bluffChance: 0.28, simultaneousTargets: 2, comboRequirement: 7, fogPulseMs: 1200 },
  particles: { kind: 'ribbons', density: 0.72, drift: 0.86 },
  ambientDrone: { baseFrequency: 132, detune: 21, filterCutoff: 900 },
});
