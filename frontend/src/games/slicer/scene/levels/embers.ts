import { defineLevel } from './_factory';

export const embers = defineLevel({
  unlockIndex: 7,
  name: 'Embers',
  biome: 'embers',
  palette: {
    background: '#1b1112',
    horizon: '#33201d',
    accent: '#c88975',
    accent2: '#8ea6ad',
    warm: '#d6a35f',
    text: '#fbf0ea',
  },
  arc: { speed: 760, gravity: 650, cardsPerArc: 6, distractorCount: 5, audioLeadMs: 470 },
  rules: { roundsToComplete: 8, bluffChance: 0.2, simultaneousTargets: 1, comboRequirement: 0 },
  particles: { kind: 'embers', density: 0.5, drift: 0.78 },
  ambientDrone: { baseFrequency: 72, detune: 10, filterCutoff: 610 },
});
