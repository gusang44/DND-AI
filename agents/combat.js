
function rolarDado(lados = 20) {
  return Math.floor(Math.random() * lados) + 1;
}

function calcularIniciativa(nome, modificador = 0) {
  const dado = rolarDado(20);

  return {
    nome,
    dado,
    modificador,
    iniciativa: dado + modificador
  };
}

function iniciarCombate(participantes) {
  const ordem = participantes.map((personagem) => {
    return calcularIniciativa(
      personagem.nome,
      personagem.modificadorIniciativa || 0
    );
  });

  ordem.sort((a, b) => b.iniciativa - a.iniciativa);

  return {
    agente: "IA de Combate",
    mensagem: "Combate iniciado!",
    ordemTurnos: ordem,
    turnoAtual: ordem[0]?.nome || null
  };
}

function realizarAtaque(atacante, alvo, ataque) {
  const dado = rolarDado(20);
  const bonus = ataque.bonusAtaque;
  const total = dado + bonus;

  const critico = dado === 20;
  const falhaCritica = dado === 1;
  const acertou =
    !falhaCritica && (critico || total >= alvo.ca);

  let dano = 0;

  if (acertou) {
    const quantidadeDados =
      ataque.quantidadeDados * (critico ? 2 : 1);

    for (let i = 0; i < quantidadeDados; i++) {
      dano += rolarDado(ataque.ladosDado);
    }

    dano = Math.max(0, dano + ataque.bonusDano);
  }

  const pvAnterior = alvo.pv;
  const pvAtual = Math.max(0, pvAnterior - dano);

  return {
    agente: "IA de Combate",
    atacante: atacante.nome,
    alvo: alvo.nome,
    dado,
    bonusAtaque: bonus,
    totalAtaque: total,
    classeArmadura: alvo.ca,
    acertou,
    critico,
    dano,
    pvAnterior,
    pvAtual
  };
}

module.exports = {
  rolarDado,
  calcularIniciativa,
  iniciarCombate,
  realizarAtaque
};
