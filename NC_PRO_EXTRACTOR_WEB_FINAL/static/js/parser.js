console.log("PARSER.JS v51 CARREGADO");


// =========================================================
// CONFIGURAÇÕES
// =========================================================

const VALOR_MINIMO_OCR = 1000;

const VALOR_MAXIMO_OCR = 999999999;


// Palavras que indicam números que não pertencem ao balão.
const TERMOS_IGNORADOS = [
    "anuncio",
    "anúncio",
    "saldo",
    "banco",
    "pix",
    "veiculo",
    "veículo",
    "veiculos",
    "veículos",
    "horario",
    "horário",
    "ping",
    "fps",
    "participantes"
];


// =========================================================
// LIMPAR TEXTO OCR
// =========================================================

function limparTexto(texto){

    return String(
        texto || ""
    )
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

}


// =========================================================
// TEXTO EM UMA LINHA
// =========================================================

function textoEmUmaLinha(texto){

    return limparTexto(
        texto
    )
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


// =========================================================
// NORMALIZAR TEXTO PARA COMPARAÇÃO
// =========================================================

function normalizarTexto(texto){

    return String(
        texto || ""
    )
    .normalize("NFD")
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

}


// =========================================================
// CONVERTER DINHEIRO DO JOGO
// =========================================================

function converterValor(valor){

    if(
        valor === null ||
        valor === undefined
    ){

        return 0;

    }


    const somenteDigitos =
    String(valor)
    .replace(/[^\d]/g, "");


    if(!somenteDigitos){

        return 0;

    }


    const numero =
    Number(
        somenteDigitos
    );


    if(
        !Number.isFinite(numero) ||
        numero <= 0
    ){

        return 0;

    }


    return numero;

}


// =========================================================
// VALIDAR VALOR MONETÁRIO
// =========================================================

function valorMonetarioValido(valor){

    return (
        Number.isFinite(valor) &&
        valor >= VALOR_MINIMO_OCR &&
        valor <= VALOR_MAXIMO_OCR
    );

}


// =========================================================
// CORRIGIR CARACTERES OCR EM TRECHOS NUMÉRICOS
// =========================================================

function corrigirTrechoNumerico(texto){

    return String(
        texto || ""
    )
    .replace(/[oO]/g, "0")
    .replace(/[iIlL|]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/[bB]/g, "8")
    .replace(/[^\d\s.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


// =========================================================
// VERIFICAR SE UM TRECHO POSSUI TERMO IGNORADO
// =========================================================

function possuiTermoIgnorado(texto){

    const normalizado =
    normalizarTexto(
        texto
    );


    return TERMOS_IGNORADOS.some(
        termo => {

            return normalizado.includes(
                normalizarTexto(termo)
            );

        }
    );

}


// =========================================================
// PEGAR VALOR DO PRINT DE ENVIO
// =========================================================

function pegarValorEnvio(texto){

    const textoLimpo =
    textoEmUmaLinha(
        texto
    );


    console.log(
        "ANALISANDO ENVIO:",
        textoLimpo
    );


    const padroes = [

        {
            nome:
            "frase de envio",

            regex:
            /envi\w*\s+(?:o\s+valor\s+de\s+)?R?\s*\$?\s*([\d\s.,oOiIlL|sSbB]{4,30}?)\s+(?:para|pra)\b/i
        },

        {
            nome:
            "sucesso + valor enviado",

            regex:
            /(?:sucesso|sucess[o0]|suc[e3]sso).*?(?:envi\w*|envlou|env1ou).*?R?\s*\$?\s*([\d\s.,oOiIlL|sSbB]{4,30})/i
        },

        {
            nome:
            "enviou valor sem para",

            regex:
            /(?:enviou|envlou|env1ou|envi0u)\D{0,12}R?\s*\$?\s*([\d\s.,oOiIlL|sSbB]{4,30})/i
        },

        {
            nome:
            "valor com R$",

            regex:
            /R\s*\$\s*([\d\s.,]{4,30})/i
        },

        {
            nome:
            "valor com RS",

            regex:
            /\bRS\s*([\d\s.,]{4,30})/i
        }

    ];


    for(
        const padrao of padroes
    ){

        const busca =
        textoLimpo.match(
            padrao.regex
        );


        if(!busca){

            continue;

        }


        const valor =
        converterValor(
            corrigirTrechoNumerico(
                busca[1]
            )
        );


        if(
            valorMonetarioValido(
                valor
            )
        ){

            console.log(
                "VALOR DE ENVIO ENCONTRADO:",
                valor,
                "ORIGEM:",
                padrao.nome
            );


            return valor;

        }

    }


    console.warn(
        "VALOR DE ENVIO NÃO IDENTIFICADO"
    );


    return 0;

}


// =========================================================
// CRIAR CANDIDATO DO BALÃO
// =========================================================

function criarCandidatoBalao({
    valorBruto,
    origem,
    prioridade,
    contexto,
    indice = 0
}){

    const trechoCorrigido =
    corrigirTrechoNumerico(
        valorBruto
    );


    const valor =
    converterValor(
        trechoCorrigido
    );


    if(
        !valorMonetarioValido(
            valor
        )
    ){

        return null;

    }


    let pontuacao =
    prioridade;


    const contextoNormalizado =
    normalizarTexto(
        contexto
    );


    if(
        contextoNormalizado.includes(
            "dinheiro"
        )
    ){

        pontuacao += 30;

    }


    if(
        /receb|recebeu|recebido|recebes|rcebeu/.test(
            contextoNormalizado
        )
    ){

        pontuacao += 25;

    }


    if(
        /item|tem|oiem|olem|ltem/.test(
            contextoNormalizado
        )
    ){

        pontuacao += 12;

    }


    if(
        /sujo|suko|sulo|hl\/o|hlo/.test(
            contextoNormalizado
        )
    ){

        pontuacao += 15;

    }


    if(
        /[x×«]\s*[\d\s.,]/i.test(
            contexto
        )
    ){

        pontuacao += 15;

    }


    if(
        possuiTermoIgnorado(
            contexto
        )
    ){

        pontuacao -= 80;

    }


    return {

        valor,

        valorBruto,

        origem,

        prioridade,

        pontuacao,

        contexto,

        indice

    };

}


// =========================================================
// ADICIONAR CANDIDATO SEM DUPLICAR
// =========================================================

function adicionarCandidato(
    lista,
    candidato
){

    if(!candidato){

        return;

    }


    const existente =
    lista.find(
        item => {

            return (
                item.valor ===
                candidato.valor
            );

        }
    );


    if(!existente){

        lista.push(
            candidato
        );

        return;

    }


    if(
        candidato.pontuacao >
        existente.pontuacao
    ){

        Object.assign(
            existente,
            candidato
        );

    }

}


// =========================================================
// EXTRAIR CONTEXTO AO REDOR DE UM ÍNDICE
// =========================================================

function extrairContexto(
    texto,
    indice,
    tamanhoAntes = 80,
    tamanhoDepois = 110
){

    const inicio =
    Math.max(
        0,
        indice - tamanhoAntes
    );


    const fim =
    Math.min(
        texto.length,
        indice + tamanhoDepois
    );


    return texto.slice(
        inicio,
        fim
    );

}


// =========================================================
// EXTRAIR CANDIDATOS DO BALÃO
// =========================================================

function extrairCandidatosBalao(texto){

    const textoLimpo =
    textoEmUmaLinha(
        texto
    );


    const candidatos =
    [];


    let correspondencia;


    /*
        REGRA 1 — Entre marcador e DINHEIRO

        x907092 DINHEIRO
        x1 400000 DINHEIRO
        ×1.400.000 DINHEIRO
        «907092 DINHEIRO
    */

    const regexMarcadorDinheiro =
    /[xX×«]\s*([\d\s.,oOiIlL|sSbB]{4,35}?)\s*(?:DINHEIRO|D[Il1]NHEIRO|DI\s*NHEI\s*RO)/gi;


    while(
        (
            correspondencia =
            regexMarcadorDinheiro.exec(
                textoLimpo
            )
        ) !== null
    ){

        const contexto =
        extrairContexto(
            textoLimpo,
            correspondencia.index
        );


        adicionarCandidato(
            candidatos,
            criarCandidatoBalao({

                valorBruto:
                correspondencia[1],

                origem:
                "entre marcador e DINHEIRO",

                prioridade:
                100,

                contexto,

                indice:
                correspondencia.index

            })
        );

    }


    /*
        REGRA 2 — Depois de item, tem ou variações
    */

    const regexDepoisItem =
    /(?:item|tem|oiem|olem|ltem|irem)\s*[xX×«]?\s*([\d\s.,oOiIlL|sSbB]{4,35})/gi;


    while(
        (
            correspondencia =
            regexDepoisItem.exec(
                textoLimpo
            )
        ) !== null
    ){

        const contexto =
        extrairContexto(
            textoLimpo,
            correspondencia.index
        );


        adicionarCandidato(
            candidatos,
            criarCandidatoBalao({

                valorBruto:
                correspondencia[1],

                origem:
                "depois de item",

                prioridade:
                88,

                contexto,

                indice:
                correspondencia.index

            })
        );

    }


    /*
        REGRA 3 — Número imediatamente antes de DINHEIRO
    */

    const regexAntesDinheiro =
    /([\d][\d\s.,oOiIlL|sSbB]{3,30}?)\s*(?:DINHEIRO|D[Il1]NHEIRO|DI\s*NHEI\s*RO)/gi;


    while(
        (
            correspondencia =
            regexAntesDinheiro.exec(
                textoLimpo
            )
        ) !== null
    ){

        const contexto =
        extrairContexto(
            textoLimpo,
            correspondencia.index
        );


        adicionarCandidato(
            candidatos,
            criarCandidatoBalao({

                valorBruto:
                correspondencia[1],

                origem:
                "antes de DINHEIRO",

                prioridade:
                82,

                contexto,

                indice:
                correspondencia.index

            })
        );

    }


    /*
        REGRA 4 — Trecho entre RECEBEU e DINHEIRO
    */

    const regexRecebeuDinheiro =
    /receb\w*([\s\S]{1,90}?)(?:DINHEIRO|D[Il1]NHEIRO|DI\s*NHEI\s*RO)/gi;


    while(
        (
            correspondencia =
            regexRecebeuDinheiro.exec(
                textoLimpo
            )
        ) !== null
    ){

        let trecho =
        correspondencia[1];


        const partesMarcador =
        trecho.split(
            /[xX×«]/
        );


        trecho =
        partesMarcador[
            partesMarcador.length - 1
        ];


        const grupos =
        trecho.match(
            /[\d\s.,oOiIlL|sSbB]{4,35}/g
        );


        if(!grupos){

            continue;

        }


        grupos.forEach(
            grupo => {

                const contexto =
                extrairContexto(
                    textoLimpo,
                    correspondencia.index
                );


                adicionarCandidato(
                    candidatos,
                    criarCandidatoBalao({

                        valorBruto:
                        grupo,

                        origem:
                        "entre RECEBEU e DINHEIRO",

                        prioridade:
                        76,

                        contexto,

                        indice:
                        correspondencia.index

                    })
                );

            }
        );

    }


    /*
        REGRA 5 — Linha contendo DINHEIRO

        Essa regra é usada quando o OCR quebra a frase.
    */

    const linhas =
    limparTexto(
        texto
    )
    .split(/\n+/);


    linhas.forEach(
        (
            linha,
            indiceLinha
        ) => {

            const linhaNormalizada =
            normalizarTexto(
                linha
            );


            if(
                !/dinheiro|d[il1]nheiro/.test(
                    linhaNormalizada
                )
            ){

                return;

            }


            if(
                possuiTermoIgnorado(
                    linha
                )
            ){

                return;

            }


            const numeros =
            linha.match(
                /[\d][\d\s.,]{3,30}/g
            );


            if(!numeros){

                return;

            }


            numeros.forEach(
                numero => {

                    adicionarCandidato(
                        candidatos,
                        criarCandidatoBalao({

                            valorBruto:
                            numero,

                            origem:
                            "linha contendo DINHEIRO",

                            prioridade:
                            65,

                            contexto:
                            linha,

                            indice:
                            indiceLinha

                        })
                    );

                }
            );

        }
    );


    /*
        REGRA 6 — Último recurso

        Remove trechos conhecidos antes de procurar números.
    */

    let textoBackup =
    textoLimpo
    .replace(
        /an[uú]ncio\s+R?\s*\$?\s*[\d\s.,]+/gi,
        " "
    )
    .replace(
        /\[\s*\d{3,8}\s*\]/g,
        " "
    )
    .replace(
        /\(\s*\d{3,8}\s*\)/g,
        " "
    )
    .replace(
        /#\s*\d{3,8}/g,
        " "
    )
    .replace(
        /\d{2}[\/.-]\d{2}[\/.-]\d{4}/g,
        " "
    )
    .replace(
        /\d{1,2}:\d{2}/g,
        " "
    )
    .replace(
        /\b(?:PING|FPS|ID)\s*:?\s*\d+\b/gi,
        " "
    );


    const encontradosBackup =
    textoBackup.match(
        /\d[\d\s.,]{4,}/g
    );


    if(encontradosBackup){

        encontradosBackup.forEach(
            valorBruto => {

                const indice =
                textoBackup.indexOf(
                    valorBruto
                );


                const contexto =
                extrairContexto(
                    textoBackup,
                    indice
                );


                adicionarCandidato(
                    candidatos,
                    criarCandidatoBalao({

                        valorBruto,

                        origem:
                        "busca de emergência",

                        prioridade:
                        20,

                        contexto,

                        indice

                    })
                );

            }
        );

    }


    return candidatos.sort(
        (
            primeiro,
            segundo
        ) => {

            if(
                segundo.pontuacao !==
                primeiro.pontuacao
            ){

                return (
                    segundo.pontuacao -
                    primeiro.pontuacao
                );

            }


            return (
                primeiro.indice -
                segundo.indice
            );

        }
    );

}


// =========================================================
// PEGAR VALOR DO BALÃO AZUL
// =========================================================

function pegarValorBalao(
    texto,
    valorEnvio = 0
){

    const textoLimpo =
    textoEmUmaLinha(
        texto
    );


    console.log(
        "BUSCANDO VALOR BALÃO AZUL:",
        textoLimpo
    );


    const candidatos =
    extrairCandidatosBalao(
        texto
    );


    console.log(
        "CANDIDATOS DO BALÃO:",
        candidatos
    );


    if(
        candidatos.length === 0
    ){

        console.warn(
            "VALOR DO BALÃO AZUL NÃO IDENTIFICADO"
        );


        return {

            valor:
            0,

            confianca:
            0,

            origem:
            "não identificado",

            candidatos:
            []

        };

    }


    let candidatosValidos =
    candidatos;


    /*
        REGRA DA LAVAGEM

        O valor do balão azul é o valor ORIGINAL recebido.
        O valor do print verde é o valor ENVIADO depois da taxa.

        Portanto:
            recebido > enviado

        Também priorizamos pares cuja taxa calculada fique
        entre 20% e 40%. Isso ajuda a impedir que saldo,
        ID ou um número com zero perdido pelo OCR seja escolhido.
    */

    if(
        valorMonetarioValido(
            valorEnvio
        )
    ){

        const compativeis =
        candidatos
        .filter(
            candidato =>
                candidato.valor >
                valorEnvio
        )
        .map(
            candidato => {

                const percentual =
                (
                    (
                        candidato.valor -
                        valorEnvio
                    )
                    /
                    candidato.valor
                )
                * 100;


                let bonus = 0;

                if(
                    percentual >= 20 &&
                    percentual <= 40
                ){
                    bonus += 120;
                }
                else{
                    bonus -= 90;
                }


                /*
                    Taxas inteiras comuns ganham um pequeno bônus.
                    Ex.: 20%, 25%, 30%.
                */
                const distanciaInteiro =
                    Math.abs(
                        percentual -
                        Math.round(percentual)
                    );

                if(
                    distanciaInteiro < 0.02
                ){
                    bonus += 12;
                }


                return {
                    ...candidato,
                    percentualCalculado:
                        percentual,
                    pontuacao:
                        candidato.pontuacao +
                        bonus
                };

            }
        )
        .sort(
            (a,b) =>
                b.pontuacao -
                a.pontuacao
        );


        if(
            compativeis.length > 0
        ){
            candidatosValidos =
                compativeis;
        }

    }


    const escolhido =
    candidatosValidos[0];


    const confianca =
    Math.max(
        0,
        Math.min(
            100,
            escolhido.pontuacao
        )
    );


    console.log(
        "VALOR ESCOLHIDO DO BALÃO:",
        escolhido.valor
    );


    console.log(
        "ORIGEM DO VALOR:",
        escolhido.origem
    );


    console.log(
        "CONFIANÇA DO PARSER:",
        confianca + "%"
    );


    return {

        valor:
        escolhido.valor,

        confianca,

        origem:
        escolhido.origem,

        candidatos:
        candidatosValidos

    };

}


// =========================================================
// LIMPAR NOME DO JOGADOR
// =========================================================

function limparNomeJogador(nome){

    return String(
        nome || ""
    )
    .replace(
        /[^A-Za-zÀ-ÿ0-9'._\-\s]/g,
        " "
    )
    .replace(/\s+/g, " ")
    .trim();

}


// =========================================================
// VALIDAR NOME
// =========================================================

function nomeJogadorValido(nome){

    if(!nome){

        return false;

    }


    const partes =
    nome.split(
        /\s+/
    );


    if(
        partes.length < 1 ||
        partes.length > 5
    ){

        return false;

    }


    return partes.every(
        parte => {

            return (
                parte.length >= 2 &&
                /^[A-Za-zÀ-ÿ0-9'._-]+$/.test(
                    parte
                )
            );

        }
    );

}


// =========================================================
// PEGAR JOGADOR
// =========================================================

function pegarJogador(
    textoBalao,
    textoEnvio = ""
){

    const balao =
    textoEmUmaLinha(
        textoBalao
    );


    const envio =
    textoEmUmaLinha(
        textoEnvio
    );


    const padroesBalao = [

        /(?:DINHEIRO\s+)?(?:SUJO|SUJ[O0]|SUKO|SULO|HL\/O|HLO|HL0)\s+de\s+([A-Za-zÀ-ÿ0-9'._-]+(?:\s+[A-Za-zÀ-ÿ0-9'._-]+){0,4})\s*\[\s*(\d{3,8})\s*\]/i,

        /\bde\s+([A-Za-zÀ-ÿ0-9'._-]+(?:\s+[A-Za-zÀ-ÿ0-9'._-]+){0,4})\s*\[\s*(\d{3,8})\s*\]/i,

        /([A-Za-zÀ-ÿ0-9'._-]+(?:\s+[A-Za-zÀ-ÿ0-9'._-]+){0,4})\s*\[\s*(\d{3,8})\s*\]/i

    ];


    for(
        const padrao of padroesBalao
    ){

        const busca =
        balao.match(
            padrao
        );


        if(!busca){

            continue;

        }


        const nome =
        limparNomeJogador(
            busca[1]
        );


        if(
            nomeJogadorValido(
                nome
            )
        ){

            return {

                nome,

                idJogador:
                busca[2]

            };

        }

    }


    const buscaEnvio =
    envio.match(
        /(?:para|pra)\s+([A-Za-zÀ-ÿ0-9'._-]+(?:\s+[A-Za-zÀ-ÿ0-9'._-]+){0,4})\s*(?:#|\[|\()\s*(\d{3,8})\s*[\]\)]?/i
    );


    if(buscaEnvio){

        const nome =
        limparNomeJogador(
            buscaEnvio[1]
        );


        if(
            nomeJogadorValido(
                nome
            )
        ){

            return {

                nome,

                idJogador:
                buscaEnvio[2]

            };

        }

    }


    return {

        nome:
        "Não identificado",

        idJogador:
        "---"

    };

}


// =========================================================
// PEGAR DATA
// =========================================================

function pegarData(texto){

    const textoLimpo =
    textoEmUmaLinha(
        texto
    );


    const busca =
    textoLimpo.match(
        /\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\s*[-–—]?\s*(\d{2}):(\d{2})\b/
    );


    if(!busca){

        return "---";

    }


    return (
        `${busca[1]}/${busca[2]}/${busca[3]} ` +
        `${busca[4]}:${busca[5]}`
    );

}


// =========================================================
// PARSER PRINCIPAL
// =========================================================

function parseOCR(
    textoEnvio,
    textoBalao
){

    console.log(
        "================="
    );


    console.log(
        "PARSER v51 RECEBEU OCR"
    );


    textoEnvio =
    String(
        textoEnvio || ""
    );


    textoBalao =
    String(
        textoBalao || ""
    );


    const envio =
    pegarValorEnvio(
        textoEnvio
    );


    const resultadoBalao =
    pegarValorBalao(
        textoBalao,
        envio
    );


    const jogador =
    pegarJogador(
        textoBalao,
        textoEnvio
    );


    const data =
    pegarData(
        textoEnvio +
        " " +
        textoBalao
    );


    const resultado = {

        envio,

        recebido:
        resultadoBalao.valor,

        nome:
        jogador.nome,

        idJogador:
        jogador.idJogador,

        data,

        confiancaValor:
        resultadoBalao.confianca,

        origemValor:
        resultadoBalao.origem

    };


    console.log(
        "VALOR INTERNO DO ENVIO:",
        envio
    );


    console.log(
        "QUANTIDADE DO BALÃO AZUL:",
        resultado.recebido
    );


    console.log(
        "CONFIANÇA DO VALOR:",
        resultado.confiancaValor + "%"
    );


    console.log(
        "ORIGEM DO VALOR:",
        resultado.origemValor
    );


    console.log(
        "RESULTADO FINAL:",
        resultado
    );


    return resultado;

}


// =========================================================
// TESTES DO PARSER
// =========================================================

function testarParserV42(){

    const testes = [

        {
            nome:
            "Valor sem separador",

            envio:
            "R$ 45.383.754",

            balao:
            "Você recebeu o item x1400000 DINHEIRO SUJO de Yure Oliveira [105475]",

            esperado:
            1400000
        },

        {
            nome:
            "Valor separado pelo OCR",

            envio:
            "R$ 45.383.754",

            balao:
            "vocêrecebeu o item x1 400000 DINHEIRO SUJO de Yure Oliveira [105475]",

            esperado:
            1400000
        },

        {
            nome:
            "Ignorar anúncio",

            envio:
            "R$ 7.118.384",

            balao:
            "Anúncio R$ 7.798.703 Você recebeu o item x907092 DINHEIRO SUJO de Lucas Henrique [71780]",

            esperado:
            907092
        }

    ];


    testes.forEach(
        teste => {

            const resultado =
            parseOCR(
                teste.envio,
                teste.balao
            );


            console.log(
                "TESTE:",
                teste.nome,
                "| ENCONTRADO:",
                resultado.recebido,
                "| ESPERADO:",
                teste.esperado,
                "| STATUS:",
                resultado.recebido === teste.esperado
                    ? "OK"
                    : "FALHOU"
            );

        }
    );

}


// =========================================================
// EXPORTAR FUNÇÕES
// =========================================================

window.parseOCR =
parseOCR;


window.pegarValorEnvio =
pegarValorEnvio;


window.pegarValorBalao =
pegarValorBalao;


window.pegarJogador =
pegarJogador;


window.pegarData =
pegarData;


window.converterValor =
converterValor;


window.testarParserV42 =
testarParserV42;


console.log(
    "PARSER.JS v51 PRONTO"
);