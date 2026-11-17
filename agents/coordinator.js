
function coordenar(acao) {
  const texto = acao.toLowerCase();

  if (
    texto.includes("atacar") ||
    texto.includes("combate") ||
    texto.includes("iniciativa")
  ) {
    return {
      agente: "IA de Combate",
      mensagem: "Preparando o sistema de combate..."
    };
  }

  if (
    texto.includes("conversar") ||
    texto.includes("perguntar") ||
    texto.includes("falar")
  ) {
    return {
      agente: "IA de NPCs",
      mensagem: "Preparando a interação com o NPC..."
    };
  }

  if (
    texto.includes("magia") ||
    texto.includes("regra") ||
    texto.includes("teste")
  ) {
    return {
      agente: "IA de Regras",
      mensagem: "Verificando as regras da campanha..."
    };
  }

  return {
    agente: "IA Narradora",
    mensagem: "Preparando a narração da aventura..."
  };
}

module.exports = coordenar;
