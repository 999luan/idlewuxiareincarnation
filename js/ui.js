function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    
    const suffixes = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const suffixNum = Math.floor(("" + Math.floor(num)).length / 3);
    
    if (suffixNum < suffixes.length) {
        let shortValue = parseFloat((suffixNum !== 0 ? (num / Math.pow(1000, suffixNum)) : num).toPrecision(3));
        if (shortValue % 1 !== 0) {
            shortValue = shortValue.toFixed(1);
        }
        return shortValue + suffixes[suffixNum];
    }
    
    return num.toExponential(2);
}

function getRouteLabel(routeId) {
    const labels = {
        none: "Caminho Indefinido",
        body: "Corpo Bestial",
        alchemy: "Alquimista da Longevividade",
        sect: "Patriarca de Seita",
        void: "Eremita do Vazio",
        demonic: "Herdeiro do Dao Proibido"
    };
    return labels[routeId] || "Caminho Indefinido";
}

function getBuildingEffectSummary(buildingId) {
    const building = GAME_DATA.buildings[buildingId];
    if (!building) return 'Sem efeito definido.';

    const effectLabels = {
        qi: `gera ${formatNumber(building.amount)} Qi/s por unidade`,
        herbs_mult: `aumenta a eficiência das Ervas em ${(building.amount * 100).toFixed(1).replace('.0', '')}% por unidade`,
        pills: `gera ${formatNumber(building.amount)} Pílulas/s por unidade`,
        disciples: `gera ${formatNumber(building.amount)} Discípulos/s por unidade`,
        elders: `gera ${formatNumber(building.amount)} Anciões/s por unidade`
    };

    return effectLabels[building.generate] || building.desc;
}

function getMetaUpgradeEffectSummary(upgradeId) {
    const upgrade = GAME_DATA.metaUpgrades[upgradeId];
    if (!upgrade) return 'Sem efeito definido.';

    const summaries = {
        dao_karma_gain: '+10% de Karma por nível ao reencarnar',
        dao_cost_reduction: 'reduz o crescimento de custo das layers a cada nível',
        dao_realm_mult: 'multiplica fortemente o bônus dos reinos',
        dao_life: '+20 anos de vida base por nível',
        dao_offline: '+10% no Qi manual e passivo por nível',
        dao_retain: 'retém 5% do Qi total por nível até o limite de 50%',
        dao_herb_mult: 'dobra a produção das Ervas por nível',
        dao_pill_mult: '+50% de eficiência das Pílulas por nível'
    };

    return summaries[upgradeId] || upgrade.desc;
}

function closeAllHudDrawers() {
    HUD_DRAWER_IDS.forEach(drawerId => {
        const drawer = document.getElementById(drawerId);
        if (drawer) drawer.classList.remove('open');
    });
    if (gameState.hudView) {
        gameState.hudView.activeDrawer = null;
    }
    drawJourneyGraph();
}

function toggleHudDrawer(drawerId) {
    const target = document.getElementById(drawerId);
    if (!target) return;

    const willOpen = !target.classList.contains('open');
    closeAllHudDrawers();

    if (willOpen) {
        target.classList.add('open');
        if (gameState.hudView) {
            gameState.hudView.activeDrawer = drawerId;
        }
    }

    drawJourneyGraph();
}

function syncFullscreenHudLayout(force = false) {
    if (!gameState.journeyView) return;

    const isMobile = window.innerWidth <= 768;
    const targetOffsetX = isMobile ? 70 : 220;
    const targetOffsetY = isMobile ? 180 : 120;

    if (
        force ||
        (gameState.journeyView.offsetX === 0 && gameState.journeyView.offsetY === 0)
    ) {
        gameState.journeyView.offsetX = targetOffsetX;
        gameState.journeyView.offsetY = targetOffsetY;
        if (!gameState.journeyView.zoom || gameState.journeyView.zoom < 0.45) {
            gameState.journeyView.zoom = isMobile ? 0.6 : 0.8;
        }
    }

    if (gameState.hudView?.activeDrawer) {
        const activeDrawer = document.getElementById(gameState.hudView.activeDrawer);
        if (activeDrawer) activeDrawer.classList.add('open');
    }
}

function pushGameToast(message, variant = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `game-toast toast-${variant}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 260);
    }, 2600);
}

function hideJourneyHoverTooltip() {
    const tooltip = document.getElementById('journey-hover-tooltip');
    if (!tooltip) return;
    tooltip.classList.remove('visible');
}

function showJourneyHoverTooltip(node, clientX, clientY) {
    const tooltip = document.getElementById('journey-hover-tooltip');
    if (!tooltip || !node || journeyGraphRuntime.pointerDown) {
        hideJourneyHoverTooltip();
        return;
    }

    const action = node.action;
    const effectsText = getActionEffectsSummary(action);
    const requirements = getActionRequirementFailures(action);
    const status = node.isInteractable
        ? 'Disponível'
        : node.onCooldown
            ? 'Recarregando'
        : node.blocked
            ? 'Rota perdida'
            : node.adjacent
                ? 'Próxima ação'
                : node.unlocked
                    ? 'Desbloqueada, mas indisponível'
                    : 'Memória';

    tooltip.innerHTML = `
        <h4>${action.name}</h4>
        <p>${status}</p>
        <p>${action.time_cost} anos</p>
        <p>${effectsText.length > 0 ? effectsText.join(' • ') : 'Sem efeito direto além da progressão.'}</p>
        ${node.onCooldown ? `<p>Disponível em ${node.cooldownRemaining.toFixed(1)} anos</p>` : (action.cooldownYears ? `<p>Recarga: ${action.cooldownYears} anos</p>` : '')}
        ${requirements.length > 0 ? `<p>Falta: ${requirements.join(' • ')}</p>` : ''}
    `;

    const tooltipWidth = 320;
    const offsetX = 18;
    const offsetY = 18;
    const left = Math.min(window.innerWidth - tooltipWidth - 14, clientX + offsetX);
    const top = Math.min(window.innerHeight - 140, clientY + offsetY);
    tooltip.style.left = `${Math.max(14, left)}px`;
    tooltip.style.top = `${Math.max(14, top)}px`;
    tooltip.classList.add('visible');
}

function updateAudioHud() {
    const audio = document.getElementById('bgm-player');
    const btn = document.getElementById('audio-toggle-btn');
    const volume = document.getElementById('audio-volume');
    if (!audio || !btn || !volume) return;

    audio.volume = Number(volume.value) / 100;
    btn.innerText = audio.paused ? 'Tocar' : 'Pausar';
}

async function tryAutoplayBackgroundMusic() {
    const audio = document.getElementById('bgm-player');
    if (!audio || !audio.paused) return;

    try {
        await audio.play();
        updateAudioHud();
    } catch (error) {
        const resumeOnInteraction = async () => {
            try {
                await audio.play();
                updateAudioHud();
            } catch (innerError) {
            }
            window.removeEventListener('pointerdown', resumeOnInteraction);
            window.removeEventListener('keydown', resumeOnInteraction);
        };

        window.addEventListener('pointerdown', resumeOnInteraction, { once: true });
        window.addEventListener('keydown', resumeOnInteraction, { once: true });
    }
}

function setupAudioHud() {
    const audio = document.getElementById('bgm-player');
    const btn = document.getElementById('audio-toggle-btn');
    const volume = document.getElementById('audio-volume');
    if (!audio || !btn || !volume || btn.dataset.bound === '1') return;

    btn.dataset.bound = '1';
    volume.value = '45';
    audio.volume = 0.45;

    btn.addEventListener('click', async () => {
        try {
            if (audio.paused) {
                await audio.play();
            } else {
                audio.pause();
            }
            updateAudioHud();
        } catch (error) {
            pushGameToast('O navegador exigiu interação adicional para iniciar a trilha.', 'warning');
        }
    });

    volume.addEventListener('input', () => {
        audio.volume = Number(volume.value) / 100;
    });

    audio.addEventListener('play', updateAudioHud);
    audio.addEventListener('pause', updateAudioHud);
    updateAudioHud();
    tryAutoplayBackgroundMusic();
}

const JOURNEY_GRAPH_NODE_WIDTH = 180;
const JOURNEY_GRAPH_NODE_HEIGHT = 72;
const HUD_DRAWER_IDS = ['drawer-idle', 'drawer-sect', 'drawer-transcendence'];
const journeyGraphRuntime = {
    canvas: null,
    ctx: null,
    hoveredNodeId: null,
    lastPointerClientX: 0,
    lastPointerClientY: 0,
    bound: false,
    pointerDown: false,
    movedWhileDown: false,
    lastPointerX: 0,
    lastPointerY: 0
};

function getJourneyNodeTypeColor(type) {
    if (type === 'corpo') return '#d48237';
    if (type === 'social') return '#8cb8ff';
    if (type === 'risco') return '#8a2424';
    return '#57A773';
}

function getJourneyNodeAtWorld(worldX, worldY) {
    const viewModel = buildJourneyGraphViewModel();
    for (let i = viewModel.nodes.length - 1; i >= 0; i--) {
        const node = viewModel.nodes[i];
        if (
            worldX >= node.x &&
            worldX <= node.x + node.width &&
            worldY >= node.y &&
            worldY <= node.y + node.height
        ) {
            return node;
        }
    }
    return null;
}

function worldToScreen(x, y) {
    return {
        x: x * gameState.journeyView.zoom + gameState.journeyView.offsetX,
        y: y * gameState.journeyView.zoom + gameState.journeyView.offsetY
    };
}

function screenToWorld(x, y) {
    return {
        x: (x - gameState.journeyView.offsetX) / gameState.journeyView.zoom,
        y: (y - gameState.journeyView.offsetY) / gameState.journeyView.zoom
    };
}

function resizeJourneyGraphCanvas() {
    const canvas = document.getElementById('journey-graph-canvas');
    const container = document.getElementById('journey-graph-container');
    if (!canvas || !container) return false;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    journeyGraphRuntime.canvas = canvas;
    journeyGraphRuntime.ctx = canvas.getContext('2d');
    journeyGraphRuntime.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

function getVisibleJourneyNodes() {
    const baseNodes = new Set([
        ...getStartingJourneyActions(),
        ...gameState.discoveredActions,
        ...gameState.unlockedActions,
        ...gameState.blockedActions
    ]);

    if (gameState.activeAction) baseNodes.add(gameState.activeAction);
    if (gameState.journeyView?.selectedNode) baseNodes.add(gameState.journeyView.selectedNode);
    if (journeyGraphRuntime.hoveredNodeId) baseNodes.add(journeyGraphRuntime.hoveredNodeId);

    const visible = new Set(baseNodes);

    baseNodes.forEach(actionId => {
        const action = GAME_DATA.journeyActions[actionId];
        if (!action || !action.unlocks) return;
        action.unlocks.forEach(nextId => {
            if (GAME_DATA.journeyActions[nextId]) {
                visible.add(nextId);
            }
        });
    });

    return Array.from(visible).filter(actionId => GAME_DATA.journeyActions[actionId]);
}

function buildJourneyGraphViewModel() {
    const visibleIds = getVisibleJourneyNodes();
    const baseSet = new Set([
        ...getStartingJourneyActions(),
        ...gameState.discoveredActions,
        ...gameState.unlockedActions,
        ...gameState.blockedActions
    ]);

    const nodes = visibleIds.map(actionId => {
        const action = GAME_DATA.journeyActions[actionId];
        const graph = action.graph || { x: 0, y: 0, lane: 'geral' };
        const discovered = gameState.discoveredActions.includes(actionId);
        const blocked = gameState.blockedActions.includes(actionId);
        const cooldownRemaining = getActionCooldownRemainingYears(actionId);
        const onCooldown = cooldownRemaining > 0;
        const unlocked = gameState.unlockedActions.includes(actionId) || getStartingJourneyActions().includes(actionId);
        const active = gameState.activeAction === actionId;
        const adjacent = !discovered && Array.from(baseSet).some(parentId => {
            const parent = GAME_DATA.journeyActions[parentId];
            return parent?.unlocks?.includes(actionId);
        });
        const failures = getActionRequirementFailures(action);

        return {
            id: actionId,
            action,
            x: graph.x,
            y: graph.y,
            width: JOURNEY_GRAPH_NODE_WIDTH,
            height: JOURNEY_GRAPH_NODE_HEIGHT,
            lane: graph.lane,
            discovered,
            blocked,
            unlocked,
            active,
            adjacent,
            canStart: unlocked && failures.length === 0,
            failures,
            progress: gameState.actionProgresses[actionId] || 0,
            hovered: journeyGraphRuntime.hoveredNodeId === actionId,
            selected: gameState.journeyView?.selectedNode === actionId,
            isEnding: !!action.ending,
            isInteractable: unlocked && failures.length === 0 && !blocked && !onCooldown,
            onCooldown,
            cooldownRemaining
        };
    }).sort((a, b) => a.x - b.x || a.y - b.y);

    const visibleSet = new Set(nodes.map(node => node.id));
    const edges = [];

    nodes.forEach(node => {
        (node.action.unlocks || []).forEach(targetId => {
            if (visibleSet.has(targetId)) {
                edges.push({ from: node.id, to: targetId, kind: 'unlock' });
            }
        });
        (node.action.blocks || []).forEach(targetId => {
            if (visibleSet.has(targetId)) {
                edges.push({ from: node.id, to: targetId, kind: 'block' });
            }
        });
    });

    return { nodes, edges };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawJourneyEdges(ctx, nodes, edges) {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    edges.forEach(edge => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return;

        const startX = from.x + from.width;
        const startY = from.y + from.height / 2;
        const endX = to.x;
        const endY = to.y + to.height / 2;
        const controlOffset = Math.max(70, (endX - startX) * 0.5);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
            startX + controlOffset,
            startY,
            endX - controlOffset,
            endY,
            endX,
            endY
        );

        if (edge.kind === 'block') {
            ctx.strokeStyle = 'rgba(138, 36, 36, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
        } else {
            const targetNode = to;
            if (targetNode.isInteractable || targetNode.active || targetNode.unlocked) {
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
                ctx.lineWidth = 2.5;
            } else {
                ctx.strokeStyle = 'rgba(90, 82, 55, 0.16)';
                ctx.lineWidth = 1.5;
            }
            ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
    });
}

function drawJourneyNodes(ctx, nodes) {
    nodes.forEach(node => {
        const baseColor = getJourneyNodeTypeColor(node.action.type);
        let fill = 'rgba(20, 22, 24, 0.92)';
        let stroke = baseColor;
        let shadow = 'transparent';

        if (node.blocked) {
            fill = 'rgba(30, 18, 18, 0.8)';
            stroke = '#8a2424';
            shadow = 'rgba(138, 36, 36, 0.22)';
        } else if (node.active) {
            fill = 'rgba(87, 167, 115, 0.26)';
            stroke = '#57A773';
            shadow = 'rgba(87, 167, 115, 0.45)';
        } else if (node.unlocked) {
            fill = 'rgba(11, 13, 15, 0.98)';
            stroke = baseColor;
            shadow = 'rgba(212, 175, 55, 0.25)';
        } else if (node.adjacent) {
            fill = 'rgba(8, 8, 9, 0.96)';
            stroke = '#443b20';
            shadow = 'rgba(0, 0, 0, 0.1)';
        } else if (node.discovered) {
            fill = 'rgba(10, 10, 11, 0.9)';
            stroke = '#34383d';
        }

        if (node.isEnding) {
            stroke = '#f0d78a';
            shadow = 'rgba(240, 215, 138, 0.28)';
        }

        ctx.save();
        ctx.shadowColor = shadow;
        ctx.globalAlpha = node.adjacent && !node.isInteractable ? 0.34 : (node.discovered && !node.unlocked ? 0.5 : 1);
        ctx.shadowBlur = node.hovered || node.selected ? 20 : (node.isInteractable || node.active ? 14 : 4);

        drawRoundedRect(ctx, node.x, node.y, node.width, node.height, 14);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = node.hovered || node.selected ? 3 : 2;
        ctx.strokeStyle = stroke;
        ctx.stroke();
        ctx.restore();
    });
}

function drawJourneyNodeLabels(ctx, nodes) {
    nodes.forEach(node => {
        ctx.save();
        ctx.fillStyle = node.blocked ? '#c69a9a' : (node.adjacent && !node.isInteractable ? '#7d7560' : '#F6F0DE');
        ctx.font = '600 13px Inter';
        ctx.textBaseline = 'top';

        const title = node.action.name.length > 26 ? `${node.action.name.slice(0, 26)}…` : node.action.name;
        ctx.fillText(title, node.x + 12, node.y + 12);

        ctx.fillStyle = node.blocked ? '#886868' : (node.adjacent && !node.isInteractable ? '#5f5846' : '#B4B4B4');
        ctx.font = '12px Inter';
        const statusText = node.active
            ? 'Em andamento'
            : node.blocked
                ? 'Rota perdida'
                : node.unlocked
                    ? 'Disponível'
                    : node.adjacent
                        ? 'Próximo passo'
                        : 'Memória';
        ctx.fillText(statusText, node.x + 12, node.y + 34);

        ctx.fillStyle = node.isEnding ? '#f0d78a' : '#D4AF37';
        const costText = node.isEnding ? `Final • ${node.action.time_cost} anos` : `${node.action.time_cost} anos`;
        ctx.fillText(costText, node.x + 12, node.y + 52);
        ctx.restore();
    });
}

function drawJourneyGraph() {
    if (!resizeJourneyGraphCanvas()) return;

    const canvas = journeyGraphRuntime.canvas;
    const ctx = journeyGraphRuntime.ctx;
    const rect = canvas.getBoundingClientRect();
    const viewModel = buildJourneyGraphViewModel();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(gameState.journeyView.offsetX, gameState.journeyView.offsetY);
    ctx.scale(gameState.journeyView.zoom, gameState.journeyView.zoom);
    drawJourneyEdges(ctx, viewModel.nodes, viewModel.edges);
    drawJourneyNodes(ctx, viewModel.nodes);
    drawJourneyNodeLabels(ctx, viewModel.nodes);
    ctx.restore();
}

function updateJourneyGraphInfo(nodeId) {
    const info = document.getElementById('journey-graph-node-info');
    if (!info) return;

    const action = GAME_DATA.journeyActions[nodeId];
    if (!action) {
        info.innerHTML = `
            <h3>Escolha um nó</h3>
            <p>Clique em uma ação no quadro para ver requisitos, custo de vida e status.</p>
        `;
        return;
    }

    const failures = getActionRequirementFailures(action);
    const blocked = gameState.blockedActions.includes(nodeId);
    const unlocked = gameState.unlockedActions.includes(nodeId) || getStartingJourneyActions().includes(nodeId);
        const cooldownRemaining = getActionCooldownRemainingYears(nodeId);
        const onCooldown = cooldownRemaining > 0;
    const discovered = gameState.discoveredActions.includes(nodeId);
    const adjacent = !discovered && Array.from(new Set([...getStartingJourneyActions(), ...gameState.discoveredActions, ...gameState.unlockedActions])).some(parentId => {
        const parent = GAME_DATA.journeyActions[parentId];
        return parent?.unlocks?.includes(nodeId);
    });

    let status = 'Memória';
    if (onCooldown) status = 'Recarregando';
    if (blocked) status = 'Rota perdida nesta vida';
    else if (gameState.activeAction === nodeId) status = 'Em andamento';
    else if (unlocked && failures.length === 0) status = 'Disponível agora';
    else if (unlocked) status = 'Desbloqueada, mas ainda exige preparo';
    else if (adjacent) status = 'Próxima ação visível';

    const req = action.requirements || {};
    const reqParts = [];
    if (req.qi) reqParts.push(`${formatNumber(req.qi)} Qi`);
    if (req.body) reqParts.push(`${req.body} Corpo`);
    if (req.mind) reqParts.push(`${req.mind} Mente`);
    if (req.realm) reqParts.push(`Reino ${req.realm}+`);
    if (req.subRealm) reqParts.push(`Estágio ${req.subRealm}+`);
    if (req.karma_max !== undefined) reqParts.push(`Karma <= ${req.karma_max}`);
    ['herbs', 'pills', 'disciples', 'elders', 'arrays'].forEach(key => {
        if (req[key]) reqParts.push(`${formatNumber(req[key])} ${GAME_DATA.buildings[key].name}`);
    });

    const progress = gameState.actionProgresses[nodeId] || 0;
    const progressText = progress > 0 ? `${Math.floor((progress / action.time_cost) * 100)}% salvo` : 'Nenhum progresso salvo';
    const failureText = failures.length > 0 ? failures.join(' • ') : 'Nada faltando';
    const effectsText = getActionEffectsSummary(action);
    const cooldownText = action.cooldownYears ? (onCooldown ? `${cooldownRemaining.toFixed(1)} anos restantes de ${action.cooldownYears}` : `${action.cooldownYears} anos por recarga`) : 'Sem recarga';

    info.innerHTML = `
        <h3>${action.name}</h3>
        <p>${action.desc}</p>
        <p><span class="journey-node-info-emphasis">Status:</span> ${status}</p>
        <p><span class="journey-node-info-emphasis">Custo:</span> ${action.time_cost} anos</p>
        <p><span class="journey-node-info-emphasis">Requisitos:</span> ${reqParts.length > 0 ? reqParts.join(', ') : 'Nenhum'}</p>
        <p><span class="journey-node-info-emphasis">Falta:</span> ${failureText}</p>
        <p><span class="journey-node-info-emphasis">Efeitos:</span> ${effectsText.length > 0 ? effectsText.join(' • ') : 'Sem efeito direto além da progressão.'}</p>
        <p><span class="journey-node-info-emphasis">Recarga:</span> ${cooldownText}</p>
        <p><span class="journey-node-info-emphasis">Progresso:</span> ${progressText}</p>
    `;
}

function bindJourneyCanvasEvents() {
    const canvas = document.getElementById('journey-graph-canvas');
    if (!canvas || journeyGraphRuntime.bound) return;

    const getPointer = event => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    };

    canvas.addEventListener('mousedown', event => {
        event.preventDefault();
        const pointer = getPointer(event);
        journeyGraphRuntime.pointerDown = true;
        journeyGraphRuntime.movedWhileDown = false;
        journeyGraphRuntime.lastPointerX = pointer.x;
        journeyGraphRuntime.lastPointerY = pointer.y;
        canvas.classList.add('grabbing');
        document.body.classList.add('dragging-canvas');
    });

    window.addEventListener('mouseup', () => {
        journeyGraphRuntime.pointerDown = false;
        canvas.classList.remove('grabbing');
        document.body.classList.remove('dragging-canvas');
        hideJourneyHoverTooltip();
    });

    canvas.addEventListener('mouseleave', () => {
        journeyGraphRuntime.pointerDown = false;
        canvas.classList.remove('grabbing');
        document.body.classList.remove('dragging-canvas');
        hideJourneyHoverTooltip();
    });

    canvas.addEventListener('mousemove', event => {
        const pointer = getPointer(event);
        journeyGraphRuntime.lastPointerClientX = event.clientX;
        journeyGraphRuntime.lastPointerClientY = event.clientY;

        if (journeyGraphRuntime.pointerDown) {
            const deltaX = pointer.x - journeyGraphRuntime.lastPointerX;
            const deltaY = pointer.y - journeyGraphRuntime.lastPointerY;
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                journeyGraphRuntime.movedWhileDown = true;
            }
            journeyGraphRuntime.lastPointerX = pointer.x;
            journeyGraphRuntime.lastPointerY = pointer.y;
            gameState.journeyView.offsetX += deltaX;
            gameState.journeyView.offsetY += deltaY;
            drawJourneyGraph();
            hideJourneyHoverTooltip();
            return;
        }

        const world = screenToWorld(pointer.x, pointer.y);
        const hoveredNode = getJourneyNodeAtWorld(world.x, world.y);
        const nextHoveredId = hoveredNode ? hoveredNode.id : null;
        if (journeyGraphRuntime.hoveredNodeId !== nextHoveredId) {
            journeyGraphRuntime.hoveredNodeId = nextHoveredId;
            drawJourneyGraph();
            updateJourneyGraphInfo(nextHoveredId || gameState.journeyView.selectedNode);
        }

        if (hoveredNode) {
            showJourneyHoverTooltip(hoveredNode, event.clientX, event.clientY);
        } else {
            hideJourneyHoverTooltip();
        }
    });

    canvas.addEventListener('click', event => {
        if (journeyGraphRuntime.movedWhileDown) return;

        const pointer = getPointer(event);
        const world = screenToWorld(pointer.x, pointer.y);
        const node = getJourneyNodeAtWorld(world.x, world.y);
        if (!node) return;

        gameState.journeyView.selectedNode = node.id;
        updateJourneyGraphInfo(node.id);
        drawJourneyGraph();

        if (node.isInteractable) {
            startJourneyAction(node.id);
        } else if (node.adjacent || node.blocked || node.failures.length > 0) {
            pushGameToast(`Ainda indisponível: ${node.action.name}`, 'warning');
        }
    });

    canvas.addEventListener('wheel', event => {
        event.preventDefault();
        const pointer = getPointer(event);
        const worldBefore = screenToWorld(pointer.x, pointer.y);
        const zoomDelta = event.deltaY < 0 ? 1.12 : 0.9;
        const newZoom = Math.max(0.45, Math.min(1.8, gameState.journeyView.zoom * zoomDelta));

        gameState.journeyView.zoom = newZoom;
        gameState.journeyView.offsetX = pointer.x - worldBefore.x * newZoom;
        gameState.journeyView.offsetY = pointer.y - worldBefore.y * newZoom;
        drawJourneyGraph();
    }, { passive: false });

    journeyGraphRuntime.bound = true;
}

function updateUI() {
    // Esquerda
    document.getElementById('current-realm').innerText = GAME_DATA.realms[gameState.realm].name;
    document.getElementById('current-sub-realm').innerText = GAME_DATA.subRealms[gameState.subRealm].name;
    
    // Idade
    document.getElementById('current-age').innerText = Math.floor(gameState.age);
    
    // Status da Jornada
    document.getElementById('status-body').innerText = formatNumber(gameState.body);
    document.getElementById('status-mind').innerText = formatNumber(gameState.mind);
    if (gameState.isImmortal) {
        document.getElementById('max-age').innerText = "∞";
        document.getElementById('age-progress-bar-fill').style.width = "100%";
        document.getElementById('age-progress-bar-fill').style.backgroundColor = "#57A773";
    } else {
        document.getElementById('max-age').innerText = gameState.lifespan;
        const agePercent = Math.min(100, (gameState.age / gameState.lifespan) * 100);
        const ageBar = document.getElementById('age-progress-bar-fill');
        ageBar.style.width = `${agePercent}%`;
        
        // Mudar cor conforme envelhece
        if (agePercent > 90) {
            ageBar.style.backgroundColor = "#8a2424"; // Vermelho
            ageBar.style.boxShadow = "0 0 5px #8a2424";
        } else if (agePercent > 75) {
            ageBar.style.backgroundColor = "#D4AF37"; // Dourado/Amarelo
            ageBar.style.boxShadow = "0 0 5px #D4AF37";
        } else {
            ageBar.style.backgroundColor = "#57A773"; // Verde
            ageBar.style.boxShadow = "0 0 5px #57A773";
        }
    }
    
    document.getElementById('current-qi').innerText = formatNumber(gameState.qi);
    document.getElementById('qps-display').innerText = formatNumber(getQiPerSecond());
    document.getElementById('qpc-display').innerText = formatNumber(getQiPerClick());
    document.getElementById('current-route').innerText = getRouteLabel(gameState.currentRoute);
    const objectiveText = (canStartTribulation() && !inTribulation)
        ? 'Você atingiu o pico do reino. Inicie a Tribulação Celestial.'
        : (gameState.currentObjective || 'Descubra um caminho entre trabalho, estudo e risco.');
    document.getElementById('current-objective').innerText = objectiveText;
    document.getElementById('current-ending').innerText = gameState.endingTitle || 'Nenhum final alcançado nesta vida.';

    // Direita
    const realmCap = GAME_DATA.realms[gameState.realm].qiCap;
    const subRealmCap = getSubRealmCap();
    
    const progressBar = document.getElementById('qi-progress-bar-fill');
    const progressLabel = document.getElementById('progress-phase-label');
    const tribBtn = document.getElementById('tribulation-btn');
    const atPeak = isRealmPeak();
    const tribulationReady = canStartTribulation();
    const targetCap = atPeak ? realmCap : subRealmCap;

    document.getElementById('qi-progress').innerText = formatNumber(gameState.qi);
    document.getElementById('qi-cap').innerText = formatNumber(targetCap);
    
    if (progressBar) {
        if (inTribulation) {
            const totalTribulationYears = getTribulationDurationYears();
            const percent = Math.max(0, Math.min(100, (tribulationTimer / totalTribulationYears) * 100));
            progressBar.style.width = `${percent}%`;
            progressBar.classList.add('tribulation-bar-fill');
            document.getElementById('qi-progress').innerText = formatNumber(Math.max(0, tribulationTimer));
            document.getElementById('qi-cap').innerText = formatNumber(totalTribulationYears);
            if (progressLabel) progressLabel.innerText = 'Tribulação';
        } else {
            const percent = Math.min(100, (gameState.qi / targetCap) * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.classList.toggle('tribulation-bar-fill', tribulationReady);
            if (progressLabel) progressLabel.innerText = atPeak ? 'Tribulação' : 'Próximo Avanço';
        }
    }

    const realmProgressFill = document.getElementById('realm-progress-bar-fill');
    const realmProgressText = document.getElementById('realm-progress-text');
    if (realmProgressFill && realmProgressText) {
        const realmPercent = Math.min(100, (gameState.qi / targetCap) * 100);
        realmProgressFill.style.width = `${realmPercent}%`;
        realmProgressText.innerText = atPeak
            ? `${formatNumber(gameState.qi)} / ${formatNumber(realmCap)} Qi para a tribulação`
            : `${formatNumber(gameState.qi)} / ${formatNumber(subRealmCap)} Qi para o próximo estágio`;
    }
    
    // Posturas Ocultar se não liberado
    const stanceSec = document.getElementById('stance-selector-section');
    if (stanceSec) {
        stanceSec.style.display = gameState.unlocks.canSelectStance ? 'block' : 'none';
    }

    // Seitas Ocultar se não liberado
    const sectSec = document.getElementById('sect-section');
    if (sectSec) {
        sectSec.style.display = gameState.unlocks.canJoinSect ? 'block' : 'none';
    }
    
    if (inTribulation) {
        document.getElementById('qi-progress').style.color = '#8a2424';
        if (tribBtn) {
            tribBtn.style.display = 'inline-flex';
            tribBtn.disabled = true;
            tribBtn.innerText = `Sobreviva ${Math.ceil(tribulationTimer)} anos`;
        }
    } else {
        document.getElementById('qi-progress').style.color = 'inherit';
        if (tribBtn) {
            tribBtn.style.display = atPeak ? 'inline-flex' : 'none';
            if (gameState.realm >= getMaxRealm() && atPeak) {
                tribBtn.innerText = "Reino Máximo Atingido";
                tribBtn.disabled = true;
            } else if (tribulationReady) {
                tribBtn.disabled = false;
                tribBtn.innerText = "Iniciar Tribulação";
            } else {
                tribBtn.disabled = true;
                tribBtn.innerText = atPeak ? "Atingir Limite de Qi" : "Cultive mais para o Pico";
            }
        }
    }

    // Centro (Atualizar botões de compra - Manuais)
    for (const techId in GAME_DATA.techniques) {
        const btn = document.getElementById(`buy-${techId}`);
        const costEl = document.getElementById(`cost-${techId}`);
        const levelEl = document.getElementById(`level-${techId}`);
        
        if (btn && costEl && levelEl) {
            const cost = getCost(techId);
            costEl.innerText = formatNumber(cost);
            levelEl.innerText = gameState.techniques[techId] || 0;
            btn.disabled = gameState.qi < cost;
        }
    }

    // Centro (Atualizar Construções / Layers)
    for (const bId in GAME_DATA.buildings) {
        const btn = document.getElementById(`buy-b-${bId}`);
        const costEl = document.getElementById(`cost-b-${bId}`);
        const countEl = document.getElementById(`count-b-${bId}`);
        
        if (btn && costEl && countEl) {
            const cost = getBuildingCost(bId);
            costEl.innerText = formatNumber(cost);
            countEl.innerText = formatNumber(gameState.inventory[bId] || 0);
            btn.disabled = gameState.qi < cost;
        }
    }

    // Ascension / Karma
    const karmaGain = calculateKarmaGain();
    const ascSec = document.getElementById('ascension-section');
    
    if (gameState.isImmortal || gameState.karma > 0 || gameState.endingTitle) {
        ascSec.style.display = 'block';
        document.getElementById('karma-gain-preview').innerText = formatNumber(karmaGain);
        document.getElementById('current-karma').innerText = formatNumber(gameState.karma);
        
        const ascBtn = document.getElementById('ascend-btn');
        ascBtn.disabled = karmaGain <= 0;
        if (gameState.isImmortal) {
            ascBtn.innerText = "Ascender ao Dao (Prestige)";
        } else if (gameState.endingTitle) {
            ascBtn.innerText = "Encerrar Esta Lenda";
        } else {
            ascBtn.innerText = "Suicídio Espiritual (Prestige)";
        }
        
        for (const upgId in GAME_DATA.metaUpgrades) {
            const btn = document.getElementById(`buy-meta-${upgId}`);
            const costEl = document.getElementById(`cost-meta-${upgId}`);
            const levelEl = document.getElementById(`level-meta-${upgId}`);
            
            if (btn && costEl && levelEl) {
                const cost = getMetaCost(upgId);
                costEl.innerText = formatNumber(cost);
                levelEl.innerText = gameState.metaUpgrades[upgId] || 0;
                btn.disabled = gameState.karma < cost;
            }
        }
    }
}

function renderTechniques() {
    // Esconder/mostrar botão Meditar
    const meditateBtn = document.getElementById('meditate-btn');
    if (meditateBtn) {
        meditateBtn.style.display = 'flex';
        if (gameState.unlocks.canMeditate) {
            meditateBtn.disabled = false;
            meditateBtn.innerText = 'Meditar';
            meditateBtn.title = `Meditar manualmente.\nGera ${formatNumber(getQiPerClick())} Qi por clique e mantém 1 Qi/s passivo enquanto a meditação estiver desperta.`;
        } else {
            meditateBtn.disabled = true;
            meditateBtn.innerText = 'Desperte o Qi';
            meditateBtn.title = 'Descubra o Qi na jornada para desbloquear a meditação e seu fluxo passivo.';
        }
    }

    const bList = document.getElementById('buildings-list');
    if(bList) {
        bList.innerHTML = '';
        
        // Se ainda não descobriu ervas, mostrar um placeholder
        if (!gameState.unlocks.canBuyHerbs) {
            bList.innerHTML = `
                <div class="technique-card" style="opacity: 0.5; border-style: dashed; justify-content: center;">
                    <p style="color: #666; font-style: italic;">🔒 Explore o mundo para descobrir os segredos do Cultivo.</p>
                </div>
            `;
            return;
        }

        // Definir a ordem da cascata
        const layerOrder = ['herbs', 'pills', 'disciples', 'elders', 'arrays'];
        const layerRequirements = {
            'herbs': 'canBuyHerbs',
            'pills': 'canBuyPills',
            'disciples': 'canBuyDisciples',
            'elders': 'canBuyElders',
            'arrays': 'canBuyArrays'
        };

        // Renderizar construções baseadas nos unlocks
        for (let i = 0; i < layerOrder.length; i++) {
            const bId = layerOrder[i];
            const reqFlag = layerRequirements[bId];
            
            // Se esta layer não estiver liberada
            if (!gameState.unlocks[reqFlag]) {
                // Renderiza o card bloqueado apenas para o próximo na fila
                const card = document.createElement('div');
                card.className = 'technique-card locked-layer';
                card.style.opacity = '0.4';
                card.style.borderStyle = 'dashed';
                card.style.justifyContent = 'center';
                card.style.background = 'repeating-linear-gradient(45deg, #121415, #121415 10px, #1a1e20 10px, #1a1e20 20px)';
                card.innerHTML = `
                    <p style="color: #A0A0A0; font-style: italic;">🔒 Próximo Passo Bloqueado (Avance na Jornada)</p>
                `;
                bList.appendChild(card);
                break; // Para de renderizar a lista
            }

            const b = GAME_DATA.buildings[bId];
            const cost = getBuildingCost(bId);
            const count = gameState.inventory[bId] || 0;

            const card = document.createElement('div');
            card.className = 'technique-card';
            
            // Seta visual para o próximo
            let arrowHtml = '';
            if (i < layerOrder.length - 1) {
                arrowHtml = `<div style="text-align: center; color: #57A773; margin: -10px 0 -5px 0;">↑ gera ↑</div>`;
            }

            card.innerHTML = `
                <div class="tech-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="color: #57A773; margin: 0;">${b.name} (<span id="count-b-${bId}">${formatNumber(count)}</span>)</h3>
                        <button id="buy-b-${bId}" class="buy-btn" onclick="handleBuyBuilding('${bId}')">Comprar</button>
                    </div>
                    <p style="margin: 5px 0;">${b.desc}</p>
                    <p style="margin: 5px 0; color: #EAE4D3;">Efeito: ${getBuildingEffectSummary(bId)}</p>
                    <p>Custo: <span id="cost-b-${bId}" style="color: #D4AF37;">${formatNumber(cost)}</span> Qi</p>
                </div>
            `;
            
            if (arrowHtml !== '') {
                const arrowDiv = document.createElement('div');
                arrowDiv.innerHTML = arrowHtml;
                bList.insertBefore(arrowDiv, bList.firstChild);
            }
            
            bList.insertBefore(card, bList.firstChild); // Inserir no topo para a cascata ficar de cima pra baixo (Matriz no topo)
        }
    }
    
    // Render Meta Upgrades
    const metaList = document.getElementById('karma-upgrades');
    if(metaList) {
        metaList.innerHTML = '';
        for (const upgId in GAME_DATA.metaUpgrades) {
            const upg = GAME_DATA.metaUpgrades[upgId];
            const cost = getMetaCost(upgId);
            const level = gameState.metaUpgrades[upgId] || 0;

            const card = document.createElement('div');
            card.className = 'technique-card';
            card.style.background = '#f9f6e6';
            card.innerHTML = `
                <div class="tech-info">
                    <h3>${upg.name} (Nvl <span id="level-meta-${upgId}">${level}</span>)</h3>
                    <p>${upg.desc}</p>
                    <p style="color: #EAE4D3;">Efeito: ${getMetaUpgradeEffectSummary(upgId)}</p>
                    <p>Custo: <span id="cost-meta-${upgId}">${formatNumber(cost)}</span> Karma</p>
                </div>
                <button id="buy-meta-${upgId}" class="buy-btn" style="background: #d4af37; color: #1a1a1a;" onclick="handleBuyMeta('${upgId}')">Compreender</button>
            `;
            metaList.appendChild(card);
        }
    }
}

function renderJourney() {
    renderJourneyLog();
    syncFullscreenHudLayout();
    bindJourneyCanvasEvents();
    drawJourneyGraph();
    updateJourneyGraphInfo(gameState.journeyView?.selectedNode || journeyGraphRuntime.hoveredNodeId || gameState.activeAction || getStartingJourneyActions()[0]);
}

function renderJourneyLog() {
    const logContainer = document.getElementById('journey-log');
    if (!logContainer) return;
    
    logContainer.innerHTML = '';
    gameState.actionLogs.forEach(log => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerText = log;
        logContainer.appendChild(entry);
    });
    // Scroll para o fim
    logContainer.scrollTop = logContainer.scrollHeight;
}

function renderDaoTree() {
    document.getElementById('tree-karma-display').innerText = formatNumber(gameState.karma);
    
    const paths = {
        heaven: document.getElementById('path-heaven'),
        earth: document.getElementById('path-earth'),
        man: document.getElementById('path-man')
    };
    
    // Limpar listas
    for (let key in paths) paths[key].innerHTML = '';
    
    for (const upgId in GAME_DATA.metaUpgrades) {
        const upg = GAME_DATA.metaUpgrades[upgId];
        const cost = getMetaCost(upgId);
        const level = gameState.metaUpgrades[upgId] || 0;
        
        const card = document.createElement('div');
        card.className = 'technique-card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';
        card.style.gap = '10px';
        
        // Cores baseadas no caminho
        let borderColor = '#D4AF37';
        if(upg.path === 'heaven') borderColor = '#8cb8ff';
        if(upg.path === 'earth') borderColor = '#57A773';
        if(upg.path === 'man') borderColor = '#d48237';
        
        card.style.borderColor = borderColor;
        
        card.innerHTML = `
            <div class="tech-info" style="text-align: center;">
                <h3 style="color: ${borderColor};">${upg.name} (Nvl <span id="level-tree-${upgId}">${level}</span>)</h3>
                <p style="margin: 5px 0;">${upg.desc}</p>
                <p style="margin: 5px 0; color: #EAE4D3;">Efeito: ${getMetaUpgradeEffectSummary(upgId)}</p>
                <p style="color: #D4AF37; font-weight: bold;">Custo: <span id="cost-tree-${upgId}">${formatNumber(cost)}</span> Karma</p>
            </div>
            <button id="buy-tree-${upgId}" class="buy-btn" style="background: #121415; border-color: ${borderColor}; color: ${borderColor}; width: 100%;" onclick="handleBuyMeta('${upgId}')">
                Compreender
            </button>
        `;
        
        if (paths[upg.path]) {
            paths[upg.path].appendChild(card);
        }
        
        // Desabilitar botão se não tiver karma
        setTimeout(() => {
            const btn = document.getElementById(`buy-tree-${upgId}`);
            if(btn) btn.disabled = gameState.karma < cost;
        }, 0);
    }
}

function showFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'fixed';
    el.style.left = (x - 20) + 'px'; // centraliza um pouco no mouse
    el.style.top = y + 'px';
    el.style.color = '#5a7d5a';
    el.style.textShadow = '1px 1px 2px #fff';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '20px';
    el.style.pointerEvents = 'none';
    el.style.transition = 'all 1s ease-out';
    el.style.opacity = 1;
    el.style.zIndex = 1000;
    
    document.body.appendChild(el);

    // Forçar reflow para garantir que a transição ocorra
    el.getBoundingClientRect();

    // Animar
    el.style.top = (y - 80) + 'px';
    el.style.opacity = 0;

    // Remover do DOM
    setTimeout(() => {
        el.remove();
    }, 1000);
}

function switchTab(tabId) {
    // Esconder todas as abas
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active-tab');
    });

    // Remover classe ativa dos botões
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar a aba selecionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active-tab');
    }

    // Adicionar classe ativa no botão que foi clicado
    const event = window.event;
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}
