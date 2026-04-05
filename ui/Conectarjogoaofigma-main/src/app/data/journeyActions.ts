export interface JourneyAction {
  id: string;
  name: string;
  desc: string;
  time_cost: number;
  type: 'corpo' | 'cultivo' | 'social' | 'risco';
  requirements: {
    body?: number;
    mind?: number;
    qi?: number;
    realm?: number;
    subRealm?: number;
    karma_min?: number;
    karma_max?: number;
    disciples?: number;
  };
  effects: {
    body?: number;
    mind?: number;
    qi?: number;
    karma?: number;
    lifespan_penalty?: number;
  };
  unlocks?: string[];
  unlock_flags?: string[];
  set_route?: 'void' | 'alchemy' | 'sect' | 'body' | 'demonic';
  blocks?: string[];
  repeatable: boolean;
  cooldownYears?: number;
  ui_reward_summary?: string;
  log: string;
}

export const JOURNEY_ACTIONS: Record<string, JourneyAction> = {
  work_farm: {
    id: "work_farm",
    name: "Trabalhar na Fazenda",
    desc: "Você ara a terra, fortalece os braços e compra mais alguns anos de humildade.",
    time_cost: 2,
    type: "corpo",
    requirements: {},
    effects: { body: 1 },
    unlocks: ["explore_forest", "explore_ruins"],
    repeatable: true,
    log: "Você volta da plantação com as mãos rachadas e o corpo um pouco mais firme."
  },
  hear_legends: {
    id: "hear_legends",
    name: "Ouvir Lendas na Taverna",
    desc: "Velhos bêbados mentem mal, mas mentem sobre imortais. Isso já basta.",
    time_cost: 2,
    type: "social",
    requirements: {},
    effects: { mind: 2 },
    unlocks: ["breathe"],
    repeatable: false,
    log: "As histórias plantam ambição onde antes só havia cansaço."
  },
  village_elder: {
    id: "village_elder",
    name: "Consultar o Ancião da Vila",
    desc: "O velho sabe pouco, mas sabe apontar para as montanhas certas.",
    time_cost: 2,
    type: "social",
    requirements: {},
    effects: { body: 1, mind: 1 },
    unlocks: ["sect_recruiter", "find_cave"],
    repeatable: false,
    log: "O ancião fala sobre cavernas, seitas e o tipo de loucura que vale a pena perseguir."
  },
  rest_under_tree: {
    id: "rest_under_tree",
    name: "Descansar sob a Árvore Antiga",
    desc: "Você silencia a respiração e escuta o vento tentando ensinar alguma coisa.",
    time_cost: 2,
    type: "cultivo",
    requirements: {},
    effects: { mind: 1, qi: 10 },
    unlocks: ["breathe"],
    repeatable: true,
    log: "Nada aconteceu de grandioso. Ainda assim, seu coração ficou mais quieto."
  },
  breathe: {
    id: "breathe",
    name: "Tentar Sentir o Qi",
    desc: "Você tenta respirar o mundo sem parecer ridículo.",
    time_cost: 3,
    type: "cultivo",
    requirements: { mind: 12 },
    effects: { qi: 60, mind: 1 },
    unlock_flags: ["canMeditate"],
    unlocks: ["read_scroll", "watch_stars"],
    repeatable: false,
    ui_reward_summary: "Desbloqueia meditação e inicia seu primeiro fluxo passivo de Qi.",
    log: "Uma corrente morna passa pelos seus meridianos. Meditar deixou de ser superstição."
  },
  find_cave: {
    id: "find_cave",
    name: "Investigar a Caverna Brilhante",
    desc: "Uma caverna húmida exala energia verde. Isso parece promissor e levemente insalubre.",
    time_cost: 3,
    type: "cultivo",
    requirements: { qi: 80 },
    effects: { qi: 120, mind: 1 },
    unlock_flags: ["canBuyHerbs"],
    unlocks: ["gather_spirit_herbs", "read_scroll"],
    repeatable: false,
    ui_reward_summary: "Desbloqueia Ervas Espirituais e abre a primeira layer comprável do idle.",
    log: "Você encontra ervas espirituais e um abrigo bom o bastante para sonhar com grandeza."
  },
  explore_forest: {
    id: "explore_forest",
    name: "Explorar a Floresta Sombria",
    desc: "A mata cobra coragem de entrada e sangue na saída.",
    time_cost: 3,
    type: "risco",
    requirements: { body: 11 },
    effects: { body: 2 },
    unlocks: ["hunt_wild_boar"],
    repeatable: false,
    log: "Você volta arranhado, vivo e um pouco menos impressionável."
  },
  explore_ruins: {
    id: "explore_ruins",
    name: "Explorar Ruínas Abandonadas",
    desc: "Pedras quebradas, estelas rachadas e um cheiro de sorte errada.",
    time_cost: 3,
    type: "risco",
    requirements: { mind: 11 },
    effects: { mind: 1, karma: -1 },
    unlocks: ["forbidden_whisper"],
    repeatable: false,
    log: "Nas ruínas, algo antigo percebe que você é tolo o bastante para continuar."
  },
  read_scroll: {
    id: "read_scroll",
    name: "Ler Pergaminhos Antigos",
    desc: "Os caracteres são ruins, mas a compreensão melhora com repetição.",
    time_cost: 3,
    type: "social",
    requirements: { mind: 13 },
    effects: { mind: 1 },
    unlocks: ["study_alchemy"],
    repeatable: true,
    log: "Cada linha lida arranca um pouco de ignorância da sua testa."
  },
  gather_spirit_herbs: {
    id: "gather_spirit_herbs",
    name: "Coletar Ervas Espirituais",
    desc: "Você aprende a colher sem destruir a raiz, o campo ou a própria mão.",
    time_cost: 3,
    type: "cultivo",
    requirements: { qi: 150 },
    effects: { qi: 400, mind: 1 },
    unlock_flags: ["canBuyPills"],
    unlocks: ["refine_awakening_pill"],
    repeatable: true,
    ui_reward_summary: "Aprimora sua base alquímica e libera Pílulas da Fundação.",
    log: "Sua bolsa se enche de ervas e sua cabeça se enche de possibilidades alquímicas."
  },
  watch_stars: {
    id: "watch_stars",
    name: "Observar as Estrelas",
    desc: "O céu parece desorganizado até começar a responder de volta.",
    time_cost: 4,
    type: "cultivo",
    requirements: { mind: 14 },
    effects: { mind: 2, qi: 200 },
    unlocks: ["silent_retreat"],
    repeatable: true,
    log: "Você aprende a chamar de destino o que antes parecia apenas vazio."
  },
  sect_recruiter: {
    id: "sect_recruiter",
    name: "Falar com o Recrutador da Seita",
    desc: "Ele mede seu talento, sua postura e o quanto você parece descartável.",
    time_cost: 3,
    type: "social",
    requirements: { mind: 11 },
    effects: { mind: 1 },
    unlock_flags: ["canSelectStance", "canJoinSect"],
    unlocks: ["outer_disciple_trial"],
    repeatable: false,
    ui_reward_summary: "Desbloqueia Posturas e a camada social da Seita.",
    log: "Você recebe um olhar avaliativo. Não é respeito, mas já é melhor que nada."
  },
  hunt_wild_boar: {
    id: "hunt_wild_boar",
    name: "Caçar Javali Espiritual",
    desc: "A fera corre, você corre atrás e ambos aprendem sobre violência.",
    time_cost: 3,
    type: "corpo",
    requirements: { body: 13 },
    effects: { body: 2, qi: 300 },
    unlocks: ["fight_beast"],
    repeatable: true,
    cooldownYears: 12,
    ui_reward_summary: "Rende um salto físico inicial, mas o vale logo fica sem presas úteis.",
    log: "A caçada deixa seus músculos duros e seus meridianos levemente mais ricos."
  },
  forbidden_whisper: {
    id: "forbidden_whisper",
    name: "Escutar o Sussurro Proibido",
    desc: "A voz promete atalhos. Vozes assim quase nunca mentem sobre o preço.",
    time_cost: 4,
    type: "risco",
    requirements: { mind: 12, karma_max: 5 },
    effects: { mind: 2, karma: -3 },
    unlocks: ["demonic_art"],
    repeatable: false,
    log: "Seu coração aprende uma sílaba que não deveria existir."
  },
  outer_disciple_trial: {
    id: "outer_disciple_trial",
    name: "Passar no Teste de Discípulo Externo",
    desc: "Golpes, exames e humilhação. Um processo seletivo clássico.",
    time_cost: 4,
    type: "social",
    requirements: { body: 12, mind: 12 },
    effects: { body: 1, mind: 1, qi: 300 },
    unlock_flags: ["canBuyDisciples"],
    unlocks: ["choose_orthodox_sect", "hall_of_scripts"],
    repeatable: false,
    ui_reward_summary: "Libera Discípulos como nova camada produtiva.",
    log: "Você entra pelos portões da seita. O luxo ainda não, a servidão imediatamente."
  },
  study_alchemy: {
    id: "study_alchemy",
    name: "Estudar Alquimia Básica",
    desc: "O caldeirão responde bem a quem aceita errar sem explodir a sobrancelha.",
    time_cost: 5,
    type: "cultivo",
    requirements: { mind: 15, qi: 2000 },
    effects: { mind: 3, qi: 500 },
    unlocks: ["refine_awakening_pill", "feel_heavens"],
    repeatable: false,
    log: "Pela primeira vez, sua mente organiza o caos em fórmula."
  },
  fight_beast: {
    id: "fight_beast",
    name: "Caçar Fera Espiritual",
    desc: "Lutar contra monstros é um jeito excelente de melhorar ou morrer tentando.",
    time_cost: 4,
    type: "corpo",
    requirements: { body: 16 },
    effects: { body: 3, qi: 2500 },
    unlocks: ["blood_bath", "feel_heavens"],
    repeatable: true,
    cooldownYears: 20,
    ui_reward_summary: "Cada fera abatida acelera o corpo, mas a região logo se esgota.",
    log: "A fera cai. Seu corpo aprende com a brutalidade antes da sua mente reclamar."
  },
  silent_retreat: {
    id: "silent_retreat",
    name: "Retiro do Silêncio",
    desc: "Você abandona distrações, pessoas e a noção saudável de conforto.",
    time_cost: 5,
    type: "cultivo",
    requirements: { mind: 18, qi: 3000 },
    effects: { mind: 3 },
    set_route: "void",
    blocks: ["blood_bath", "refine_awakening_pill", "choose_orthodox_sect", "soul_bargain"],
    unlocks: ["feel_heavens", "void_insight"],
    repeatable: false,
    log: "Você escolhe o vazio. Todo o resto passa a soar barulhento demais."
  },
  refine_awakening_pill: {
    id: "refine_awakening_pill",
    name: "Refinar Pílula do Despertar",
    desc: "Uma única pílula para abrir a mente ou cozinhar seu futuro em fogo alto.",
    time_cost: 6,
    type: "cultivo",
    requirements: { mind: 18, qi: 6000 },
    effects: { mind: 4, body: 1 },
    set_route: "alchemy",
    blocks: ["blood_bath", "silent_retreat", "choose_orthodox_sect", "soul_bargain"],
    unlocks: ["open_medicine_hall", "feel_heavens"],
    repeatable: false,
    log: "Seu espírito se alonga como metal em brasa. O caminho da fornalha foi escolhido."
  },
  choose_orthodox_sect: {
    id: "choose_orthodox_sect",
    name: "Jurar Lealdade à Seita Ortodoxa",
    desc: "Disciplina, hierarquia e centenas de pessoas querendo usar seu talento.",
    time_cost: 5,
    type: "social",
    requirements: { mind: 14, qi: 4000 },
    effects: { body: 2, mind: 2 },
    set_route: "sect",
    blocks: ["blood_bath", "silent_retreat", "refine_awakening_pill", "soul_bargain", "demonic_art"],
    unlocks: ["sect_duties", "hall_of_scripts", "feel_heavens"],
    repeatable: false,
    log: "Você veste o manto da seita. Agora seu talento pertence a uma máquina maior."
  },
  blood_bath: {
    id: "blood_bath",
    name: "Banho de Sangue da Fera",
    desc: "Você mergulha no sangue espiritual. Seu corpo aprova, sua expectativa de vida protesta.",
    time_cost: 6,
    type: "risco",
    requirements: { body: 22, qi: 2500 },
    effects: { body: 6, lifespan_penalty: 6 },
    set_route: "body",
    blocks: ["refine_awakening_pill", "silent_retreat", "choose_orthodox_sect", "soul_bargain"],
    unlocks: ["bone_tempering", "feel_heavens"],
    repeatable: false,
    log: "Seus ossos se racham e renascem. Você escolheu a estrada que responde com cicatrizes."
  },
  demonic_art: {
    id: "demonic_art",
    name: "Praticar Arte Demoníaca Menor",
    desc: "Roubar Qi do que deveria permanecer quieto é eficiente e repugnante.",
    time_cost: 4,
    type: "risco",
    requirements: { qi: 3000, karma_max: 0 },
    effects: { qi: 8000, body: 1, lifespan_penalty: 5, karma: -5 },
    unlocks: ["soul_bargain"],
    repeatable: true,
    cooldownYears: 30,
    ui_reward_summary: "Explode seu poder por pouco tempo, mas o preço e a fonte se tornam instáveis.",
    log: "O ganho é embriagante. O cheiro da sua alma, menos."
  },
  feel_heavens: {
    id: "feel_heavens",
    name: "Forçar a Atenção dos Céus",
    desc: "Você cutuca o firmamento até ele resolver responder com trovões.",
    time_cost: 4,
    type: "risco",
    requirements: { qi: 1800, body: 18, subRealm: 4 },
    effects: { mind: 2 },
    unlocks: [],
    repeatable: false,
    ui_reward_summary: "Prepara o espírito para a Tribulação e reforça sua leitura dos céus.",
    log: "As nuvens escurecem. Você compreende melhor a fúria dos céus antes do desafio final."
  },
  soul_bargain: {
    id: "soul_bargain",
    name: "Selar um Pacto da Alma",
    desc: "Poder rápido, juros eternos.",
    time_cost: 6,
    type: "risco",
    requirements: { realm: 2, qi: 10000, karma_max: -5 },
    effects: { body: 2, mind: 2, karma: -8 },
    set_route: "demonic",
    blocks: ["choose_orthodox_sect", "silent_retreat", "refine_awakening_pill", "blood_bath"],
    unlocks: ["consume_enemy_core", "black_meridian_breakthrough"],
    repeatable: false,
    log: "Você assina sem tinta. Seu destino agora sabe exatamente onde mora."
  }
};

// Ações iniciais desbloqueadas
export const INITIAL_ACTIONS = ["work_farm", "hear_legends", "village_elder", "rest_under_tree"];
