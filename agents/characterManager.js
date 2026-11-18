
const fs = require("fs");
const path = require("path");

const caminhoArquivo = path.join(
  __dirname,
  "..",
  "data",
  "personagens.json"
);

const ATRIBUTOS = [
  "forca",
  "destreza",
  "constituicao",
  "inteligencia",
  "sabedoria",
  "carisma"
];

// ==========================================
// ARMAZENAMENTO
// ==========================================

function carregarPersonagens() {
  if (!fs.existsSync(caminhoArquivo)) {
    return [];
  }

  const conteudo = fs.readFileSync(
    caminhoArquivo,
    "utf8"
  );

  const personagens = JSON.parse(conteudo);

  if (!Array.isArray(personagens)) {
    throw new Error(
      "Arquivo de personagens inválido."
    );
  }

  return personagens;
}

function salvarPersonagens(personagens) {
  fs.mkdirSync(
    path.dirname(caminhoArquivo),
    { recursive: true }
  );

  const temporario = caminhoArquivo + ".tmp";

  fs.writeFileSync(
    temporario,
    JSON.stringify(personagens, null, 2),
    "utf8"
  );

  fs.renameSync(temporario, caminhoArquivo);
}

// ==========================================
// REGRAS DE D&D 5E (2014)
// ==========================================

function calcularModificador(valor) {
  return Math.floor((valor - 10) / 2);
}

function calcularProficiencia(nivel) {
  return Math.ceil(nivel / 4) + 1;
}

// ==========================================
// VALIDAÇÃO
// ==========================================

function validarPersonagem(dados) {
  if (!dados || typeof dados !== "object" ||
      Array.isArray(dados)) {
    return "Dados do personagem inválidos.";
  }

  if (
    typeof dados.nome !== "string" ||
    !dados.nome.trim()
  ) {
    return "O nome do personagem é obrigatório.";
  }

  if (
    typeof dados.raca !== "string" ||
    !dados.raca.trim()
  ) {
    return "A raça do personagem é obrigatória.";
  }

  if (
    typeof dados.classe !== "string" ||
    !dados.classe.trim()
  ) {
    return "A classe do personagem é obrigatória.";
  }

  if (
    !Number.isInteger(dados.nivel) ||
    dados.nivel < 1 ||
    dados.nivel > 20
  ) {
    return "O nível deve estar entre 1 e 20.";
  }

  if (
    !dados.atributos ||
    typeof dados.atributos !== "object" ||
    Array.isArray(dados.atributos)
  ) {
    return "Os seis atributos são obrigatórios.";
  }

  for (const atributo of ATRIBUTOS) {
    const valor = dados.atributos[atributo];

    if (
      !Number.isInteger(valor) ||
      valor < 1 ||
      valor > 30
    ) {
      return `Atributo inválido: ${atributo}.`;
    }
  }

  if (
    !Number.isInteger(dados.pvMaximo) ||
    dados.pvMaximo < 1
  ) {
    return "Os PV máximos devem ser positivos.";
  }

  if (
    !Number.isInteger(dados.ca) ||
    dados.ca < 0
  ) {
    return "Classe de armadura inválida.";
  }

  if (
    typeof dados.deslocamento !== "number" ||
    !Number.isFinite(dados.deslocamento) ||
    dados.deslocamento < 0
  ) {
    return "Deslocamento inválido.";
  }

  return null;
}

// ==========================================
// CADASTRO
// ==========================================

function criarPersonagem(dados) {
  const erro = validarPersonagem(dados);

  if (erro) {
    return { erro };
  }

  const personagens = carregarPersonagens();

  const id = require("crypto").randomUUID();

  const atributos = {};

  for (const nome of ATRIBUTOS) {
    atributos[nome] = dados.atributos[nome];
  }

  const modificadores = {};

  for (const nome of ATRIBUTOS) {
    modificadores[nome] =
      calcularModificador(atributos[nome]);
  }

  const personagem = {
    id,
    nome: dados.nome.trim(),
    raca: dados.raca.trim(),
    classe: dados.classe.trim(),
    nivel: dados.nivel,
    atributos,
    modificadores,
    bonusProficiencia:
      calcularProficiencia(dados.nivel),
    pvMaximo: dados.pvMaximo,
    pvAtual: dados.pvMaximo,
    ca: dados.ca,
    deslocamento: dados.deslocamento,
    versaoRegras: "2014",
    criadoEm: new Date().toISOString()
  };

  personagens.push(personagem);

  salvarPersonagens(personagens);

  return {
    mensagem: "Personagem criado com sucesso.",
    personagem
  };
}

// ==========================================
// CONSULTAS
// ==========================================

function listarPersonagens() {
  return carregarPersonagens();
}

function buscarPersonagem(id) {
  const personagens = carregarPersonagens();

  const personagem = personagens.find(
    p => p.id === id
  );

  if (!personagem) {
    return { erro: "Personagem não encontrado." };
  }

  return personagem;
}

// ==========================================
// D&D AI v0.6 — EDITAR PERSONAGEM
// ==========================================

function editarPersonagem(id, alteracoes) {
  if (
    !alteracoes ||
    typeof alteracoes !== "object" ||
    Array.isArray(alteracoes)
  ) {
    return { erro: "Alterações inválidas." };
  }

  const personagens = carregarPersonagens();

  const indice = personagens.findIndex(
    personagem => personagem.id === id
  );

  if (indice === -1) {
    return { erro: "Personagem não encontrado." };
  }

  const atual = personagens[indice];

  const dadosAtualizados = {
    ...atual,
    ...alteracoes,
    id: atual.id,
    atributos: {
      ...atual.atributos,
      ...(alteracoes.atributos || {})
    }
  };

  // Impedir alterações diretas em campos calculados
  // e metadados controlados pelo sistema.
  dadosAtualizados.criadoEm = atual.criadoEm;
  dadosAtualizados.versaoRegras = atual.versaoRegras;

  const erro = validarPersonagem(dadosAtualizados);

  if (erro) {
    return { erro };
  }

  const modificadores = {};

  for (const atributo of ATRIBUTOS) {
    modificadores[atributo] = calcularModificador(
      dadosAtualizados.atributos[atributo]
    );
  }

  dadosAtualizados.modificadores = modificadores;

  dadosAtualizados.bonusProficiencia =
    calcularProficiencia(dadosAtualizados.nivel);

  // Manter os PV atuais dentro do novo limite.
  const novosPV = dadosAtualizados.pvMaximo;

  const pvAtual = alteracoes.pvAtual !== undefined
    ? alteracoes.pvAtual
    : atual.pvAtual ?? novosPV;

  if (
    !Number.isInteger(pvAtual) ||
    pvAtual < 0 ||
    pvAtual > novosPV
  ) {
    return {
      erro: "PV atuais devem estar entre 0 e os PV máximos."
    };
  }

  dadosAtualizados.pvAtual = pvAtual;
  dadosAtualizados.atualizadoEm =
    new Date().toISOString();

  personagens[indice] = dadosAtualizados;

  salvarPersonagens(personagens);

  return {
    mensagem: "Personagem atualizado com sucesso.",
    personagem: dadosAtualizados
  };
}

function prepararInventario(personagem) {
  if (!personagem || typeof personagem !== "object") {
    throw new Error("Personagem inválido.");
  }

  if (!Array.isArray(personagem.inventario)) {
    personagem.inventario = [];
  }

  return personagem;
}

function adicionarItemInventario(personagem, item) {
  prepararInventario(personagem);

  if (!item || typeof item !== "object" ||
      Array.isArray(item)) {
    return { erro: "Item inválido." };
  }

  if (typeof item.nome !== "string" ||
      !item.nome.trim()) {
    return { erro: "O nome do item é obrigatório." };
  }

  if (!Number.isInteger(item.quantidade) ||
      item.quantidade < 1) {
    return { erro: "Quantidade inválida." };
  }

  const novoItem = {
    id: require("crypto").randomUUID(),
    nome: item.nome.trim(),
    tipo: item.tipo || "outros",
    quantidade: item.quantidade,
    peso: 0,
    equipado: false
  };

  personagem.inventario.push(novoItem);

  return {
    mensagem: "Item adicionado com sucesso.",
    item: novoItem,
    inventario: personagem.inventario
  };
}

function equiparItemInventario(personagem, itemId) {
  prepararInventario(personagem);

  const item = personagem.inventario.find(
    item => item.id === itemId
  );

  if (!item) {
    return { erro: "Item não encontrado." };
  }

  const tiposPermitidos = [
    "arma",
    "armadura",
    "escudo"
  ];

  if (!tiposPermitidos.includes(item.tipo)) {
    return {
      erro: "Este tipo de item não pode ser equipado."
    };
  }

  if (item.equipado === true) {
    return { erro: "Este item já está equipado." };
  }

  // Permitir apenas uma armadura equipada.
  if (item.tipo === "armadura") {
    for (const outro of personagem.inventario) {
      if (outro.tipo === "armadura") {
        outro.equipado = false;
      }
    }
  }

  // Permitir apenas um escudo equipado.
  if (item.tipo === "escudo") {
    for (const outro of personagem.inventario) {
      if (outro.tipo === "escudo") {
        outro.equipado = false;
      }
    }
  }

  item.equipado = true;

  return {
    mensagem: "Item equipado com sucesso.",
    item,
    inventario: personagem.inventario
  };
}

function desequiparItemInventario(personagem, itemId) {
  prepararInventario(personagem);

  const item = personagem.inventario.find(
    item => item.id === itemId
  );

  if (!item) {
    return { erro: "Item não encontrado." };
  }

  if (item.equipado !== true) {
    return { erro: "Este item não está equipado." };
  }

  item.equipado = false;

  return {
    mensagem: "Item desequipado com sucesso.",
    item,
    inventario: personagem.inventario
  };
}

function alterarEquipamentoPersonagem(personagemId, itemId, equipar) {
  if (typeof equipar !== "boolean") {
    return { erro: "Operação de equipamento inválida." };
  }

  const personagem = buscarPersonagem(personagemId);

  if (personagem.erro) {
    return personagem;
  }

  const resultado = equipar
    ? equiparItemInventario(personagem, itemId)
    : desequiparItemInventario(personagem, itemId);

  if (resultado.erro) {
    return resultado;
  }

  const salvamento = salvarInventarioPersonagem(
    personagemId,
    personagem.inventario
  );

  if (salvamento.erro) {
    return salvamento;
  }

  return {
    mensagem: equipar
      ? "Equipamento salvo como equipado."
      : "Equipamento salvo como desequipado.",
    item: resultado.item,
    inventario: salvamento.inventario
  };
}

function removerItemInventario(personagem, itemId, quantidade) {
  prepararInventario(personagem);

  const item = personagem.inventario.find(
    item => item.id === itemId
  );

  if (!item) {
    return { erro: "Item não encontrado." };
  }

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return { erro: "Quantidade inválida." };
  }

  if (quantidade > item.quantidade) {
    return { erro: "Quantidade insuficiente no inventário." };
  }

  item.quantidade -= quantidade;

  if (item.quantidade === 0) {
    personagem.inventario = personagem.inventario.filter(
      item => item.id !== itemId
    );
  }

  return {
    mensagem: "Item removido com sucesso.",
    inventario: personagem.inventario
  };
}

function salvarInventarioPersonagem(id, inventario) {
  if (!Array.isArray(inventario)) {
    return { erro: "Inventário inválido." };
  }

  const personagens = carregarPersonagens();

  const indice = personagens.findIndex(
    personagem => personagem.id === id
  );

  if (indice === -1) {
    return { erro: "Personagem não encontrado." };
  }

  const personagem = personagens[indice];

  personagem.inventario = inventario.map(item => ({
    ...item
  }));

  personagem.atualizadoEm = new Date().toISOString();

  salvarPersonagens(personagens);

  return {
    mensagem: "Inventário salvo com sucesso.",
    personagemId: id,
    inventario: personagem.inventario
  };
}

function adicionarItemPersonagem(personagemId, item) {
  const personagem = buscarPersonagem(personagemId);

  if (personagem.erro) {
    return personagem;
  }

  const resultado = adicionarItemInventario(
    personagem,
    item
  );

  if (resultado.erro) {
    return resultado;
  }

  const salvamento = salvarInventarioPersonagem(
    personagemId,
    personagem.inventario
  );

  if (salvamento.erro) {
    return salvamento;
  }

  return {
    mensagem: "Item adicionado e salvo com sucesso.",
    item: resultado.item,
    inventario: salvamento.inventario
  };
}

function removerItemPersonagem(personagemId, itemId, quantidade) {
  const personagem = buscarPersonagem(personagemId);

  if (personagem.erro) {
    return personagem;
  }

  const resultado = removerItemInventario(
    personagem,
    itemId,
    quantidade
  );

  if (resultado.erro) {
    return resultado;
  }

  const salvamento = salvarInventarioPersonagem(
    personagemId,
    personagem.inventario
  );

  if (salvamento.erro) {
    return salvamento;
  }

  return {
    mensagem: "Item removido e salvo com sucesso.",
    inventario: salvamento.inventario
  };
}

function calcularCAEquipamentos(personagem) {
  prepararInventario(personagem);

  const destreza = personagem.atributos?.destreza;

  if (!Number.isInteger(destreza)) {
    return { erro: "Destreza inválida na ficha." };
  }

  const modificadorDestreza = Math.floor(
    (destreza - 10) / 2
  );

  
const armaduras = {
  // ARMADURAS LEVES
  "armadura acolchoada": {
    base: 11,
    maxDestreza: null
  },
  "armadura de couro": {
    base: 11,
    maxDestreza: null
  },
  "couro batido": {
    base: 12,
    maxDestreza: null
  },

  // ARMADURAS MÉDIAS
  "gibão de peles": {
    base: 12,
    maxDestreza: 2
  },
  "camisão de malha": {
    base: 13,
    maxDestreza: 2
  },
  "brunea": {
    base: 14,
    maxDestreza: 2
  },
  "peitoral": {
    base: 14,
    maxDestreza: 2
  },
  "meia-armadura": {
    base: 15,
    maxDestreza: 2
  },

  // ARMADURAS PESADAS
  "cota de anéis": {
    base: 14,
    maxDestreza: 0
  },
  "cota de malha": {
    base: 16,
    maxDestreza: 0
  },
  "cota de talas": {
    base: 17,
    maxDestreza: 0
  },
  "armadura de placas": {
    base: 18,
    maxDestreza: 0
  }
};


  const inventario = personagem.inventario;

  const armadura = inventario.find(
    item => item.tipo === "armadura" &&
            item.equipado === true
  );

  const escudo = inventario.find(
    item => item.tipo === "escudo" &&
            item.equipado === true
  );

  let ca = 10 + modificadorDestreza;

  if (armadura) {
    const nome = armadura.nome.trim().toLowerCase();
    const dados = armaduras[nome];

    if (!dados) {
      return {
        erro: "Armadura ainda não cadastrada nas regras."
      };
    }

    
ca = dados.base;

if (dados.maxDestreza === null) {
  ca += modificadorDestreza;
} else if (dados.maxDestreza === 2) {
  ca += Math.min(modificadorDestreza, 2);
}

  }

  if (escudo) {
    ca += 2;
  }

  return {
    caCalculada: ca,
    modificadorDestreza,
    armadura: armadura?.nome || "Nenhuma",
    escudo: escudo?.nome || "Nenhum",
    caOriginal: personagem.ca
  };
}

function calcularDeslocamentoArmadura(personagem) {
  if (!personagem || typeof personagem !== "object") {
    return { erro: "Personagem inválido." };
  }

  const forca = personagem.atributos?.forca;
  const deslocamento = personagem.deslocamento;

  if (
    !Number.isInteger(forca) ||
    !Number.isFinite(deslocamento) ||
    deslocamento < 0
  ) {
    return { erro: "Força ou deslocamento inválido." };
  }

  const requisitos = {
    "cota de anéis": 0,
    "cota de malha": 13,
    "cota de talas": 15,
    "armadura de placas": 15
  };

  const inventario = Array.isArray(personagem.inventario)
    ? personagem.inventario
    : [];

  const armadura = inventario.find(
    item => item.tipo === "armadura" &&
            item.equipado === true
  );

  const nome = armadura?.nome?.trim().toLowerCase();

  const forcaNecessaria =
    Object.prototype.hasOwnProperty.call(requisitos, nome)
      ? requisitos[nome]
      : 0;

  const ehAnao = personagem.raca
    ?.trim()
    .toLowerCase()
    .includes("anão") ||
    personagem.raca
      ?.trim()
      .toLowerCase()
      .includes("anao");

  const forcaInsuficiente = forca < forcaNecessaria;

  const penalidade = forcaInsuficiente && !ehAnao
    ? 3
    : 0;

  return {
    armadura: armadura?.nome || "Nenhuma",
    forcaAtual: forca,
    forcaNecessaria,
    forcaInsuficiente,
    excecaoRacial: Boolean(ehAnao),
    penalidade,
    deslocamentoOriginal: deslocamento,
    deslocamentoCalculado: Math.max(
      0,
      deslocamento - penalidade
    )
  };
}

function prepararProficienciasArmadura(personagem) {
  if (
    !personagem ||
    typeof personagem !== "object" ||
    Array.isArray(personagem)
  ) {
    return { erro: "Personagem inválido." };
  }

  const campos = [
    "leves",
    "medias",
    "pesadas",
    "escudos"
  ];

  const origem = personagem.proficienciasArmadura;

  const proficiencias = {};

  for (const campo of campos) {
    const valor = origem?.[campo];

    proficiencias[campo] =
      typeof valor === "boolean" ? valor : false;
  }

  return {
    proficienciasArmadura: proficiencias
  };
}

function salvarProficienciasArmadura(personagemId, proficiencias) {
  const campos = ["leves", "medias", "pesadas", "escudos"];

  if (
    !proficiencias ||
    typeof proficiencias !== "object" ||
    Array.isArray(proficiencias) ||
    campos.some(campo =>
      typeof proficiencias[campo] !== "boolean"
    )
  ) {
    return { erro: "Proficiências inválidas." };
  }

  const personagens = carregarPersonagens();

  const indice = personagens.findIndex(
    personagem => personagem.id === personagemId
  );

  if (indice === -1) {
    return { erro: "Personagem não encontrado." };
  }

  personagens[indice].proficienciasArmadura = {
    leves: proficiencias.leves,
    medias: proficiencias.medias,
    pesadas: proficiencias.pesadas,
    escudos: proficiencias.escudos
  };

  personagens[indice].atualizadoEm =
    new Date().toISOString();

  salvarPersonagens(personagens);

  return {
    mensagem: "Proficiências salvas com sucesso.",
    personagemId,
    proficienciasArmadura:
      personagens[indice].proficienciasArmadura
  };
}

function identificarCategoriaArmadura(nomeItem, tipoItem) {
  if (
    typeof nomeItem !== "string" ||
    typeof tipoItem !== "string"
  ) {
    return null;
  }

  const nome = nomeItem.trim().toLowerCase();
  const tipo = tipoItem.trim().toLowerCase();

  if (tipo === "escudo" && nome === "escudo") {
    return "escudos";
  }

  if (tipo !== "armadura") {
    return null;
  }

  const categorias = {
    leves: [
      "armadura acolchoada",
      "armadura de couro",
      "couro batido"
    ],

    medias: [
      "gibão de peles",
      "camisão de malha",
      "brunea",
      "peitoral",
      "meia-armadura"
    ],

    pesadas: [
      "cota de anéis",
      "cota de malha",
      "cota de talas",
      "armadura de placas"
    ]
  };

  for (const [categoria, armaduras] of Object.entries(categorias)) {
    if (armaduras.includes(nome)) {
      return categoria;
    }
  }

  return null;
}

function verificarProficienciasEquipamentos(personagem) {
  if (!personagem || typeof personagem !== "object") {
    return { erro: "Personagem inválido." };
  }

  const inventario = Array.isArray(personagem.inventario)
    ? personagem.inventario
    : [];

  const proficiencias = personagem.proficienciasArmadura;

  const equipamentos = [];

  for (const item of inventario) {
    if (!item.equipado) continue;

    if (!["armadura", "escudo"].includes(item.tipo)) {
      continue;
    }

    const categoria = identificarCategoriaArmadura(
      item.nome,
      item.tipo
    );

    let status = "nao_informado";

    if (categoria && proficiencias) {
      const valor = proficiencias[categoria];

      if (valor === true) {
        status = "proficiente";
      } else if (valor === false) {
        status = "sem_proficiencia";
      }
    }

    equipamentos.push({
      nome: item.nome,
      categoria: categoria || "desconhecida",
      status
    });
  }

  return {
    personagem: personagem.nome,
    equipamentos,
    possuiEquipamentoSemProficiencia:
      equipamentos.some(
        item => item.status === "sem_proficiencia"
      )
  };
}

module.exports = {
  criarPersonagem,
  listarPersonagens,
  buscarPersonagem,
  editarPersonagem,
  calcularModificador,
  calcularProficiencia,
  prepararInventario,
  adicionarItemInventario,
  removerItemInventario,
  salvarInventarioPersonagem,
  adicionarItemPersonagem,
  removerItemPersonagem,
  equiparItemInventario,
  desequiparItemInventario,
  alterarEquipamentoPersonagem,
  calcularCAEquipamentos,
  calcularDeslocamentoArmadura,
  prepararProficienciasArmadura,
  salvarProficienciasArmadura,
  identificarCategoriaArmadura,
  verificarProficienciasEquipamentos
};
