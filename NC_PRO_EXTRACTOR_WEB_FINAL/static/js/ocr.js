(() => {
    "use strict";

    console.log("OCR.JS v45 CARREGADO");

    // =========================================================
    // ESTADO PRIVADO
    // =========================================================

    let ocrEmProcessamento = false;
    let promessaTesseract = null;

    const URLS_TESSERACT = [
        "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
        "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"
    ];

    const RECORTES_RECEBIMENTO = [
        {
            nome: "BALÃO AMPLO COLORIDO",
            x: 0.00,
            y: 0.05,
            largura: 0.90,
            altura: 0.50,
            escala: 2.2,
            filtro: "colorido",
            psm: "6"
        },
        {
            nome: "BALÃO AMPLO CINZA",
            x: 0.00,
            y: 0.05,
            largura: 0.90,
            altura: 0.50,
            escala: 2.2,
            filtro: "cinza",
            psm: "6"
        },
        {
            nome: "BALÃO FOCADO CINZA",
            x: 0.00,
            y: 0.11,
            largura: 0.80,
            altura: 0.34,
            escala: 3.2,
            filtro: "cinza",
            psm: "6"
        },
        {
            nome: "BALÃO FOCADO BINÁRIO",
            x: 0.00,
            y: 0.11,
            largura: 0.80,
            altura: 0.34,
            escala: 3.2,
            filtro: "binario",
            limiar: 150,
            psm: "6"
        }
    ];

    // =========================================================
    // ELEMENTOS E CONSOLE
    // =========================================================

    function obterElemento(id) {
        return document.getElementById(id);
    }

    function atualizarConsoleOCR(texto) {
        const elemento = obterElemento("resultadoOCR");

        if (elemento) {
            elemento.textContent = String(texto ?? "");
        }
    }

    function atualizarBotaoProcessar(processando) {
        const botao = obterElemento("btnProcessar");

        if (!botao) {
            return;
        }

        botao.disabled = processando;

        botao.innerHTML = processando
            ? `
                <span class="btn-processar-icone">⏳</span>
                <span class="btn-processar-texto">
                    <strong>PROCESSANDO OCR...</strong>
                    <small>Aguarde a análise dos prints</small>
                </span>
            `
            : `
                <span class="btn-processar-icone">🤖</span>
                <span class="btn-processar-texto">
                    <strong>PROCESSAR OCR</strong>
                    <small>Iniciar análise dos dois prints</small>
                </span>
            `;
    }

    function mostrarProgresso(etapa, progresso) {
        const porcentagem = Math.max(
            0,
            Math.min(100, Math.round((Number(progresso) || 0) * 100))
        );

        console.log(`${etapa}: ${porcentagem}%`);
        atualizarConsoleOCR(`${etapa}\n\nProcessando: ${porcentagem}%`);
    }

    // =========================================================
    // TESSERACT
    // =========================================================

    function carregarScript(url) {
        return new Promise((resolve, reject) => {
            const seletor = `script[data-ocr-tesseract="${url}"]`;
            const existente = document.querySelector(seletor);

            if (existente) {
                if (
                    window.Tesseract &&
                    typeof window.Tesseract.recognize === "function"
                ) {
                    resolve(window.Tesseract);
                    return;
                }

                existente.addEventListener(
                    "load",
                    () => resolve(window.Tesseract),
                    { once: true }
                );

                existente.addEventListener(
                    "error",
                    () => reject(new Error(`Falha ao carregar ${url}`)),
                    { once: true }
                );

                return;
            }

            const script = document.createElement("script");
            script.src = url;
            script.async = true;
            script.dataset.ocrTesseract = url;

            script.onload = () => {
                if (
                    window.Tesseract &&
                    typeof window.Tesseract.recognize === "function"
                ) {
                    resolve(window.Tesseract);
                    return;
                }

                reject(
                    new Error(
                        "O Tesseract.js foi carregado, mas não disponibilizou a função recognize."
                    )
                );
            };

            script.onerror = () => {
                script.remove();
                reject(new Error(`Falha ao carregar ${url}`));
            };

            document.head.appendChild(script);
        });
    }

    async function garantirTesseractCarregado() {
        if (
            window.Tesseract &&
            typeof window.Tesseract.recognize === "function"
        ) {
            return window.Tesseract;
        }

        if (promessaTesseract) {
            return promessaTesseract;
        }

        promessaTesseract = (async () => {
            let ultimoErro = null;

            for (const url of URLS_TESSERACT) {
                try {
                    const biblioteca = await carregarScript(url);

                    console.log("TESSERACT.JS CARREGADO:", url);
                    return biblioteca;
                } catch (erro) {
                    ultimoErro = erro;
                    console.warn("FALHA NO CDN DO TESSERACT:", url, erro);
                }
            }

            throw (
                ultimoErro ||
                new Error("Não foi possível carregar o Tesseract.js.")
            );
        })();

        try {
            return await promessaTesseract;
        } catch (erro) {
            promessaTesseract = null;
            throw erro;
        }
    }

    // =========================================================
    // IMAGEM E CANVAS
    // =========================================================

    function carregarImagemArquivo(arquivo) {
        return new Promise((resolve, reject) => {
            if (!arquivo) {
                reject(new Error("Arquivo de imagem não informado."));
                return;
            }

            if (!arquivo.type || !arquivo.type.startsWith("image/")) {
                reject(new Error("O arquivo selecionado não é uma imagem válida."));
                return;
            }

            const leitor = new FileReader();
            const imagem = new Image();

            leitor.onload = evento => {
                imagem.src = String(evento.target?.result || "");
            };

            leitor.onerror = () => {
                reject(new Error("Não foi possível ler o arquivo."));
            };

            imagem.onload = () => resolve(imagem);

            imagem.onerror = () => {
                reject(new Error("Não foi possível abrir a imagem."));
            };

            leitor.readAsDataURL(arquivo);
        });
    }

    function clonarCanvas(canvasOriginal) {
        const canvas = document.createElement("canvas");

        canvas.width = canvasOriginal.width;
        canvas.height = canvasOriginal.height;

        const contexto = canvas.getContext("2d", {
            willReadFrequently: true
        });

        if (!contexto) {
            throw new Error(
                "O navegador não conseguiu criar o contexto 2D."
            );
        }

        contexto.drawImage(
            canvasOriginal,
            0,
            0
        );

        return canvas;
    }    function criarCanvasRecorte(imagem, configuracao) {
        const larguraImagem = imagem.naturalWidth || imagem.width;
        const alturaImagem = imagem.naturalHeight || imagem.height;

        const x = Math.round(
            larguraImagem * configuracao.x
        );

        const y = Math.round(
            alturaImagem * configuracao.y
        );

        const largura = Math.max(
            1,
            Math.min(
                larguraImagem - x,
                Math.round(
                    larguraImagem *
                    configuracao.largura
                )
            )
        );

        const altura = Math.max(
            1,
            Math.min(
                alturaImagem - y,
                Math.round(
                    alturaImagem *
                    configuracao.altura
                )
            )
        );

        const escala =
            Number(configuracao.escala) || 1;

        const canvas =
            document.createElement("canvas");

        canvas.width = Math.max(
            1,
            Math.round(
                largura * escala
            )
        );

        canvas.height = Math.max(
            1,
            Math.round(
                altura * escala
            )
        );

        const contexto = canvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );

        if (!contexto) {
            throw new Error(
                "O navegador não conseguiu criar o contexto 2D."
            );
        }

        contexto.imageSmoothingEnabled = true;
        contexto.imageSmoothingQuality = "high";

        contexto.drawImage(
            imagem,
            x,
            y,
            largura,
            altura,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return canvas;
    }

    function aplicarCinza(
        canvas,
        contraste = 1.45
    ) {
        const contexto = canvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );

        if (!contexto) {
            throw new Error(
                "Não foi possível processar a imagem em cinza."
            );
        }

        const dados = contexto.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const pixels = dados.data;

        for (
            let indice = 0;
            indice < pixels.length;
            indice += 4
        ) {
            const vermelho =
                pixels[indice];

            const verde =
                pixels[indice + 1];

            const azul =
                pixels[indice + 2];

            let cinza =
                vermelho * 0.299 +
                verde * 0.587 +
                azul * 0.114;

            cinza =
                (cinza - 128) *
                contraste +
                128;

            cinza = Math.max(
                0,
                Math.min(
                    255,
                    cinza
                )
            );

            pixels[indice] =
                cinza;

            pixels[indice + 1] =
                cinza;

            pixels[indice + 2] =
                cinza;
        }

        contexto.putImageData(
            dados,
            0,
            0
        );

        return canvas;
    }

    function aplicarBinario(
        canvas,
        limiar = 150
    ) {
        const contexto = canvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );

        if (!contexto) {
            throw new Error(
                "Não foi possível binarizar a imagem."
            );
        }

        const dados = contexto.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const pixels = dados.data;

        for (
            let indice = 0;
            indice < pixels.length;
            indice += 4
        ) {
            const brilho =
                pixels[indice] * 0.299 +
                pixels[indice + 1] * 0.587 +
                pixels[indice + 2] * 0.114;

            const valor =
                brilho >= limiar
                    ? 255
                    : 0;

            pixels[indice] =
                valor;

            pixels[indice + 1] =
                valor;

            pixels[indice + 2] =
                valor;
        }

        contexto.putImageData(
            dados,
            0,
            0
        );

        return canvas;
    }

    function aplicarFiltro(
        canvas,
        configuracao
    ) {
        if (
            configuracao.filtro ===
            "cinza"
        ) {
            return aplicarCinza(
                canvas,
                1.55
            );
        }

        if (
            configuracao.filtro ===
            "binario"
        ) {
            return aplicarBinario(
                aplicarCinza(
                    canvas,
                    1.35
                ),
                configuracao.limiar ||
                150
            );
        }

        return canvas;
    }

    // =========================================================
    // OCR
    // =========================================================

    async function reconhecerTexto(
        canvas,
        etapa,
        psm = "6"
    ) {
        const Tesseract =
            await garantirTesseractCarregado();

        console.log(
            "INICIANDO OCR:",
            etapa
        );

        const resultado =
            await Tesseract.recognize(
                canvas,
                "por",
                {
                    logger: mensagem => {
                        if (
                            mensagem.status ===
                            "recognizing text"
                        ) {
                            mostrarProgresso(
                                etapa,
                                mensagem.progress
                            );
                        }
                    },

                    tessedit_pageseg_mode:
                        psm,

                    preserve_interword_spaces:
                        "1"
                }
            );

        return {
            nome:
                etapa,

            texto:
                resultado?.data?.text ||
                "",

            confianca:
                Number(
                    resultado?.data?.confidence
                ) || 0
        };
    }

    async function lerPrintEnvio(
        arquivo
    ) {
        const imagem =
            await carregarImagemArquivo(
                arquivo
            );

        const escala =
            (
                imagem.naturalWidth ||
                imagem.width
            ) < 1600
                ? 1.4
                : 1;

        const canvas =
            criarCanvasRecorte(
                imagem,
                {
                    x: 0,
                    y: 0,
                    largura: 1,
                    altura: 1,
                    escala
                }
            );

        aplicarCinza(
            canvas,
            1.15
        );

        return reconhecerTexto(
            canvas,
            "PRINT DE ENVIO",
            "6"
        );
    }    async function lerVariacoesRecebimento(
        arquivo
    ) {
        const imagem =
            await carregarImagemArquivo(
                arquivo
            );

        const leituras = [];

        for (
            const configuracao
            of RECORTES_RECEBIMENTO
        ) {
            const recorte =
                criarCanvasRecorte(
                    imagem,
                    configuracao
                );

            const processado =
                aplicarFiltro(
                    clonarCanvas(
                        recorte
                    ),
                    configuracao
                );

            const leitura =
                await reconhecerTexto(
                    processado,
                    configuracao.nome,
                    configuracao.psm
                );

            console.log(
                configuracao.nome
            );

            console.log(
                leitura.texto
            );

            leituras.push(
                leitura
            );
        }

        return leituras;
    }

    // =========================================================
    // PONTUAÇÃO E CONSENSO
    // =========================================================

    function normalizarTextoOCR(
        texto
    ) {
        return String(
            texto || ""
        )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        )
        .trim();
    }

    function pontuarTextoBalao(
        texto,
        confiancaTesseract = 0
    ) {
        const normalizado =
            normalizarTextoOCR(
                texto
            );

        let pontos =
            Math.min(
                20,
                confiancaTesseract / 5
            );

        if (
            /dinheiro|d[il1]nheiro|di\s*nhei\s*ro/.test(
                normalizado
            )
        ) {
            pontos += 28;
        }

        if (
            /receb|recebeu|recebido|recebes|rcebeu/.test(
                normalizado
            )
        ) {
            pontos += 22;
        }

        if (
            /item|tem|oiem|olem|ltem/.test(
                normalizado
            )
        ) {
            pontos += 10;
        }

        if (
            /sujo|suko|sulo|hl\/o|hlo|hl0/.test(
                normalizado
            )
        ) {
            pontos += 16;
        }

        if (
            /[x×«]\s*[\d\s.,]{4,}/.test(
                normalizado
            )
        ) {
            pontos += 22;
        }

        if (
            /\[\s*\d{3,8}\s*\]/.test(
                normalizado
            )
        ) {
            pontos += 10;
        }

        if (
            /anuncio|saldo|banco|pix/.test(
                normalizado
            )
        ) {
            pontos -= 15;
        }

        return pontos;
    }

    function analisarLeitura(
        textoEnvio,
        leitura
    ) {
        if (
            typeof window.parseOCR !==
            "function"
        ) {
            throw new Error(
                "A função parseOCR não foi carregada. Verifique o parser.js."
            );
        }

        const resultado =
            window.parseOCR(
                textoEnvio,
                leitura.texto
            );

        const valorEnvio =
            Number(
                resultado?.envio
            ) || 0;

        const valorRecebido =
            Number(
                resultado?.recebido
            ) || 0;

        let pontuacao =
            pontuarTextoBalao(
                leitura.texto,
                leitura.confianca
            );

        if (
            valorRecebido > 0
        ) {
            pontuacao += 38;
        }

        if (
            resultado?.nome &&
            resultado.nome !==
            "Não identificado"
        ) {
            pontuacao += 16;
        }

        if (
            resultado?.idJogador &&
            resultado.idJogador !==
            "---"
        ) {
            pontuacao += 13;
        }

        if (
            resultado?.data &&
            resultado.data !==
            "---"
        ) {
            pontuacao += 5;
        }

        if (
            Number(
                resultado?.confiancaValor
            ) > 0
        ) {
            pontuacao += Math.min(
                20,
                Number(
                    resultado.confiancaValor
                ) / 5
            );
        }

        if (
            valorEnvio > 0 &&
            valorRecebido > valorEnvio
        ) {
            pontuacao -= 70;
        }

        return {
            ...leitura,
            resultado,
            pontuacao
        };
    }

    function aplicarConsenso(
        leituras
    ) {
        const contagem =
            new Map();

        for (
            const leitura
            of leituras
        ) {
            const valor =
                Number(
                    leitura.resultado
                        ?.recebido
                ) || 0;

            if (
                valor <= 0
            ) {
                continue;
            }

            contagem.set(
                valor,
                (
                    contagem.get(
                        valor
                    ) || 0
                ) + 1
            );
        }

        for (
            const leitura
            of leituras
        ) {
            const valor =
                Number(
                    leitura.resultado
                        ?.recebido
                ) || 0;

            const repeticoes =
                contagem.get(
                    valor
                ) || 0;

            if (
                repeticoes >= 2
            ) {
                leitura.pontuacao +=
                    repeticoes * 22;
            }
        }

        return leituras;
    }    function escolherMelhorLeitura(
        textoEnvio,
        leituras
    ) {
        const analisadas =
            aplicarConsenso(
                leituras.map(
                    leitura =>
                        analisarLeitura(
                            textoEnvio,
                            leitura
                        )
                )
            );

        analisadas.sort(
            (
                primeira,
                segunda
            ) =>
                segunda.pontuacao -
                primeira.pontuacao
        );

        console.table(
            analisadas.map(
                leitura => ({
                    leitura:
                        leitura.nome,

                    valor:
                        leitura.resultado
                            ?.recebido || 0,

                    nome:
                        leitura.resultado
                            ?.nome || "---",

                    id:
                        leitura.resultado
                            ?.idJogador || "---",

                    confiancaTesseract:
                        leitura.confianca,

                    pontuacao:
                        leitura.pontuacao
                })
            )
        );

        return analisadas[0] || null;
    }

    // =========================================================
    // RESULTADO E LIMPEZA
    // =========================================================

    function limparProcessamentoAnterior() {
        window.resultadoOCR = null;

        if (
            typeof window
                .limparDadosOperacao ===
            "function"
        ) {
            window.limparDadosOperacao();
        }
        else {
            const valores = {
                nomeJogador:
                    "---",

                idJogador:
                    "---",

                dataOperacao:
                    "---",

                valorRecebido:
                    "R$ 0",

                valorPorcentagem:
                    "R$ 0,00"
            };

            for (
                const [id, valor]
                of Object.entries(
                    valores
                )
            ) {
                const elemento =
                    obterElemento(id);

                if (elemento) {
                    elemento.textContent =
                        valor;
                }
            }
        }

        atualizarConsoleOCR(
            "Preparando novo processamento..."
        );
    }

    function exibirResultadoOCR(
        resultado
    ) {
        const nome =
            obterElemento(
                "nomeJogador"
            );

        const id =
            obterElemento(
                "idJogador"
            );

        const data =
            obterElemento(
                "dataOperacao"
            );

        const valor =
            obterElemento(
                "valorRecebido"
            );

        if (nome) {
            nome.textContent =
                resultado.nome ||
                "Não identificado";
        }

        if (id) {
            id.textContent =
                resultado.idJogador ||
                "---";
        }

        if (data) {

            const dataOCR =
                String(
                    resultado.data || ""
                )
                .trim();

            if(
                dataOCR &&
                dataOCR !== "---"
            ){

                /*
                    A data e a hora devem vir do print.
                    Removemos qualquer marcação que impeça o OCR
                    de atualizar o campo.
                */

                delete data.dataset.dataFixa;

                data.textContent =
                    dataOCR;


                console.log(
                    "DATA/HORA APLICADA DO PRINT:",
                    dataOCR
                );

            }

        }

        const valorRecebido =
            Number(
                resultado.recebido
            ) || 0;

        if (valor) {
            valor.textContent =
                valorRecebido
                .toLocaleString(
                    "pt-BR",
                    {
                        style:
                            "currency",

                        currency:
                            "BRL",

                        minimumFractionDigits:
                            0,

                        maximumFractionDigits:
                            0
                    }
                );
        }

        if (
            typeof window
                .calcularGanho ===
            "function"
        ) {
            window.calcularGanho();
        }

        atualizarConsoleOCR(
            JSON.stringify(
                resultado,
                null,
                4
            )
        );
    }

    // =========================================================
    // PROCESSAMENTO PRINCIPAL
    // =========================================================

    async function processarOCR() {
        if (ocrEmProcessamento) {
            console.warn(
                "OCR JÁ ESTÁ EM PROCESSAMENTO"
            );

            return;
        }

        const arquivoEnvio =
            obterElemento(
                "printEnvio"
            )
            ?.files?.[0];

        const arquivoRecebimento =
            obterElemento(
                "printRecebimento"
            )
            ?.files?.[0];

        if (
            !arquivoEnvio ||
            !arquivoRecebimento
        ) {
            alert(
                "Envie o print de envio e o print de recebimento."
            );

            return;
        }

        try {
            ocrEmProcessamento =
                true;

            atualizarBotaoProcessar(
                true
            );

            limparProcessamentoAnterior();

            console.log(
                "===================="
            );

            console.log(
                "INICIANDO PROCESSAMENTO OCR v45"
            );

            console.log(
                "ARQUIVO ENVIO:",
                arquivoEnvio.name,
                arquivoEnvio.size
            );

            console.log(
                "ARQUIVO RECEBIMENTO:",
                arquivoRecebimento.name,
                arquivoRecebimento.size
            );

            await garantirTesseractCarregado();

            const leituraEnvio =
                await lerPrintEnvio(
                    arquivoEnvio
                );

            const textoEnvio =
                leituraEnvio.texto;

            console.log(
                "TEXTO ENVIO"
            );

            console.log(
                textoEnvio
            );

            const leiturasRecebimento =
                await lerVariacoesRecebimento(
                    arquivoRecebimento
                );

            const textoCombinado =
                leiturasRecebimento
                .map(
                    leitura =>
                        leitura.texto
                )
                .filter(Boolean)
                .join(
                    "\n\n"
                );

            leiturasRecebimento.push({
                nome:
                    "LEITURAS COMBINADAS",

                texto:
                    textoCombinado,

                confianca:
                    0
            });

            const melhor =
                escolherMelhorLeitura(
                    textoEnvio,
                    leiturasRecebimento
                );

            if (
                !melhor ||
                !melhor.resultado
            ) {
                throw new Error(
                    "Nenhuma leitura válida foi produzida."
                );
            }

            const resultadoBase =
                melhor.resultado;

            const valorRecebido =
                Number(
                    resultadoBase.recebido
                ) || 0;

            if (
                valorRecebido <= 0
            ) {
                throw new Error(
                    "Não foi possível identificar o valor do balão azul."
                );
            }            const resultadoFinal = {
                ...resultadoBase,

                leituraOCR:
                    melhor.nome,

                pontuacaoOCR:
                    Number(
                        melhor.pontuacao
                            .toFixed(2)
                    ),

                confiancaTesseract:
                    Number(
                        melhor.confianca
                            .toFixed(2)
                    )
            };

            window.resultadoOCR =
                resultadoFinal;

            exibirResultadoOCR(
                resultadoFinal
            );

            const dadosParciais = [];

            if (
                !resultadoFinal.nome ||
                resultadoFinal.nome ===
                "Não identificado"
            ) {
                dadosParciais.push(
                    "nome"
                );
            }

            if (
                !resultadoFinal.idJogador ||
                resultadoFinal.idJogador ===
                "---"
            ) {
                dadosParciais.push(
                    "ID"
                );
            }

            if (
                dadosParciais.length > 0
            ) {
                alert(
                    "⚠️ O valor foi identificado, mas confira manualmente: " +
                    dadosParciais.join(
                        " e "
                    ) +
                    "."
                );
            }

            console.log(
                "RESULTADO FINAL DO OCR"
            );

            console.log(
                resultadoFinal
            );

            console.log(
                "OCR FINALIZADO COM SUCESSO"
            );
        }
        catch (erro) {
            console.error(
                "ERRO NO OCR:",
                erro
            );

            const mensagem =
                erro?.message ||
                "Erro desconhecido.";

            atualizarConsoleOCR(
                "Erro ao processar OCR:\n\n" +
                mensagem
            );

            alert(
                "❌ Erro ao processar OCR: " +
                mensagem
            );
        }
        finally {
            ocrEmProcessamento =
                false;

            atualizarBotaoProcessar(
                false
            );
        }
    }

    // =========================================================
    // EXPORTAÇÕES
    // =========================================================

    window.processarOCR =
        processarOCR;

    window.garantirTesseractCarregado =
        garantirTesseractCarregado;

    window.limparProcessamentoAnterior =
        limparProcessamentoAnterior;

    console.log(
        "OCR.JS v45 PRONTO"
    );
})();
