
function narrar(acao, campanha = "personalizada") {
  return {
    agente: "IA Narradora",
    campanha: campanha,
    narracao:
      "O ambiente parece tranquilo, mas algo chama sua atenção. " +
      "Você decide: " + acao + ". " +
      "O mundo reage à sua escolha, e a aventura continua."
  };
}

module.exports = narrar;
