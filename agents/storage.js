
const fs = require("fs");
const path = require("path");

const pastaDados = path.join(__dirname, "..", "data");
const arquivoDados = path.join(pastaDados, "batalhas.json");

// Garantir que a pasta de dados exista
function prepararArmazenamento() {
  if (!fs.existsSync(pastaDados)) {
    fs.mkdirSync(pastaDados, { recursive: true });
  }
}

// Salvar batalhas e históricos
function salvarDados(batalhas, historicos) {
  prepararArmazenamento();

  const dados = {
    versao: 1,
    atualizadoEm: new Date().toISOString(),
    batalhas: Array.from(batalhas.entries()),
    historicos: Array.from(historicos.entries())
  };

  const temporario = arquivoDados + ".tmp";

  fs.writeFileSync(
    temporario,
    JSON.stringify(dados, null, 2),
    "utf8"
  );

  fs.renameSync(temporario, arquivoDados);
}

// Recuperar dados salvos
function carregarDados() {
  prepararArmazenamento();

  if (!fs.existsSync(arquivoDados)) {
    return {
      batalhas: new Map(),
      historicos: new Map()
    };
  }

  const conteudo = fs.readFileSync(arquivoDados, "utf8");
  const dados = JSON.parse(conteudo);

  if (
    !Array.isArray(dados.batalhas) ||
    !Array.isArray(dados.historicos)
  ) {
    throw new Error("Arquivo de batalhas inválido.");
  }

  return {
    batalhas: new Map(dados.batalhas),
    historicos: new Map(dados.historicos)
  };
}

module.exports = {
  salvarDados,
  carregarDados
};
