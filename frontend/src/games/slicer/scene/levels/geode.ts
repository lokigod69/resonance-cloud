import { defineLevel } from './_factory';

export const geode = defineLevel({
  unlockIndex: 6,
  name: 'Geode',
  biome: 'geode',
  palette: {
    background: '#121421',
    horizon: '#241f3a',
    accent: '#9ab9d6',
    accent2: '#b6a1d9',
    warm: '#d7bf83',
    text: '#f1f2fa',
  },
  arc: { speed: 700, gravity: 620, cardsPerArc: 6, distractorCount: 5, audioLeadMs: 520 },
  rules: { roundsToComplete: 8, bluffChance: 0.18, simultaneousTargets: 2, comboRequirement: 0 },
  particles: { kind: 'crystals', density: 0.32, drift: 0.35 },
  ambientDrone: { baseFrequency: 144, detune: 18, filterCutoff: 880 },
});
