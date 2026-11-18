
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  buscarPersonagem,
  salvarProficienciasArmadura
} = require("./agents/characterManager");

const arquivo = path.join(__dirname, "data", "personagens.json");
const id = `teste-proficiencia-${crypto.randomUUID()}`;

const personagens = JSON.parse(
  fs.readFileSync(arquivo, "utf8")
);

if (!Array.isArray(personagens)) {
  throw new Error("Arquivo de personagens inválido.");
}

let testeCriado = false;

try {
  personagens.push({
    id,
    nome: "Guerreiro Temporário"
  });

  fs.writeFileSync(
    arquivo,
    JSON.stringify(personagens, null, 2),
    "utf8"
  );

  testeCriado = true;

  const resultado = salvarProficienciasArmadura(id, {
    leves: true,
    medias: true,
    pesadas: true,
    escudos: true
  });

  if (resultado.erro) {
    throw new Error(resultado.erro);
  }

  const personagem = buscarPersonagem(id);

  const proficiencias = personagem.proficienciasArmadura;

  if (
    !proficiencias ||
    Object.values(proficiencias).some(valor => valor !== true)
  ) {
    throw new Error("Falha ao recuperar as proficiências.");
  }

  console.log("PROFICIÊNCIAS SALVAS!");
  console.log(proficiencias);
  console.log("TESTE APROVADO!");

} finally {
  if (testeCriado) {
    const dadosAtuais = JSON.parse(
      fs.readFileSync(arquivo, "utf8")
    );

    const semTeste = dadosAtuais.filter(
      personagem => personagem.id !== id
    );

    fs.writeFileSync(
      arquivo,
      JSON.stringify(semTeste, null, 2),
      "utf8"
    );

    console.log("Personagem temporário removido.");
  }
}
