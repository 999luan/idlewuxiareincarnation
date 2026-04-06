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
    return getLocalizedRouteLabel(routeId);
}

function getBuildingEffectSummary(buildingId) {
    const building = GAME_DATA.buildings[buildingId];
    if (!building) return t('no_effect_defined');

    const effectLabels = {
        qi: t('effect_qi_per_unit', { amount: formatNumber(building.amount) }),
        herbs_mult: t('effect_herbs_mult', { amount: (building.amount * 100).toFixed(1).replace('.0', '') }),
        pills: t('effect_pills_per_unit', { amount: formatNumber(building.amount) }),
        disciples: t('effect_disciples_per_unit', { amount: formatNumber(building.amount) }),
        elders: t('effect_elders_per_unit', { amount: formatNumber(building.amount) })
    };

    return effectLabels[building.generate] || building.desc;
}

function getMetaUpgradeEffectSummary(upgradeId) {
    const upgrade = GAME_DATA.metaUpgrades[upgradeId];
    if (!upgrade) return t('no_effect_defined');

    const summaries = {
        dao_karma_gain: { 'pt-BR': '+10% de Karma por nível ao reencarnar', en: '+10% Karma on reincarnation per level', 'zh-CN': '每级转生业力 +10%' },
        dao_cost_reduction: { 'pt-BR': 'reduz o crescimento de custo das layers a cada nível', en: 'reduces layer cost growth each level', 'zh-CN': '每级降低产业成本成长' },
        dao_realm_mult: { 'pt-BR': 'multiplica fortemente o bônus dos reinos', en: 'greatly amplifies realm bonuses', 'zh-CN': '大幅强化境界倍率' },
        dao_fate_threads: { 'pt-BR': '+15% de Qi das ações da jornada por nível', en: '+15% Qi from journey actions per level', 'zh-CN': '每级旅途行动真气 +15%' },
        dao_mortal_echo: { 'pt-BR': '+20% de Corpo/Mente em ações e -12% de recarga por nível', en: '+20% Body/Mind from actions and -12% cooldown per level', 'zh-CN': '每级行动肉身/心神 +20%，冷却 -12%' },
        dao_life: { 'pt-BR': '+20 anos de vida base por nível', en: '+20 base lifespan per level', 'zh-CN': '每级基础寿命 +20 年' },
        dao_offline: { 'pt-BR': '+10% no Qi manual e passivo por nível', en: '+10% manual and passive Qi per level', 'zh-CN': '每级手动与被动真气 +10%' },
        dao_retain: { 'pt-BR': 'retém 5% do Qi total por nível até o limite de 50%', en: 'retains 5% total Qi per level up to 50%', 'zh-CN': '每级保留 5% 总真气，上限 50%' },
        dao_origin_reserve: { 'pt-BR': '+10% de reserva inicial de Qi em cada novo reino por nível', en: '+10% starting Qi reserve in each new realm per level', 'zh-CN': '每级新境界初始真气储备 +10%' },
        dao_tribulation_grace: { 'pt-BR': '-8% de anos de tribulação por nível', en: '-8% tribulation years per level', 'zh-CN': '每级天劫年数 -8%' },
        dao_herb_mult: { 'pt-BR': 'dobra a produção das Ervas por nível', en: 'doubles Herb production per level', 'zh-CN': '每级灵草产出翻倍' },
        dao_pill_mult: { 'pt-BR': '+50% de eficiência das Pílulas por nível', en: '+50% Pill efficiency per level', 'zh-CN': '每级丹药效率 +50%' },
        dao_sect_flow: { 'pt-BR': '+20% na cascata de Discípulos, Anciões e Matrizes por nível', en: '+20% cascade flow for Disciples, Elders and Arrays per level', 'zh-CN': '每级弟子、长老、阵法联动 +20%' },
        dao_foundation_well: { 'pt-BR': '+15% de Qi passivo total por nível', en: '+15% total passive Qi per level', 'zh-CN': '每级总被动真气 +15%' },
        dao_world_root: { 'pt-BR': '+12% no fluxo passivo total e +10% na cascata por nível', en: '+12% total passive flow and +10% cascade per level', 'zh-CN': '每级总被动流转 +12%，联动 +10%' }
    };

    const summary = summaries[upgradeId];
    if (!summary) return upgrade.desc;
    return summary[getCurrentLocale()] || summary['pt-BR'];
}

function getMetaUpgradeRequirementText(upg) {
    if (!upg.requires) return t('free');
    return Object.entries(upg.requires)
        .map(([reqId, reqLevel]) => `${GAME_DATA.metaUpgrades[reqId].name} ${reqLevel}`)
        .join(' • ');
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
    const container = document.getElementById('journey-graph-container');
    const rect = container?.getBoundingClientRect();
    const targetZoom = isMobile ? 0.44 : 0.54;

    if (
        force ||
        (gameState.journeyView.offsetX === 0 && gameState.journeyView.offsetY === 0)
    ) {
        if (force || !gameState.journeyView.zoom || gameState.journeyView.zoom < 0.45) {
            gameState.journeyView.zoom = targetZoom;
        }

        const zoom = gameState.journeyView.zoom || targetZoom;
        const startFocus = getJourneyStartFocusBounds();
        const desiredScreenX = rect ? rect.width * (isMobile ? 0.52 : 0.46) : (isMobile ? 240 : 480);
        const desiredScreenY = rect ? rect.height * (isMobile ? 0.82 : 0.8) : (isMobile ? 560 : 760);
        const focusCenterX = (startFocus.minX + startFocus.maxX) / 2;
        const focusBottomY = startFocus.maxY;

        gameState.journeyView.offsetX = desiredScreenX - (focusCenterX * zoom);
        gameState.journeyView.offsetY = desiredScreenY - (focusBottomY * zoom);
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
        ? t('available_now')
        : node.onCooldown
            ? t('recharging')
        : node.blocked
            ? t('route_lost')
            : node.adjacent
                ? t('next_action')
                : node.unlocked
                    ? t('next_action')
                    : t('memory_status');

    tooltip.innerHTML = `
        <h4>${action.name}</h4>
        <p>${status}</p>
        <p>${action.time_cost} ${t('years')}</p>
        <p>${effectsText.length > 0 ? effectsText.join(' • ') : t('no_direct_effect')}</p>
        ${node.onCooldown ? `<p>${t('cooldown_ready_in', { years: node.cooldownRemaining.toFixed(1) })}</p>` : (action.cooldownYears ? `<p>${t('cooldown_label')}: ${t('cooldown_fixed', { years: getActionCooldownDurationYears(action.id) })}</p>` : '')}
        ${requirements.length > 0 ? `<p>${t('missing')}: ${requirements.join(' • ')}</p>` : ''}
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
    btn.innerText = audio.paused ? t('play') : t('pause');
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
            pushGameToast(t('audio_blocked_toast'), 'warning');
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

const JOURNEY_GRAPH_NODE_WIDTH = 220;
const JOURNEY_GRAPH_NODE_HEIGHT = 112;
const HUD_DRAWER_IDS = ['drawer-idle', 'drawer-sect', 'drawer-transcendence'];
const JOURNEY_GRAPH_PADDING_X = 120;
const JOURNEY_GRAPH_PADDING_Y = 120;
const JOURNEY_GRAPH_COLUMN_GAP = 74;
const JOURNEY_GRAPH_ROW_GAP = 90;
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

function getJourneyNodePalette(type) {
    if (type === 'corpo') {
        return {
            start: '#dc2626',
            end: '#ea580c',
            icon: '💪'
        };
    }
    if (type === 'social') {
        return {
            start: '#16a34a',
            end: '#10b981',
            icon: '👥'
        };
    }
    if (type === 'risco') {
        return {
            start: '#7f1d1d',
            end: '#450a0a',
            icon: '⚠'
        };
    }
    return {
        start: '#9333ea',
        end: '#2563eb',
        icon: '🧘'
    };
}

function getJourneyNodeBadge(node) {
    if (node.active) return { text: `▶ ${t('in_progress_action')}`, background: 'rgba(250, 204, 21, 0.85)', color: '#111827' };
    if (node.blocked) return { text: `🔒 ${t('route_lost')}`, background: 'rgba(239, 68, 68, 0.82)', color: '#fff7f7' };
    if (!node.unlocked) return { text: `🔒 ${t('locked_word')}`, background: 'rgba(107, 114, 128, 0.78)', color: '#f3f4f6' };
    if (node.isInteractable) return { text: t('available_now'), background: 'rgba(96, 165, 250, 0.82)', color: '#eff6ff' };
    if (node.adjacent) return { text: t('next_action'), background: 'rgba(107, 114, 128, 0.78)', color: '#f3f4f6' };
    return { text: t('memory_status'), background: 'rgba(75, 85, 99, 0.74)', color: '#f3f4f6' };
}

function truncateCanvasText(ctx, text, maxWidth) {
    const raw = `${text ?? ''}`;
    if (ctx.measureText(raw).width <= maxWidth) return raw;
    let truncated = raw;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
}

function drawWrappedCanvasText(ctx, text, x, y, maxWidth, maxLines, lineHeight) {
    const words = `${text ?? ''}`.split(/\s+/).filter(Boolean);
    if (words.length === 0) return y;

    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
            currentLine = candidate;
            return;
        }

        if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            lines.push(truncateCanvasText(ctx, word, maxWidth));
            currentLine = '';
        }
    });

    if (currentLine) lines.push(currentLine);

    const limitedLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
        limitedLines[maxLines - 1] = truncateCanvasText(ctx, limitedLines[maxLines - 1], maxWidth);
    }

    limitedLines.forEach((line, index) => {
        ctx.fillText(line, x, y + (index * lineHeight));
    });

    return y + limitedLines.length * lineHeight;
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

function getJourneyGraphAxisMaps() {
    const rawXs = new Set();
    const rawYs = new Set();

    Object.values(GAME_DATA.journeyActions).forEach(action => {
        if (!action.graph) return;
        rawXs.add(action.graph.x);
        rawYs.add(action.graph.y);
    });

    const xLevels = Array.from(rawXs).sort((a, b) => a - b);
    const yLevels = Array.from(rawYs).sort((a, b) => a - b);

    return {
        xOrder: new Map(xLevels.map((value, index) => [value, index])),
        yOrder: new Map(yLevels.map((value, index) => [value, index])),
        xCount: xLevels.length,
        yCount: yLevels.length
    };
}

function transformJourneyGraphPoint(rawX, rawY, axisMaps) {
    // Rotate the journey so the beginning sits at the bottom and the path climbs upward.
    const xIndex = axisMaps.yOrder.get(rawY) || 0;
    const yIndex = axisMaps.xOrder.get(rawX) || 0;

    return {
        x: JOURNEY_GRAPH_PADDING_X + xIndex * (JOURNEY_GRAPH_NODE_WIDTH + JOURNEY_GRAPH_COLUMN_GAP),
        y: JOURNEY_GRAPH_PADDING_Y + ((axisMaps.xCount - 1 - yIndex) * (JOURNEY_GRAPH_NODE_HEIGHT + JOURNEY_GRAPH_ROW_GAP))
    };
}

function getJourneyStartFocusBounds() {
    const axisMaps = getJourneyGraphAxisMaps();
    const startingIds = getStartingJourneyActions();
    const fallback = {
        minX: JOURNEY_GRAPH_PADDING_X,
        maxX: JOURNEY_GRAPH_PADDING_X + JOURNEY_GRAPH_NODE_WIDTH,
        minY: JOURNEY_GRAPH_PADDING_Y,
        maxY: JOURNEY_GRAPH_PADDING_Y + JOURNEY_GRAPH_NODE_HEIGHT
    };

    if (!startingIds.length) return fallback;

    const coords = startingIds
        .map(actionId => GAME_DATA.journeyActions[actionId]?.graph)
        .filter(Boolean)
        .map(graph => transformJourneyGraphPoint(graph.x, graph.y, axisMaps));

    if (!coords.length) return fallback;

    return coords.reduce((acc, point) => ({
        minX: Math.min(acc.minX, point.x),
        maxX: Math.max(acc.maxX, point.x + JOURNEY_GRAPH_NODE_WIDTH),
        minY: Math.min(acc.minY, point.y),
        maxY: Math.max(acc.maxY, point.y + JOURNEY_GRAPH_NODE_HEIGHT)
    }), {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
    });
}

function buildJourneyGraphViewModel() {
    const visibleIds = getVisibleJourneyNodes();
    const baseSet = new Set([
        ...getStartingJourneyActions(),
        ...gameState.discoveredActions,
        ...gameState.unlockedActions,
        ...gameState.blockedActions
    ]);
    const axisMaps = getJourneyGraphAxisMaps();

    const nodes = visibleIds.map(actionId => {
        const action = GAME_DATA.journeyActions[actionId];
        const graph = action.graph || { x: 0, y: 0, lane: 'geral' };
        const point = transformJourneyGraphPoint(graph.x, graph.y, axisMaps);
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
            x: point.x,
            y: point.y,
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
    }).sort((a, b) => b.y - a.y || a.x - b.x);

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

        const startX = from.x + from.width / 2;
        const startY = from.y;
        const endX = to.x + to.width / 2;
        const endY = to.y + to.height;
        const controlOffset = Math.max(90, Math.abs(endY - startY) * 0.4);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
            startX,
            startY - controlOffset,
            endX,
            endY + controlOffset,
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
        const palette = getJourneyNodePalette(node.action.type);
        const cardGradient = ctx.createLinearGradient(node.x, node.y, node.x + node.width, node.y + node.height);
        cardGradient.addColorStop(0, palette.start);
        cardGradient.addColorStop(1, palette.end);

        let stroke = '#6b7280';
        let shadow = 'rgba(0, 0, 0, 0.28)';
        let opacity = 1;

        if (node.active) {
            stroke = '#facc15';
            shadow = 'rgba(250, 204, 21, 0.45)';
        } else if (node.blocked) {
            stroke = '#ef4444';
            shadow = 'rgba(239, 68, 68, 0.34)';
            opacity = 0.4;
        } else if (!node.unlocked) {
            stroke = '#4b5563';
            opacity = 0.42;
        } else if (node.isInteractable) {
            stroke = '#60a5fa';
            shadow = 'rgba(96, 165, 250, 0.28)';
        } else {
            stroke = '#6b7280';
        }

        if (node.isEnding) {
            stroke = '#facc15';
            shadow = 'rgba(250, 204, 21, 0.3)';
        }

        ctx.save();
        ctx.shadowColor = shadow;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = node.hovered || node.selected ? 24 : (node.isInteractable || node.active ? 18 : 8);

        drawRoundedRect(ctx, node.x, node.y, node.width, node.height, 9);
        ctx.fillStyle = cardGradient;
        ctx.fill();
        ctx.lineWidth = node.hovered || node.selected ? 3.5 : 2.5;
        ctx.strokeStyle = stroke;
        ctx.stroke();

        ctx.shadowBlur = 0;
        const innerX = node.x + 2;
        const innerY = node.y + 2;
        const innerW = node.width - 4;
        const innerH = node.height - 4;
        const innerGradient = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
        innerGradient.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
        innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
        drawRoundedRect(ctx, innerX, innerY, innerW, innerH, 7);
        ctx.fillStyle = innerGradient;
        ctx.fill();

        const iconSize = 34;
        const iconX = node.x + node.width - 26;
        const iconY = node.y - 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(iconX, iconY + 10, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '18px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(palette.icon, iconX, iconY + 10);
        ctx.restore();
    });
}

function drawJourneyNodeLabels(ctx, nodes) {
    nodes.forEach(node => {
        const badge = getJourneyNodeBadge(node);
        const contentX = node.x + 12;
        let currentY = node.y + 12;
        const textWidth = node.width - 24;

        ctx.save();
        ctx.textBaseline = 'top';

        const badgeWidth = Math.min(node.width - 58, Math.max(72, ctx.measureText(badge.text).width + 14));
        drawRoundedRect(ctx, contentX, currentY, badgeWidth, 20, 4);
        ctx.fillStyle = badge.background;
        ctx.fill();
        ctx.fillStyle = badge.color;
        ctx.font = '600 10px Inter';
        ctx.fillText(truncateCanvasText(ctx, badge.text, badgeWidth - 10), contentX + 6, currentY + 5);
        currentY += 28;

        if (node.action.set_route) {
            const routeBadgeText = '★ Rota';
            const routeBadgeWidth = 52;
            drawRoundedRect(ctx, contentX + badgeWidth + 6, node.y + 12, routeBadgeWidth, 20, 4);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.84)';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '600 10px Inter';
            ctx.fillText(routeBadgeText, contentX + badgeWidth + 13, node.y + 17);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 13px Inter';
        ctx.textBaseline = 'top';
        const title = truncateCanvasText(ctx, node.action.name, textWidth - 4);
        ctx.fillText(title, contentX, currentY);
        currentY += 18;

        ctx.fillStyle = 'rgba(243, 244, 246, 0.86)';
        ctx.font = '11px Inter';
        currentY = drawWrappedCanvasText(ctx, node.action.desc, contentX, currentY, textWidth, 2, 14) + 4;

        ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
        ctx.font = '600 11px Inter';
        const timeText = `⏱ ${node.action.time_cost} ${t('years')}`;
        ctx.fillText(timeText, contentX, node.y + node.height - 22);

        if (node.action.repeatable) {
            ctx.textAlign = 'right';
            ctx.fillText('♻', node.x + node.width - 12, node.y + node.height - 22);
            ctx.textAlign = 'left';
        }
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
            <div class="journey-graph-node-info-top">
                <span class="hud-label">${t('status')}</span>
                <span class="journey-graph-node-info-chip">${t('action_panel_chip')}</span>
            </div>
            <h3>${t('choose_node')}</h3>
            <p>${t('choose_node_hint')}</p>
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

    let status = t('memory_status');
    if (onCooldown) status = t('recharging');
    if (blocked) status = t('route_lost');
    else if (gameState.activeAction === nodeId) status = t('in_progress_action');
    else if (unlocked && failures.length === 0) status = t('available_now');
    else if (unlocked) status = t('next_action');
    else if (adjacent) status = t('next_action');

    const req = action.requirements || {};
    const reqParts = [];
    if (req.qi) reqParts.push(`${formatNumber(req.qi)} Qi`);
    if (req.body) reqParts.push(`${req.body} ${t('body_word')}`);
    if (req.mind) reqParts.push(`${req.mind} ${t('mind_word')}`);
    if (req.realm) reqParts.push(`${t('realm_word')} ${req.realm}+`);
    if (req.subRealm) reqParts.push(`${t('subrealm_word')} ${req.subRealm}+`);
    if (req.karma_max !== undefined) reqParts.push(`Karma <= ${req.karma_max}`);
    ['herbs', 'pills', 'disciples', 'elders', 'arrays'].forEach(key => {
        if (req[key]) reqParts.push(`${formatNumber(req[key])} ${GAME_DATA.buildings[key].name}`);
    });

    const progress = gameState.actionProgresses[nodeId] || 0;
    const progressText = progress > 0 ? `${Math.floor((progress / action.time_cost) * 100)}%` : t('no_saved_progress');
    const failureText = failures.length > 0 ? failures.join(' • ') : t('no_requirements');
    const effectsText = getActionEffectsSummary(action);
    const cooldownDuration = getActionCooldownDurationYears(nodeId);
    const cooldownText = action.cooldownYears ? (onCooldown ? t('cooldown_remaining', { remaining: cooldownRemaining.toFixed(1), total: cooldownDuration }) : t('cooldown_per_use', { years: cooldownDuration })) : t('no_cooldown');
    const unlocksText = action.unlocks?.length ? action.unlocks.map(id => GAME_DATA.journeyActions[id]?.name).filter(Boolean) : [];

    let ctaLabel = t('execute_action');
    let ctaDisabled = false;
    if (gameState.activeAction === nodeId) {
        ctaLabel = t('action_running');
        ctaDisabled = true;
    } else if (blocked) {
        ctaLabel = t('locked_route');
        ctaDisabled = true;
    } else if (!unlocked) {
        ctaLabel = t('locked_word');
        ctaDisabled = true;
    } else if (onCooldown) {
        ctaLabel = t('recharging');
        ctaDisabled = true;
    } else if (failures.length > 0) {
        ctaLabel = t('unmet_requirements');
        ctaDisabled = true;
    }

    info.innerHTML = `
        <div class="journey-graph-node-info-top">
            <span class="hud-label">${t('status')}</span>
            <span class="journey-graph-node-info-chip">${status}</span>
        </div>
        <h3>${action.name}</h3>
        <p>${action.desc}</p>
        <div class="journey-detail-grid">
            <div class="journey-detail-stat">
                <span class="journey-detail-stat-label">${t('status')}</span>
                <span class="journey-detail-stat-value">${status}</span>
            </div>
            <div class="journey-detail-stat">
                <span class="journey-detail-stat-label">${t('time_word')}</span>
                <span class="journey-detail-stat-value">${action.time_cost} ${t('years')}</span>
            </div>
            <div class="journey-detail-stat">
                <span class="journey-detail-stat-label">${t('repeatable_word')}</span>
                <span class="journey-detail-stat-value">${action.repeatable ? t('yes_word') : t('no_word')}</span>
            </div>
            <div class="journey-detail-stat">
                <span class="journey-detail-stat-label">${t('progress')}</span>
                <span class="journey-detail-stat-value">${progressText}</span>
            </div>
        </div>
        <div class="journey-detail-block">
            <h4>${t('requirements')}</h4>
            <div class="journey-detail-list">
                <div class="journey-detail-item">${reqParts.length > 0 ? reqParts.join(' • ') : t('no_requirements')}</div>
                <div class="journey-detail-item muted">${t('missing')}: ${failureText}</div>
            </div>
        </div>
        <div class="journey-detail-block">
            <h4>${t('effects')}</h4>
            <div class="journey-detail-list">
                <div class="journey-detail-item">${effectsText.length > 0 ? effectsText.join(' • ') : t('no_direct_effect')}</div>
                <div class="journey-detail-item muted">${t('cooldown_label')}: ${cooldownText}</div>
            </div>
        </div>
        ${unlocksText.length > 0 ? `
            <div class="journey-detail-block">
                <h4>${t('unlocks')}</h4>
                <div class="journey-detail-list">
                    <div class="journey-detail-item">${unlocksText.join(' • ')}</div>
                </div>
            </div>
        ` : ''}
        <button class="buy-btn journey-detail-cta" onclick="startJourneyAction('${nodeId}')" ${ctaDisabled ? 'disabled' : ''}>${ctaLabel}</button>
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
            pushGameToast(t('unavailable_action_toast', { action: node.action.name }), 'warning');
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
        ? t('objective_tribulation')
        : (gameState.currentObjectiveKey ? t(gameState.currentObjectiveKey, gameState.currentObjectiveData || {}) : (gameState.currentObjective || t('objective_default')));
    document.getElementById('current-objective').innerText = objectiveText;
    document.getElementById('current-ending').innerText = gameState.endingTitle || t('no_ending');
    const topKarma = document.getElementById('top-karma-display');
    if (topKarma) {
        topKarma.innerText = formatNumber(gameState.karma);
        topKarma.style.color = gameState.karma >= 0 ? '#D4AF37' : '#d98b8b';
    }

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
            if (progressLabel) progressLabel.innerText = t('tribulation');
        } else {
            const percent = Math.min(100, (gameState.qi / targetCap) * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.classList.toggle('tribulation-bar-fill', tribulationReady);
            if (progressLabel) progressLabel.innerText = atPeak ? t('tribulation') : t('next_breakthrough');
        }
    }

    const realmProgressFill = document.getElementById('realm-progress-bar-fill');
    const realmProgressText = document.getElementById('realm-progress-text');
    if (realmProgressFill && realmProgressText) {
        const realmPercent = Math.min(100, (gameState.qi / targetCap) * 100);
        realmProgressFill.style.width = `${realmPercent}%`;
        realmProgressText.innerText = atPeak
            ? t('qi_to_tribulation', { current: formatNumber(gameState.qi), target: formatNumber(realmCap) })
            : t('qi_to_next_stage', { current: formatNumber(gameState.qi), target: formatNumber(subRealmCap) });
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
            tribBtn.innerText = t('survive_years', { years: Math.ceil(tribulationTimer) });
        }
    } else {
        document.getElementById('qi-progress').style.color = 'inherit';
        if (tribBtn) {
            tribBtn.style.display = atPeak ? 'inline-flex' : 'none';
            if (gameState.realm >= getMaxRealm() && atPeak) {
                tribBtn.innerText = t('max_realm');
                tribBtn.disabled = true;
            } else if (tribulationReady) {
                tribBtn.disabled = false;
                tribBtn.innerText = t('start_tribulation');
            } else {
                tribBtn.disabled = true;
                tribBtn.innerText = atPeak ? t('reach_qi_cap') : t('cultivate_to_peak');
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
            ascBtn.innerText = t('ascend_dao');
        } else if (gameState.endingTitle) {
            ascBtn.innerText = t('end_legend_btn');
        } else {
            ascBtn.innerText = t('spiritual_suicide');
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
            meditateBtn.innerText = t('meditate');
            meditateBtn.title = t('meditation_title', { qpc: formatNumber(getQiPerClick()) });
        } else {
            meditateBtn.disabled = true;
            meditateBtn.innerText = t('awaken_qi');
            meditateBtn.title = t('awaken_qi_title');
        }
    }

    const bList = document.getElementById('buildings-list');
    if(bList) {
        bList.innerHTML = '';
        
        // Se ainda não descobriu ervas, mostrar um placeholder
        if (!gameState.unlocks.canBuyHerbs) {
            bList.innerHTML = `
                <div class="technique-card" style="opacity: 0.5; border-style: dashed; justify-content: center;">
                    <p style="color: #666; font-style: italic;">${t('locked_idle_hint')}</p>
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
                    <p style="color: #A0A0A0; font-style: italic;">${t('locked_next_step')}</p>
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
                arrowHtml = `<div style="text-align: center; color: #57A773; margin: -10px 0 -5px 0;">${t('generates_arrow')}</div>`;
            }

            card.innerHTML = `
                <div class="tech-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="color: #57A773; margin: 0;">${b.name} (<span id="count-b-${bId}">${formatNumber(count)}</span>)</h3>
                        <button id="buy-b-${bId}" class="buy-btn" onclick="handleBuyBuilding('${bId}')">${t('buy')}</button>
                    </div>
                    <p style="margin: 5px 0;">${b.desc}</p>
                    <p style="margin: 5px 0; color: #EAE4D3;">${t('effect')}: ${getBuildingEffectSummary(bId)}</p>
                    <p>${t('cost')}: <span id="cost-b-${bId}" style="color: #D4AF37;">${formatNumber(cost)}</span> Qi</p>
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
                    <h3>${upg.name} (${t('level_short')} <span id="level-meta-${upgId}">${level}</span>)</h3>
                    <p>${upg.desc}</p>
                    <p style="color: #EAE4D3;">${t('effect')}: ${getMetaUpgradeEffectSummary(upgId)}</p>
                    <p>${t('cost')}: <span id="cost-meta-${upgId}">${formatNumber(cost)}</span> ${t('karma_word')}</p>
                </div>
                <button id="buy-meta-${upgId}" class="buy-btn" style="background: #d4af37; color: #1a1a1a;" onclick="handleBuyMeta('${upgId}')">${t('comprehend')}</button>
            `;
            metaList.appendChild(card);
        }
    }
}

function renderJourney() {
    renderJourneyLog();
    syncFullscreenHudLayout(!journeyGraphRuntime.bound);
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
        entry.innerText = typeof window.localizeJourneyLogEntry === 'function'
            ? window.localizeJourneyLogEntry(log)
            : log;
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
        const canBuy = canBuyMetaUpgrade(upgId);
        const isMaxed = upg.maxLevel !== undefined && level >= upg.maxLevel;
        
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
        card.style.opacity = canBuy || level > 0 ? '1' : '0.72';
        
        card.innerHTML = `
            <div class="tech-info" style="text-align: center;">
                <h3 style="color: ${borderColor};">${upg.name} (${t('level_short')} <span id="level-tree-${upgId}">${level}</span>${upg.maxLevel ? ` / ${upg.maxLevel}` : ''})</h3>
                <p style="margin: 5px 0;">${upg.desc}</p>
                <p style="margin: 5px 0; color: #EAE4D3;">${t('effect')}: ${getMetaUpgradeEffectSummary(upgId)}</p>
                <p style="color: #D4AF37; font-weight: bold;">${t('cost')}: <span id="cost-tree-${upgId}">${formatNumber(cost)}</span> ${t('karma_word')}</p>
                <p style="margin: 5px 0; color: #A0A0A0;">${t('requirements')}: ${getMetaUpgradeRequirementText(upg)}</p>
            </div>
            <button id="buy-tree-${upgId}" class="buy-btn" style="background: #121415; border-color: ${borderColor}; color: ${borderColor}; width: 100%;" onclick="handleBuyMeta('${upgId}')">
                ${isMaxed ? t('completed') : t('comprehend')}
            </button>
        `;
        
        if (paths[upg.path]) {
            paths[upg.path].appendChild(card);
        }
        
        // Desabilitar botão se não tiver karma
        setTimeout(() => {
            const btn = document.getElementById(`buy-tree-${upgId}`);
            if (btn) btn.disabled = !canBuy || isMaxed;
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
