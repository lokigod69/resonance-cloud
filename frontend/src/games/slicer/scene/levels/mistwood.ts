import { defineLevel } from './_factory';

export const mistwood = defineLevel({
  unlockIndex: 8,
  name: 'Mistwood',
  biome: 'mistwood',
  palette: {
    background: '#111b1b',
    horizon: '#1f3430',
    accent: '#8fb8a8',
    accent2: '#8fa4bf',
    warm: '#c9b47a',
    text: '#edf5f0',
  },
  arc: { speed: 800, gravity: 665, cardsPerArc: 6, distractorCount: 5, audioLeadMs: 430 },
  rules: { roundsToComplete: 8, bluffChance: 0.22, simultaneousTargets: 1, comboRequirement: 0, fogPulseMs: 1600 },
  particles: { kind: 'fog', density: 0.55, drift: 0.22 },
  ambientDrone: { baseFrequency: 92, detune: 13, filterCutoff: 430 },
});
