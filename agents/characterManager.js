
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
  removerItemPersonagem
};
