import { defineLevel } from './_factory';

export const aurora = defineLevel({
  unlockIndex: 3,
  name: 'Aurora',
  biome: 'aurora',
  palette: {
    background: '#111627',
    horizon: '#1b2842',
    accent: '#82c8c4',
    accent2: '#8f9fe4',
    warm: '#d5be87',
    text: '#edf5f8',
  },
  arc: { speed: 600, gravity: 585, cardsPerArc: 5, distractorCount: 4, audioLeadMs: 700 },
  rules: { roundsToComplete: 7, bluffChance: 0, simultaneousTargets: 2, comboRequirement: 0 },
  particles: { kind: 'ribbons', density: 0.24, drift: 0.72 },
  ambientDrone: { baseFrequency: 128, detune: 14, filterCutoff: 760 },
});
