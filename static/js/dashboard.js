console.log("DASHBOARD.JS v43 CARREGADO");


// =========================================================
// ESTADO
// =========================================================

let salvamentoEmAndamento = false;


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        console.log(
            "INICIANDO EVENTOS DO DASHBOARD v42"
        );


        configurarBotaoProcessar();

        configurarPorcentagem();

        configurarBotaoSalvar();

        configurarBotaoCopiar();


        calcularGanho();


        console.log(
            "DASHBOARD.JS v42 PRONTO"
        );

    }
);


// =========================================================
// BUSCAR ELEMENTO
// =========================================================

function obterElemento(id){

    return document.getElementById(
        id
    );

}


// =========================================================
// CONVERTER TEXTO MONETÁRIO
// =========================================================

function converterValorMonetario(valor){

    if(
        valor === null ||
        valor === undefined
    ){

        return 0;

    }


    if(
        typeof valor === "number"
    ){

        return Number.isFinite(valor)
            ? valor
            : 0;

    }


    let texto =
    String(valor)
        .trim()
        .replace(/R\$/gi, "")
        .replace(/\s/g, "");


    if(!texto){

        return 0;

    }


    /*
        Exemplos aceitos:

        1.400.000
        1.400.000,00
        1400000
        1400000,00
    */


    if(
        texto.includes(",")
    ){

        texto =
        texto
            .replace(/\./g, "")
            .replace(",", ".");

    }
    else{

        texto =
        texto.replace(/\./g, "");

    }


    texto =
    texto.replace(
        /[^\d.-]/g,
        ""
    );


    const numero =
    Number(texto);


    return Number.isFinite(numero)
        ? numero
        : 0;

}


// =========================================================
// FORMATAR DINHEIRO
// =========================================================

function formatarDinheiro(valor){

    const numero =
    Number(valor) || 0;


    return numero.toLocaleString(
        "pt-BR",
        {
            style:
                "currency",

            currency:
                "BRL",

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );

}


// =========================================================
// PREVIEW DAS IMAGENS
// =========================================================

function previewImagem(
    input,
    idPreview
){

    const preview =
    obterElemento(
        idPreview
    );


    if(!preview){

        console.warn(
            "Preview não encontrado:",
            idPreview
        );

        return;

    }


    const arquivo =
    input?.files?.[0];


    if(!arquivo){

        preview.removeAttribute(
            "src"
        );

        return;

    }


    if(
        !arquivo.type ||
        !arquivo.type.startsWith(
            "image/"
        )
    ){

        alert(
            "Selecione um arquivo de imagem válido."
        );


        input.value =
        "";


        preview.removeAttribute(
            "src"
        );


        return;

    }


    if(
        preview.dataset.urlAnterior
    ){

        URL.revokeObjectURL(
            preview.dataset.urlAnterior
        );

    }


    const url =
    URL.createObjectURL(
        arquivo
    );


    preview.src =
    url;


    preview.dataset.urlAnterior =
    url;


    console.log(
        "PREVIEW CARREGADO:",
        arquivo.name
    );

}


window.previewImagem =
previewImagem;


// =========================================================
// CONFIGURAR BOTÃO PROCESSAR
// =========================================================

function configurarBotaoProcessar(){

    const botao =
    obterElemento(
        "btnProcessar"
    );


    if(!botao){

        console.warn(
            "BOTÃO PROCESSAR NÃO ENCONTRADO"
        );

        return;

    }


    botao.addEventListener(
        "click",
        async function(){

            if(
                typeof window.processarOCR !==
                "function"
            ){

                console.error(
                    "FUNÇÃO processarOCR NÃO CARREGADA"
                );


                alert(
                    "O sistema OCR ainda não foi carregado. Atualize a página e tente novamente."
                );


                return;

            }


            try{

                await window.processarOCR();

            }
            catch(erro){

                console.error(
                    "ERRO AO PROCESSAR OCR:",
                    erro
                );


                alert(
                    "Não foi possível processar os prints."
                );

            }

        }
    );


    console.log(
        "BOTÃO PROCESSAR CONFIGURADO"
    );

}


// =========================================================
// CONFIGURAR PORCENTAGEM
// =========================================================

function configurarPorcentagem(){

    const campo =
    obterElemento(
        "porcentagemAplicada"
    );


    if(!campo){

        console.warn(
            "CAMPO DE PORCENTAGEM NÃO ENCONTRADO"
        );

        return;

    }


    campo.addEventListener(
        "input",
        calcularGanho
    );


    campo.addEventListener(
        "change",
        function(){

            normalizarPorcentagem();

            calcularGanho();

        }
    );


    console.log(
        "CÁLCULO DE PORCENTAGEM CONFIGURADO"
    );

}


// =========================================================
// NORMALIZAR PORCENTAGEM
// =========================================================

function normalizarPorcentagem(){

    const campo =
    obterElemento(
        "porcentagemAplicada"
    );


    if(!campo){

        return -20;

    }


    let porcentagem =
    Number(
        campo.value
    );


    if(
        !Number.isFinite(
            porcentagem
        )
    ){

        porcentagem =
        -20;

    }


    porcentagem =
    Math.max(
        -40,
        Math.min(
            -20,
            porcentagem
        )
    );


    campo.value =
    porcentagem;


    return porcentagem;

}


// =========================================================
// CALCULAR GANHO
// =========================================================

function calcularGanho(){

    const campoValor =
    obterElemento(
        "valorRecebido"
    );


    const campoPorcentagem =
    obterElemento(
        "porcentagemAplicada"
    );


    const campoResultado =
    obterElemento(
        "valorPorcentagem"
    );


    if(
        !campoValor ||
        !campoPorcentagem ||
        !campoResultado
    ){

        return 0;

    }


    const valor =
    converterValorMonetario(
        campoValor.innerText
    );


    const porcentagem =
    normalizarPorcentagem();


    /*
        A porcentagem é negativa:

        -20
        -25
        -40

        O ganho precisa ser salvo como valor positivo.
    */

    const ganho =
    valor *
    (
        Math.abs(
            porcentagem
        ) / 100
    );


    campoResultado.innerText =
    formatarDinheiro(
        ganho
    );


    console.log(
        "VALOR PROCESSADO:",
        valor
    );


    console.log(
        "PORCENTAGEM APLICADA:",
        porcentagem
    );


    console.log(
        "GANHO CALCULADO:",
        ganho
    );


    return ganho;

}


window.calcularGanho =
calcularGanho;


// =========================================================
// DADOS DA OPERAÇÃO
// =========================================================

function obterDadosOperacao(){

    const nome =
    obterElemento(
        "nomeJogador"
    )?.innerText?.trim() ||
    "---";


    const id =
    obterElemento(
        "idJogador"
    )?.innerText?.trim() ||
    "---";


    /*
        A data é preenchida automaticamente pelo servidor.
        Ela não depende do OCR do print.
    */

    const data =
    obterElemento(
        "dataOperacao"
    )?.innerText?.trim() ||
    "---";


    const valor =
    converterValorMonetario(
        obterElemento(
            "valorRecebido"
        )?.innerText
    );


    const porcentagem =
    normalizarPorcentagem();


    const ganho =
    valor *
    (
        Math.abs(
            porcentagem
        ) / 100
    );


    const observacoes =
    obterElemento(
        "observacoes"
    )?.value?.trim() ||
    "";


    return {

        nome_jogador:
            nome,

        id_jogador:
            id,

        data_exibicao:
            data,

        valor:
            valor,

        porcentagem:
            porcentagem,

        valor_porcentagem:
            ganho,

        observacoes:
            observacoes

    };

}


// =========================================================
// VALIDAR OPERAÇÃO
// =========================================================

function validarDadosOperacao(dados){

    if(
        !dados.nome_jogador ||
        dados.nome_jogador === "---" ||
        dados.nome_jogador === "Não identificado"
    ){

        alert(
            "O nome do jogador não foi identificado."
        );


        return false;

    }


    if(
        !dados.id_jogador ||
        dados.id_jogador === "---" ||
        dados.id_jogador === "Não identificado"
    ){

        alert(
            "O ID do jogador não foi identificado."
        );


        return false;

    }


    if(
        !Number.isFinite(
            dados.valor
        ) ||
        dados.valor <= 0
    ){

        alert(
            "O valor processado é inválido. Execute o OCR novamente."
        );


        return false;

    }


    if(
        dados.porcentagem < -40 ||
        dados.porcentagem > -20
    ){

        alert(
            "A porcentagem deve estar entre -40% e -20%."
        );


        return false;

    }


    if(
        !Number.isFinite(
            dados.valor_porcentagem
        ) ||
        dados.valor_porcentagem <= 0
    ){

        alert(
            "O ganho da operação é inválido."
        );


        return false;

    }


    return true;

}


// =========================================================
// CONFIGURAR BOTÃO SALVAR
// =========================================================

function configurarBotaoSalvar(){

    const botao =
    obterElemento(
        "salvarComprovante"
    );


    console.log(
        "BOTÃO SALVAR:",
        Boolean(botao)
    );


    if(!botao){

        return;

    }


    botao.addEventListener(
        "click",
        salvarComprovante
    );

}


// =========================================================
// ALTERAR BOTÃO SALVAR
// =========================================================

function definirEstadoBotaoSalvar(
    salvando
){

    const botao =
    obterElemento(
        "salvarComprovante"
    );


    if(!botao){

        return;

    }


    botao.disabled =
    salvando;


    if(salvando){

        botao.innerHTML =
        `
            <span>⏳</span>

            <div>
                <strong>SALVANDO...</strong>
                <small>Aguarde um instante</small>
            </div>
        `;

    }
    else{

        botao.innerHTML =
        `
            <span>💾</span>

            <div>
                <strong>SALVAR OPERAÇÃO</strong>
                <small>Registrar no histórico</small>
            </div>
        `;

    }

}



function arquivoParaDataURL(arquivo){
    return new Promise((resolve, reject) => {
        if(!arquivo){
            resolve(null);
            return;
        }
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result || ""));
        leitor.onerror = () => reject(new Error("Não foi possível ler um dos prints."));
        leitor.readAsDataURL(arquivo);
    });
}

// =========================================================
// SALVAR COMPROVANTE
// =========================================================

async function salvarComprovante(){

    if(salvamentoEmAndamento){

        return false;

    }


    const dados =
    obterDadosOperacao();


    if(
        !validarDadosOperacao(
            dados
        )
    ){

        return false;

    }


    try{

        salvamentoEmAndamento =
        true;


        definirEstadoBotaoSalvar(
            true
        );


        const arquivoEnvio = obterElemento("printEnvio")?.files?.[0] || null;
        const arquivoRecebimento = obterElemento("printRecebimento")?.files?.[0] || null;

        dados.print_envio_base64 = await arquivoParaDataURL(arquivoEnvio);
        dados.print_recebimento_base64 = await arquivoParaDataURL(arquivoRecebimento);

        console.log(
            "SALVANDO OPERAÇÃO:",
            {
                ...dados,
                print_envio_base64: dados.print_envio_base64 ? "[imagem]" : null,
                print_recebimento_base64: dados.print_recebimento_base64 ? "[imagem]" : null
            }
        );


        const resposta =
        await fetch(
            "/salvar-operacao",
            {
                method:
                    "POST",

                headers:{
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        dados
                    )
            }
        );


        let retorno;


        try{

            retorno =
            await resposta.json();

        }
        catch(erro){

            console.error(
                "RESPOSTA INVÁLIDA DO SERVIDOR:",
                erro
            );


            throw new Error(
                "O servidor retornou uma resposta inválida."
            );

        }


        if(
            !resposta.ok ||
            !retorno.sucesso
        ){

            throw new Error(
                retorno.erro ||
                retorno.mensagem ||
                "Não foi possível salvar a operação."
            );

        }


        console.log(
            "OPERAÇÃO SALVA:",
            retorno
        );


        alert(
            "✅ Operação salva com sucesso!"
        );


        /*
            Abre o histórico imediatamente para confirmar
            que a operação foi registrada no banco.
        */

        window.location.href =
        "/historico?atualizado=" +
        Date.now();


        return true;

    }
    catch(erro){

        console.error(
            "ERRO AO SALVAR:",
            erro
        );


        alert(
            "❌ Erro ao salvar: " +
            (
                erro.message ||
                "erro desconhecido"
            )
        );


        return false;

    }
    finally{

        salvamentoEmAndamento =
        false;


        definirEstadoBotaoSalvar(
            false
        );

    }

}


window.salvarComprovante =
salvarComprovante;


// =========================================================
// CONFIGURAR BOTÃO COPIAR
// =========================================================

function configurarBotaoCopiar(){

    const botao =
    obterElemento(
        "copiarComprovante"
    );


    console.log(
        "BOTÃO COPIAR:",
        Boolean(botao)
    );


    if(!botao){

        return;

    }


    botao.addEventListener(
        "click",
        copiarComprovante
    );

}


// =========================================================
// GERAR TEXTO DO COMPROVANTE
// =========================================================

function gerarTextoComprovante(){

    const dados = obterDadosOperacao();

    const valorFormatado =
        formatarDinheiro(
            dados.valor
        );

    const ganhoFormatado =
        formatarDinheiro(
            Math.abs(
                Number(
                    dados.valor_porcentagem || 0
                )
            )
        );

    const porcentagem =
        Math.abs(
            Number(
                dados.porcentagem || 0
            )
        );

    const porcentagemFormatada =
        Number.isInteger(
            porcentagem
        )
        ? String(
            porcentagem
        )
        : porcentagem
            .toFixed(2)
            .replace(".", ",");

    const observacoes =
        dados.observacoes ||
        "Sem observações.";

    return (
`CHINA PRO EXTRACTOR — RESUMO DA OPERAÇÃO

👤 Jogador: ${dados.nome_jogador}
🆔 ID: ${dados.id_jogador}
📅 Data: ${dados.data_exibicao}

💵 Valor processado: ${valorFormatado}
📊 Porcentagem aplicada: ${porcentagemFormatada}%
💎 Ganho da operação: ${ganhoFormatado}

📝 Observações: ${observacoes}`
    );

}


// =========================================================
// COPIAR COMPROVANTE — SOMENTE TEXTO
// =========================================================

async function copiarComprovante(){

    const dados =
        obterDadosOperacao();

    if(
        !validarDadosOperacao(
            dados
        )
    ){
        return false;
    }

    const texto =
        gerarTextoComprovante();

    try{

        if(
            navigator.clipboard &&
            window.isSecureContext
        ){

            await navigator.clipboard.writeText(
                texto
            );

        }
        else{

            copiarTextoAlternativo(
                texto
            );

        }

        alert(
            "✅ Relatório em texto copiado!"
        );

        return true;

    }
    catch(erro){

        console.error(
            "ERRO AO COPIAR RELATÓRIO:",
            erro
        );

        try{

            copiarTextoAlternativo(
                texto
            );

            alert(
                "✅ Relatório em texto copiado!"
            );

            return true;

        }
        catch(erroAlternativo){

            console.error(
                "ERRO NO MÉTODO ALTERNATIVO:",
                erroAlternativo
            );

            alert(
                "❌ Não foi possível copiar o relatório."
            );

            return false;

        }

    }

}


window.copiarComprovante =
copiarComprovante;


// =========================================================
// MÉTODO ALTERNATIVO DE CÓPIA
// =========================================================

function copiarTextoAlternativo(texto){

    const campo =
    document.createElement(
        "textarea"
    );


    campo.value =
    texto;


    campo.setAttribute(
        "readonly",
        ""
    );


    campo.style.position =
    "fixed";


    campo.style.top =
    "-9999px";


    campo.style.left =
    "-9999px";


    campo.style.opacity =
    "0";


    document.body.appendChild(
        campo
    );


    campo.focus();

    campo.select();


    campo.setSelectionRange(
        0,
        campo.value.length
    );


    const copiado =
    document.execCommand(
        "copy"
    );


    campo.remove();


    if(!copiado){

        throw new Error(
            "O navegador recusou a cópia."
        );

    }

}


// =========================================================
// LIMPAR FORMULÁRIO APÓS OCR
// =========================================================

function limparDadosOperacao(){

    const camposTexto = {

        nomeJogador:
            "---",

        idJogador:
            "---",

        valorRecebido:
            "R$ 0",

        valorPorcentagem:
            "R$ 0,00"

    };


    Object.entries(
        camposTexto
    ).forEach(
        function([
            id,
            valor
        ]){

            const elemento =
            obterElemento(
                id
            );


            if(elemento){

                elemento.innerText =
                valor;

            }

        }
    );


    const porcentagem =
    obterElemento(
        "porcentagemAplicada"
    );


    if(porcentagem){

        porcentagem.value =
        -20;

    }


    const observacoes =
    obterElemento(
        "observacoes"
    );


    if(observacoes){

        observacoes.value =
        "";

    }


    calcularGanho();

}


window.limparDadosOperacao =
limparDadosOperacao;


// =========================================================
// EXPORTAÇÕES
// =========================================================

window.converterValorMonetario =
converterValorMonetario;


window.formatarDinheiro =
formatarDinheiro;


console.log(
    "FUNÇÕES DO DASHBOARD v42 DISPONÍVEIS"
);