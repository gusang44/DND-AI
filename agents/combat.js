
function rolarDado(lados = 20) {
  return Math.floor(Math.random() * lados) + 1;
}

function rolarD20ComVantagem(tipo = "normal") {
  const primeiroDado = rolarDado(20);

  if (tipo === "normal") {
    return {
      tipo: "normal",
      dados: [primeiroDado],
      resultado: primeiroDado
    };
  }

  const segundoDado = rolarDado(20);

  if (tipo === "vantagem") {
    return {
      tipo: "vantagem",
      dados: [primeiroDado, segundoDado],
      resultado: Math.max(primeiroDado, segundoDado)
    };
  }

  if (tipo === "desvantagem") {
    return {
      tipo: "desvantagem",
      dados: [primeiroDado, segundoDado],
      resultado: Math.min(primeiroDado, segundoDado)
    };
  }

  throw new Error("Tipo de rolagem inválido.");
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


function realizarAtaque(atacante, alvo, ataque, tipoRolagem = "normal") {
const rolagem = rolarD20ComVantagem(tipoRolagem);
const dado = rolagem.resultado;

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
    tipoRolagem: rolagem.tipo,
    dadosRolados: rolagem.dados,
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
  rolarD20ComVantagem,
  calcularIniciativa,
  iniciarCombate,
  realizarAtaque,
};
