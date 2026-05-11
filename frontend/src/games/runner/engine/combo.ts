import type { Upgrade, UpgradeId } from './types';

const UPGRADE_THRESHOLDS: Array<{ id: UpgradeId; label: string; combo: number; uses: number }> = [
  { id: 'slow_time', label: 'Slow Time', combo: 10, uses: 1 },
  { id: 'echo_sense', label: 'Echo Sense', combo: 20, uses: 1 },
  { id: 'glide', label: 'Glide', combo: 30, uses: 1 },
];

export class ComboSystem {
  count = 0;
  private readonly earned = new Set<UpgradeId>();

  get multiplier(): number {
    return 1 + Math.floor(this.count / 3);
  }

  recordCorrect(): Upgrade[] {
    this.count += 1;
    return UPGRADE_THRESHOLDS.filter((upgrade) => {
      if (this.count < upgrade.combo || this.earned.has(upgrade.id)) {
        return false;
      }
      this.earned.add(upgrade.id);
      return true;
    }).map((upgrade) => ({
      id: upgrade.id,
      label: upgrade.label,
      earnedAtCombo: upgrade.combo,
      uses: upgrade.uses,
    }));
  }

  recordMiss(): void {
    this.count = 0;
  }
}
