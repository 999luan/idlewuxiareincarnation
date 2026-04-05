export const GAME_DATA = {
  subRealms: {
    1: { name: "Inicial", multiplier: 1.0 },
    2: { name: "Intermediário", multiplier: 1.25 },
    3: { name: "Avançado", multiplier: 1.6 },
    4: { name: "Pico", multiplier: 2.1 }
  },
  realms: {
    1: {
      name: "Temperar o Corpo",
      qiCap: 2000,
      multiplier: 1,
      tribulationDps: 80,
      tribulationYears: 2,
      karmaReward: 0,
      lifespanReward: 25,
      qiReserveRatio: 0.5,
      desc: "Seus ossos doem, mas sua vontade finalmente aprendeu a ranger junto."
    },
    2: {
      name: "Condensação de Qi",
      qiCap: 120000,
      multiplier: 5,
      tribulationDps: 3000,
      tribulationYears: 18,
      karmaReward: 1,
      lifespanReward: 60,
      qiReserveRatio: 0.5,
      desc: "O mundo deixa de ser ar e passa a ser alimento."
    },
    3: {
      name: "Estabelecimento de Fundação",
      qiCap: 2500000,
      multiplier: 25,
      tribulationDps: 800000,
      tribulationYears: 45,
      karmaReward: 2,
      lifespanReward: 120,
      qiReserveRatio: 0.5,
      desc: "Seu Dao deixa de ser rumor e ganha espinha dorsal."
    },
    4: {
      name: "Formação do Núcleo",
      qiCap: 40000000,
      multiplier: 125,
      tribulationDps: 250000000,
      tribulationYears: 90,
      karmaReward: 4,
      lifespanReward: 220,
      qiReserveRatio: 0.5,
      desc: "Uma estrela pessoal gira no seu dantian, pequena e tirânica."
    },
    5: {
      name: "Alma Nascente",
      qiCap: 800000000,
      multiplier: 625,
      tribulationDps: 2e11,
      tribulationYears: 180,
      karmaReward: 7,
      lifespanReward: 420,
      qiReserveRatio: 0.5,
      desc: "Sua alma aprende a andar antes mesmo de abandonar o corpo."
    },
    6: {
      name: "Separação Espiritual",
      qiCap: 15000000000,
      multiplier: 3125,
      tribulationDps: 2e15,
      tribulationYears: 360,
      karmaReward: 11,
      lifespanReward: 800,
      qiReserveRatio: 0.5,
      desc: "A carne já não manda tanto quanto antes."
    },
    7: {
      name: "Imortal Verdadeiro",
      qiCap: 250000000000,
      multiplier: 15625,
      tribulationDps: 2e19,
      tribulationYears: 720,
      karmaReward: 16,
      lifespanReward: 1500,
      qiReserveRatio: 0.5,
      desc: "Os mortais juram que você sempre existiu."
    }
  },
  techniques: {
    click_base: {
      id: "click_base",
      name: "Técnica do Dedo Dourado",
      type: "click",
      baseCost: 10,
      costGrowth: 1.15,
      basePower: 1,
      desc: "Aumenta o Qi gerado por clique."
    }
  },
  buildings: {
    herbs: {
      id: "herbs",
      name: "Erva Espiritual",
      baseCost: 30,
      costGrowth: 1.14,
      desc: "Raízes úmidas de energia. Cada unidade gera 3 Qi/s.",
      generate: "qi",
      amount: 3
    },
    pills: {
      id: "pills",
      name: "Pílula da Fundação",
      baseCost: 1200,
      costGrowth: 1.18,
      desc: "Cada pílula aumenta a eficiência das Ervas em +1.5%.",
      generate: "herbs_mult",
      amount: 0.015
    },
    disciples: {
      id: "disciples",
      name: "Discípulo Exterior",
      baseCost: 15000,
      costGrowth: 1.22,
      desc: "Cada Discípulo gera 0.6 Pílula por segundo.",
      generate: "pills",
      amount: 0.6
    },
    elders: {
      id: "elders",
      name: "Ancião da Seita",
      baseCost: 500000,
      costGrowth: 1.27,
      desc: "Cada Ancião recruta 0.5 Discípulo por segundo.",
      generate: "disciples",
      amount: 0.5
    },
    arrays: {
      id: "arrays",
      name: "Matriz de Convergência",
      baseCost: 15000000,
      costGrowth: 1.32,
      desc: "Cada Matriz atrai 0.35 Ancião por segundo.",
      generate: "elders",
      amount: 0.35
    }
  },
  metaUpgrades: {
    dao_karma_gain: {
      id: "dao_karma_gain",
      name: "Compreensão do Samsara",
      baseCost: 1,
      costGrowth: 1.5,
      desc: "Aumenta o ganho de Karma ao reencarnar em +10%.",
      path: "man"
    },
    dao_cost_reduction: {
      id: "dao_cost_reduction",
      name: "Mente Vazia",
      baseCost: 2,
      costGrowth: 1.8,
      desc: "Reduz o crescimento de custo das propriedades.",
      path: "man"
    },
    dao_realm_mult: {
      id: "dao_realm_mult",
      name: "Ecos do Passado",
      baseCost: 5,
      costGrowth: 3,
      desc: "Multiplicadores de reino ganham um bônus massivo.",
      path: "man"
    },
    dao_life: {
      id: "dao_life",
      name: "Corpo de Tartaruga",
      baseCost: 1,
      costGrowth: 1.5,
      desc: "Aumenta a expectativa de vida inicial em +20 anos.",
      path: "heaven"
    },
    dao_offline: {
      id: "dao_offline",
      name: "Respiração Profunda",
      baseCost: 2,
      costGrowth: 2,
      desc: "Aumenta Qi manual e passivo em +10%.",
      path: "heaven"
    },
    dao_retain: {
      id: "dao_retain",
      name: "Memória da Alma",
      baseCost: 10,
      costGrowth: 5,
      desc: "Mantém 5% do Qi total na próxima vida.",
      path: "heaven"
    },
    dao_herb_mult: {
      id: "dao_herb_mult",
      name: "Solo Fértil",
      baseCost: 1,
      costGrowth: 1.5,
      desc: "Ervas geram 2x mais Qi.",
      path: "earth"
    },
    dao_pill_mult: {
      id: "dao_pill_mult",
      name: "Fogo Alquímico",
      baseCost: 3,
      costGrowth: 2,
      desc: "Pílulas são 50% mais eficientes ao buffar Ervas.",
      path: "earth"
    }
  }
};

export const formatNumber = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return Math.floor(num).toString();
};
