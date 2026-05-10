import { defineLevel } from './_factory';

export const solstice = defineLevel({
  unlockIndex: 9,
  name: 'Solstice',
  biome: 'solstice',
  palette: {
    background: '#17151a',
    horizon: '#342b22',
    accent: '#d6b46f',
    accent2: '#86aeb9',
    warm: '#e0bc62',
    text: '#fff6dd',
  },
  arc: { speed: 850, gravity: 700, cardsPerArc: 7, distractorCount: 6, audioLeadMs: 390 },
  rules: { roundsToComplete: 9, bluffChance: 0.24, simultaneousTargets: 2, comboRequirement: 5 },
  particles: { kind: 'motes', density: 0.62, drift: 0.64 },
  ambientDrone: { baseFrequency: 118, detune: 15, filterCutoff: 820 },
});
