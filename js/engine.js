function getCost(techId) {
    const tech = GAME_DATA.techniques[techId];
    const level = gameState.techniques[techId] || 0;
    let cost = Math.floor(tech.baseCost * Math.pow(tech.costGrowth, level));
    
    // Karma positivo reduz custos (caminho justo)
    if (gameState.karma > 0) {
        cost = Math.floor(cost * (1 - Math.min(0.5, gameState.karma * 0.005))); // Max 50% de desconto
    }
    
    return cost;
}

function getRealmMultiplier() {
    let base = GAME_DATA.realms[gameState.realm].multiplier;
    let subMult = GAME_DATA.subRealms[gameState.subRealm].multiplier;
    
    // Dao do Homem: Ecos do Passado (aumenta o multiplicador do reino massivamente)
    const daoRealmMult = gameState.metaUpgrades.dao_realm_mult || 0;
    if (daoRealmMult > 0) {
        base *= Math.pow(1.5, daoRealmMult);
    }
    
    return base * subMult;
}

function getSubRealmCap() {
    const realmCap = GAME_DATA.realms[gameState.realm].qiCap;
    // Sub-reinos dividem o cap total em 4 partes crescentes
    const fractions = { 1: 0.1, 2: 0.3, 3: 0.6, 4: 1.0 };
    return Math.floor(realmCap * fractions[gameState.subRealm]);
}

function getMaxRealm() {
    return Math.max(...Object.keys(GAME_DATA.realms).map(Number));
}

function isRealmPeak() {
    return gameState.subRealm >= 4;
}

function refreshTribulationUnlock() {
    gameState.unlocks.canTribulation = isRealmPeak() && gameState.realm < getMaxRealm();
}

function canStartTribulation() {
    return !inTribulation && gameState.realm < getMaxRealm() && isRealmPeak() && gameState.qi >= GAME_DATA.realms[gameState.realm].qiCap;
}

function checkSubRealmAdvancement() {
    if (gameState.subRealm >= 4) return; // Já está no pico
    
    const currentSubCap = getSubRealmCap();
    if (gameState.qi >= currentSubCap) {
        gameState.subRealm++;
        refreshTribulationUnlock();
        if (!gameState.isImmortal) {
            gameState.lifespan += 10; // +10 anos por sub-reino
        }
        pushGameToast(`Você avançou para o estágio: ${GAME_DATA.subRealms[gameState.subRealm].name}. +10 anos de vida.`, 'success');
        addJourneyLog(`[Dao] Seu cultivo avançou para o estágio ${GAME_DATA.subRealms[gameState.subRealm].name}.`);
        if (isRealmPeak()) {
            pushGameToast('Seu cultivo alcançou o pico deste reino. A Tribulação Celestial agora pode ser enfrentada ao atingir o limite de Qi.', 'warning');
            addJourneyLog('[Tribulação] O pico do reino foi alcançado. Encha seu Qi até o limite para desafiar os céus.');
        }
        updateUI();
    }
}

function getQiPerClick() {
    const clickLevel = gameState.techniques.click_base || 0;
    const techPower = GAME_DATA.techniques.click_base.basePower;
    let baseClick = 1 + (clickLevel * techPower);
    
    if (gameState.stance === 'mountain') baseClick *= 1.5;
    if (gameState.stance === 'river') baseClick *= 0.8;
    
    if (gameState.sect === 'sword') baseClick *= 2.0; // Bônus Seita
    
    // Karma Negativo aumenta o poder bruto levemente (caminho demoníaco)
    if (gameState.karma < 0) {
        baseClick *= (1 + (Math.abs(gameState.karma) * 0.01));
    }

    const daoBreath = gameState.metaUpgrades.dao_offline || 0;
    if (daoBreath > 0) {
        baseClick *= (1 + (0.1 * daoBreath));
    }
    
    return baseClick * getRealmMultiplier();
}

function getBuildingCost(buildingId) {
    const building = GAME_DATA.buildings[buildingId];
    const level = gameState.inventory[buildingId] || 0;
    
    // Dao do Homem: Redução do crescimento de custo (Growth penalty)
    let growth = building.costGrowth;
    const daoCostReduction = gameState.metaUpgrades.dao_cost_reduction || 0;
    if (daoCostReduction > 0) {
        // Reduz o crescimento em 0.01 por nível, mas não menor que 1.05
        growth = Math.max(1.05, growth - (daoCostReduction * 0.01));
    }
    
    let cost = Math.floor(building.baseCost * Math.pow(growth, level));
    
    if (gameState.karma > 0) {
        cost = Math.floor(cost * (1 - Math.min(0.5, gameState.karma * 0.005)));
    }
    
    return cost;
}

function buyBuilding(buildingId) {
    const cost = getBuildingCost(buildingId);
    if (gameState.qi >= cost) {
        gameState.qi -= cost;
        gameState.inventory[buildingId] = (gameState.inventory[buildingId] || 0) + 1;
        return true;
    }
    return false;
}

function processCascade(secondsPassed) {
    // A cascata roda de cima para baixo
    // Matrizes -> Anciões -> Discípulos -> Pílulas -> Ervas -> Qi
    
    if (gameState.inventory.arrays > 0) {
        gameState.inventory.elders += gameState.inventory.arrays * GAME_DATA.buildings.arrays.amount * secondsPassed;
    }
    
    if (gameState.inventory.elders > 0) {
        gameState.inventory.disciples += gameState.inventory.elders * GAME_DATA.buildings.elders.amount * secondsPassed;
    }
    
    if (gameState.inventory.disciples > 0) {
        gameState.inventory.pills += gameState.inventory.disciples * GAME_DATA.buildings.disciples.amount * secondsPassed;
    }
}

function getQiPerSecond() {
    const herbsCount = gameState.inventory.herbs || 0;
    let baseHerbPower = GAME_DATA.buildings.herbs.amount;
    
    // Dao da Terra: Solo Fértil (Dobra ervas por nível)
    const daoHerbMult = gameState.metaUpgrades.dao_herb_mult || 0;
    if (daoHerbMult > 0) baseHerbPower *= Math.pow(2, daoHerbMult);
    
    // Pílulas aumentam as Ervas
    const pillsCount = gameState.inventory.pills || 0;
    let pillEfficiency = GAME_DATA.buildings.pills.amount;
    
    // Dao da Terra: Fogo Alquímico (Pílulas +50% melhores por nível)
    const daoPillMult = gameState.metaUpgrades.dao_pill_mult || 0;
    if (daoPillMult > 0) pillEfficiency *= (1 + (0.5 * daoPillMult));
    
    const pillBonus = 1 + (pillsCount * pillEfficiency);
    
    let basePassive = herbsCount * baseHerbPower * pillBonus;

    if (gameState.unlocks?.canMeditate) {
        basePassive += 1;
    }
    
    if (gameState.stance === 'river') basePassive *= 1.5;
    if (gameState.stance === 'mountain') basePassive *= 0.8;
    
    if (gameState.sect === 'lotus') basePassive *= 2.0;
    
    if (gameState.karma < 0) {
        basePassive *= (1 + (Math.abs(gameState.karma) * 0.01));
    }
    
    // Opcional: manter o antigo karma_multiplier se o player já o tiver de save anterior
    const oldKarmaMult = gameState.metaUpgrades.karma_multiplier || 0;
    if (oldKarmaMult > 0) basePassive *= (1 + (oldKarmaMult * 0.1));

    const daoBreath = gameState.metaUpgrades.dao_offline || 0;
    if (daoBreath > 0) {
        basePassive *= (1 + (0.1 * daoBreath));
    }
    
    return basePassive * getRealmMultiplier();
}

function addQi(amount) {
    const cap = GAME_DATA.realms[gameState.realm].qiCap;
    gameState.qi += amount;
    if (gameState.qi > cap) {
        gameState.qi = cap;
    }
    gameState.totalQi += amount;
    
    checkSubRealmAdvancement();
}

function buyTechnique(techId) {
    const cost = getCost(techId);
    if (gameState.qi >= cost) {
        gameState.qi -= cost;
        gameState.techniques[techId] = (gameState.techniques[techId] || 0) + 1;
        return true;
    }
    return false;
}

function calculateKarmaGain() {
    let baseKarma = GAME_DATA.realms[gameState.realm]?.karmaReward || 0;
    const qiMillions = Math.max(0, gameState.totalQi / 1000000);
    const qiBonus = qiMillions > 0 ? Math.floor(Math.log10(qiMillions + 1) * Math.max(1, gameState.realm - 1)) : 0;
    const endingBonus = gameState.endingTitle ? 2 : 0;

    baseKarma += qiBonus + endingBonus;
    
    const daoKarmaGain = gameState.metaUpgrades.dao_karma_gain || 0;
    if (daoKarmaGain > 0) {
        baseKarma = Math.floor(baseKarma * (1 + (0.1 * daoKarmaGain)));
    }
    
    return baseKarma;
}

function getMetaCost(upgradeId) {
    const upg = GAME_DATA.metaUpgrades[upgradeId];
    const level = gameState.metaUpgrades[upgradeId] || 0;
    return Math.floor(upg.baseCost * Math.pow(upg.costGrowth, level));
}

function buyMetaUpgrade(upgradeId) {
    const cost = getMetaCost(upgradeId);
    if (gameState.karma >= cost) {
        gameState.karma -= cost;
        gameState.metaUpgrades[upgradeId] = (gameState.metaUpgrades[upgradeId] || 0) + 1;
        return true;
    }
    return false;
}

function getActionRequirementFailures(actionData) {
    const failures = [];
    const req = actionData.requirements || {};

    if (req.qi && gameState.qi < req.qi) failures.push(`Qi ${formatNumber(gameState.qi)}/${formatNumber(req.qi)}`);
    if (req.body && gameState.body < req.body) failures.push(`Corpo ${gameState.body}/${req.body}`);
    if (req.mind && gameState.mind < req.mind) failures.push(`Mente ${gameState.mind}/${req.mind}`);
    if (req.realm && gameState.realm < req.realm) failures.push(`Reino ${gameState.realm}/${req.realm}`);
    if (req.subRealm && gameState.subRealm < req.subRealm) failures.push(`Estágio ${gameState.subRealm}/${req.subRealm}`);
    if (req.karma_max !== undefined && gameState.karma > req.karma_max) failures.push(`Karma ${gameState.karma}/${req.karma_max}`);

    const inventoryKeys = ['herbs', 'pills', 'disciples', 'elders', 'arrays'];
    inventoryKeys.forEach(key => {
        if (req[key] && (gameState.inventory[key] || 0) < req[key]) {
            failures.push(`${GAME_DATA.buildings[key].name} ${formatNumber(gameState.inventory[key] || 0)}/${formatNumber(req[key])}`);
        }
    });

    if (actionData.id) {
        const cooldownRemaining = getActionCooldownRemainingYears(actionData.id);
        if (cooldownRemaining > 0) {
            failures.push(`Recarga ${cooldownRemaining.toFixed(1)} anos`);
        }
    }

    return failures;
}

function getActionCooldownRemainingYears(actionId) {
    const actionData = GAME_DATA.journeyActions[actionId];
    if (!actionData?.cooldownYears) return 0;

    const nextAvailableAge = gameState.actionCooldowns?.[actionId] || 0;
    return Math.max(0, nextAvailableAge - gameState.age);
}

function syncCultivationMilestones() {
    let corrected = false;

    while (gameState.subRealm < 4 && gameState.qi >= getSubRealmCap()) {
        gameState.subRealm++;
        corrected = true;
    }

    refreshTribulationUnlock();

    return corrected;
}

function getActionEffectsSummary(actionData) {
    const parts = [];
    const effects = actionData.effects || {};

    if (effects.qi) parts.push(`+${formatNumber(effects.qi)} Qi`);
    if (effects.body) parts.push(`+${effects.body} Corpo`);
    if (effects.mind) parts.push(`+${effects.mind} Mente`);
    if (effects.karma) parts.push(`${effects.karma > 0 ? '+' : ''}${effects.karma} Karma`);
    if (effects.lifespan_penalty) parts.push(`-${effects.lifespan_penalty} anos de vida`);

    if (actionData.unlock_flags?.length) {
        const unlockNames = {
            canMeditate: 'Meditação',
            canSelectStance: 'Posturas',
            canJoinSect: 'Seitas',
            canBuyHerbs: 'Ervas Espirituais',
            canBuyPills: 'Pílulas da Fundação',
            canBuyDisciples: 'Discípulos',
            canBuyElders: 'Anciões',
            canBuyArrays: 'Matrizes de Convergência',
            canTribulation: 'Tribulação Celestial'
        };
        parts.push(`Desbloqueia ${actionData.unlock_flags.map(flag => unlockNames[flag] || flag).join(', ')}`);
    }

    if (actionData.unlocks?.length) {
        parts.push(`Revela ${actionData.unlocks.map(id => GAME_DATA.journeyActions[id]?.name).filter(Boolean).join(', ')}`);
    }

    if (actionData.set_route) {
        parts.push(`Compromete a rota ${getRouteLabel(actionData.set_route)}`);
    }

    if (actionData.blocks?.length) {
        parts.push(`Fecha ${actionData.blocks.map(id => GAME_DATA.journeyActions[id]?.name).filter(Boolean).join(', ')}`);
    }

    if (actionData.ui_reward_summary) {
        parts.unshift(actionData.ui_reward_summary);
    }

    return parts;
}

function applyAscensionReset(gain) {
    gameState.karma += gain;

    let qiRetained = 0;
    const daoRetain = gameState.metaUpgrades.dao_retain || 0;
    if (daoRetain > 0) {
        qiRetained = gameState.totalQi * Math.min(0.5, (0.05 * daoRetain));
    }

    gameState.qi = qiRetained;
    gameState.totalQi = qiRetained;
    gameState.realm = 1;
    gameState.subRealm = 1;
    gameState.inventory = {
        herbs: 0,
        pills: 0,
        disciples: 0,
        elders: 0,
        arrays: 0
    };
    gameState.techniques = {
        click_base: 0
    };

    resetJourneyState();
    saveGame();
}

function ascend() {
    const gain = calculateKarmaGain();
    if (gain <= 0) return false;
    applyAscensionReset(gain);
    return true;
}

function reincarnateFromDeath() {
    const gain = calculateKarmaGain();
    applyAscensionReset(gain);
    return gain;
}
