import { defineLevel } from './_factory';

export const stillwater = defineLevel({
  unlockIndex: 1,
  name: 'Stillwater',
  biome: 'stillwater',
  palette: {
    background: '#0f1720',
    horizon: '#152331',
    accent: '#7faad4',
    accent2: '#91adb8',
    warm: '#d3b77b',
    text: '#edf5f8',
  },
  arc: { speed: 500, gravity: 520, cardsPerArc: 4, distractorCount: 3, audioLeadMs: 900 },
  rules: { roundsToComplete: 6, bluffChance: 0, simultaneousTargets: 1, comboRequirement: 0 },
  particles: { kind: 'motes', density: 0.18, drift: 0.25 },
  ambientDrone: { baseFrequency: 96, detune: 5, filterCutoff: 520 },
});
