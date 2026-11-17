
const historicos = new Map();

// Restaurar históricos salvos
function restaurarHistoricos(dadosSalvos) {
  historicos.clear();

  for (const [id, eventos] of dadosSalvos) {
    historicos.set(id, eventos);
  }
}

// Obter todos os históricos para salvar
function obterTodosHistoricos() {
  return historicos;
}

function registrarEvento(idBatalha, tipo, descricao, dados = {}) {
  if (!historicos.has(idBatalha)) {
    historicos.set(idBatalha, []);
  }

  const historico = historicos.get(idBatalha);

  const evento = {
    id: historico.length + 1,
    tipo,
    descricao,
    dados,
    horario: new Date().toISOString()
  };

  historico.push(evento);

  return evento;
}

function obterHistorico(idBatalha) {
  return historicos.get(idBatalha) || [];
}

function limparHistorico(idBatalha) {
  historicos.delete(idBatalha);
}

module.exports = {
  registrarEvento,
  obterHistorico,
  limparHistorico,
  restaurarHistoricos,
  obterTodosHistoricos
};
