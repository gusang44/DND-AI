
const { rolarD20ComVantagem } = require("./combat");

const {
  calcularRestricoesArmadura
} = require("./characterManager");

function realizarTesteD20(
  bonus = 0,
  tipoRolagem = "normal"
) {
  if (!Number.isFinite(bonus)) {
    return { erro: "Bônus do teste inválido." };
  }

  if (!["normal", "vantagem", "desvantagem"].includes(tipoRolagem)) {
    return { erro: "Tipo de rolagem inválido." };
  }

  const rolagem = rolarD20ComVantagem(tipoRolagem);

  return {
    tipoRolagem: rolagem.tipo,
    dadosRolados: rolagem.dados,
    dadoUtilizado: rolagem.resultado,
    bonus,
    total: rolagem.resultado + bonus
  };
}

function calcularModificadorAtributo(personagem, atributo) {
  const atributosValidos = [
    "forca",
    "destreza",
    "constituicao",
    "inteligencia",
    "sabedoria",
    "carisma"
  ];

  if (!atributosValidos.includes(atributo)) {
    return { erro: "Atributo inválido." };
  }

  const valor = personagem?.atributos?.[atributo];

  if (
    !Number.isInteger(valor) ||
    valor < 1 ||
    valor > 30
  ) {
    return { erro: "Valor de atributo inválido." };
  }

  return {
    atributo,
    valor,
    modificador: Math.floor((valor - 10) / 2)
  };
}


function realizarTesteAtributo(
  personagem,
  atributo,
  tipoRolagem = "normal"
) {

  const calculo = calcularModificadorAtributo(
    personagem,
    atributo
  );

  if (calculo.erro) {
    return calculo;
  }

  
const decisao = determinarRolagemTeste(
  personagem,
  atributo,
  tipoRolagem === "vantagem",
  tipoRolagem === "desvantagem"
);

if (decisao.erro) {
  return decisao;
}

const resultado = realizarTesteD20(
  calculo.modificador,
  decisao.tipoRolagem
);


  if (resultado.erro) {
    return resultado;
  }

  return {
    personagem: personagem.nome,
    atributo,
    valorAtributo: calculo.valor,
    modificador: calculo.modificador,
    tipoRolagem: resultado.tipoRolagem,
    desvantagemArmadura: decisao.desvantagemArmadura,
    verificacaoPendente: decisao.verificacaoPendente,
    dadosRolados: resultado.dadosRolados,
    dadoUtilizado: resultado.dadoUtilizado,
    total: resultado.total
  };
}

function determinarRolagemTeste(
  personagem,
  atributo,
  possuiVantagem = false,
  possuiDesvantagem = false
) {
  const atributosValidos = [
    "forca",
    "destreza",
    "constituicao",
    "inteligencia",
    "sabedoria",
    "carisma"
  ];

  if (!atributosValidos.includes(atributo)) {
    return { erro: "Atributo inválido." };
  }

  const restricoes = calcularRestricoesArmadura(personagem);

  if (restricoes.erro) {
    return restricoes;
  }

  const atributoAfetado =
    atributo === "forca" ||
    atributo === "destreza";

  const desvantagemArmadura =
    atributoAfetado &&
    restricoes.desvantagemForcaDestreza === true;

  const vantagem = possuiVantagem === true;

  const desvantagem =
    possuiDesvantagem === true ||
    desvantagemArmadura;

  let tipoRolagem = "normal";

  if (vantagem && !desvantagem) {
    tipoRolagem = "vantagem";
  } else if (desvantagem && !vantagem) {
    tipoRolagem = "desvantagem";
  }

  return {
    tipoRolagem,
    desvantagemArmadura,
    verificacaoPendente: restricoes.verificacaoPendente
  };
}

function identificarTipoTeste(tipo) {
  const tiposValidos = [
    "habilidade",
    "resistencia"
  ];

  if (!tiposValidos.includes(tipo)) {
    return {
      erro: "Tipo de teste inválido."
    };
  }

  return {
    tipo,
    usaProficiencia:
      tipo === "habilidade" || tipo === "resistencia"
  };
}

function calcularBonusProficiencia(personagem) {
  const nivel = personagem?.nivel;

  if (
    !Number.isInteger(nivel) ||
    nivel < 1 ||
    nivel > 20
  ) {
    return {
      erro: "Nível do personagem inválido."
    };
  }

  const bonus = Math.floor((nivel - 1) / 4) + 2;

  return {
    nivel,
    bonusProficiencia: bonus
  };
}

function consultarProficienciaTeste(
  personagem,
  tipo,
  nome
) {
  const gruposValidos = {
    habilidade: "pericias",
    resistencia: "resistencias"
  };

  const grupo = gruposValidos[tipo];

  if (!grupo) {
    return {
      erro: "Tipo de teste inválido."
    };
  }

const resistenciasValidas = [
  "forca",
  "destreza",
  "constituicao",
  "inteligencia",
  "sabedoria",
  "carisma"
];

if (tipo === "habilidade") {
  const identificacao = identificarAtributoPericia(nome);

  if (identificacao.erro) {
    return identificacao;
  }
}

if (
  tipo === "resistencia" &&
  !resistenciasValidas.includes(nome)
) {
  return {
    erro: "Atributo de resistência inválido."
  };
}

  if (
    !personagem ||
    typeof personagem !== "object" ||
    !personagem.proficienciasTestes
  ) {
    return {
      erro: "Proficiências não cadastradas."
    };
  }

  const proficiencias =
    personagem.proficienciasTestes[grupo];

  if (
    !proficiencias ||
    !Object.prototype.hasOwnProperty.call(
      proficiencias,
      nome
    )
  ) {
    return {
      erro: "Proficiência não encontrada."
    };
  }

  const valor = proficiencias[nome];

  if (valor === true) {
    return {
      tipo,
      nome,
      status: "proficiente",
      proficiente: true
    };
  }

  if (valor === false) {
    return {
      tipo,
      nome,
      status: "nao_proficiente",
      proficiente: false
    };
  }

  if (valor === null) {
    return {
      tipo,
      nome,
      status: "nao_informado",
      proficiente: null
    };
  }

  return {
    erro: "Valor de proficiência inválido."
  };
}

function calcularBonusTeste(
  personagem,
  tipo,
  nome,
  atributo
) {
  const calculoAtributo = calcularModificadorAtributo(
    personagem,
    atributo
  );

  if (calculoAtributo.erro) {
    return calculoAtributo;
  }

  const consulta = consultarProficienciaTeste(
    personagem,
    tipo,
    nome
  );

  if (consulta.erro) {
    return consulta;
  }

  let bonusProficiencia = 0;

  if (consulta.proficiente === true) {
    const calculoProficiencia =
      calcularBonusProficiencia(personagem);

    if (calculoProficiencia.erro) {
      return calculoProficiencia;
    }

    bonusProficiencia =
      calculoProficiencia.bonusProficiencia;
  }

  const bonusTotal =
    calculoAtributo.modificador +
    bonusProficiencia;

  return {
    tipo,
    nome,
    atributo,
    modificadorAtributo:
      calculoAtributo.modificador,
    proficiente: consulta.proficiente,
    statusProficiencia: consulta.status,
    bonusProficiencia,
    bonusTotal,
    verificacaoPendente:
      consulta.proficiente === null
  };
}

function realizarTesteComProficiencia(
  personagem,
  tipo,
  nome,
  atributo,
  tipoRolagem = "normal"
) {
  const tiposRolagemValidos = [
    "normal",
    "vantagem",
    "desvantagem"
  ];

  if (!tiposRolagemValidos.includes(tipoRolagem)) {
    return {
      erro: "Tipo de rolagem inválido."
    };
  }

  const calculo = calcularBonusTeste(
    personagem,
    tipo,
    nome,
    atributo
  );

  if (calculo.erro) {
    return calculo;
  }

  const decisao = determinarRolagemTeste(
    personagem,
    atributo,
    tipoRolagem === "vantagem",
    tipoRolagem === "desvantagem"
  );

  if (decisao.erro) {
    return decisao;
  }

  const resultado = realizarTesteD20(
    calculo.bonusTotal,
    decisao.tipoRolagem
  );

  if (resultado.erro) {
    return resultado;
  }

  return {
    personagem: personagem.nome,
    tipo,
    nome,
    atributo,
    modificadorAtributo: calculo.modificadorAtributo,
    bonusProficiencia: calculo.bonusProficiencia,
    bonusTotal: calculo.bonusTotal,
    statusProficiencia: calculo.statusProficiencia,
    tipoRolagem: resultado.tipoRolagem,
    dadosRolados: resultado.dadosRolados,
    dadoUtilizado: resultado.dadoUtilizado,
    total: resultado.total,
    desvantagemArmadura: decisao.desvantagemArmadura,
    verificacaoPendente:
      calculo.verificacaoPendente ||
      decisao.verificacaoPendente
  };
}

function identificarAtributoPericia(pericia) {
  const atributosPericias = {
    acrobacia: "destreza",
    arcanismo: "inteligencia",
    atletismo: "forca",
    atuacao: "carisma",
    enganacao: "carisma",
    furtividade: "destreza",
    historia: "inteligencia",
    intimidacao: "carisma",
    intuicao: "sabedoria",
    investigacao: "inteligencia",
    lidarAnimais: "sabedoria",
    medicina: "sabedoria",
    natureza: "inteligencia",
    percepcao: "sabedoria",
    persuasao: "carisma",
    prestidigitacao: "destreza",
    religiao: "inteligencia",
    sobrevivencia: "sabedoria"
  };

  if (
    !Object.prototype.hasOwnProperty.call(
      atributosPericias,
      pericia
    )
  ) {
    return {
      erro: "Perícia inválida."
    };
  }

  return {
    pericia,
    atributo: atributosPericias[pericia]
  };
}

function realizarTestePericia(
  personagem,
  pericia,
  tipoRolagem = "normal",
  atributoAlternativo = null
) {
  const identificacao = identificarAtributoPericia(
    pericia
  );

  if (identificacao.erro) {
    return identificacao;
  }

  const atributo =
    atributoAlternativo ?? identificacao.atributo;

  const resultado = realizarTesteComProficiencia(
    personagem,
    "habilidade",
    pericia,
    atributo,
    tipoRolagem
  );

  if (resultado.erro) {
    return resultado;
  }

  return {
    ...resultado,
    pericia,
    atributoPadrao: identificacao.atributo,
    atributoAlternativoUtilizado:
      atributoAlternativo !== null
  };
}

function realizarTesteResistencia(
  personagem,
  atributo,
  tipoRolagem = "normal"
) {
  const atributosValidos = [
    "forca",
    "destreza",
    "constituicao",
    "inteligencia",
    "sabedoria",
    "carisma"
  ];

  if (!atributosValidos.includes(atributo)) {
    return {
      erro: "Atributo de resistência inválido."
    };
  }

  const resultado = realizarTesteComProficiencia(
    personagem,
    "resistencia",
    atributo,
    atributo,
    tipoRolagem
  );

  if (resultado.erro) {
    return resultado;
  }

  return {
    ...resultado,
    testeResistencia: true
  };
}

module.exports = {
  realizarTesteD20,
    calcularModificadorAtributo,
    realizarTesteAtributo,
    determinarRolagemTeste,
    identificarTipoTeste,
    calcularBonusProficiencia,
    consultarProficienciaTeste,
    calcularBonusTeste,
    realizarTesteComProficiencia,
    identificarAtributoPericia,
    realizarTestePericia,
    realizarTesteResistencia
};
