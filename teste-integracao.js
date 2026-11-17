
const {
  listarPersonagens
} = require("./agents/characterManager");

async function testar() {
  const personagens = listarPersonagens();

  const personagem = personagens.find(
    p =>
      Number.isInteger(p.pvMaximo) &&
      Number.isInteger(p.ca) &&
      Number.isFinite(p.deslocamento)
  );

  if (!personagem) {
    console.log(
      "Nenhum personagem com ficha completa encontrado."
    );
    return;
  }

  const idBatalha = `teste-v06-${Date.now()}`;

  const resposta = await fetch(
    "http://localhost:3000/batalha/criar-com-personagens",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: idBatalha,
        participantes: [
          {
            personagemId: personagem.id,
            iniciativa: 15
          }
        ]
      })
    }
  );

  const resultado = await resposta.json();

  console.log("Status HTTP:", resposta.status);
  console.log(
    JSON.stringify(resultado, null, 2)
  );
}

testar().catch(console.error);
