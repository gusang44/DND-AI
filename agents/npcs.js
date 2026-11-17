
const personagens = {
  ferreiro: {
    nome: "Borin",
    raca: "Anão",
    origem: "Montanhas do Norte",
    personalidade: "Sério e trabalhador",
    estiloVoz: "Grave e pausado",
    saudacao: "Bem-vindo à minha forja, viajante!"
  },

  taverneiro: {
    nome: "Edric",
    raca: "Humano",
    origem: "Reino de Valdoria",
    personalidade: "Amigável e curioso",
    estiloVoz: "Alegre",
    saudacao: "Entre! Temos comida quente!"
  },

  guarda: {
    nome: "Arthen",
    raca: "Elfo",
    origem: "Floresta de Eldoria",
    personalidade: "Disciplinado",
    estiloVoz: "Calmo e formal",
    saudacao: "Identifique-se, viajante."
  }
};

function interpretarNPC(acao, tipo = "taverneiro") {
  const npc = personagens[tipo];

  if (!npc) {
    return { erro: "NPC não encontrado." };
  }

  return {
    agente: "IA de NPCs",
    personagem: npc.nome,
    raca: npc.raca,
    origem: npc.origem,
    personalidade: npc.personalidade,
    estiloVoz: npc.estiloVoz,
    dialogo: npc.saudacao,
    acaoJogador: acao
  };
}

module.exports = interpretarNPC;
