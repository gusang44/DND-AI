
const c = require("./agents/characterManager");

async function testar() {
  const modelo = c.prepararProficienciasTestes({})
    .proficienciasTestes;

  modelo.pericias.atletismo = true;
  modelo.pericias.percepcao = false;
  modelo.resistencias.forca = true;
  modelo.resistencias.constituicao = true;

  const personagem = c.criarPersonagem({
    nome: "Teste Temporario de Proficiencias",
    raca: "Humano",
    classe: "Guerreiro",
    nivel: 1,
    atributos: {
      forca: 16,
      destreza: 12,
      constituicao: 14,
      inteligencia: 10,
      sabedoria: 10,
      carisma: 10
    },
    pvMaximo: 12,
    ca: 16,
    deslocamento: 9
  });

  if (personagem.erro || !personagem.id) {
    console.log("Não foi possível criar a ficha temporária.");
    console.log(personagem);
    return;
  }

  console.log("Ficha criada:", personagem.id);

  const resposta = await fetch(
    `http://localhost:3000/personagens/${encodeURIComponent(personagem.id)}/proficiencias-testes`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelo)
    }
  );

  const resultado = await resposta.json();

  console.log("HTTP:", resposta.status);
  console.log("Resposta:", resultado.mensagem || resultado.erro);

  const ficha = c.buscarPersonagem(personagem.id);

  console.log("Atletismo:", ficha.proficienciasTestes?.pericias?.atletismo);
  console.log("Percepção:", ficha.proficienciasTestes?.pericias?.percepcao);
  console.log("Força:", ficha.proficienciasTestes?.resistencias?.forca);
  console.log("Constituição:", ficha.proficienciasTestes?.resistencias?.constituicao);

  console.log("ID temporário para limpeza:", personagem.id);
}

testar().catch(console.error);
