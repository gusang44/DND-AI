
const crypto = require("node:crypto");

const {
  buscarPersonagem,
  adicionarItemInventario,
  salvarInventarioPersonagem
} = require("./agents/characterManager");

const fs = require("node:fs");
const path = require("node:path");

const arquivo = path.join(
  __dirname,
  "data",
  "personagens.json"
);

const conteudoOriginal = fs.readFileSync(arquivo, "utf8");

try {
  const personagens = JSON.parse(conteudoOriginal);

  if (!Array.isArray(personagens)) {
    throw new Error("Formato de personagens.json inesperado.");
  }

  const id = `teste-inventario-${crypto.randomUUID()}`;

  const personagemTeste = {
    id,
    nome: "Teste Inventário",
    inventario: []
  };

  personagens.push(personagemTeste);

  fs.writeFileSync(
    arquivo,
    JSON.stringify(personagens, null, 2),
    "utf8"
  );

  console.log("Personagem temporário criado.");

  const personagem = buscarPersonagem(id);

  if (!personagem || personagem.erro) {
    throw new Error("Personagem temporário não encontrado.");
  }

  const resultado = adicionarItemInventario(personagem, {
    nome: "Poção de Cura",
    tipo: "consumivel",
    quantidade: 3
  });

  if (resultado.erro) {
    throw new Error(resultado.erro);
  }

  const salvamento = salvarInventarioPersonagem(
    id,
    personagem.inventario
  );

  if (salvamento.erro) {
    throw new Error(salvamento.erro);
  }

  const recarregado = buscarPersonagem(id);

  if (
    !recarregado.inventario ||
    recarregado.inventario.length !== 1 ||
    recarregado.inventario[0].quantidade !== 3
  ) {
    throw new Error("Falha na persistência do inventário.");
  }

  console.log("Item salvo e recarregado com sucesso!");
  console.log(recarregado.inventario);

} finally {
  fs.writeFileSync(arquivo, conteudoOriginal, "utf8");
  console.log("Arquivo original restaurado.");
}
