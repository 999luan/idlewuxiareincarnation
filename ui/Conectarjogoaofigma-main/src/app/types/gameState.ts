export interface GameState {
  qi: number;
  totalQi: number;
  realm: number;
  subRealm: number;
  stance: 'balance' | 'mountain' | 'river';
  sect: 'none' | 'sword' | 'lotus';
  age: number;
  lifespan: number;
  isImmortal: boolean;
  body: number;
  mind: number;
  unlocks: {
    canMeditate: boolean;
    canSelectStance: boolean;
    canJoinSect: boolean;
    canBuyHerbs: boolean;
    canBuyPills: boolean;
    canBuyDisciples: boolean;
    canBuyElders: boolean;
    canBuyArrays: boolean;
    canTribulation: boolean;
  };
  inventory: {
    herbs: number;
    pills: number;
    disciples: number;
    elders: number;
    arrays: number;
  };
  techniques: {
    click_base: number;
  };
  karma: number;
  metaUpgrades: {
    karma_multiplier: number;
    dao_life: number;
    dao_offline: number;
    dao_retain: number;
    dao_herb_mult: number;
    dao_pill_mult: number;
    dao_karma_gain: number;
    dao_cost_reduction: number;
    dao_realm_mult: number;
  };
  journey: {
    unlockedActions: string[];
    completedActions: string[];
    activeAction: string | null;
    actionProgress: number;
    blockedActions: string[];
    chosenRoute: 'void' | 'alchemy' | 'sect' | 'body' | 'demonic' | null;
  };
  lastSave: number;
}

export const getInitialState = (): GameState => ({
  qi: 0,
  totalQi: 0,
  realm: 1,
  subRealm: 1,
  stance: 'balance',
  sect: 'none',
  age: 15,
  lifespan: 150,
  isImmortal: false,
  body: 10,
  mind: 10,
  unlocks: {
    canMeditate: false,
    canSelectStance: false,
    canJoinSect: false,
    canBuyHerbs: false,
    canBuyPills: false,
    canBuyDisciples: false,
    canBuyElders: false,
    canBuyArrays: false,
    canTribulation: false
  },
  inventory: {
    herbs: 0,
    pills: 0,
    disciples: 0,
    elders: 0,
    arrays: 0
  },
  techniques: {
    click_base: 0
  },
  karma: 0,
  metaUpgrades: {
    karma_multiplier: 0,
    dao_life: 0,
    dao_offline: 0,
    dao_retain: 0,
    dao_herb_mult: 0,
    dao_pill_mult: 0,
    dao_karma_gain: 0,
    dao_cost_reduction: 0,
    dao_realm_mult: 0
  },
  journey: {
    unlockedActions: ["work_farm", "hear_legends", "village_elder", "rest_under_tree"],
    completedActions: [],
    activeAction: null,
    actionProgress: 0,
    blockedActions: [],
    chosenRoute: null
  },
  lastSave: Date.now()
});
