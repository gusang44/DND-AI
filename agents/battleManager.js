
const { realizarAtaque } = require("./combat");

const {
  registrarEvento,
  obterHistorico,
  limparHistorico,
  restaurarHistoricos,
  obterTodosHistoricos
} = require("./history");

const {
  salvarDados,
  carregarDados
} = require("./storage");

const {
  buscarPersonagem: buscarFichaPersonagem,
  calcularRestricoesArmadura
} = require("./characterManager");

function consultarRestricoesParticipante(participante) {
  if (!participante || typeof participante !== "object") {
    return {
      status: "indisponivel",
      motivo: "Participante inválido."
    };
  }

  const fichaId = participante.fichaPersonagemId;

  if (typeof fichaId !== "string" || !fichaId.trim()) {
    return {
      status: "sem_ficha",
      motivo: "Participante sem ficha vinculada."
    };
  }

  const ficha = buscarFichaPersonagem(fichaId);

  if (!ficha || ficha.erro) {
    return {
      status: "ficha_nao_encontrada",
      motivo: "Ficha vinculada não encontrada."
    };
  }

  const restricoes = calcularRestricoesArmadura(ficha);

  if (restricoes.erro) {
    return {
      status: "indisponivel",
      motivo: restricoes.erro
    };
  }

  return {
    status: restricoes.verificacaoPendente
      ? "verificacao_pendente"
      : "verificado",

    fichaPersonagemId: fichaId,
    possuiRestricoes: restricoes.possuiRestricoes,
    desvantagemForcaDestreza:
      restricoes.desvantagemForcaDestreza,
    conjuracaoBloqueada:
      restricoes.conjuracaoBloqueada,
    equipamentosSemProficiencia:
      restricoes.equipamentosSemProficiencia
  };
}

// ==========================================
// ARMAZENAMENTO DAS BATALHAS
// ==========================================

const batalhas = new Map();

function salvarEstado() {
  salvarDados(batalhas, obterTodosHistoricos());
}

function restaurarEstado() {
  const dados = carregarDados();

  batalhas.clear();

  for (const [id, batalha] of dados.batalhas) {
    batalhas.set(id, batalha);
  }

  restaurarHistoricos(dados.historicos);

  console.log(
    `D&D AI: ${batalhas.size} batalha(s) recuperada(s).`
  );
}

// Recuperar dados ao iniciar
restaurarEstado();

// Salvar automaticamente após operações válidas
function executarESalvar(operacao) {
  return (...argumentos) => {
    const resultado = operacao(...argumentos);

    if (resultado && !resultado.erro) {
      salvarEstado();
    }

    return resultado;
  };
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function buscarBatalha(id) {
  return batalhas.get(id);
}

function buscarPersonagem(batalha, nome) {
  return batalha.participantes.find(
    p => p.nome === nome
  );
}

function personagemDoTurno(batalha) {
  return batalha.participantes[batalha.turno];
}

function validarQuantidade(valor, permitirZero = false) {
  return (
    Number.isFinite(valor) &&
    (permitirZero ? valor >= 0 : valor > 0)
  );
}

// ==========================================
// CRIAÇÃO DE BATALHAS
// ==========================================

function criarBatalha(id, participantes) {
  if (typeof id !== "string" || !id.trim()) {
    return { erro: "ID da batalha inválido." };
  }

  if (batalhas.has(id)) {
    return { erro: "Já existe uma batalha com esse ID." };
  }

  if (
    !Array.isArray(participantes) ||
    participantes.length === 0
  ) {
    return { erro: "Informe os participantes." };
  }

  const nomes = new Set();

  for (const p of participantes) {
    if (
      !p ||
      typeof p.nome !== "string" ||
      !p.nome.trim() ||
      nomes.has(p.nome) ||
      !Number.isInteger(p.pv) ||
      p.pv <= 0 ||
      !Number.isFinite(p.ca) ||
      !Number.isFinite(p.iniciativa) ||
      (
        p.deslocamento !== undefined &&
        !validarQuantidade(p.deslocamento, true)
      )
    ) {
      return {
        erro: "Dados dos participantes inválidos ou nomes duplicados."
      };
    }

    nomes.add(p.nome);
  }

  const personagens = participantes.map(p => {
    const deslocamento = p.deslocamento ?? 9;

    return {
      nome: p.nome,
      fichaPersonagemId: p.fichaPersonagemId ?? null,
      pv: p.pv,
      pvMaximo: p.pv,
      ca: p.ca,
      iniciativa: p.iniciativa,
      deslocamento,
      movimentoRestante: deslocamento,
      reacaoDisponivel: true
    };
  });

  personagens.sort(
    (a, b) => b.iniciativa - a.iniciativa
  );

  const batalha = {
    id,
    rodada: 1,
    turno: 0,
    participantes: personagens,
    ativa: true,
    acoes: {
      acao: true,
      acaoBonus: true,
      movimento: true
    }
  };

  batalhas.set(id, batalha);

  limparHistorico(id);

  registrarEvento(
    id,
    "inicio",
    `Batalha ${id} iniciada.`,
    {
      participantes: personagens.map(p => p.nome)
    }
  );

  return batalha;
}

// ==========================================
// CONSULTAS
// ==========================================

function obterBatalha(id) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  return batalha;
}

function consultarHistorico(id) {
  if (!batalhas.has(id)) {
    return { erro: "Batalha não encontrada." };
  }

  return {
    idBatalha: id,
    eventos: obterHistorico(id)
  };
}

// NOVO — D&D AI v0.5
function listarBatalhas() {
  return Array.from(batalhas.values()).map(batalha => {
    const atual = personagemDoTurno(batalha);

    return {
      id: batalha.id,
      rodada: batalha.rodada,
      turnoAtual: atual?.nome || null,
      quantidadeParticipantes:
        batalha.participantes.length,
      ativa: batalha.ativa
    };
  });
}

// ==========================================
// CONTROLE DE TURNOS
// ==========================================

function proximoTurno(id) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (!batalha.ativa) {
    return { erro: "A batalha está encerrada." };
  }

  batalha.turno++;

  if (batalha.turno >= batalha.participantes.length) {
    batalha.turno = 0;
    batalha.rodada++;
  }

  const atual = personagemDoTurno(batalha);

  batalha.acoes = {
    acao: true,
    acaoBonus: true,
    movimento: true
  };

  atual.movimentoRestante = atual.deslocamento;
  atual.reacaoDisponivel = true;

  registrarEvento(
    id,
    "turno",
    `Turno de ${atual.nome} iniciado.`,
    {
      rodada: batalha.rodada,
      personagem: atual.nome
    }
  );

  return batalha;
}

// ==========================================
// DANO MANUAL
// ==========================================

function aplicarDano(id, nome, dano) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  const personagem = buscarPersonagem(batalha, nome);

  if (!personagem) {
    return { erro: "Personagem não encontrado." };
  }

  if (!Number.isInteger(dano) || dano < 0) {
    return { erro: "Dano inválido." };
  }

  const pvAnterior = personagem.pv;

  personagem.pv = Math.max(
    0,
    personagem.pv - dano
  );

  const danoReal = pvAnterior - personagem.pv;

  registrarEvento(
    id,
    "dano",
    `${personagem.nome} recebeu ${danoReal} de dano.`,
    {
      personagem: nome,
      dano,
      danoReal,
      pvAnterior,
      pvAtual: personagem.pv
    }
  );

  return {
    personagem: nome,
    dano,
    danoReal,
    pvAnterior,
    pvAtual: personagem.pv
  };
}

// ==========================================
// ATAQUES
// ==========================================

function atacarNaBatalha(id, atacante, alvo, ataque) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (!batalha.ativa) {
    return { erro: "A batalha está encerrada." };
  }

  const personagem = buscarPersonagem(
    batalha,
    atacante
  );

  const inimigo = buscarPersonagem(
    batalha,
    alvo
  );

  if (!personagem || !inimigo) {
    return {
      erro: "Atacante ou alvo não encontrado."
    };
  }

  if (atacante === alvo) {
    return { erro: "Selecione outro alvo." };
  }

  const atual = personagemDoTurno(batalha);

  if (atual.nome !== atacante) {
    return {
      erro: "Não é o turno desse personagem."
    };
  }

  if (!batalha.acoes.acao) {
    return {
      erro: "A ação principal já foi utilizada."
    };
  }

  if (personagem.pv <= 0) {
    return {
      erro: "O atacante está sem pontos de vida."
    };
  }

  if (inimigo.pv <= 0) {
    return {
      erro: "O alvo já está sem pontos de vida."
    };
  }

  if (
    !ataque ||

    (
      ataque.atributo !== undefined &&
      ![
        "forca",
        "destreza",
        "constituicao",
        "inteligencia",
        "sabedoria",
        "carisma"
      ].includes(ataque.atributo)
    ) ||
    !Number.isFinite(ataque.bonusAtaque) ||
    !Number.isInteger(ataque.quantidadeDados) ||
    ataque.quantidadeDados <= 0 ||
    !Number.isInteger(ataque.ladosDado) ||
    ataque.ladosDado <= 0 ||
    !Number.isFinite(ataque.bonusDano)
  ) {
    return { erro: "Dados do ataque inválidos." };
  }

  
const decisaoRolagem = determinarTipoRolagemAtaque(
  personagem,
  ataque,
  ataque.possuiVantagem === true,
  ataque.possuiDesvantagem === true
);

const resultado = realizarAtaque(
  personagem,
  inimigo,
  ataque,
  decisaoRolagem.tipoRolagem
);

  // combat.js calcula o dano e os PV resultantes.
  // Garantimos que os PV permaneçam dentro dos limites.
  inimigo.pv = Math.max(
    0,
    Math.min(inimigo.pvMaximo, resultado.pvAtual)
  );

  batalha.acoes.acao = false;

  registrarEvento(
    id,
    "ataque",
    `${atacante} atacou ${alvo}.`,
    {
      rodada: batalha.rodada,
      atacante,
      alvo,
      d20: resultado.dado,
      totalAtaque: resultado.totalAtaque,
      classeArmadura: resultado.classeArmadura,
      acertou: resultado.acertou,
      critico: resultado.critico,
      dano: resultado.dano,
      pvAtualAlvo: inimigo.pv
    }
  );

  return {
    ...resultado,
    pvAtual: inimigo.pv,
    rodada: batalha.rodada,
    turnoAtual: atual.nome,
    acoesDisponiveis: { ...batalha.acoes }
  };
}

// ==========================================
// AÇÃO BÔNUS
// ==========================================

function usarAcaoBonus(id, nome) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (!batalha.ativa) {
    return { erro: "A batalha está encerrada." };
  }

  const atual = personagemDoTurno(batalha);

  if (atual.nome !== nome) {
    return {
      erro: "Não é o turno desse personagem."
    };
  }

  if (!batalha.acoes.acaoBonus) {
    return {
      erro: "A ação bônus já foi utilizada."
    };
  }

  batalha.acoes.acaoBonus = false;

  registrarEvento(
    id,
    "acao_bonus",
    `${nome} utilizou uma ação bônus.`,
    { rodada: batalha.rodada, personagem: nome }
  );

  return {
    mensagem: "Ação bônus utilizada.",
    personagem: nome,
    acoesDisponiveis: { ...batalha.acoes }
  };
}

// ==========================================
// REAÇÃO
// ==========================================

function usarReacao(id, nome) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (!batalha.ativa) {
    return { erro: "A batalha está encerrada." };
  }

  const personagem = buscarPersonagem(
    batalha,
    nome
  );

  if (!personagem) {
    return { erro: "Personagem não encontrado." };
  }

  if (!personagem.reacaoDisponivel) {
    return { erro: "Reação já utilizada." };
  }

  personagem.reacaoDisponivel = false;

  registrarEvento(
    id,
    "reacao",
    `${nome} utilizou uma reação.`,
    { personagem: nome }
  );

  return {
    mensagem: "Reação utilizada.",
    personagem: nome,
    reacaoDisponivel: false
  };
}

// ==========================================
// MOVIMENTO
// ==========================================

function moverPersonagem(id, nome, distancia) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (!batalha.ativa) {
    return { erro: "A batalha está encerrada." };
  }

  const atual = personagemDoTurno(batalha);

  if (atual.nome !== nome) {
    return {
      erro: "Não é o turno desse personagem."
    };
  }

  if (!validarQuantidade(distancia)) {
    return { erro: "Distância inválida." };
  }

  if (distancia > atual.movimentoRestante) {
    return {
      erro: "Movimento insuficiente."
    };
  }

  atual.movimentoRestante =
    Math.max(0, atual.movimentoRestante - distancia);

  batalha.acoes.movimento =
    atual.movimentoRestante > 0;

  registrarEvento(
    id,
    "movimento",
    `${nome} moveu ${distancia} metro(s).`,
    {
      personagem: nome,
      distancia,
      movimentoRestante: atual.movimentoRestante
    }
  );

  return {
    personagem: nome,
    distancia,
    movimentoRestante: atual.movimentoRestante,
    acoesDisponiveis: { ...batalha.acoes }
  };
}

// ==========================================
// AJUSTES DO MESTRE
// ==========================================

function ajustarRecursosMestre(id, nome, ajustes) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  const personagem = buscarPersonagem(
    batalha,
    nome
  );

  if (!personagem) {
    return { erro: "Personagem não encontrado." };
  }

  if (
    !ajustes ||
    typeof ajustes !== "object" ||
    Array.isArray(ajustes)
  ) {
    return { erro: "Ajustes inválidos." };
  }

  const permitidos = [
    "pv",
    "movimentoRestante",
    "reacaoDisponivel"
  ];

  const campos = Object.keys(ajustes);

  if (
    campos.length === 0 ||
    campos.some(campo => !permitidos.includes(campo))
  ) {
    return {
      erro: "Um ou mais campos de ajuste são inválidos."
    };
  }

  for (const campo of campos) {
    const valor = ajustes[campo];

    if (
      campo === "pv" &&
      (!Number.isInteger(valor) ||
        valor < 0 ||
        valor > personagem.pvMaximo)
    ) {
      return {
        erro: "PV deve estar entre 0 e o máximo."
      };
    }

    if (
      campo === "movimentoRestante" &&
      !validarQuantidade(valor, true)
    ) {
      return { erro: "Movimento inválido." };
    }

    if (
      campo === "reacaoDisponivel" &&
      typeof valor !== "boolean"
    ) {
      return { erro: "Valor de reação inválido." };
    }
  }

  const anteriores = {};

  for (const campo of campos) {
    anteriores[campo] = personagem[campo];
    personagem[campo] = ajustes[campo];
  }

  registrarEvento(
    id,
    "ajuste_mestre",
    `O Mestre ajustou os recursos de ${nome}.`,
    {
      personagem: nome,
      anteriores,
      ajustes
    }
  );

  return {
    mensagem: "Recursos ajustados pelo Mestre.",
    personagem: nome,
    ajustes,
    recursos: {
      pv: personagem.pv,
      movimentoRestante: personagem.movimentoRestante,
      reacaoDisponivel: personagem.reacaoDisponivel
    }
  };
}

// ==========================================
// CURA DO MESTRE
// ==========================================

function curarPersonagem(id, nome, quantidade) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  const personagem = buscarPersonagem(
    batalha,
    nome
  );

  if (!personagem) {
    return { erro: "Personagem não encontrado." };
  }

  if (
    !Number.isInteger(quantidade) ||
    quantidade <= 0
  ) {
    return { erro: "Quantidade de cura inválida." };
  }

  const pvAnterior = personagem.pv;

  personagem.pv = Math.min(
    personagem.pvMaximo,
    personagem.pv + quantidade
  );

  const curaReal = personagem.pv - pvAnterior;

  registrarEvento(
    id,
    "cura_mestre",
    `O Mestre curou ${nome} em ${curaReal} PV.`,
    {
      personagem: nome,
      curaSolicitada: quantidade,
      curaReal,
      pvAnterior,
      pvAtual: personagem.pv
    }
  );

  return {
    personagem: nome,
    curaReal,
    pvAtual: personagem.pv,
    pvMaximo: personagem.pvMaximo
  };
}

// ==========================================
// RESTAURAR AÇÕES DO MESTRE
// ==========================================

function restaurarAcaoMestre(id, nome, tipo) {
  const batalha = buscarBatalha(id);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (!batalha.ativa) {
    return { erro: "A batalha está encerrada." };
  }

  const atual = personagemDoTurno(batalha);

  if (atual.nome !== nome) {
    return {
      erro: "Só é possível restaurar ações do personagem atual."
    };
  }

  if (
    tipo !== "acao" &&
    tipo !== "acaoBonus"
  ) {
    return { erro: "Tipo de ação inválido." };
  }

  const estavaDisponivel = batalha.acoes[tipo];

  batalha.acoes[tipo] = true;

  registrarEvento(
    id,
    "restauracao_mestre",
    `O Mestre restaurou ${tipo} de ${nome}.`,
    {
      rodada: batalha.rodada,
      personagem: nome,
      tipo,
      estavaDisponivel
    }
  );

  return {
    mensagem: "Ação restaurada pelo Mestre.",
    personagem: nome,
    tipo,
    acoesDisponiveis: { ...batalha.acoes }
  };
}


// ==========================================
// D&D AI v0.5 — RENOMEAR BATALHA
// ==========================================

function renomearBatalha(idAtual, novoId) {
  if (
    typeof novoId !== "string" ||
    !novoId.trim()
  ) {
    return { erro: "Informe um novo ID válido." };
  }

  novoId = novoId.trim();

  const batalha = batalhas.get(idAtual);

  if (!batalha) {
    return { erro: "Batalha não encontrada." };
  }

  if (idAtual === novoId) {
    return { erro: "O novo ID é igual ao atual." };
  }

  if (batalhas.has(novoId)) {
    return {
      erro: "Já existe uma batalha com esse ID."
    };
  }

  // Preservar os eventos anteriores
  const eventos = obterHistorico(idAtual).map(
    evento => ({
      ...evento,
      dados: { ...evento.dados }
    })
  );

  // Atualizar a batalha
  batalha.id = novoId;

  batalhas.delete(idAtual);
  batalhas.set(novoId, batalha);

  // Transferir o histórico
  const historicos = obterTodosHistoricos();

  historicos.delete(idAtual);
  historicos.set(novoId, eventos);

  registrarEvento(
    novoId,
    "renomear_batalha",
    `Batalha renomeada de ${idAtual} para ${novoId}.`,
    { idAnterior: idAtual, novoId }
  );

  return {
    mensagem: "Batalha renomeada com sucesso.",
    idAnterior: idAtual,
    novoId
  };
}

// ==========================================
// D&D AI v0.5 — EXCLUIR BATALHA
// ==========================================

function excluirBatalha(id) {
  if (!batalhas.has(id)) {
    return { erro: "Batalha não encontrada." };
  }

  batalhas.delete(id);
  limparHistorico(id);

  return {
    mensagem: "Batalha excluída com sucesso.",
    id
  };
}

function determinarTipoRolagemAtaque(
  participante,
  ataque,
  possuiVantagem = false,
  possuiDesvantagem = false
) {
  const restricoes =
    consultarRestricoesParticipante(participante);

  const atributoAfetado =
    ataque?.atributo === "forca" ||
    ataque?.atributo === "destreza";

  const desvantagemArmadura =
    restricoes.desvantagemForcaDestreza === true &&
    atributoAfetado;

  const vantagem = possuiVantagem === true;

  const desvantagem =
    possuiDesvantagem === true ||
    desvantagemArmadura;

  let tipo = "normal";

  if (vantagem && !desvantagem) {
    tipo = "vantagem";
  } else if (desvantagem && !vantagem) {
    tipo = "desvantagem";
  }

  return {
    tipoRolagem: tipo,
    desvantagemArmadura,
    restricoesStatus: restricoes.status
  };
}

module.exports = {
  criarBatalha: executarESalvar(criarBatalha),
  obterBatalha,
  consultarHistorico,
  listarBatalhas,
  proximoTurno: executarESalvar(proximoTurno),
  aplicarDano: executarESalvar(aplicarDano),
  atacarNaBatalha: executarESalvar(atacarNaBatalha),
  usarAcaoBonus: executarESalvar(usarAcaoBonus),
  usarReacao: executarESalvar(usarReacao),
  moverPersonagem: executarESalvar(moverPersonagem),
  ajustarRecursosMestre: executarESalvar(ajustarRecursosMestre),
  curarPersonagem: executarESalvar(curarPersonagem),
  restaurarAcaoMestre: executarESalvar(restaurarAcaoMestre),
  renomearBatalha: executarESalvar(renomearBatalha),
excluirBatalha: executarESalvar(excluirBatalha),
consultarRestricoesParticipante,
determinarTipoRolagemAtaque
};
