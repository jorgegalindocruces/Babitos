/**
 * Describe each one-time boss reward from persisted progress and live tuning.
 * This stays independent from Phaser so every route into the shop uses the
 * same truthful copy and the contract can be tested directly in Node.
 */
export function getShopBossRewardCopy(progress = {}, bossData = {}) {
  const claimedRewards = new Set(
    Array.isArray(progress?.claimedRewards) ? progress.claimedRewards : [],
  );
  const rewards = [
    {
      id: 'boss1_reward',
      label: 'BABITO CORRUPTO',
      coins: Number(bossData?.babito_corrupto?.rewardCoins) || 30,
    },
    {
      id: 'boss2_reward',
      label: 'LA OSCURIDAD',
      coins: Number(bossData?.la_oscuridad?.rewardCoins) || 40,
    },
  ];

  return rewards
    .map(({ id, label, coins }) => (
      `${label} +${Math.max(0, Math.trunc(coins))} · ${claimedRewards.has(id) ? 'COBRADA' : 'PENDIENTE'}`
    ))
    .join('\n');
}
