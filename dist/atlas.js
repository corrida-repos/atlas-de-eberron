"use strict";
const byId = (id) => document.getElementById(id);
const viewport = byId("viewport");
const mapImage = byId("map-image");
const markerLayer = byId("markers");
const editor = byId("editor");
const form = byId("event-form");
const search = byId("search");
const snapshot = window.atlasSnapshot;
const storageKey = "atlas-eberron-events-v2";
const legacyStorageKey = "atlas-eberron-events-v1";
const labels = { campaign: "Campanha", history: "História de Eberron", arix: "Arix", isadora: "Isadora", bear: "Bear Lee", dm: "Notas do DM" };
const category = byId("event-group");
const legacyEvents = [["forja-inicio", "Em busca da Forja Esquecida", "Sharn · Canalizações", "Sessão 1", "Isadora, Bear Lee e Arix começaram a investigação de The Forgotten Forge e seguiram o rasto até às canalizações de Sharn."], ["forja-schema", "O schema Cannith recuperado", "Sharn · Ruínas Cannith", "Sessão 2", "O grupo recuperou o schema Cannith em forma de estrela de sete pontas e entregou-o a Lady Elaydren. Mais tarde, descansou na estalagem Broken Anvil."], ["three-towers", "A missão dos Sentinel Marshals", "Sharn · Three Towers, Upper Tavick’s Landing", "Após a Sessão 2", "O grupo encontrou Rock Lee Marshal Deneith no enclave dos Sentinel Marshals. Arix recebeu uma missão de campo."], ["olarune", "O ataque à igreja de Olarune", "Sharn · Igreja de Olarune", "Após a missão dos Marshals", "Na igreja, o grupo encontrou um schema em forma de crescente usado como ídolo. Vola Ashroot foi mordida durante o ataque e o grupo conseguiu salvá-la."], ["docas", "O resgate de Tharok", "Sharn · Docas", "Após o ataque à igreja", "O grupo resgatou Tharok e incendiou o armazém das docas. Garrow escapou com o schema."]];
const maps = {
  mundo: { caption: "Mapa-múndi de Eberron", width: 1600, height: 1231, alt: "Mapa-múndi de Eberron, com Khorvaire, Aerenal, Xen’drik, Argonnessen e Sarlona" },
  khorvaire: { caption: "Continente de Khorvaire", width: 7680, height: 4837, alt: "Mapa de Khorvaire com cidades, nações, rios, montanhas e linhas do Lightning Rail" },
  sharn: { caption: "Sharn · Lower Wards", width: 2500, height: 3000, alt: "Mapa dos bairros inferiores de Sharn, incluindo a frente ribeirinha" }
};
const starterEvents = [
  {
    "id": "forja-inicio",
    "title": "O assassínio de Bonal e a Forja Esquecida",
    "place": "Sharn · Canalizações",
    "date": "998 YK · Sessão 1",
    "description": "A morte de Bonal Geldem reuniu Arix, Isadora e Bear Lee. Lady Elaydren pediu-lhes que recuperassem uma relíquia Cannith. A investigação levou o grupo aos esgotos de Sharn.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "campaign"
  },
  {
    "id": "forja-schema",
    "title": "O schema Cannith recuperado",
    "place": "Sharn · Ruínas Cannith e Broken Anvil",
    "date": "998 YK · Sessão 2",
    "description": "O grupo recuperou o schema em forma de estrela de sete pontas e entregou-o a Lady Elaydren. Chegou ao nível 2 e passou a noite no Broken Anvil, por conta dela.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "campaign"
  },
  {
    "id": "three-towers",
    "title": "A missão dos Sentinel Marshals",
    "place": "Sharn · Three Towers, Upper Tavick’s Landing",
    "date": "998 YK · Sessão 3",
    "description": "Um bilhete recebido após a passagem pela Barmin Tower levou Arix ao enclave. Rock reconheceu Bear Lee como meio-irmão, mandou-o sair e deu a Arix uma missão de campo.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "campaign"
  },
  {
    "id": "olarune",
    "title": "O schema em crescente desaparece",
    "place": "Sharn · Igreja de Olarune",
    "date": "998 YK · Após a sessão 3",
    "description": "O grupo ligou o roubo do ídolo em crescente à Garra Esmeralda e à reanimação dos mortos no cemitério adjacente. Ajudou Vola Ashroot após a mordedura, soube que o sacerdote Tharok tinha desaparecido e preparou três estacas de madeira.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "campaign"
  },
  {
    "id": "docas",
    "title": "O resgate de Tharok",
    "place": "Sharn · Docas",
    "date": "998 YK · Após a investigação na igreja",
    "description": "O grupo retirou Tharok do armazém e incendiou-o. O líder da Garra Esmeralda escapou com o cofre e o schema em crescente. Na fuga, disse a Arix «I recognize you, Arix».",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ],
      "sharn": [
        0.203,
        0.564
      ]
    },
    "group": "campaign"
  },
  {
    "id": "tharok-pistas",
    "title": "O testemunho de Tharok",
    "place": "Sharn",
    "date": "998 YK · Sessão mais recente",
    "description": "Tharok levava água benta no bolso durante o cativeiro. O líder esteve perto dele sem reagir e Tharok ouviu-o conversar com alguém. O grupo levantou a hipótese de um changeling a trabalhar com um vampiro.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "campaign"
  },
  {
    "id": "broken-anvil-carta",
    "title": "Uma carta aponta para Rose Quarry",
    "place": "Sharn · Broken Anvil",
    "date": "998 YK · Sessão mais recente",
    "description": "O grupo enfrentou e revistou um agente do Lord of Blades. A carta que ele trazia apontava para Rose Quarry e o grupo soube que Lady Elaydren quer que procurem lá outro schema. O grupo chegou ao nível 3.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "campaign"
  },
  {
    "id": "rose-quarry-destino",
    "title": "O próximo destino de Elaydren",
    "place": "Rose Quarry · Fronteira de Darguun com o Mournland",
    "date": "Em aberto · 998 YK",
    "description": "O grupo tem uma indicação para procurar outro schema em Rose Quarry. A pista foi descoberta no Broken Anvil, em Sharn.",
    "visible": true,
    "approx": false,
    "points": {
      "khorvaire": [
        0.4902,
        0.8311
      ]
    },
    "group": "campaign"
  },
  {
    "id": "demonios",
    "title": "O sacrifício dos couatls",
    "place": "Eberron",
    "date": "Era dos Demónios",
    "description": "Segundo a tradição da Chama de Prata, dragões e couatls combateram os soberanos demoníacos. O sacrifício dos couatls ajudou a aprisioná-los.",
    "visible": true,
    "approx": false,
    "points": {},
    "group": "history"
  },
  {
    "id": "dhakaan",
    "title": "O império de Dhakaan",
    "place": "Khorvaire",
    "date": "Antiguidade",
    "description": "O império goblinoide dominou grande parte do continente e desagregou-se após a guerra contra os daelkyr.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.329,
        0.354
      ]
    },
    "group": "history"
  },
  {
    "id": "marcas",
    "title": "A Guerra das Marcas",
    "place": "Khorvaire",
    "date": "c. −1500 YK",
    "description": "A guerra consolidou o poder das casas dragonmarked.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.329,
        0.354
      ]
    },
    "group": "history"
  },
  {
    "id": "galifar",
    "title": "A fundação de Galifar",
    "place": "Khorvaire",
    "date": "1 YK",
    "description": "Galifar I reuniu as Cinco Nações num reino.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.329,
        0.354
      ]
    },
    "group": "history"
  },
  {
    "id": "chama",
    "title": "A Igreja da Chama de Prata",
    "place": "Thrane",
    "date": "299 YK",
    "description": "A origem da Igreja está ligada à história de Tira Miron.",
    "visible": true,
    "approx": true,
    "points": {
      "khorvaire": [
        0.438,
        0.52
      ]
    },
    "group": "history"
  },
  {
    "id": "guerra",
    "title": "O início da Última Guerra",
    "place": "Khorvaire",
    "date": "894 YK",
    "description": "A morte de Jarot ir’Wynarn desencadeou a disputa pela sucessão.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.329,
        0.354
      ]
    },
    "group": "history"
  },
  {
    "id": "valenar",
    "title": "A independência de Valenar",
    "place": "Valenar",
    "date": "956 YK",
    "description": "Os Valaes Tairn tomaram território cyrano e proclamaram Valenar.",
    "visible": true,
    "approx": true,
    "points": {
      "khorvaire": [
        0.665,
        0.735
      ]
    },
    "group": "history"
  },
  {
    "id": "eldeen",
    "title": "A independência dos Eldeen Reaches",
    "place": "Eldeen Reaches · Aundair",
    "date": "958 YK",
    "description": "Os Eldeen Reaches separaram-se de Aundair.",
    "visible": true,
    "approx": true,
    "points": {
      "khorvaire": [
        0.252,
        0.44
      ]
    },
    "group": "history"
  },
  {
    "id": "warforged",
    "title": "Os primeiros warforged vivos",
    "place": "Khorvaire",
    "date": "965 YK",
    "description": "Aarren d’Cannith criou os primeiros warforged vivos.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.329,
        0.354
      ]
    },
    "group": "history"
  },
  {
    "id": "darguun",
    "title": "A fundação de Darguun",
    "place": "Darguun",
    "date": "969 YK",
    "description": "Haruuc liderou uma revolta goblinoide e estabeleceu Darguun em antigo território de Cyre.",
    "visible": true,
    "approx": true,
    "points": {
      "khorvaire": [
        0.462,
        0.793
      ]
    },
    "group": "history"
  },
  {
    "id": "mourning",
    "title": "O Dia do Mourning",
    "place": "Cyre · Mournland",
    "date": "994 YK",
    "description": "Uma catástrofe arcana devastou Cyre e deixou o Mournland.",
    "visible": true,
    "approx": true,
    "points": {
      "khorvaire": [
        0.574,
        0.673
      ]
    },
    "group": "history"
  },
  {
    "id": "tratado",
    "title": "O Tratado de Thronehold",
    "place": "Thronehold",
    "date": "996 YK",
    "description": "O tratado pôs fim à Última Guerra, reconheceu a liberdade dos warforged e proibiu a sua criação.",
    "visible": true,
    "approx": false,
    "points": {},
    "group": "history"
  },
  {
    "id": "arix-adocao",
    "title": "Sylas adota Arix",
    "place": "Sharn",
    "date": "Antes da campanha",
    "description": "Sylas Karva encontrou Arix nas ruas de Sharn e adotou-a. Depois de a apanhar a procurar componentes no seu gabinete, enviou-a para a Universidade de Morgrave para espiar por sua conta.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "arix"
  },
  {
    "id": "arix-mending",
    "title": "O acidente em Morgrave",
    "place": "Sharn · Universidade de Morgrave",
    "date": "Antes da campanha · Prólogo da sessão 1",
    "description": "Um acidente com Mending selou os lábios de Alaric e levou à expulsão de Arix. Bonal Geldem ofereceu-se para continuar a ensiná-la por correspondência.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "arix"
  },
  {
    "id": "arix-documentos",
    "title": "Os documentos de Orien e Cannith",
    "place": "Sharn · Universidade de Morgrave",
    "date": "Antes da campanha · Recordação durante a missão de Olarune",
    "description": "Arix viu Bonal e Kaven dividirem documentos sobre glifos de conjuração e maquinaria. Um vampiro disfarçado de contínuo apoderou-se da informação sobre o paradeiro do schema em crescente.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "arix"
  },
  {
    "id": "arix-asas",
    "title": "As asas de dragão e os Marshals",
    "place": "Sharn",
    "date": "Antes da campanha",
    "description": "Arix transmitiu a Sylas o que soube de Kaven sobre o schema. Sylas ensinou-a a manifestar asas de dragão e, através de Rock, colocou-a nos Sentinel Marshals.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "arix"
  },
  {
    "id": "arix-rock",
    "title": "O documento sobre Rock",
    "place": "Sharn · Gabinete de Arix",
    "date": "998 YK · Sessão mais recente",
    "description": "Arix encontrou um documento segundo o qual a promoção de Rock assentou numa falsa reputação de herói de guerra.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "arix"
  },
  {
    "id": "isa-denour",
    "title": "A Derradeira Denour",
    "place": "Local por confirmar",
    "date": "Antes da campanha · Prólogo da sessão 2",
    "description": "A avó de Isadora ensinou-lhe harpa e transmitiu-lhe a tradição da Derradeira Denour e o dom de tocar os fios da magia. Alfred continuou as lições após a morte da avó.",
    "visible": true,
    "approx": false,
    "points": {},
    "group": "isadora"
  },
  {
    "id": "isa-wynarn",
    "title": "Isadora, Neyo e Lucan em Wynarn",
    "place": "Aundair · Universidade de Wynarn",
    "date": "Antes da campanha · Prólogo da sessão mais recente",
    "description": "A rivalidade entre Isadora e Neyo ir’Krell escondia uma atração mútua. Lucan Stellos também tinha sentimentos por Isadora.",
    "visible": true,
    "approx": true,
    "points": {
      "khorvaire": [
        0.392,
        0.453
      ]
    },
    "group": "isadora"
  },
  {
    "id": "isa-eduardo",
    "title": "A notícia da morte de Eduardo",
    "place": "Local por confirmar",
    "date": "Depois da ofensiva de Vvaraak · Prólogo da sessão 2",
    "description": "Rha trouxe a Isadora a notícia da morte do pai e tornou-se seu guarda-costas.",
    "visible": true,
    "approx": false,
    "points": {},
    "group": "isadora"
  },
  {
    "id": "isa-metade",
    "title": "A primeira proposta de Rock",
    "place": "Sharn",
    "date": "998 YK · Antes do resgate de Tharok",
    "description": "Rock ofereceu-se para perdoar metade da dívida de Isadora se ela resolvesse o roubo e jantasse com ele.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "isadora"
  },
  {
    "id": "isa-lucan",
    "title": "O jantar com Rock e a missão de Lucan",
    "place": "Sharn",
    "date": "998 YK · Sessão mais recente",
    "description": "Isadora percebeu que Rock tinha sentimentos por ela. Ele propôs reduzir a dívida de Isadora para 3 000 po se ela encontrasse Lucan Stellos e resolvesse o problema. Segundo Rock, Lucan é um operacional da Cidadela de Breland, trabalha para Calderus e planeia traí-lo. Rock pediu a Isadora que tentasse dissuadi-lo. Se falhar, quer que o mate. Resolver o problema saldaria a dívida de Rock ao seu patrono.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "isadora"
  },
  {
    "id": "bear-passage",
    "title": "O nascimento de Bear Lee",
    "place": "Passage · Aundair",
    "date": "c. 966 YK · Prólogo da sessão 3",
    "description": "Bear Lee nasceu em Passage, filho de Maela e Korruk, e herdou a Marca da Sentinela. A rivalidade com o meio-irmão Rock começou na infância.",
    "visible": true,
    "approx": false,
    "points": {
      "khorvaire": [
        0.3475,
        0.5196
      ]
    },
    "group": "bear"
  },
  {
    "id": "bear-vvaraak",
    "title": "A infiltração em Vvaraak",
    "place": "Montes de Vvaraak",
    "date": "c. 992 YK",
    "description": "Deneith enviou Bear Lee para se infiltrar na tribo durante a ofensiva de Eduardo. Aprendeu os costumes dos Gatekeepers e ficou noivo de Fjee-Rha, do clã Borius, que lhe deu o nome Rha-Kiuk.",
    "visible": true,
    "approx": false,
    "points": {},
    "group": "bear"
  },
  {
    "id": "bear-resistencia",
    "title": "Rha junta-se à resistência",
    "place": "Montes de Vvaraak",
    "date": "Durante a ofensiva de Vvaraak",
    "description": "Rha hesitou em entregar informações e houve mortos durante o atraso. Depois de Fjee-Rha ser dada como morta, partilhou informações com a resistência. Eduardo morreu numa armadilha defensiva de Rha. Rha levou a notícia a Isadora e ofereceu-se para a proteger sem cobrar.",
    "visible": true,
    "approx": false,
    "points": {},
    "group": "bear"
  },
  {
    "id": "bear-tharok",
    "title": "O corpo de Fjee-Rha nunca apareceu",
    "place": "Sharn",
    "date": "998 YK · Sessão mais recente",
    "description": "Tharok Borius, tio de Fjee-Rha, revelou a Rha que nunca encontraram o corpo dela.",
    "visible": true,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ]
    },
    "group": "bear"
  },
  {
    "id": "dm-skarvath",
    "title": "Tiamat, Sylas e o Xulo Pattern",
    "place": "Argonnessen · Pit of Five Sorrows",
    "date": "Antiguidade · Consequências na campanha",
    "description": "O aprisionamento de Tiamat interrompeu a criação do abishai verde Skarvath, que vive como Sylas Karva. Quer libertá-la para que conclua a sua criação. Desviou Wynarn Dreamleaf durante a guerra de Vvaraak. O Xulo Pattern deriva de investigação sobre conjuração sustentada.",
    "visible": false,
    "approx": true,
    "points": {
      "mundo": [
        0.642,
        0.615
      ]
    },
    "group": "dm"
  },
  {
    "id": "dm-xendrik",
    "title": "O complexo sobrevivente dos gigantes",
    "place": "Xen’drik",
    "date": "c. −40 000 a −39 000 YK",
    "description": "Após a guerra contra Dal Quor e a destruição da civilização dos gigantes pelos dragões, um complexo conservou instalações, vestígios da escravização dos elfos e portais de água ligados a Lamannia.",
    "visible": false,
    "approx": true,
    "points": {
      "mundo": [
        0.277,
        0.7
      ]
    },
    "group": "dm"
  },
  {
    "id": "dm-kedran",
    "title": "Os documentos antigos e a identidade de Kedran",
    "place": "Khorvaire",
    "date": "Cerca de quinze séculos antes da campanha",
    "description": "A investigação de Orien sobre glifos e maquinaria foi testada por Cannith. O relato jogado distingue o investigador Orien de Kedran Cannith. Uma revisão identifica Kedran como d’Orien. A identidade no relato jogado continua por conciliar.",
    "visible": false,
    "approx": true,
    "points": {
      "mundo": [
        0.329,
        0.354
      ]
    },
    "group": "dm"
  },
  {
    "id": "dm-rose",
    "title": "A origem do vidro de Rose Quarry",
    "place": "Rose Quarry · Whitehearth",
    "date": "994 YK · Imediatamente antes do Mourning",
    "description": "Uma máquina experimental de Whitehearth lançou vidro fundido sobre Rose Quarry e matou os habitantes. A causa do Mourning continua por esclarecer.",
    "visible": false,
    "approx": true,
    "points": {
      "khorvaire": [
        0.4902,
        0.8311
      ]
    },
    "group": "dm"
  },
  {
    "id": "dm-merrix",
    "title": "Os interesses dos ramos Cannith",
    "place": "Fairhaven, Sharn e Korth",
    "date": "Depois de 994 YK",
    "description": "Elaydren serve secretamente Merrix, que prefere associar a investigação ao ramo de Jorlanna. Merrix contacta Sylas. Os termos e o que Merrix sabe sobre o portal estão em aberto.",
    "visible": false,
    "approx": false,
    "points": {},
    "group": "dm"
  },
  {
    "id": "dm-calderus",
    "title": "O cativeiro de Tharok e a hipótese Calderus",
    "place": "Sharn · Docas",
    "date": "998 YK · Missão de Olarune e sessão mais recente",
    "description": "Garrow levou o cofre e torturou Tharok para saber mais sobre o schema. Calderus é a hipótese de trabalho do DM para o vampiro que poderá ter estado em contacto com o líder. A identidade do interlocutor continua por confirmar.",
    "visible": false,
    "approx": true,
    "points": {
      "mundo": [
        0.274,
        0.412
      ],
      "khorvaire": [
        0.2271,
        0.8935
      ],
      "sharn": [
        0.203,
        0.564
      ]
    },
    "group": "dm"
  }
];

function validEvents(records) {
  if (!Array.isArray(records) || records.length > 2000) throw new Error("Invalid event list");
  const ids = new Set();
  return records.map((record) => {
    if (!record || typeof record.id !== "string" || !record.id || ids.has(record.id)) throw new Error("Invalid event ID");
    ids.add(record.id);
    for (const field of ["title", "place", "date", "description"]) {
      if (typeof record[field] !== "string" || record[field].length > 2400) throw new Error("Invalid event text");
    }
    if (!record.title.trim() || !record.place.trim()) throw new Error("Missing title or place");
    const points = Object.fromEntries(Object.entries(record.points || {}).filter(([map, p]) =>
      Object.hasOwn(maps, map) && Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 1)
    ));
    return {
      id: record.id, title: record.title, place: record.place, date: record.date, description: record.description,
      visible: record.visible === true, approx: record.approx === true, points,
      group: Object.hasOwn(labels, record.group) ? record.group : "campaign"
    };
  });
}

function loadEvents() {
  if (snapshot) return validEvents(snapshot.events).filter(event => canShare(event, snapshot.recipient));
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return validEvents(JSON.parse(stored));
    const legacy = localStorage.getItem(legacyStorageKey);
    if (!legacy) return validEvents(starterEvents);
    const previous = validEvents(JSON.parse(legacy));
    const defaults = new Map(legacyEvents.map(([id, ...fields]) => [id, fields]));
    const starter = new Map(starterEvents.map(event => [event.id, event]));
    const migrated = previous.map(event => {
      const fields = defaults.get(event.id);
      if (!fields) return event;
      const updated = { ...event };
      ["title", "place", "date", "description"].forEach((field, index) => {
        if (event[field] === fields[index]) updated[field] = starter.get(event.id)[field];
      });
      return updated;
    });
    const previousIds = new Set(previous.map(event => event.id));
    const additions = starterEvents.filter(event => !defaults.has(event.id) && !previousIds.has(event.id));
    const result = validEvents([...migrated, ...additions]);
    try {
      localStorage.setItem(storageKey, JSON.stringify(result));
    } catch {
      // Keep the migrated events usable even when storage is full.
    }
    return result;
  } catch {
    return validEvents(starterEvents);
  }
}

let events = loadEvents();
let selectedId = events[0]?.id ?? null;
let playerView = Boolean(snapshot);
let currentMap = "khorvaire";
let draft = null;
let picking = false;
let toastTimer;
let state = { scale: 1, x: 0, y: 0, fit: 1, width: 0, height: 0 };
const pointers = new Map();
let gesture = null;

const icon = (name) => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function toast(message) {
  const node = byId("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 4300);
}

function persist(updated) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
    events = updated;
    return true;
  } catch {
    toast("O navegador não conseguiu guardar os eventos. Verifica o espaço disponível.");
    return false;
  }
}

function canShare(event, recipient = "group") {
  return event.visible && (event.group === "campaign" || event.group === "history" ||
    (["arix", "isadora", "bear"].includes(recipient) && event.group === recipient));
}

function visibleEvents() {
  return playerView ? events.filter(event => canShare(event, snapshot?.recipient)) : events;
}

function syncCategories() {
  const before = category.value || (Object.hasOwn(labels, snapshot?.recipient) ? snapshot.recipient : "campaign");
  const allowed = playerView ? new Set(["campaign", "history", snapshot?.recipient]) : new Set(Object.keys(labels));
  category.replaceChildren();
  for (const [value, label] of Object.entries(labels)) {
    if (!allowed.has(value)) continue;
    const option = make("option", "", label);
    option.value = value;
    category.append(option);
  }
  category.value = allowed.has(before) ? before : "campaign";
}

function filteredEvents() {
  const normalize = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const term = normalize(search.value.trim());
  return visibleEvents().filter(event => event.group === category.value && normalize([event.title, event.place, event.date, event.description].join(" ")).includes(term));
}

function positionFor(event, map = currentMap) {
  return Object.hasOwn(event.points, map) ? event.points[map] : null;
}

function drawMarkers() {
  const groups = new Map();
  const all = visibleEvents().filter(event => event.group === category.value);
  for (const event of filteredEvents()) {
    const point = positionFor(event);
    if (!point) continue;
    const key = point.join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  const active = document.activeElement?.closest?.(".marker");
  const keepFocus = active?.dataset.point;
  const existing = new Map([...markerLayer.children].map(node => [node.dataset.point, node]));
  for (const [key, group] of groups) {
    const selected = group.find(event => event.id === selectedId);
    const [x, y] = positionFor(group[0]);
    const city = group[0].place.split(" · ")[0];
    const sameCity = group.every(event => event.place.split(" · ")[0] === city);
    const groupLabel = group.length > 1 ? group.length + " eventos" + (sameCity ? " em " + city : " neste local") : group[0].title;
    const marker = existing.get(key) ?? make("button");
    existing.delete(key);
    marker.dataset.point = key;
    marker.className = "marker" + (selected ? " active" : "") + (group.every(event => event.approx) ? " approx" : "") + (group.length > 1 ? " cluster" : "");
    marker.style.left = state.x + x * state.width * state.scale + "px";
    marker.style.top = state.y + y * state.height * state.scale - 5 + "px";
    marker.title = groupLabel;
    marker.setAttribute("aria-label", groupLabel);
    marker.replaceChildren(document.createTextNode(group.length > 1 ? group.length : all.indexOf(group[0]) + 1));
    if (selected) marker.append(make("span", "marker-label", group.length > 1 ? selected.place.split(" · ")[0] : selected.title));
    marker.onclick = () => {
      if (picking) return;
      const next = selected ? group[(group.indexOf(selected) + 1) % group.length] : group[0];
      choose(next, false);
      if (window.matchMedia("(max-width: 790px)").matches) byId("detail").scrollIntoView({ block: "nearest" });
    };
    if (!marker.isConnected) markerLayer.append(marker);
  }
  for (const node of existing.values()) node.remove();
  if (keepFocus && document.activeElement !== active && active.isConnected) active.focus({ preventScroll: true });
}

function drawMap() {
  const width = state.width * state.scale;
  const height = state.height * state.scale;
  const viewWidth = viewport.clientWidth;
  const viewHeight = viewport.clientHeight;
  state.x = width > viewWidth ? clamp(state.x, viewWidth - width, 0) : (viewWidth - width) / 2;
  state.y = height > viewHeight ? clamp(state.y, viewHeight - height, 0) : (viewHeight - height) / 2;
  mapImage.style.transform = "translate(" + state.x + "px," + state.y + "px) scale(" + state.scale + ")";
  byId("zoom-value").textContent = Math.round(state.scale / state.fit * 100) + "%";
  byId("zoom-out").disabled = state.scale <= state.fit * 1.001;
  byId("zoom-in").disabled = state.scale >= state.fit * 12;
  drawMarkers();
}

function resetMap() {
  const map = maps[currentMap];
  state.width = map.width;
  state.height = map.height;
  mapImage.style.width = map.width + "px";
  mapImage.style.height = map.height + "px";
  state.fit = Math.min(viewport.clientWidth / map.width, viewport.clientHeight / map.height);
  if (!state.fit) return;
  state.scale = state.fit;
  state.x = (viewport.clientWidth - map.width * state.fit) / 2;
  state.y = (viewport.clientHeight - map.height * state.fit) / 2;
  drawMap();
}

function setMap(key) {
  currentMap = key;
  mapImage.src = snapshot?.images[key] ?? key + ".webp";
  mapImage.alt = maps[key].alt;
  byId("map-caption").textContent = maps[key].caption;
  for (const tab of byId("map-tabs").querySelectorAll("button")) tab.setAttribute("aria-pressed", String(tab.dataset.map === key));
  resetMap();
}

function zoomTo(scale, x, y, fromX = x, fromY = y) {
  const newScale = clamp(scale, state.fit, state.fit * 12);
  const ratio = newScale / state.scale;
  state.x = x - (fromX - state.x) * ratio;
  state.y = y - (fromY - state.y) * ratio;
  state.scale = newScale;
  drawMap();
}

function centerZoom(factor) {
  zoomTo(state.scale * factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
}

function focusEvent(event) {
  const map = positionFor(event) ? currentMap : ["sharn", "khorvaire", "mundo"].find(key => positionFor(event, key));
  if (!map) return;
  if (map !== currentMap) setMap(map);
  const [x, y] = positionFor(event);
  state.scale = Math.max(state.scale, state.fit * (currentMap === "sharn" ? 2.4 : 2.8));
  state.x = viewport.clientWidth / 2 - x * state.width * state.scale;
  state.y = viewport.clientHeight / 2 - y * state.height * state.scale;
  drawMap();
}

function choose(event, focus) {
  selectedId = event.id;
  if (focus) focusEvent(event);
  render();
}

function action(label, fn, cls = "link", symbol = "") {
  const button = make("button", cls);
  button.type = "button";
  if (symbol) button.innerHTML = icon(symbol);
  if (cls.includes("icon-button")) {
    button.title = label;
    button.setAttribute("aria-label", label);
  } else button.append(document.createTextNode(label));
  button.addEventListener("click", fn);
  return button;
}

function renderDetail(event) {
  const detail = byId("detail");
  detail.hidden = !event;
  detail.replaceChildren();
  if (!event) return;
  const hasPoint = Object.keys(event.points).length > 0;
  const tag = !hasPoint ? "Sem marcador" : event.approx ? "Local aproximado" : "Local marcado";
  detail.append(make("p", "detail-tag", tag), make("h3", "", event.title));
  for (const [symbol, label] of [["pin", event.place], ["clock", event.date || "Data por confirmar"]]) {
    const p = make("p", "meta");
    p.innerHTML = icon(symbol);
    p.append(document.createTextNode(label));
    detail.append(p);
  }
  if (event.description) detail.append(make("p", "description", event.description));
  const buttons = make("div", "event-actions");
  if (positionFor(event, "sharn") && currentMap !== "sharn") {
    buttons.append(action("Ver em Sharn", () => { setMap("sharn"); focusEvent(event); renderDetail(event); }, "link jump"));
  } else if (hasPoint) {
    buttons.append(action("Centrar no mapa", () => focusEvent(event), "link jump"));
  }
  if (!playerView) {
    const group = events.filter(item => item.group === event.group);
    const index = group.indexOf(event);
    const up = action("Mover para antes na cronologia", () => reorder(event, -1), "icon-button", "up");
    const down = action("Mover para depois na cronologia", () => reorder(event, 1), "icon-button", "down");
    up.disabled = index === 0;
    down.disabled = index === group.length - 1;
    buttons.append(up, down, action("Editar", () => openEditor(event)), action("Apagar", () => {
      if (confirm("Apagar o evento «" + event.title + "»?") && persist(events.filter(item => item !== event))) {
        selectedId = visibleEvents()[0]?.id ?? null;
        render();
        toast("Evento apagado.");
      }
    }, "link delete"));
  }
  detail.append(buttons);
}

function render() {
  const shown = filteredEvents();
  const all = visibleEvents().filter(event => event.group === category.value);
  const timeline = byId("timeline");
  const activeRow = document.activeElement?.closest?.(".timeline-item")?.dataset.id;
  timeline.replaceChildren();
  if (!shown.some(event => event.id === selectedId)) selectedId = shown[0]?.id ?? null;
  byId("count").textContent = all.length + (all.length === 1 ? " evento" : " eventos");
  for (const event of shown) {
    const row = make("button", "timeline-item");
    row.type = "button";
    row.dataset.id = event.id;
    row.setAttribute("aria-current", String(event.id === selectedId));
    row.append(make("span", "timeline-index", String(all.indexOf(event) + 1)));
    const label = make("span", "timeline-text");
    label.append(make("strong", "", event.title), make("small", "", event.date || "Data por confirmar"));
    row.append(label);
    row.insertAdjacentHTML("beforeend", icon(canShare(event) || playerView ? "arrow" : "lock"));
    row.addEventListener("click", () => choose(event, true));
    timeline.append(row);
    if (activeRow === event.id) row.focus({ preventScroll: true });
  }
  if (!shown.length) timeline.append(make("p", "empty", search.value ? "Nenhum evento corresponde à pesquisa." : "Ainda não há eventos na cronologia."));
  renderDetail(shown.find(event => event.id === selectedId));
  drawMarkers();
}

function reorder(event, offset) {
  const index = events.indexOf(event);
  const group = events.filter(item => item.group === event.group);
  const adjacent = group[group.indexOf(event) + offset];
  if (!adjacent) return;
  const target = events.indexOf(adjacent);
  const updated = [...events];
  [updated[index], updated[target]] = [updated[target], updated[index]];
  if (persist(updated)) {
    render();
    toast("Ordem da cronologia atualizada.");
  }
}

function setPlayerView(enabled) {
  playerView = enabled;
  search.value = "";
  document.body.classList.toggle("player-view", enabled);
  byId("exit-player").hidden = !enabled || Boolean(snapshot);
  byId("view-label").hidden = !enabled;
  if (snapshot?.recipient && snapshot.recipient !== "group") byId("view-label-text").textContent = "Vista de " + labels[snapshot.recipient];
  syncCategories();
  if (!visibleEvents().some(event => event.id === selectedId)) selectedId = visibleEvents()[0]?.id ?? null;
  render();
}

function openEditor(event = null) {
  if (playerView) return;
  draft = event ? { ...event, points: { ...event.points } } : { points: {}, visible: false, approx: false, group: category.value };
  byId("form-title").textContent = event ? "Editar evento" : "Novo evento";
  form.reset();
  for (const field of ["title", "place", "date", "description"]) form.elements[field].value = draft[field] ?? "";
  form.elements.group.value = draft.group;
  form.elements.visible.checked = draft.visible;
  updateVisibilityControl();
  form.elements.approx.checked = draft.approx;
  byId("form-error").hidden = true;
  updatePosition();
  editor.showModal();
}

function updateVisibilityControl() {
  form.elements.visible.disabled = form.elements.group.value === "dm";
}

function updatePosition() {
  const captions = Object.keys(draft.points).map(key => ({ mundo: "Mundo", khorvaire: "Khorvaire", sharn: "Sharn" })[key]);
  byId("position-status").textContent = captions.length ? "Marcado em " + captions.join(", ") : "Sem ponto no mapa";
}

function endPick(point) {
  if (!picking) return;
  if (point) {
    const [x, y] = point;
    const nx = (x - state.x) / (state.width * state.scale);
    const ny = (y - state.y) / (state.height * state.scale);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
      toast("Escolhe um ponto dentro do mapa.");
      return;
    }
    draft.points[currentMap] = [nx, ny];
  }
  picking = false;
  viewport.classList.remove("picking");
  byId("pick-hint").hidden = true;
  updatePosition();
  editor.showModal();
}

function localPoint(event) {
  const rect = viewport.getBoundingClientRect();
  return [event.clientX - rect.left, event.clientY - rect.top];
}

function pinch(points) {
  const [a, b] = points;
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, distance: Math.hypot(a[0] - b[0], a[1] - b[1]) };
}

viewport.addEventListener("pointerdown", event => {
  if (event.target.closest("button") || event.button !== 0 || pointers.size >= 2) return;
  const point = localPoint(event);
  viewport.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, point);
  gesture = { start: point, moved: pointers.size > 1 || Boolean(gesture?.moved) };
});
viewport.addEventListener("pointermove", event => {
  if (!pointers.has(event.pointerId)) return;
  const previous = pointers.get(event.pointerId);
  const point = localPoint(event);
  const before = [...pointers.values()];
  pointers.set(event.pointerId, point);
  if (pointers.size === 2) {
    const from = pinch(before);
    const to = pinch([...pointers.values()]);
    if (from.distance > 0) zoomTo(state.scale * to.distance / from.distance, to.x, to.y, from.x, from.y);
    return;
  }
  const [sx, sy] = gesture.start;
  if (!gesture.moved && Math.hypot(point[0] - sx, point[1] - sy) < 4) return;
  gesture.moved = true;
  viewport.classList.add("dragging");
  state.x += point[0] - previous[0];
  state.y += point[1] - previous[1];
  drawMap();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  viewport.addEventListener(type, event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (!pointers.size) {
      if (type === "pointerup" && picking && !gesture.moved) endPick(localPoint(event));
      gesture = null;
      viewport.classList.remove("dragging");
    }
  });
}
viewport.addEventListener("wheel", event => {
  event.preventDefault();
  const [x, y] = localPoint(event);
  zoomTo(state.scale * (event.deltaY > 0 ? 1 / 1.18 : 1.18), x, y);
}, { passive: false });
viewport.addEventListener("keydown", event => {
  if (event.target !== viewport) return;
  const shifts = { ArrowLeft: [55, 0], ArrowRight: [-55, 0], ArrowUp: [0, 55], ArrowDown: [0, -55] };
  if (Object.hasOwn(shifts, event.key)) {
    event.preventDefault();
    state.x += shifts[event.key][0];
    state.y += shifts[event.key][1];
    drawMap();
  } else if (event.key === "+" || event.key === "=") centerZoom(1.25);
  else if (event.key === "-") centerZoom(1 / 1.25);
  else if (event.key === "Escape") endPick(null);
  else if (picking && event.key === "Enter") {
    event.preventDefault();
    endPick([viewport.clientWidth / 2, viewport.clientHeight / 2]);
  }
});

byId("zoom-in").onclick = () => centerZoom(1.25);
byId("zoom-out").onclick = () => centerZoom(1 / 1.25);
byId("reset").onclick = resetMap;
byId("home").onclick = event => {
  event.preventDefault();
  setMap("khorvaire");
  renderDetail(filteredEvents().find(item => item.id === selectedId));
};
byId("add").onclick = () => openEditor();
byId("player").onclick = () => setPlayerView(true);
byId("exit-player").onclick = () => setPlayerView(false);
byId("share").onclick = () => byId("sharing").showModal();
byId("backup").onclick = () => byId("backup-dialog").showModal();
byId("credits").onclick = () => byId("credits-dialog").showModal();
byId("cancel-pick").onclick = () => endPick(null);
byId("pick").onclick = () => {
  editor.close();
  picking = true;
  viewport.classList.add("picking");
  byId("pick-hint").hidden = false;
  viewport.focus({ preventScroll: true });
  if (window.matchMedia("(max-width: 790px)").matches) viewport.scrollIntoView({ block: "center" });
};
for (const button of document.querySelectorAll(".dismiss")) button.onclick = () => button.closest("dialog").close();
for (const tab of byId("map-tabs").querySelectorAll("button")) tab.onclick = () => { setMap(tab.dataset.map); renderDetail(filteredEvents().find(event => event.id === selectedId)); };
search.addEventListener("input", render);
category.addEventListener("change", () => { search.value = ""; render(); });
form.elements.group.addEventListener("change", updateVisibilityControl);

form.addEventListener("submit", event => {
  event.preventDefault();
  if (playerView || !draft) return;
  const error = byId("form-error");
  const values = new FormData(form);
  const record = { ...draft, id: draft.id ?? (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random()) };
  for (const field of ["title", "place", "date", "description"]) record[field] = values.get(field).trim();
  record.group = values.get("group");
  record.visible = record.group !== "dm" && values.has("visible");
  record.approx = values.has("approx");
  if (!record.title || !record.place) {
    error.textContent = "Preenche o título e o local.";
    error.hidden = false;
    return;
  }
  const updated = draft.id ? events.map(item => item.id === draft.id ? record : item) : [...events, record];
  if (persist(updated)) {
    editor.close();
    draft = null;
    search.value = "";
    category.value = record.group;
    choose(record, true);
    toast("Evento guardado.");
  }
});

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

byId("export").onclick = () => download("eberron-campanha.json", JSON.stringify({ version: 1, events }, null, 2), "application/json");
byId("import").onclick = () => byId("import-file").click();
byId("import-file").onchange = async event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 6_000_000) throw new Error("File too large");
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1) throw new Error("Unsupported format");
    const imported = validEvents(backup.events);
    if (!confirm("Substituir os eventos deste navegador pelos " + imported.length + " eventos da cópia?")) return;
    if (persist(imported)) {
      selectedId = events[0]?.id ?? null;
      search.value = "";
      byId("backup-dialog").close();
      render();
      toast("Cópia importada.");
    }
  } catch {
    toast("O ficheiro escolhido não é uma cópia válida do atlas.");
  }
};

async function getFile(path, asDataUrl = false) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Download failed");
  if (!asDataUrl) return response.text();
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

byId("download-player").onclick = async event => {
  const button = event.currentTarget;
  button.disabled = true;
  toast("A preparar a cópia dos jogadores…");
  try {
    const mapKeys = Object.keys(maps);
    const recipient = byId("share-recipient").value;
    const sharedEvents = events.filter(item => canShare(item, recipient));
    const [template, css, js, instrument, spectral, ...mapImages] = await Promise.all([
      getFile("index.html"), getFile("atlas.css"), getFile("atlas.js"), getFile("instrument.woff2", true), getFile("spectral.woff2", true),
      ...mapKeys.map(key => getFile(key + ".webp", true))
    ]);
    const images = Object.fromEntries(mapKeys.map((key, index) => [key, mapImages[index]]));
    const payload = JSON.stringify({ events: sharedEvents, images, recipient }).replace(/</g, "\\u003c");
    const styles = css.replace("url(instrument.woff2)", 'url("' + instrument + '")').replace("url(spectral.woff2)", 'url("' + spectral + '")');
    // Omit the original campaign data and embed just the player snapshot.
    const playerScript = js.replace(/^const legacyEvents = .*?;$/m, "const legacyEvents = [];").replace(/const starterEvents = \[[\s\S]*?\n\];/, "const starterEvents = [];");
    const html = template
      .replace('<link rel="stylesheet" href="atlas.css">', () => "<style>" + styles + "</style>")
      .replace('<script defer src="atlas.js"></' + 'script>', "")
      .replace("</" + "body>", () => "<" + "script>window.atlasSnapshot=" + payload + ";\n" + playerScript + "</" + "script></" + "body>");
    const names = { group: "grupo", arix: "arix", isadora: "isadora", bear: "bear-lee" };
    download("atlas-de-eberron-" + names[recipient] + ".html", html, "text/html;charset=utf-8");
    byId("sharing").close();
    toast("Cópia dos jogadores descarregada.");
  } catch {
    toast("Não foi possível gerar a cópia. Tenta novamente.");
  } finally {
    button.disabled = false;
  }
};

let viewportSize = [viewport.clientWidth, viewport.clientHeight];
new ResizeObserver(() => {
  const [width, height] = [viewport.clientWidth, viewport.clientHeight];
  if (!width || !height || (width === viewportSize[0] && height === viewportSize[1])) return;
  const [oldWidth, oldHeight] = viewportSize;
  viewportSize = [width, height];
  const x = (oldWidth / 2 - state.x) / state.scale;
  const y = (oldHeight / 2 - state.y) / state.scale;
  const relativeZoom = state.scale / state.fit;
  state.fit = Math.min(width / state.width, height / state.height);
  state.scale = state.fit * relativeZoom;
  state.x = width / 2 - x * state.scale;
  state.y = height / 2 - y * state.scale;
  drawMap();
}).observe(viewport);

setMap("khorvaire");
setPlayerView(playerView);
