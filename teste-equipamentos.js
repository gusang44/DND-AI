
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  buscarPersonagem,
  adicionarItemPersonagem,
  alterarEquipamentoPersonagem
} = require("./agents/characterManager");

const arquivo = path.join(
  __dirname,
  "data",
  "personagens.json"
);

const original = fs.readFileSync(arquivo, "utf8");
const id = `teste-equipamento-${crypto.randomUUID()}`;

try {
  const personagens = JSON.parse(original);

  if (!Array.isArray(personagens)) {
    throw new Error("Formato de personagens.json inválido.");
  }

  personagens.push({
    id,
    nome: "Guerreiro Temporário",
    inventario: []
  });

  fs.writeFileSync(
    arquivo,
    JSON.stringify(personagens, null, 2),
    "utf8"
  );

  const adicao = adicionarItemPersonagem(id, {
    nome: "Espada Longa",
    tipo: "arma",
    quantidade: 1
  });

  if (adicao.erro) throw new Error(adicao.erro);

  const itemId = adicao.item.id;

  const equipado = alterarEquipamentoPersonagem(
    id,
    itemId,
    true
  );

  if (equipado.erro) throw new Error(equipado.erro);

  const personagemEquipado = buscarPersonagem(id);
  const armaEquipada = personagemEquipado.inventario.find(
    item => item.id === itemId
  );

  if (armaEquipada?.equipado !== true) {
    throw new Error("Falha ao salvar equipamento.");
  }

  console.log("ARMA EQUIPADA E SALVA!");

  const desequipado = alterarEquipamentoPersonagem(
    id,
    itemId,
    false
  );

  if (desequipado.erro) throw new Error(desequipado.erro);

  const personagemDesequipado = buscarPersonagem(id);
  const armaDesequipada = personagemDesequipado.inventario.find(
    item => item.id === itemId
  );

  if (armaDesequipada?.equipado !== false) {
    throw new Error("Falha ao salvar desequipamento.");
  }

  console.log("ARMA DESEQUIPADA E SALVA!");
  console.log("TESTE APROVADO!");

} finally {
  fs.writeFileSync(arquivo, original, "utf8");
  console.log("Dados originais restaurados.");
}
