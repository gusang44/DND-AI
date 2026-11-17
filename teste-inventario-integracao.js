
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  buscarPersonagem,
  adicionarItemPersonagem,
  removerItemPersonagem
} = require("./agents/characterManager");

const arquivo = path.join(
  __dirname,
  "data",
  "personagens.json"
);

const original = fs.readFileSync(arquivo, "utf8");
const id = `teste-${crypto.randomUUID()}`;

try {
  const personagens = JSON.parse(original);

  if (!Array.isArray(personagens)) {
    throw new Error("Formato JSON inesperado.");
  }

  personagens.push({
    id,
    nome: "Personagem Temporário",
    inventario: []
  });

  fs.writeFileSync(
    arquivo,
    JSON.stringify(personagens, null, 2),
    "utf8"
  );

  console.log("1. Personagem temporário criado.");

  const adicao = adicionarItemPersonagem(id, {
    nome: "Poção de Cura",
    tipo: "consumivel",
    quantidade: 3
  });

  if (adicao.erro) {
    throw new Error(adicao.erro);
  }

  console.log("2. Item adicionado e salvo.");

  const remocao = removerItemPersonagem(
    id,
    adicao.item.id,
    2
  );

  if (remocao.erro) {
    throw new Error(remocao.erro);
  }

  console.log("3. Duas poções removidas.");

  const personagem = buscarPersonagem(id);
  const item = personagem.inventario.find(
    item => item.id === adicao.item.id
  );

  if (!item || item.quantidade !== 1) {
    throw new Error("Falha na persistência.");
  }

  console.log("4. Inventário recarregado.");
  console.log("Poções restantes:", item.quantidade);
  console.log("TESTE APROVADO!");

} finally {
  fs.writeFileSync(arquivo, original, "utf8");
  console.log("Dados originais restaurados.");
}
