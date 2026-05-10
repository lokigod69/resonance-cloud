import { defineLevel } from './_factory';

export const driftwood = defineLevel({
  unlockIndex: 4,
  name: 'Driftwood',
  biome: 'driftwood',
  palette: {
    background: '#151a1b',
    horizon: '#26302c',
    accent: '#7fa3a0',
    accent2: '#a29b82',
    warm: '#caa26e',
    text: '#edf1ec',
  },
  arc: { speed: 620, gravity: 540, cardsPerArc: 5, distractorCount: 4, audioLeadMs: 640 },
  rules: { roundsToComplete: 7, bluffChance: 0, simultaneousTargets: 1, comboRequirement: 0 },
  particles: { kind: 'debris', density: 0.3, drift: 0.45 },
  ambientDrone: { baseFrequency: 88, detune: 7, filterCutoff: 470 },
});
