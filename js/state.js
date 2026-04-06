function getStartingJourneyActions() {
    return ['work_farm', 'hear_legends', 'village_elder', 'rest_under_tree'];
}

function getDefaultObjective() {
    if (typeof window.getLocalizedDefaultObjective === 'function') {
        return window.getLocalizedDefaultObjective();
    }
    return 'Descubra um caminho entre trabalho, estudo e risco.';
}

function getJourneyStartLog(samsaraCycles = 0) {
    if (typeof window.getLocalizedJourneyStartLog === 'function') {
        return window.getLocalizedJourneyStartLog(samsaraCycles);
    }
    return 'Aos 15 anos, você ainda é mortal, mas já escolheu ouvir o mundo com atenção perigosa.';
}

let gameState = {
    qi: 0,
    totalQi: 0,
    realm: 1,
    subRealm: 1,
    stance: 'balance', // 'balance', 'mountain', 'river'
    sect: 'none', // 'none', 'sword', 'lotus'
    age: 15, // Idade inicial
    lifespan: 150, // Expectativa de vida base
    isImmortal: false,
    body: 10,
    mind: 10,
    unlockedActions: getStartingJourneyActions(),
    discoveredActions: getStartingJourneyActions(),
    blockedActions: [],
    actionCooldowns: {},
    actionUseCounts: {},
    narrativeMemory: {
        samsaraCycles: 0,
        lifetimeActionCounts: {},
        totalActionCounts: {},
        lastEndingId: '',
        endingCounts: {},
        endingHistory: []
    },
    activeAction: null,
    actionProgresses: {},
    actionLogs: [getJourneyStartLog(0)],
    currentRoute: 'none',
    endingId: '',
    endingTitle: '',
    endingText: '',
    currentObjective: getDefaultObjective(),
    currentObjectiveKey: 'objective_default',
    currentObjectiveData: {},
    journeyView: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        selectedNode: null
    },
    hudView: {
        activeDrawer: null
    },
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
    locale: 'pt-BR',
    metaUpgrades: {
        karma_multiplier: 0,
        dao_life: 0,
        dao_offline: 0,
        dao_retain: 0,
        dao_origin_reserve: 0,
        dao_tribulation_grace: 0,
        dao_herb_mult: 0,
        dao_pill_mult: 0,
        dao_sect_flow: 0,
        dao_foundation_well: 0,
        dao_world_root: 0,
        dao_karma_gain: 0,
        dao_cost_reduction: 0,
        dao_realm_mult: 0,
        dao_fate_threads: 0,
        dao_mortal_echo: 0
    },
    lastSave: Date.now()
};

// ...rest of state.js...

function saveGame() {
    gameState.lastSave = Date.now();
    localStorage.setItem('wuxiaIdleSave', JSON.stringify(gameState));
}

function loadGame() {
    try {
        if (sessionStorage.getItem('wuxiaIdleResetPending') === '1') {
            sessionStorage.removeItem('wuxiaIdleResetPending');
            localStorage.removeItem('wuxiaIdleSave');
            return;
        }
    } catch (error) {
        // Ignore sessionStorage issues and continue with normal load.
    }

    const saved = localStorage.getItem('wuxiaIdleSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState = { ...gameState, ...parsed };

        if (!gameState.inventory) {
            gameState.inventory = { herbs: 0, pills: 0, disciples: 0, elders: 0, arrays: 0 };
            if (parsed.techniques && parsed.techniques.passive_base) {
                gameState.inventory.herbs = parsed.techniques.passive_base;
                delete gameState.techniques.passive_base;
            }
        }
        if (!gameState.metaUpgrades) {
            gameState.metaUpgrades = { karma_multiplier: 0 };
        }
        for (const upgId in GAME_DATA.metaUpgrades) {
            if (gameState.metaUpgrades[upgId] === undefined) {
                gameState.metaUpgrades[upgId] = 0;
            }
        }
        
        if (gameState.subRealm === undefined) gameState.subRealm = 1;
        if (gameState.stance === undefined) gameState.stance = 'balance';
        if (gameState.sect === undefined) gameState.sect = 'none';
        if (gameState.age === undefined) gameState.age = 15;
        if (gameState.lifespan === undefined) gameState.lifespan = 150;
        if (gameState.isImmortal === undefined) gameState.isImmortal = false;
        if (gameState.locale === undefined) gameState.locale = 'pt-BR';
        
        if (gameState.body === undefined) gameState.body = 10;
        if (gameState.mind === undefined) gameState.mind = 10;

        const starterActions = getStartingJourneyActions();
        if (!gameState.unlockedActions || gameState.unlockedActions.length === 0) {
            gameState.unlockedActions = [...starterActions];
        }
        if (!gameState.discoveredActions || gameState.discoveredActions.length === 0) {
            gameState.discoveredActions = [...starterActions];
        }
        starterActions.forEach(actionId => {
            if (!gameState.unlockedActions.includes(actionId)) gameState.unlockedActions.push(actionId);
            if (!gameState.discoveredActions.includes(actionId)) gameState.discoveredActions.push(actionId);
        });

        if (gameState.blockedActions === undefined) gameState.blockedActions = [];
        if (gameState.actionCooldowns === undefined) gameState.actionCooldowns = {};
        if (gameState.actionUseCounts === undefined) gameState.actionUseCounts = {};
        if (gameState.narrativeMemory === undefined) {
            gameState.narrativeMemory = {
                samsaraCycles: 0,
                lifetimeActionCounts: {},
                totalActionCounts: {},
                lastEndingId: '',
                endingCounts: {},
                endingHistory: []
            };
        } else {
            if (gameState.narrativeMemory.samsaraCycles === undefined) gameState.narrativeMemory.samsaraCycles = 0;
            if (gameState.narrativeMemory.lifetimeActionCounts === undefined) gameState.narrativeMemory.lifetimeActionCounts = {};
            if (gameState.narrativeMemory.totalActionCounts === undefined) gameState.narrativeMemory.totalActionCounts = {};
            if (gameState.narrativeMemory.lastEndingId === undefined) gameState.narrativeMemory.lastEndingId = '';
            if (gameState.narrativeMemory.endingCounts === undefined) gameState.narrativeMemory.endingCounts = {};
            if (gameState.narrativeMemory.endingHistory === undefined) gameState.narrativeMemory.endingHistory = [];
        }
        if (gameState.activeAction === undefined) gameState.activeAction = null;
        if (gameState.actionProgresses === undefined) {
            gameState.actionProgresses = {};
            if (parsed.actionProgress !== undefined && parsed.activeAction) {
                gameState.actionProgresses[parsed.activeAction] = parsed.actionProgress;
            }
        }
        if (gameState.actionLogs === undefined || gameState.actionLogs.length === 0) {
            gameState.actionLogs = [getJourneyStartLog(gameState.narrativeMemory?.samsaraCycles || 0)];
        }
        if (gameState.currentRoute === undefined) gameState.currentRoute = 'none';
        if (gameState.endingId === undefined) gameState.endingId = '';
        if (gameState.endingTitle === undefined) gameState.endingTitle = '';
        if (gameState.endingText === undefined) gameState.endingText = '';
        if (gameState.currentObjective === undefined) gameState.currentObjective = getDefaultObjective();
        if (gameState.currentObjectiveKey === undefined) gameState.currentObjectiveKey = '';
        if (gameState.currentObjectiveData === undefined) gameState.currentObjectiveData = {};
        if (gameState.journeyView === undefined) {
            gameState.journeyView = {
                zoom: 1,
                offsetX: 0,
                offsetY: 0,
                selectedNode: null
            };
        } else {
            if (gameState.journeyView.zoom === undefined) gameState.journeyView.zoom = 1;
            if (gameState.journeyView.offsetX === undefined) gameState.journeyView.offsetX = 0;
            if (gameState.journeyView.offsetY === undefined) gameState.journeyView.offsetY = 0;
            if (gameState.journeyView.selectedNode === undefined) gameState.journeyView.selectedNode = null;
        }
        if (gameState.hudView === undefined) {
            gameState.hudView = {
                activeDrawer: null
            };
        } else {
            if (gameState.hudView.activeDrawer === undefined) gameState.hudView.activeDrawer = null;
        }
        if (gameState.unlocks === undefined) {
            gameState.unlocks = {
                canMeditate: false,
                canSelectStance: false,
                canJoinSect: false,
                canBuyHerbs: false,
                canBuyPills: false,
                canBuyDisciples: false,
                canBuyElders: false,
                canBuyArrays: false,
                canTribulation: false
            };
        } else {
            if (gameState.unlocks.canSelectStance === undefined) gameState.unlocks.canSelectStance = false;
            if (gameState.unlocks.canJoinSect === undefined) gameState.unlocks.canJoinSect = false;
            if (gameState.unlocks.canBuyDisciples === undefined) gameState.unlocks.canBuyDisciples = false;
            if (gameState.unlocks.canBuyElders === undefined) gameState.unlocks.canBuyElders = false;
            if (gameState.unlocks.canBuyArrays === undefined) gameState.unlocks.canBuyArrays = false;
            if (gameState.unlocks.canTribulation === undefined) gameState.unlocks.canTribulation = false;
        }

        gameState.unlockedActions = gameState.unlockedActions.filter(actionId => GAME_DATA.journeyActions[actionId]);
        gameState.discoveredActions = gameState.discoveredActions.filter(actionId => GAME_DATA.journeyActions[actionId]);
        gameState.blockedActions = gameState.blockedActions.filter(actionId => GAME_DATA.journeyActions[actionId]);
        if (gameState.activeAction && !GAME_DATA.journeyActions[gameState.activeAction]) {
            gameState.activeAction = null;
        }
    }
}

function resetJourneyState() {
    const rebornFrame = gameState.metaUpgrades?.dao_reborn_frame || 0;
    gameState.body = 10 + (2 * rebornFrame);
    gameState.mind = 10 + (2 * rebornFrame);
    gameState.unlockedActions = [...getStartingJourneyActions()];
    gameState.blockedActions = [];
    gameState.actionCooldowns = {};
    gameState.actionUseCounts = {};
    if (!gameState.narrativeMemory) {
        gameState.narrativeMemory = {
            samsaraCycles: 0,
            lifetimeActionCounts: {},
            totalActionCounts: {},
            lastEndingId: '',
            endingCounts: {},
            endingHistory: []
        };
    } else {
        gameState.narrativeMemory.lifetimeActionCounts = {};
        if (gameState.narrativeMemory.samsaraCycles === undefined) gameState.narrativeMemory.samsaraCycles = 0;
        if (gameState.narrativeMemory.totalActionCounts === undefined) gameState.narrativeMemory.totalActionCounts = {};
        if (gameState.narrativeMemory.lastEndingId === undefined) gameState.narrativeMemory.lastEndingId = '';
        if (gameState.narrativeMemory.endingCounts === undefined) gameState.narrativeMemory.endingCounts = {};
        if (gameState.narrativeMemory.endingHistory === undefined) gameState.narrativeMemory.endingHistory = [];
    }
    gameState.activeAction = null;
    gameState.actionProgresses = {};
    gameState.actionLogs = [getJourneyStartLog(gameState.narrativeMemory?.samsaraCycles || 0)];
    gameState.age = 15;
    gameState.currentRoute = 'none';
    gameState.endingId = '';
    gameState.endingTitle = '';
    gameState.endingText = '';
    gameState.currentObjective = getDefaultObjective();
    gameState.currentObjectiveKey = 'objective_default';
    gameState.currentObjectiveData = {};
    if (!gameState.journeyView) {
        gameState.journeyView = { zoom: 1, offsetX: 0, offsetY: 0, selectedNode: null };
    } else {
        gameState.journeyView.selectedNode = null;
    }

    const daoLife = gameState.metaUpgrades?.dao_life || 0;
    gameState.lifespan = 150 + (20 * daoLife);
    gameState.isImmortal = false;

    gameState.unlocks = {
        canMeditate: false,
        canSelectStance: false,
        canJoinSect: false,
        canBuyHerbs: false,
        canBuyPills: false,
        canBuyDisciples: false,
        canBuyElders: false,
        canBuyArrays: false,
        canTribulation: false
    };

    getStartingJourneyActions().forEach(actionId => {
        if (!gameState.discoveredActions.includes(actionId)) {
            gameState.discoveredActions.push(actionId);
        }
    });
}

function resetGame() {
    window.__skipBeforeUnloadSave = true;
    try {
        sessionStorage.setItem('wuxiaIdleResetPending', '1');
    } catch (error) {
        // Ignore sessionStorage issues and still perform the reset.
    }
    localStorage.removeItem('wuxiaIdleSave');
    location.replace(window.location.pathname + window.location.search + window.location.hash);
}
