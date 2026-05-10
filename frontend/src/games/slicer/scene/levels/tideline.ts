import { defineLevel } from './_factory';

export const tideline = defineLevel({
  unlockIndex: 5,
  name: 'Tideline',
  biome: 'tideline',
  palette: {
    background: '#0d1822',
    horizon: '#153955',
    accent: '#73b4ce',
    accent2: '#91adb8',
    warm: '#d4bd82',
    text: '#edf5f8',
  },
  arc: { speed: 660, gravity: 600, cardsPerArc: 5, distractorCount: 4, audioLeadMs: 590 },
  rules: { roundsToComplete: 7, bluffChance: 0.16, simultaneousTargets: 1, comboRequirement: 0 },
  particles: { kind: 'spray', density: 0.35, drift: 0.5 },
  ambientDrone: { baseFrequency: 112, detune: 11, filterCutoff: 690 },
});
