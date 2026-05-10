import { defineLevel } from './_factory';

export const rainfall = defineLevel({
  unlockIndex: 2,
  name: 'Rainfall',
  biome: 'rainfall',
  palette: {
    background: '#101a24',
    horizon: '#193044',
    accent: '#86b8dd',
    accent2: '#7fa3ac',
    warm: '#cbb881',
    text: '#edf5f8',
  },
  arc: { speed: 560, gravity: 560, cardsPerArc: 4, distractorCount: 3, audioLeadMs: 760 },
  rules: { roundsToComplete: 6, bluffChance: 0, simultaneousTargets: 1, comboRequirement: 0 },
  particles: { kind: 'rain', density: 0.45, drift: 0.55 },
  ambientDrone: { baseFrequency: 104, detune: 9, filterCutoff: 620 },
});
