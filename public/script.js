
// D&D AI — Interface de combate

let batalhaAtiva = null;

const $ = (id) => document.getElementById(id);

// Comunicação com o servidor
async function requisicao(rota, metodo = "GET", dados) {
  const opcoes = { method: metodo };

  if (dados !== undefined) {
    opcoes.headers = {
      "Content-Type": "application/json"
    };
    opcoes.body = JSON.stringify(dados);
  }

  const resposta = await fetch(rota, opcoes);
  const resultado = await resposta.json();

  if (!resposta.ok || resultado.erro) {
    throw new Error(
      resultado.erro || "Erro na comunicação."
    );
  }

  return resultado;
}

// Registrar eventos
function registrar(mensagem, dados = null) {
  const horario = new Date().toLocaleTimeString("pt-BR");

  const detalhes = dados
    ? "\n" + JSON.stringify(dados, null, 2)
    : "";

  $("log").textContent =
    `[${horario}] ${mensagem}${detalhes}\n\n` +
    $("log").textContent;
}

// Executar uma ação e atualizar a tela
async function executar(rota, dados, mensagem) {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  try {
    const resultado = await requisicao(
      rota,
      "POST",
      dados
    );

    registrar(mensagem, resultado);

if (mensagem === "Ataque realizado.") {
  animarDado(resultado);
}

await carregarBatalha(batalhaAtiva.id);
  } catch (erro) {
    registrar("Erro: " + erro.message);
  }
}

// Criar batalha
$("criarBatalha").addEventListener("click", async () => {
  try {
    const id = $("batalhaId").value.trim();
    const participantes = JSON.parse(
      $("participantes").value
    );

    if (!id) {
      throw new Error("Informe o ID da batalha.");
    }

    const resultado = await requisicao(
      "/batalha/criar",
      "POST",
      { id, participantes }
    );

    registrar("Batalha criada!", resultado);
    await carregarBatalha(id);
  } catch (erro) {
    registrar("Erro ao criar batalha: " + erro.message);
  }
});

// Carregar batalha
async function carregarBatalha(id) {
  if (!id) {
    registrar("Informe o ID da batalha.");
    return;
  }

  try {
    const batalha = await requisicao(
      `/batalha/${encodeURIComponent(id)}`
    );

    batalhaAtiva = batalha;
$("batalhaAtual").value = id;

renderizarBatalha();
await carregarHistorico(id);
  } catch (erro) {
    registrar("Erro ao carregar: " + erro.message);
  }
}

$("carregar").addEventListener("click", () => {
  carregarBatalha($("batalhaAtual").value.trim());
});

$("atualizar").addEventListener("click", () => {
  if (batalhaAtiva) {
    carregarBatalha(batalhaAtiva.id);
  } else {
    registrar("Nenhuma batalha carregada.");
  }
});

// Mostrar personagens e recursos
function renderizarBatalha() {
  const batalha = batalhaAtiva;

  if (!batalha) return;

  const atual = batalha.participantes[batalha.turno];

  $("resumo").textContent =
    `Batalha: ${batalha.id} | ` +
    `Rodada: ${batalha.rodada} | ` +
    `Turno: ${atual.nome} | ` +
    `Ação: ${batalha.acoes.acao ? "Disponível" : "Usada"} | ` +
    `Ação bônus: ${
      batalha.acoes.acaoBonus ? "Disponível" : "Usada"
    }`;

  const container = $("personagens");
  container.replaceChildren();

  batalha.participantes.forEach((personagem) => {
    const card = document.createElement("div");

    card.className = "character-card";

    if (personagem.nome === atual.nome) {
      card.classList.add("active");
    }

    const nome = document.createElement("h4");
    nome.textContent = personagem.nome;

    const informacoes = document.createElement("p");
    informacoes.textContent =
      `CA: ${personagem.ca} | ` +
      `Iniciativa: ${personagem.iniciativa}`;

    const vida = document.createElement("p");
    vida.textContent =
      `PV: ${personagem.pv}/${personagem.pvMaximo}`;

    const barra = document.createElement("div");
    barra.className = "hp-track";

    const preenchimento = document.createElement("div");
    preenchimento.className = "hp-fill";

    const porcentagem = personagem.pvMaximo > 0
      ? (personagem.pv / personagem.pvMaximo) * 100
      : 0;

    preenchimento.style.width =
      `${Math.max(0, Math.min(100, porcentagem))}%`;

    barra.appendChild(preenchimento);

    const recursos = document.createElement("p");
    recursos.textContent =
      `Movimento: ${personagem.movimentoRestante}m | ` +
      `Reação: ${
        personagem.reacaoDisponivel ? "Disponível" : "Usada"
      }`;

    card.append(nome, informacoes, vida, barra, recursos);
    container.appendChild(card);
  });

  atualizarSeletores();
  atualizarPersonagensMestre();
}

// Atualizar seletores de personagem e alvo
function atualizarSeletores() {
  const personagemSelecionado = $("personagem").value;
  const alvoSelecionado = $("alvo").value;

  $("personagem").replaceChildren();
  $("alvo").replaceChildren();

  batalhaAtiva.participantes.forEach((p) => {
    const opcaoPersonagem = new Option(p.nome, p.nome);
    const opcaoAlvo = new Option(p.nome, p.nome);

    $("personagem").add(opcaoPersonagem);
    $("alvo").add(opcaoAlvo);
  });

  const nomes = batalhaAtiva.participantes.map(
    p => p.nome
  );

  const atual = batalhaAtiva.participantes[
    batalhaAtiva.turno
  ].nome;

  $("personagem").value = nomes.includes(
    personagemSelecionado
  ) ? personagemSelecionado : atual;

  const alvoPadrao = nomes.find(
    nome => nome !== $("personagem").value
  );

  $("alvo").value = nomes.includes(alvoSelecionado)
    ? alvoSelecionado
    : (alvoPadrao || atual);
}

// Avançar turno
$("proximoTurno").addEventListener("click", () => {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/proximo`,
    {},
    "Turno avançado."
  );
});

// Atacar
$("atacar").addEventListener("click", () => {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  const ataque = {
    bonusAtaque: Number($("bonusAtaque").value),
    quantidadeDados: Number($("quantidadeDados").value),
    ladosDado: Number($("ladosDado").value),
    bonusDano: Number($("bonusDano").value)
  };

  executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/atacar`,
    {
      atacante: $("personagem").value,
      alvo: $("alvo").value,
      ataque
    },
    "Ataque realizado."
  );
});

// Ação bônus
$("acaoBonus").addEventListener("click", () => {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/acao-bonus`,
    { nome: $("personagem").value },
    "Ação bônus utilizada."
  );
});

// Reação
$("reacao").addEventListener("click", () => {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/reacao`,
    { nome: $("personagem").value },
    "Reação utilizada."
  );
});

// Movimento
$("mover").addEventListener("click", () => {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/mover`,
    {
      nome: $("personagem").value,
      distancia: Number($("distancia").value)
    },
    "Movimento realizado."
  );
});

registrar("Interface D&D AI inicializada.");

// Carregar histórico da batalha
async function carregarHistorico(id) {
  try {
    const resultado = await requisicao(
      `/batalha/${encodeURIComponent(id)}/historico`
    );

    const eventos = resultado.eventos;

    if (eventos.length === 0) {
      $("log").textContent =
        "Nenhum acontecimento registrado.";
      return;
    }

    const linhas = eventos.map((evento) => {
      const horario = new Date(
        evento.horario
      ).toLocaleTimeString("pt-BR");

      let detalhes = "";

      if (evento.tipo === "ataque") {
        const d = evento.dados;

        detalhes =
          `\n  D20: ${d.d20}` +
          ` | Total: ${d.totalAtaque}` +
          ` | CA: ${d.classeArmadura}` +
          ` | Dano: ${d.dano}` +
          (d.critico ? " | CRÍTICO!" : "");
      }

      return `[${horario}] ${evento.descricao}${detalhes}`;
    });

    $("log").textContent = linhas.reverse().join("\n\n");

  } catch (erro) {
    registrar("Erro ao carregar histórico: " + erro.message);
  }
}

// Animação do D20 após um ataque
function animarDado(resultado) {
  const dado = document.getElementById("d20");
  const valor = document.getElementById("diceValue");
  const status = document.getElementById("diceStatus");
  const detalhes = document.getElementById("diceDetails");

  if (!dado || !valor || !status || !detalhes) {
    return;
  }

  const numero = resultado.dado;

  if (!Number.isInteger(numero)) {
    return;
  }

  // Reiniciar animação
  dado.classList.remove(
    "rolling",
    "critical",
    "failure"
  );

  void dado.offsetWidth;

  valor.textContent = numero;
  dado.classList.add("rolling");

  if (numero === 20) {
    dado.classList.add("critical");
    status.textContent = "⚔️ ACERTO CRÍTICO!";
  } else if (numero === 1) {
    dado.classList.add("failure");
    status.textContent = "💀 FALHA NATURAL!";
  } else if (resultado.acertou) {
    status.textContent = "⚔️ Ataque acertou!";
  } else {
    status.textContent = "🛡️ Ataque errou!";
  }

  detalhes.textContent =
    `D20: ${numero} | ` +
    `Bônus: ${resultado.bonusAtaque} | ` +
    `Total: ${resultado.totalAtaque} | ` +
    `CA do alvo: ${resultado.classeArmadura} | ` +
    `Dano: ${resultado.dano}`;

  dado.addEventListener(
    "animationend",
    () => dado.classList.remove("rolling"),
    { once: true }
  );
}

// D&D AI — Painel avançado do Mestre

// Alternar campos conforme o tipo de ajuste
$("mestreTipo").addEventListener("change", () => {
  const tipo = $("mestreTipo").value;

  $("mestreValorContainer").style.display =
    tipo === "reacaoDisponivel" ? "none" : "";

  $("mestreReacaoContainer").style.display =
    tipo === "reacaoDisponivel" ? "" : "none";
});

// Atualizar personagens do painel do Mestre
function atualizarPersonagensMestre() {
  if (!batalhaAtiva) return;

  const seletor = $("mestrePersonagem");
  const selecionado = seletor.value;

  seletor.replaceChildren();

  batalhaAtiva.participantes.forEach((p) => {
    seletor.add(new Option(p.nome, p.nome));
  });

  if (
    batalhaAtiva.participantes.some(
      p => p.nome === selecionado
    )
  ) {
    seletor.value = selecionado;
  }
}

// Aplicar ajuste
$("mestreAplicar").addEventListener("click", async () => {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  const nome = $("mestrePersonagem").value;
  const tipo = $("mestreTipo").value;

  let valor;

  if (tipo === "reacaoDisponivel") {
    valor = $("mestreReacao").value === "true";
  } else {
    const texto = $("mestreValor").value.trim();

    if (texto === "") {
      registrar("Informe um valor para o ajuste.");
      return;
    }

    valor = Number(texto);

    if (
      !Number.isFinite(valor) ||
      valor < 0 ||
      (tipo === "pv" && !Number.isInteger(valor))
    ) {
      registrar("Valor de ajuste inválido.");
      return;
    }
  }

  const confirmado = confirm(
    `Aplicar ajuste em ${nome}?\n` +
    `${tipo}: ${valor}`
  );

  if (!confirmado) return;

  await executar(
    `/batalha/${encodeURIComponent(
      batalhaAtiva.id
    )}/mestre/ajustar`,
    {
      nome,
      ajustes: {
        [tipo]: valor
      }
    },
    `O Mestre ajustou ${tipo} de ${nome}.`
  );
});

// D&D AI — Intervenções rápidas do Mestre

function obterDadosIntervencao() {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return null;
  }

  const nome = $("mestrePersonagem").value;

  if (!nome) {
    registrar("Selecione um personagem.");
    return null;
  }

  const quantidade = Number($("mestreQuantidade").value);

  if (
    $("mestreQuantidade").value.trim() === "" ||
    !Number.isInteger(quantidade) ||
    quantidade <= 0
  ) {
    registrar("Informe uma quantidade inteira maior que zero.");
    return null;
  }

  return { nome, quantidade };
}

// Cura rápida
$("mestreCurar").addEventListener("click", async () => {
  const dados = obterDadosIntervencao();
  if (!dados) return;

  await executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/mestre/curar`,
    dados,
    `O Mestre curou ${dados.nome}.`
  );
});

// Dano rápido
$("mestreDano").addEventListener("click", async () => {
  const dados = obterDadosIntervencao();
  if (!dados) return;

  // Reutiliza a rota de dano já existente.
  await executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/dano`,
    {
      nome: dados.nome,
      dano: dados.quantidade
    },
    `O Mestre aplicou dano em ${dados.nome}.`
  );
});

// Restaurar ação principal ou bônus
async function restaurarAcao(tipo) {
  if (!batalhaAtiva) {
    registrar("Carregue uma batalha primeiro.");
    return;
  }

  const nome = $("mestrePersonagem").value;

  if (!nome) {
    registrar("Selecione um personagem.");
    return;
  }

  const atual =
    batalhaAtiva.participantes[batalhaAtiva.turno];

  if (atual.nome !== nome) {
    registrar(
      "Selecione o personagem que está no turno atual."
    );
    return;
  }

  await executar(
    `/batalha/${encodeURIComponent(batalhaAtiva.id)}/mestre/restaurar-acao`,
    { nome, tipo },
    `O Mestre restaurou ${tipo} de ${nome}.`
  );
}

$("mestreRestaurarAcao").addEventListener(
  "click",
  () => restaurarAcao("acao")
);

$("mestreRestaurarBonus").addEventListener(
  "click",
  () => restaurarAcao("acaoBonus")
);

// ==========================================
// D&D AI v0.5 — GERENCIADOR DE BATALHAS
// ==========================================

async function listarBatalhasSalvas() {
  const container = $("listaBatalhas");

  container.textContent = "Carregando batalhas...";

  try {
    const resultado = await requisicao("/batalhas");

    container.replaceChildren();

    if (resultado.batalhas.length === 0) {
      container.textContent =
        "Nenhuma batalha salva encontrada.";
      return;
    }

    resultado.batalhas.forEach(batalha => {
      const card = document.createElement("div");
      card.className = "saved-battle-card";

      const titulo = document.createElement("h4");
      titulo.textContent = batalha.id;

      const rodada = document.createElement("p");
      rodada.textContent =
        `Rodada: ${batalha.rodada}`;

      const participantes = document.createElement("p");
      participantes.textContent =
        `Participantes: ${batalha.quantidadeParticipantes}`;

      const turno = document.createElement("p");
      turno.textContent =
        `Turno atual: ${batalha.turnoAtual || "Nenhum"}`;

      const botao = document.createElement("button");
      botao.className = "primary";
      botao.textContent = "▶ Continuar batalha";

      botao.addEventListener("click", async () => {
        await carregarBatalha(batalha.id);

        document.getElementById("resumo")
          .scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
      });

      
// Botão para renomear
const botaoRenomear = document.createElement("button");
botaoRenomear.className = "secondary";
botaoRenomear.textContent = "✏️ Renomear";

botaoRenomear.addEventListener("click", async () => {
  const novoId = prompt(
    "Novo nome da batalha:",
    batalha.id
  );

  if (novoId === null) return;

  if (!novoId.trim()) {
    registrar("O nome da batalha não pode ficar vazio.");
    return;
  }

  try {
    const resultado = await requisicao(
      `/batalha/${encodeURIComponent(batalha.id)}/renomear`,
      "PATCH",
      { novoId: novoId.trim() }
    );

    registrar("Batalha renomeada.", resultado);

    if (batalhaAtiva?.id === batalha.id) {
      await carregarBatalha(resultado.novoId);
    }

    await listarBatalhasSalvas();
  } catch (erro) {
    registrar("Erro ao renomear: " + erro.message);
  }
});

// Botão para excluir
const botaoExcluir = document.createElement("button");
botaoExcluir.className = "secondary";
botaoExcluir.textContent = "🗑️ Excluir";

botaoExcluir.addEventListener("click", async () => {
  const confirmado = confirm(
    `Excluir permanentemente a batalha "${batalha.id}"?\n` +
    "Essa ação também apagará seu histórico."
  );

  if (!confirmado) return;

  try {
    const resultado = await requisicao(
      `/batalha/${encodeURIComponent(batalha.id)}`,
      "DELETE"
    );

    registrar("Batalha excluída.", resultado);

    if (batalhaAtiva?.id === batalha.id) {
      batalhaAtiva = null;

      $("batalhaAtual").value = "";
      $("resumo").textContent =
        "Nenhuma batalha carregada.";

      $("personagens").replaceChildren();
      $("personagem").replaceChildren();
      $("alvo").replaceChildren();
    }

    await listarBatalhasSalvas();
  } catch (erro) {
    registrar("Erro ao excluir: " + erro.message);
  }
});

card.append(
  titulo,
  rodada,
  participantes,
  turno,
  botao,
  botaoRenomear,
  botaoExcluir
);


      container.appendChild(card);
    });

  } catch (erro) {
    container.textContent =
      "Erro ao carregar batalhas.";

    registrar(
      "Erro ao listar batalhas: " + erro.message
    );
  }
}

$("listarBatalhas").addEventListener(
  "click",
  listarBatalhasSalvas
);

// Carregar a lista ao abrir o aplicativo
listarBatalhasSalvas();

// ==========================================
// D&D AI v0.6 — CADASTRO DE PERSONAGENS
// ==========================================

$("formPersonagem").addEventListener(
  "submit",
  async (evento) => {
    evento.preventDefault();

    const mensagem = $("charMensagem");
    const botao = $("formPersonagem")
      .querySelector('button[type="submit"]');

    const dados = {
      nome: $("charNome").value.trim(),
      raca: $("charRaca").value.trim(),
      classe: $("charClasse").value.trim(),
      nivel: Number($("charNivel").value),

      atributos: {
        forca: Number($("charForca").value),
        destreza: Number($("charDestreza").value),
        constituicao: Number(
          $("charConstituicao").value
        ),
        inteligencia: Number(
          $("charInteligencia").value
        ),
        sabedoria: Number($("charSabedoria").value),
        carisma: Number($("charCarisma").value)
      },

      pvMaximo: Number($("charPV").value),
      ca: Number($("charCA").value),
      deslocamento: Number(
        $("charDeslocamento").value
      )
    };

    botao.disabled = true;
    mensagem.textContent = "Salvando personagem...";

    try {
      const resultado = await requisicao(
        "/personagens",
        "POST",
        dados
      );

      mensagem.textContent =
        `✓ ${resultado.personagem.nome} ` +
        "foi cadastrado com sucesso!";

      registrar(
        "Personagem cadastrado.",
        resultado
      );
await carregarBibliotecaPersonagens();
await carregarSelecaoPersonagensBatalha();
      $("formPersonagem").reset();

    } catch (erro) {
      mensagem.textContent =
        "Erro ao cadastrar: " + erro.message;

      registrar(
        "Erro ao cadastrar personagem: " +
        erro.message
      );

    } finally {
      botao.disabled = false;
    }
  }
);

// ==========================================
// D&D AI v0.6 — BIBLIOTECA DE PERSONAGENS
// ==========================================

function formatarModificador(valor) {
  return valor >= 0 ? `+${valor}` : String(valor);
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);

  if (classe) {
    elemento.className = classe;
  }

  if (texto !== undefined) {
    elemento.textContent = String(texto);
  }

  return elemento;
}

function criarCartaoPersonagem(personagem) {
  const card = criarElemento(
    "article",
    "character-sheet-card"
  );

  const nome = criarElemento(
    "h4",
    "",
    personagem.nome
  );

  const subtitulo = criarElemento(
    "p",
    "character-sheet-subtitle",
    `${personagem.raca} • ${personagem.classe} • ` +
    `Nível ${personagem.nivel}`
  );

  const stats = criarElemento(
    "div",
    "character-sheet-stats"
  );

  const dadosCombate = [
    ["PV", `${personagem.pvAtual ?? personagem.pvMaximo ?? "—"}/${personagem.pvMaximo ?? "—"}`],
    ["CA", personagem.ca ?? "—"],
    [
      "Proficiência",
      personagem.bonusProficiencia !== undefined
        ? formatarModificador(personagem.bonusProficiencia)
        : "—"
    ]
  ];

  for (const [rotulo, valor] of dadosCombate) {
    const bloco = criarElemento(
      "div",
      "character-sheet-stat"
    );

    bloco.append(
      criarElemento("strong", "", valor),
      criarElemento("span", "", rotulo)
    );

    stats.appendChild(bloco);
  }

  const atributos = criarElemento(
    "div",
    "character-sheet-attributes"
  );

  const listaAtributos = [
    ["FOR", "forca"],
    ["DES", "destreza"],
    ["CON", "constituicao"],
    ["INT", "inteligencia"],
    ["SAB", "sabedoria"],
    ["CAR", "carisma"]
  ];

  for (const [sigla, chave] of listaAtributos) {
    const valor = personagem.atributos?.[chave];

    const modificador = Number.isInteger(valor)
      ? Math.floor((valor - 10) / 2)
      : null;

    const bloco = criarElemento(
      "div",
      "character-sheet-attribute"
    );

    bloco.append(
      criarElemento("span", "", sigla),
      criarElemento(
        "strong",
        "",
        valor ?? "—"
      ),
      criarElemento(
        "small",
        "",
        modificador === null
          ? "—"
          : formatarModificador(modificador)
      )
    );

    atributos.appendChild(bloco);
  }

  
const botaoFicha = criarElemento(
  "button",
  "secondary",
  "📜 Ver Ficha Completa"
);

botaoFicha.type = "button";
botaoFicha.style.marginTop = "18px";
botaoFicha.style.width = "100%";

botaoFicha.addEventListener("click", () => {
  abrirFichaDetalhada(personagem.id);
});


const botaoEditar = criarElemento(
  "button",
  "secondary",
  "✏️ Editar Ficha"
);

botaoEditar.type = "button";

botaoEditar.addEventListener("click", () => {
  abrirEditorPersonagem(personagem.id);
});

const acoes = criarElemento(
  "div",
  "character-sheet-actions"
);

acoes.append(botaoFicha, botaoEditar);

card.append(
  nome,
  subtitulo,
  stats,
  atributos,
  acoes
);



  return card;
}

async function carregarBibliotecaPersonagens() {
  const container = $("bibliotecaPersonagens");
  const status = $("bibliotecaStatus");

  status.textContent = "Carregando personagens...";

  try {
    const resultado = await requisicao("/personagens");

    container.replaceChildren();

    if (resultado.personagens.length === 0) {
      status.textContent =
        "Nenhum personagem cadastrado.";
      return;
    }

    for (const personagem of resultado.personagens) {
      container.appendChild(
        criarCartaoPersonagem(personagem)
      );
    }

    status.textContent =
      `${resultado.personagens.length} ` +
      "personagem(ns) encontrado(s).";

  } catch (erro) {
    status.textContent =
      "Erro ao carregar biblioteca: " +
      erro.message;
  }
}

$("atualizarBiblioteca").addEventListener(
  "click",
  carregarBibliotecaPersonagens
);

carregarBibliotecaPersonagens();

// ==========================================
// D&D AI v0.6 — FICHA DETALHADA
// ==========================================

async function abrirFichaDetalhada(id) {
  try {
    const personagem = await requisicao(
      `/personagens/${encodeURIComponent(id)}`
    );

const proficienciasArmadura = {
  leves: personagem.proficienciasArmadura?.leves ?? false,
  medias: personagem.proficienciasArmadura?.medias ?? false,
  pesadas: personagem.proficienciasArmadura?.pesadas ?? false,
  escudos: personagem.proficienciasArmadura?.escudos ?? false
};

let caEquipamentos = null;

try {
  caEquipamentos = await requisicao(
    `/personagens/${encodeURIComponent(id)}/ca-equipamentos`
  );
} catch (erroCA) {
  console.warn(
    "Não foi possível calcular a CA dos equipamentos:",
    erroCA.message
  );
}

let deslocamentoEquipamentos = null;

try {
  deslocamentoEquipamentos = await requisicao(
    `/personagens/${encodeURIComponent(id)}/deslocamento-equipamentos`
  );
} catch (erroDeslocamento) {
  console.warn(
    "Não foi possível calcular o deslocamento:",
    erroDeslocamento.message
  );
}

let verificacaoProficiencias = null;

try {
  verificacaoProficiencias = await requisicao(
    `/personagens/${encodeURIComponent(id)}/verificar-proficiencias`
  );
} catch (erro) {
  console.warn(
    "Não foi possível verificar as proficiências:",
    erro.message
  );
}

    const painel = $("painelFichaDetalhada");
    const conteudo = $("conteudoFichaDetalhada");

    conteudo.replaceChildren();

    const cabecalho = criarElemento(
      "div",
      "character-detail-header"
    );

    cabecalho.append(
      criarElemento("h4", "", personagem.nome),
      criarElemento(
        "p",
        "",
        `${personagem.raca} • ${personagem.classe} • ` +
        `Nível ${personagem.nivel}`
      )
    );

    const informacoes = criarElemento(
      "div",
      "character-detail-info"
    );

    const campos = [
      [
        "Pontos de Vida",
        `${personagem.pvAtual ?? personagem.pvMaximo ?? "—"}/` +
        `${personagem.pvMaximo ?? "—"}`
      ],
      ["Classe de Armadura", personagem.ca ?? "—"],

[
  "CA dos Equipamentos",
  caEquipamentos?.caCalculada ?? "Não calculada"
],

      [
        "Proficiência",
        personagem.bonusProficiencia == null
          ? "—"
          : formatarModificador(
              personagem.bonusProficiencia
            )
      ],
      [
        "Deslocamento",
        personagem.deslocamento == null
          ? "—"
          : `${personagem.deslocamento} m`
      ],

[
  "Deslocamento com Equipamentos",
  deslocamentoEquipamentos?.deslocamentoCalculado == null
    ? "Não calculado"
    : `${deslocamentoEquipamentos.deslocamentoCalculado} m`
],

      [
        "Regras",
        personagem.versaoRegras ?? "Não informado"
      ]
    ];

    for (const [rotulo, valor] of campos) {
      const bloco = document.createElement("div");

      bloco.append(
        criarElemento("strong", "", valor),
        criarElemento("span", "", rotulo)
      );

      informacoes.appendChild(bloco);
    }

const editorProficiencias =
  criarEditorProficienciasArmadura(
    proficienciasArmadura,
    personagem.id
  );

informacoes.appendChild(editorProficiencias);

const avisosProficiencias =
  criarAvisosProficiencias(verificacaoProficiencias);

informacoes.appendChild(avisosProficiencias);

    const tituloAtributos = criarElemento(
      "h5",
      "",
      "Atributos e Modificadores"
    );

    const atributos = criarElemento(
      "div",
      "character-sheet-attributes"
    );

    const lista = [
      ["Força", "forca"],
      ["Destreza", "destreza"],
      ["Constituição", "constituicao"],
      ["Inteligência", "inteligencia"],
      ["Sabedoria", "sabedoria"],
      ["Carisma", "carisma"]
    ];

    for (const [nome, chave] of lista) {
      const valor = personagem.atributos?.[chave];

      const modificador = Number.isInteger(valor)
        ? Math.floor((valor - 10) / 2)
        : null;

      const bloco = criarElemento(
        "div",
        "character-sheet-attribute"
      );

      bloco.append(
        criarElemento("span", "", nome),
        criarElemento("strong", "", valor ?? "—"),
        criarElemento(
          "small",
          "",
          modificador === null
            ? "—"
            : formatarModificador(modificador)
        )
      );

      atributos.appendChild(bloco);
    }

const secaoInventario = criarElemento(
  "div",
  "character-inventory"
);

const tituloInventario = criarElemento(
  "h5",
  "",
  "Inventário"
);

secaoInventario.appendChild(tituloInventario);

const formularioItem = document.createElement("form");
formularioItem.className = "inventory-add-form";

const campoNome = document.createElement("input");
campoNome.type = "text";
campoNome.placeholder = "Nome do item";
campoNome.required = true;

const campoTipo = document.createElement("select");


for (const tipo of [
  "arma",
  "armadura",
  "escudo",
  "consumivel",
  "equipamento",
  "outros"
]) {

  const opcao = document.createElement("option");
  opcao.value = tipo;
  opcao.textContent = tipo;
  campoTipo.appendChild(opcao);
}

const campoQuantidade = document.createElement("input");
campoQuantidade.type = "number";
campoQuantidade.min = "1";
campoQuantidade.step = "1";
campoQuantidade.value = "1";
campoQuantidade.required = true;

const botaoAdicionar = document.createElement("button");
botaoAdicionar.type = "submit";
botaoAdicionar.textContent = "Adicionar Item";

const mensagemItem = criarElemento("p", "", "");

formularioItem.append(
  campoNome,
  campoTipo,
  campoQuantidade,
  botaoAdicionar
);

secaoInventario.append(
  formularioItem,
  mensagemItem
);

formularioItem.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  botaoAdicionar.disabled = true;
  mensagemItem.textContent = "Adicionando item...";

  try {
    await requisicao(
      `/personagens/${encodeURIComponent(id)}/inventario`,
      "POST",
      {
        nome: campoNome.value.trim(),
        tipo: campoTipo.value,
        quantidade: Number(campoQuantidade.value)
      }
    );

    await abrirFichaDetalhada(id);

  } catch (erro) {
    mensagemItem.textContent = `Erro: ${erro.message}`;
  } finally {
    botaoAdicionar.disabled = false;
  }
});

const inventario = Array.isArray(personagem.inventario)
  ? personagem.inventario
  : [];

if (inventario.length === 0) {
  secaoInventario.appendChild(
    criarElemento(
      "p",
      "",
      "Este personagem ainda não possui itens."
    )
  );
} else {
  
for (const item of inventario) {
  const linha = criarElemento(
    "div",
    "character-inventory-item"
  );

  const nomeItem = criarElemento(
    "strong",
    "",
    item.nome
  );

  const detalhesItem = criarElemento(
    "span",
    "",
    `Tipo: ${item.tipo || "outros"} | Quantidade: ${item.quantidade}`
  );

  const controles = criarElemento(
    "div",
    "inventory-remove-controls"
  );

  const campoRemover = document.createElement("input");
  campoRemover.type = "number";
  campoRemover.min = "1";
  campoRemover.max = String(item.quantidade);
  campoRemover.step = "1";
  campoRemover.value = "1";
  campoRemover.setAttribute(
    "aria-label",
    `Quantidade a remover de ${item.nome}`
  );

  const botaoRemover = document.createElement("button");
  botaoRemover.type = "button";
  botaoRemover.textContent = "Remover";
  botaoRemover.className = "inventory-remove-button";

  const mensagemRemocao = criarElemento("p", "", "");

  botaoRemover.addEventListener("click", async () => {
    const quantidade = Number(campoRemover.value);

    if (
      campoRemover.value.trim() === "" ||
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > item.quantidade
    ) {
      mensagemRemocao.textContent =
        "Informe uma quantidade válida.";
      return;
    }

    const confirmar = window.confirm(
      `Remover ${quantidade} unidade(s) de ${item.nome}?`
    );

    if (!confirmar) return;

    botaoRemover.disabled = true;
    mensagemRemocao.textContent = "Removendo...";

    try {
      await requisicao(
        `/personagens/${encodeURIComponent(id)}/inventario/${encodeURIComponent(item.id)}`,
        "DELETE",
        { quantidade }
      );

      await abrirFichaDetalhada(id);

    } catch (erro) {
      mensagemRemocao.textContent =
        `Erro: ${erro.message}`;

      botaoRemover.disabled = false;
    }
  });

const tiposEquipaveis = ["arma", "armadura", "escudo"];

if (tiposEquipaveis.includes(item.tipo)) {
  const botaoEquipamento = document.createElement("button");

  botaoEquipamento.type = "button";
  botaoEquipamento.className = "inventory-equip-button";

  botaoEquipamento.textContent = item.equipado
    ? "Desequipar"
    : "Equipar";

  const mensagemEquipamento = criarElemento("p", "", "");

  botaoEquipamento.addEventListener("click", async () => {
    const equipar = item.equipado !== true;

    botaoEquipamento.disabled = true;
    mensagemEquipamento.textContent = equipar
      ? "Equipando..."
      : "Desequipando...";

    try {
      await requisicao(
        `/personagens/${encodeURIComponent(id)}/inventario/${encodeURIComponent(item.id)}/equipar`,
        "PATCH",
        { equipar }
      );

      await abrirFichaDetalhada(id);

    } catch (erro) {
      mensagemEquipamento.textContent =
        `Erro: ${erro.message}`;

      botaoEquipamento.disabled = false;
    }
  });

  controles.appendChild(botaoEquipamento);
  linha.appendChild(mensagemEquipamento);
}

  controles.append(campoRemover, botaoRemover);

  linha.append(
    nomeItem,
    detalhesItem,
    controles,
    mensagemRemocao
  );

  secaoInventario.appendChild(linha);
}



}

    conteudo.append(
      cabecalho,
      informacoes,
      tituloAtributos,
      atributos,
      secaoInventario
    );

    painel.hidden = false;

    painel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (erro) {
    registrar(
      "Erro ao abrir ficha: " + erro.message
    );
  }
  }

$("fecharFicha").addEventListener("click", () => {
  $("painelFichaDetalhada").hidden = true;
});

// ==========================================
// D&D AI v0.6 — EDITOR VISUAL
// ==========================================

let personagemEmEdicao = null;

async function abrirEditorPersonagem(id) {
  try {
    const personagem = await requisicao(
      `/personagens/${encodeURIComponent(id)}`
    );

    // Fichas antigas incompletas precisam ser
    // completadas antes de serem editadas.
    if (!personagem.atributos) {
      registrar(
        "Esta ficha está incompleta. " +
        "Cadastre uma ficha completa para editá-la."
      );
      return;
    }

    personagemEmEdicao = personagem.id;

    const campos = {
      editNome: personagem.nome,
      editRaca: personagem.raca,
      editClasse: personagem.classe,
      editNivel: personagem.nivel,
      editForca: personagem.atributos.forca,
      editDestreza: personagem.atributos.destreza,
      editConstituicao: personagem.atributos.constituicao,
      editInteligencia: personagem.atributos.inteligencia,
      editSabedoria: personagem.atributos.sabedoria,
      editCarisma: personagem.atributos.carisma,
      editPVMaximo: personagem.pvMaximo,
      editPVAtual: personagem.pvAtual ?? personagem.pvMaximo,
      editCA: personagem.ca,
      editDeslocamento: personagem.deslocamento
    };

    for (const [idCampo, valor] of Object.entries(campos)) {
      $(idCampo).value = valor ?? "";
    }

    $("mensagemEditarPersonagem").textContent = "";
    $("painelEditarPersonagem").hidden = false;

    $("painelEditarPersonagem").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (erro) {
    registrar("Erro ao abrir editor: " + erro.message);
  }
}

$("fecharEditorPersonagem").addEventListener(
  "click",
  () => {
    $("painelEditarPersonagem").hidden = true;
    personagemEmEdicao = null;
  }
);

$("formEditarPersonagem").addEventListener(
  "submit",
  async (evento) => {
    evento.preventDefault();

    if (!personagemEmEdicao) return;

    const mensagem = $("mensagemEditarPersonagem");
    const botao = $("formEditarPersonagem")
      .querySelector('button[type="submit"]');

    const dados = {
      nome: $("editNome").value.trim(),
      raca: $("editRaca").value.trim(),
      classe: $("editClasse").value.trim(),
      nivel: Number($("editNivel").value),

      atributos: {
        forca: Number($("editForca").value),
        destreza: Number($("editDestreza").value),
        constituicao: Number($("editConstituicao").value),
        inteligencia: Number($("editInteligencia").value),
        sabedoria: Number($("editSabedoria").value),
        carisma: Number($("editCarisma").value)
      },

      pvMaximo: Number($("editPVMaximo").value),
      pvAtual: Number($("editPVAtual").value),
      ca: Number($("editCA").value),
      deslocamento: Number(
        $("editDeslocamento").value
      )
    };

    if (dados.pvAtual > dados.pvMaximo) {
      mensagem.textContent =
        "Os PV atuais não podem superar os PV máximos.";
      return;
    }

    botao.disabled = true;
    mensagem.textContent = "Salvando alterações...";

    try {
      const id = personagemEmEdicao;

      const resultado = await requisicao(
        `/personagens/${encodeURIComponent(id)}`,
        "PATCH",
        dados
      );

      registrar("Ficha atualizada.", resultado);

      await carregarBibliotecaPersonagens();

      // Se a ficha detalhada estiver aberta,
      // atualizar seus dados também.
      if (!$("painelFichaDetalhada").hidden) {
        await abrirFichaDetalhada(id);
      }

      mensagem.textContent =
        "✓ Personagem atualizado com sucesso!";

      personagemEmEdicao = null;

      $("painelEditarPersonagem").hidden = true;

    } catch (erro) {
      mensagem.textContent =
        "Erro ao salvar: " + erro.message;

      registrar(
        "Erro ao editar personagem: " + erro.message
      );

    } finally {
      botao.disabled = false;
    }
  }
);

// ==========================================
// D&D AI v0.6 — SELEÇÃO VISUAL PARA BATALHA
// ==========================================

async function carregarSelecaoPersonagensBatalha() {
  const container = $("selecaoPersonagensBatalha");
  const mensagem = $("mensagemBatalhaFichas");

  container.replaceChildren();
  mensagem.textContent = "Carregando personagens...";

  try {
    const resultado = await requisicao("/personagens");

    const personagensValidos = resultado.personagens.filter(
      p =>
        typeof p.id === "string" &&
        Number.isInteger(p.pvMaximo) &&
        p.pvMaximo > 0 &&
        Number.isInteger(p.ca) &&
        Number.isFinite(p.deslocamento)
    );

    if (personagensValidos.length === 0) {
      mensagem.textContent =
        "Nenhuma ficha completa disponível.";
      return;
    }

    for (const personagem of personagensValidos) {
      const card = criarElemento(
        "div",
        "battle-character-option"
      );

      card.dataset.personagemId = personagem.id;

      const titulo = criarElemento(
        "h4",
        "",
        personagem.nome
      );

      const descricao = criarElemento(
        "p",
        "",
        `${personagem.raca} • ${personagem.classe} • ` +
        `Nível ${personagem.nivel}`
      );

      const stats = criarElemento(
        "p",
        "",
        `PV ${personagem.pvMaximo} • ` +
        `CA ${personagem.ca} • ` +
        `Deslocamento ${personagem.deslocamento} m`
      );

      const labelSelecao = document.createElement("label");
      const checkbox = document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.className = "battle-character-check";

      labelSelecao.append(
        checkbox,
        document.createTextNode("Participar da batalha")
      );

      const labelIniciativa = document.createElement("label");
      const inputIniciativa = document.createElement("input");

      inputIniciativa.type = "number";
      inputIniciativa.step = "1";
      inputIniciativa.value = "10";
      inputIniciativa.className = "battle-character-initiative";

      labelIniciativa.append(
        document.createTextNode("Iniciativa: "),
        inputIniciativa
      );

      card.append(
        titulo,
        descricao,
        stats,
        labelSelecao,
        labelIniciativa
      );

      container.appendChild(card);
    }

    mensagem.textContent =
      `${personagensValidos.length} ` +
      "personagem(ns) disponível(is).";

  } catch (erro) {
    mensagem.textContent =
      "Erro ao carregar personagens: " + erro.message;
  }
}

$("atualizarSelecaoBatalha").addEventListener(
  "click",
  carregarSelecaoPersonagensBatalha
);

$("criarBatalhaComFichas").addEventListener(
  "click",
  async () => {
    const id = $("novaBatalhaFichasId").value.trim();
    const mensagem = $("mensagemBatalhaFichas");
    const botao = $("criarBatalhaComFichas");

    if (!id) {
      mensagem.textContent =
        "Informe o nome da batalha.";
      return;
    }

    const participantes = [];

    const cards = document.querySelectorAll(
      ".battle-character-option"
    );

    for (const card of cards) {
      const selecionado = card.querySelector(
        ".battle-character-check"
      );

      if (!selecionado.checked) continue;

      const iniciativaCampo = card.querySelector(
        ".battle-character-initiative"
      );

      const texto = iniciativaCampo.value.trim();

      if (
        texto === "" ||
        !Number.isInteger(Number(texto))
      ) {
        mensagem.textContent =
          "Informe iniciativas inteiras para todos " +
          "os personagens selecionados.";
        return;
      }

      participantes.push({
        personagemId: card.dataset.personagemId,
        iniciativa: Number(texto)
      });
    }

    if (participantes.length === 0) {
      mensagem.textContent =
        "Selecione pelo menos um personagem.";
      return;
    }

    botao.disabled = true;
    mensagem.textContent = "Criando batalha...";

    try {
      const resultado = await requisicao(
        "/batalha/criar-com-personagens",
        "POST",
        { id, participantes }
      );

      registrar(
        "Batalha criada com personagens salvos.",
        resultado
      );

      mensagem.textContent =
        "✓ Batalha criada com sucesso!";

      // Carrega automaticamente a nova batalha.
      await carregarBatalha(id);

      // Atualiza a lista de batalhas persistentes.
      await listarBatalhasSalvas();

    } catch (erro) {
      mensagem.textContent =
        "Erro ao criar batalha: " + erro.message;

      registrar(
        "Erro ao criar batalha: " + erro.message
      );

    } finally {
      botao.disabled = false;
    }
  }
);

// Carregar as opções ao abrir o aplicativo.
carregarSelecaoPersonagensBatalha();
function criarEditorProficienciasArmadura(proficiencias, personagemId) {
  const editor = document.createElement("div");
  editor.className = "editor-proficiencias-armadura";

  const titulo = document.createElement("h3");
  titulo.textContent = "Proficiências com Armaduras";
  editor.appendChild(titulo);

  const opcoes = [
    ["leves", "Armaduras leves"],
    ["medias", "Armaduras médias"],
    ["pesadas", "Armaduras pesadas"],
    ["escudos", "Escudos"]
  ];

  for (const [chave, descricao] of opcoes) {
    const label = document.createElement("label");
    label.style.display = "block";
    label.style.marginBottom = "8px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = chave;
    checkbox.checked = proficiencias[chave] === true;

    label.appendChild(checkbox);
    label.appendChild(
      document.createTextNode(` ${descricao}`)
    );

    editor.appendChild(label);
  }

const botaoSalvar = document.createElement("button");
botaoSalvar.type = "button";
botaoSalvar.textContent = "Salvar Proficiências";

const mensagem = document.createElement("p");

botaoSalvar.addEventListener("click", async () => {
  const proficienciasAtualizadas = {};

  for (const chave of ["leves", "medias", "pesadas", "escudos"]) {
    const checkbox = editor.querySelector(
      `input[name="${chave}"]`
    );

    proficienciasAtualizadas[chave] = checkbox.checked;
  }

  botaoSalvar.disabled = true;
  mensagem.textContent = "Salvando proficiências...";

  try {
    const resposta = await fetch(
      `/personagens/${encodeURIComponent(personagemId)}/proficiencias-armadura`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(proficienciasAtualizadas)
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.erro || "Não foi possível salvar."
      );
    }

    mensagem.textContent = "Proficiências salvas com sucesso!";
  } catch (erro) {
    mensagem.textContent = `Erro: ${erro.message}`;
  } finally {
    botaoSalvar.disabled = false;
  }
});

editor.append(botaoSalvar, mensagem);

  return editor;
}


function criarAvisosProficiencias(verificacao) {
  const secao = document.createElement("div");
  secao.className = "avisos-proficiencias";

  const titulo = document.createElement("h3");
  titulo.textContent = "Proficiência dos Equipamentos";
  secao.appendChild(titulo);

  if (!verificacao) {
    const aviso = document.createElement("p");
    aviso.textContent = "Verificação indisponível.";
    secao.appendChild(aviso);
    return secao;
  }

  const equipamentos = verificacao.equipamentos || [];

  if (equipamentos.length === 0) {
    const aviso = document.createElement("p");
    aviso.textContent = "Nenhuma armadura ou escudo equipado.";
    secao.appendChild(aviso);
    return secao;
  }

  const rotulos = {
    proficiente: "Proficiente",
    sem_proficiencia: "Sem proficiência",
    nao_informado: "Não informado"
  };

  for (const item of equipamentos) {
    const linha = document.createElement("p");

    const status = rotulos[item.status] || "Não informado";

    linha.textContent = `${item.nome}: ${status}`;

    linha.className = `proficiencia-${item.status}`;

    secao.appendChild(linha);
  }

  return secao;
}
