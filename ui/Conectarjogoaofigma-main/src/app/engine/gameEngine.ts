import { GameState } from '../types/gameState';
import { GAME_DATA } from '../data/gameData';

export const getRealmMultiplier = (state: GameState): number => {
  let base = GAME_DATA.realms[state.realm].multiplier;
  const subMult = GAME_DATA.subRealms[state.subRealm].multiplier;

  const daoRealmMult = state.metaUpgrades.dao_realm_mult || 0;
  if (daoRealmMult > 0) {
    base *= Math.pow(1.5, daoRealmMult);
  }

  return base * subMult;
};

export const getSubRealmCap = (state: GameState): number => {
  const realmCap = GAME_DATA.realms[state.realm].qiCap;
  const fractions: Record<number, number> = { 1: 0.1, 2: 0.3, 3: 0.6, 4: 1.0 };
  return Math.floor(realmCap * fractions[state.subRealm]);
};

export const getQiPerClick = (state: GameState): number => {
  const clickLevel = state.techniques.click_base || 0;
  const techPower = GAME_DATA.techniques.click_base.basePower;
  let baseClick = 1 + (clickLevel * techPower);

  if (state.stance === 'mountain') baseClick *= 1.5;
  if (state.stance === 'river') baseClick *= 0.8;

  if (state.sect === 'sword') baseClick *= 2.0;

  if (state.karma < 0) {
    baseClick *= (1 + (Math.abs(state.karma) * 0.01));
  }

  const daoBreath = state.metaUpgrades.dao_offline || 0;
  if (daoBreath > 0) {
    baseClick *= (1 + (0.1 * daoBreath));
  }

  return baseClick * getRealmMultiplier(state);
};

export const getQiPerSecond = (state: GameState): number => {
  const herbsCount = state.inventory.herbs || 0;
  let baseHerbPower = GAME_DATA.buildings.herbs.amount;

  const daoHerbMult = state.metaUpgrades.dao_herb_mult || 0;
  if (daoHerbMult > 0) baseHerbPower *= Math.pow(2, daoHerbMult);

  const pillsCount = state.inventory.pills || 0;
  let pillEfficiency = GAME_DATA.buildings.pills.amount;

  const daoPillMult = state.metaUpgrades.dao_pill_mult || 0;
  if (daoPillMult > 0) pillEfficiency *= (1 + (0.5 * daoPillMult));

  const pillBonus = 1 + (pillsCount * pillEfficiency);

  let basePassive = herbsCount * baseHerbPower * pillBonus;

  if (state.unlocks?.canMeditate) {
    basePassive += 1;
  }

  if (state.stance === 'river') basePassive *= 1.5;
  if (state.stance === 'mountain') basePassive *= 0.8;

  if (state.sect === 'lotus') basePassive *= 2.0;

  if (state.karma < 0) {
    basePassive *= (1 + (Math.abs(state.karma) * 0.01));
  }

  const oldKarmaMult = state.metaUpgrades.karma_multiplier || 0;
  if (oldKarmaMult > 0) basePassive *= (1 + (oldKarmaMult * 0.1));

  const daoBreath = state.metaUpgrades.dao_offline || 0;
  if (daoBreath > 0) {
    basePassive *= (1 + (0.1 * daoBreath));
  }

  return basePassive * getRealmMultiplier(state);
};

export const getBuildingCost = (state: GameState, buildingId: keyof typeof GAME_DATA.buildings): number => {
  const building = GAME_DATA.buildings[buildingId];
  const level = state.inventory[buildingId] || 0;

  let growth = building.costGrowth;
  const daoCostReduction = state.metaUpgrades.dao_cost_reduction || 0;
  if (daoCostReduction > 0) {
    growth = Math.max(1.05, growth - (daoCostReduction * 0.01));
  }

  let cost = Math.floor(building.baseCost * Math.pow(growth, level));

  if (state.karma > 0) {
    cost = Math.floor(cost * (1 - Math.min(0.5, state.karma * 0.005)));
  }

  return cost;
};

export const getTechniqueCost = (state: GameState, techId: keyof typeof GAME_DATA.techniques): number => {
  const tech = GAME_DATA.techniques[techId];
  const level = state.techniques[techId] || 0;
  let cost = Math.floor(tech.baseCost * Math.pow(tech.costGrowth, level));

  if (state.karma > 0) {
    cost = Math.floor(cost * (1 - Math.min(0.5, state.karma * 0.005)));
  }

  return cost;
};

export const getMetaCost = (state: GameState, upgradeId: keyof typeof GAME_DATA.metaUpgrades): number => {
  const upg = GAME_DATA.metaUpgrades[upgradeId];
  const level = state.metaUpgrades[upgradeId] || 0;
  return Math.floor(upg.baseCost * Math.pow(upg.costGrowth, level));
};

export const calculateKarmaGain = (state: GameState): number => {
  let baseKarma = GAME_DATA.realms[state.realm]?.karmaReward || 0;
  const qiMillions = Math.max(0, state.totalQi / 1000000);
  const qiBonus = qiMillions > 0 ? Math.floor(Math.log10(qiMillions + 1) * Math.max(1, state.realm - 1)) : 0;

  baseKarma += qiBonus;

  const daoKarmaGain = state.metaUpgrades.dao_karma_gain || 0;
  if (daoKarmaGain > 0) {
    baseKarma = Math.floor(baseKarma * (1 + (0.1 * daoKarmaGain)));
  }

  return baseKarma;
};

export const canAffordBuilding = (state: GameState, buildingId: keyof typeof GAME_DATA.buildings): boolean => {
  return state.qi >= getBuildingCost(state, buildingId);
};

export const canAffordTechnique = (state: GameState, techId: keyof typeof GAME_DATA.techniques): boolean => {
  return state.qi >= getTechniqueCost(state, techId);
};

export const canAffordMetaUpgrade = (state: GameState, upgradeId: keyof typeof GAME_DATA.metaUpgrades): boolean => {
  return state.karma >= getMetaCost(state, upgradeId);
};

export const processCascade = (state: GameState, secondsPassed: number): void => {
  if (state.inventory.arrays > 0) {
    state.inventory.elders += state.inventory.arrays * GAME_DATA.buildings.arrays.amount * secondsPassed;
  }

  if (state.inventory.elders > 0) {
    state.inventory.disciples += state.inventory.elders * GAME_DATA.buildings.elders.amount * secondsPassed;
  }

  if (state.inventory.disciples > 0) {
    state.inventory.pills += state.inventory.disciples * GAME_DATA.buildings.disciples.amount * secondsPassed;
  }
};
