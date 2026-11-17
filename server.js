
const express = require("express");

const coordenar = require("./agents/coordinator");
const narrar = require("./agents/narrator");
const interpretarNPC = require("./agents/npcs");

const {
  iniciarCombate,
  realizarAtaque,
} = require("./agents/combat");


const {
  criarBatalha,
  obterBatalha,
  consultarHistorico,
  proximoTurno,
  aplicarDano,
  atacarNaBatalha,
  usarAcaoBonus,
  usarReacao,
  moverPersonagem,
  ajustarRecursosMestre,
  curarPersonagem,
  restaurarAcaoMestre,
  listarBatalhas,
  renomearBatalha,
excluirBatalha
} = require("./agents/battleManager");

const {
  criarPersonagem,
  listarPersonagens,
  buscarPersonagem,
  editarPersonagem,
  adicionarItemPersonagem,
  removerItemPersonagem
} = require("./agents/characterManager");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));


// Ações dos jogadores
app.post("/acao", (req, res) => {
  const { acao } = req.body || {};

  if (typeof acao !== "string" || !acao.trim()) {
    return res.status(400).json({
      erro: "Informe uma ação válida."
    });
  }

  const resultado = coordenar(acao);

  if (resultado.agente === "IA Narradora") {
    return res.json(narrar(acao));
  }

  if (resultado.agente === "IA de NPCs") {
    const tipo = req.body.npc || "taverneiro";
    return res.json(interpretarNPC(acao, tipo));
  }

  return res.json(resultado);
});

// Teste de iniciativa
app.post("/combate/iniciar", (req, res) => {
  const { participantes } = req.body || {};

  if (
    !Array.isArray(participantes) ||
    participantes.length === 0 ||
    participantes.some(p =>
      !p ||
      typeof p.nome !== "string" ||
      !p.nome.trim() ||
      (p.modificadorIniciativa !== undefined &&
        (!Number.isInteger(p.modificadorIniciativa) ||
         Math.abs(p.modificadorIniciativa) > 100))
    )
  ) {
    return res.status(400).json({
      erro: "Participantes inválidos."
    });
  }

  return res.json(iniciarCombate(participantes));
});

// Teste de ataque isolado
app.post("/combate/atacar", (req, res) => {
  const { atacante, alvo, ataque } = req.body || {};

  if (
    !atacante ||
    typeof atacante.nome !== "string" ||
    !alvo ||
    typeof alvo.nome !== "string" ||
    !Number.isInteger(alvo.ca) ||
    !Number.isInteger(alvo.pv) ||
    alvo.pv < 0 ||
    !ataque ||
    !Number.isInteger(ataque.bonusAtaque) ||
    !Number.isInteger(ataque.quantidadeDados) ||
    ataque.quantidadeDados < 1 ||
    ataque.quantidadeDados > 20 ||
    !Number.isInteger(ataque.ladosDado) ||
    ataque.ladosDado < 2 ||
    ataque.ladosDado > 100 ||
    !Number.isInteger(ataque.bonusDano)
  ) {
    return res.status(400).json({
      erro: "Dados de ataque inválidos."
    });
  }

  return res.json(
    realizarAtaque(atacante, alvo, ataque)
  );
});

// Criar batalha
app.post("/batalha/criar", (req, res) => {
  const { id, participantes } = req.body || {};

  if (
    typeof id !== "string" ||
    !id.trim() ||
    !Array.isArray(participantes) ||
    participantes.length === 0 ||
    participantes.some(p =>
      !p ||
      typeof p.nome !== "string" ||
      !p.nome.trim() ||
      !Number.isInteger(p.pv) ||
      p.pv < 0 ||
      !Number.isInteger(p.ca) ||
      !Number.isInteger(p.iniciativa) ||
      (p.deslocamento !== undefined &&
        (typeof p.deslocamento !== "number" ||
         !Number.isFinite(p.deslocamento) ||
         p.deslocamento < 0))
    ) ||
    new Set(participantes.map(p => p.nome)).size !==
      participantes.length
  ) {
    return res.status(400).json({
      erro: "Dados da batalha inválidos."
    });
  }

  const resultado = criarBatalha(id, participantes);

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Consultar batalha
app.get("/batalha/:id", (req, res) => {
  const batalha = obterBatalha(req.params.id);

  if (!batalha) {
    return res.status(404).json({
      erro: "Batalha não encontrada."
    });
  }

  return res.json(batalha);
});

// Avançar turno
app.post("/batalha/:id/proximo", (req, res) => {
  const resultado = proximoTurno(req.params.id);

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Aplicar dano manual
app.post("/batalha/:id/dano", (req, res) => {
  const { nome, dano } = req.body || {};

  if (
    typeof nome !== "string" ||
    !Number.isInteger(dano) ||
    dano < 0
  ) {
    return res.status(400).json({
      erro: "Dados de dano inválidos."
    });
  }

  const resultado = aplicarDano(
    req.params.id,
    nome,
    dano
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Ataque integrado à batalha
app.post("/batalha/:id/atacar", (req, res) => {
  const { atacante, alvo, ataque } = req.body || {};

  if (
    typeof atacante !== "string" ||
    typeof alvo !== "string" ||
    !atacante.trim() ||
    !alvo.trim() ||
    !ataque ||
    !Number.isInteger(ataque.bonusAtaque) ||
    !Number.isInteger(ataque.quantidadeDados) ||
    ataque.quantidadeDados < 1 ||
    ataque.quantidadeDados > 20 ||
    !Number.isInteger(ataque.ladosDado) ||
    ataque.ladosDado < 2 ||
    ataque.ladosDado > 100 ||
    !Number.isInteger(ataque.bonusDano)
  ) {
    return res.status(400).json({
      erro: "Dados de ataque inválidos."
    });
  }

  const resultado = atacarNaBatalha(
    req.params.id,
    atacante,
    alvo,
    ataque
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Usar ação bônus
app.post("/batalha/:id/acao-bonus", (req, res) => {
  const { nome } = req.body || {};

  if (typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({
      erro: "Nome inválido."
    });
  }

  const resultado = usarAcaoBonus(req.params.id, nome);

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Usar reação
app.post("/batalha/:id/reacao", (req, res) => {
  const { nome } = req.body || {};

  if (typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({
      erro: "Nome inválido."
    });
  }

  const resultado = usarReacao(req.params.id, nome);

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Mover personagem
app.post("/batalha/:id/mover", (req, res) => {
  const { nome, distancia } = req.body || {};

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    typeof distancia !== "number" ||
    !Number.isFinite(distancia) ||
    distancia <= 0
  ) {
    return res.status(400).json({
      erro: "Dados de movimento inválidos."
    });
  }

  const resultado = moverPersonagem(
    req.params.id,
    nome,
    distancia
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Ajustes do Mestre - somente protótipo local
app.post("/batalha/:id/mestre/ajustar", (req, res) => {
  const { nome, ajustes } = req.body || {};

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    !ajustes ||
    typeof ajustes !== "object" ||
    Array.isArray(ajustes)
  ) {
    return res.status(400).json({
      erro: "Dados de ajuste inválidos."
    });
  }

  const resultado = ajustarRecursosMestre(
    req.params.id,
    nome,
    ajustes
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});


app.get("/batalha/:id/historico", (req, res) => {
  const resultado = consultarHistorico(req.params.id);

  if (resultado.erro) {
    return res.status(404).json(resultado);
  }

  return res.json(resultado);
});

// Cura rápida do Mestre
app.post("/batalha/:id/mestre/curar", (req, res) => {
  const { nome, quantidade } = req.body || {};

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    !Number.isInteger(quantidade) ||
    quantidade <= 0
  ) {
    return res.status(400).json({
      erro: "Dados de cura inválidos."
    });
  }

  const resultado = curarPersonagem(
    req.params.id,
    nome,
    quantidade
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// Restaurar ações pelo Mestre
app.post("/batalha/:id/mestre/restaurar-acao", (req, res) => {
  const { nome, tipo } = req.body || {};

  if (
    typeof nome !== "string" ||
    !nome.trim() ||
    !["acao", "acaoBonus"].includes(tipo)
  ) {
    return res.status(400).json({
      erro: "Dados de restauração inválidos."
    });
  }

  const resultado = restaurarAcaoMestre(
    req.params.id,
    nome,
    tipo
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

/* ==========================================
   D&D AI v0.5 — LISTAR BATALHAS SALVAS
========================================== */

app.get("/batalhas", (req, res) => {
  try {
    const lista = listarBatalhas();

    return res.json({
      quantidade: lista.length,
      batalhas: lista
    });

  } catch (erro) {
    console.error(
      "Erro ao listar batalhas:",
      erro
    );

    return res.status(500).json({
      erro: "Erro ao listar batalhas salvas."
    });
  }
});

// ==========================================
// D&D AI v0.5 — RENOMEAR BATALHA
// ==========================================

app.patch("/batalha/:id/renomear", (req, res) => {
  const { novoId } = req.body || {};

  const resultado = renomearBatalha(
    req.params.id,
    novoId
  );

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// ==========================================
// D&D AI v0.5 — EXCLUIR BATALHA
// ==========================================

app.delete("/batalha/:id", (req, res) => {
  const resultado = excluirBatalha(req.params.id);

  if (resultado.erro) {
    return res.status(400).json(resultado);
  }

  return res.json(resultado);
});

// ==========================================
// D&D AI v0.6 — PERSONAGENS
// ==========================================

// Criar personagem
app.post("/personagens", (req, res) => {
  try {
    const resultado = criarPersonagem(req.body);

    if (resultado.erro) {
      return res.status(400).json(resultado);
    }

    return res.status(201).json(resultado);
  } catch (erro) {
    console.error("Erro ao criar personagem:", erro);

    return res.status(500).json({
      erro: "Erro interno ao criar personagem."
    });
  }
});

// Listar personagens
app.get("/personagens", (req, res) => {
  try {
    const personagens = listarPersonagens();

    return res.json({
      quantidade: personagens.length,
      personagens
    });
  } catch (erro) {
    console.error("Erro ao listar personagens:", erro);

    return res.status(500).json({
      erro: "Erro interno ao listar personagens."
    });
  }
});

// Consultar personagem pelo ID
app.get("/personagens/:id", (req, res) => {
  try {
    const resultado = buscarPersonagem(req.params.id);

    if (resultado.erro) {
      return res.status(404).json(resultado);
    }

    return res.json(resultado);
  } catch (erro) {
    console.error("Erro ao consultar personagem:", erro);

    return res.status(500).json({
      erro: "Erro interno ao consultar personagem."
    });
  }
});

// ==========================================
// D&D AI v0.6 — EDITAR PERSONAGEM
// ==========================================

app.put("/personagens/:id", (req, res) => {
  try {
    const resultado = editarPersonagem(req.params.id, req.body);

    if (resultado.erro) {
      return res.status(400).json(resultado);
    }

    return res.json(resultado);
  } catch (erro) {
    console.error("Erro ao editar personagem:", erro);

    return res.status(500).json({
      erro: "Erro interno ao editar personagem."
    });
  }
});

// ==========================================
// D&D AI v0.6 — ATUALIZAR PERSONAGEM
// ==========================================

app.patch("/personagens/:id", (req, res) => {
  try {
    const resultado = editarPersonagem(
      req.params.id,
      req.body
    );

    if (resultado.erro) {
      const status = resultado.erro ===
        "Personagem não encontrado."
        ? 404
        : 400;

      return res.status(status).json(resultado);
    }

    return res.json(resultado);

  } catch (erro) {
    console.error(
      "Erro ao atualizar personagem:",
      erro
    );

    return res.status(500).json({
      erro: "Erro interno ao atualizar personagem."
    });
  }
});

// ======================================
// D&D AI v0.7 - ADICIONAR ITEM
// ======================================

app.post("/personagens/:id/inventario", (req, res) => {
  try {
    const personagemId = req.params.id;

    const resultado = adicionarItemPersonagem(
      personagemId,
      req.body
    );

    if (resultado.erro) {
      const status = resultado.erro ===
        "Personagem não encontrado."
        ? 404
        : 400;

      return res.status(status).json(resultado);
    }

    return res.status(201).json(resultado);

  } catch (erro) {
    console.error(
      "Erro ao adicionar item ao inventário:",
      erro
    );

    return res.status(500).json({
      erro: "Erro interno ao adicionar item."
    });
  }
});

 // ======================================
 // D&D AI v0.7 - REMOVER ITEM
 // ======================================

app.delete("/personagens/:id/inventario/:itemId", (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantidade } = req.body || {};

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return res.status(400).json({
        erro: "Quantidade inválida."
      });
    }

    const resultado = removerItemPersonagem(
      id,
      itemId,
      quantidade
    );

    if (resultado.erro) {
      const status = resultado.erro ===
        "Personagem não encontrado."
        ? 404
        : 400;

      return res.status(status).json(resultado);
    }

    return res.json(resultado);

  } catch (erro) {
    console.error("Erro ao remover item:", erro);

    return res.status(500).json({
      erro: "Erro interno ao remover item."
    });
  }
});

// ==========================================
// D&D AI v0.6 — BATALHA COM PERSONAGENS SALVOS
// ==========================================

app.post("/batalha/criar-com-personagens", (req, res) => {
  try {
    const { id, participantes } = req.body || {};

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        erro: "Informe um ID válido para a batalha."
      });
    }

    if (!Array.isArray(participantes) ||
        participantes.length === 0) {
      return res.status(400).json({
        erro: "Selecione pelo menos um personagem."
      });
    }

    const personagensSalvos = listarPersonagens();

    const idsSelecionados = new Set();
    const nomesSelecionados = new Set();
    const participantesBatalha = [];

    for (const entrada of participantes) {
      if (!entrada || typeof entrada !== "object") {
        return res.status(400).json({
          erro: "Participante inválido."
        });
      }

      const { personagemId, iniciativa } = entrada;

      if (typeof personagemId !== "string" ||
          !personagemId.trim()) {
        return res.status(400).json({
          erro: "ID do personagem inválido."
        });
      }

      if (idsSelecionados.has(personagemId)) {
        return res.status(400).json({
          erro: "Um personagem foi selecionado duas vezes."
        });
      }

      if (!Number.isInteger(iniciativa)) {
        return res.status(400).json({
          erro: "A iniciativa deve ser um número inteiro."
        });
      }

      const personagem = personagensSalvos.find(
        p => p.id === personagemId
      );

      if (!personagem) {
        return res.status(404).json({
          erro: `Personagem não encontrado: ${personagemId}`
        });
      }

      // Impedir fichas antigas incompletas
      if (
        !Number.isInteger(personagem.pvMaximo) ||
        !Number.isInteger(personagem.ca) ||
        !Number.isFinite(personagem.deslocamento)
      ) {
        return res.status(400).json({
          erro: `Ficha incompleta: ${personagem.nome}`
        });
      }

      if (nomesSelecionados.has(personagem.nome)) {
        return res.status(400).json({
          erro: "Existem personagens com nomes repetidos."
        });
      }

      idsSelecionados.add(personagemId);
      nomesSelecionados.add(personagem.nome);

      participantesBatalha.push({
        nome: personagem.nome,
        pv: personagem.pvMaximo,
        pvMaximo: personagem.pvMaximo,
        ca: personagem.ca,
        iniciativa,
        deslocamento: personagem.deslocamento
      });
    }

    // Reutiliza o gerenciador de batalhas existente.
    const resultado = criarBatalha(
      id.trim(),
      participantesBatalha
    );

    if (resultado.erro) {
      return res.status(400).json(resultado);
    }

    return res.status(201).json(resultado);

  } catch (erro) {
    console.error(
      "Erro ao criar batalha com personagens:",
      erro
    );

    return res.status(500).json({
      erro: "Erro interno ao criar batalha."
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `D&D AI iniciado em http://localhost:${PORT}`
  );
});
