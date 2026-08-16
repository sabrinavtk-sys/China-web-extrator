

async function carregarImagemHistorico(url){
    if(!url) return null;
    const resposta = await fetch(url, {credentials:"same-origin"});
    if(!resposta.ok) return null;
    return await createImageBitmap(await resposta.blob());
}

async function gerarImagemHistorico(botao, texto){
    const urls = [
        botao.dataset.printEnvio || "",
        botao.dataset.printRecebimento || ""
    ].filter(Boolean);

    if(!urls.length) return null;

    const imagens = [];
    for(const url of urls){
        const img = await carregarImagemHistorico(url);
        if(img) imagens.push(img);
    }
    if(!imagens.length) return null;

    const largura = 1200, margem = 50;
    const temp = document.createElement("canvas").getContext("2d");
    temp.font = "28px Arial";
    const linhas = [];
    for(const trecho of texto.split("\n")){
        if(!trecho.trim()){ linhas.push(""); continue; }
        const palavras = trecho.split(/\s+/);
        let linha = "";
        for(const palavra of palavras){
            const teste = linha ? linha + " " + palavra : palavra;
            if(temp.measureText(teste).width > largura-margem*2 && linha){
                linhas.push(linha); linha = palavra;
            }else linha = teste;
        }
        if(linha) linhas.push(linha);
    }

    const alturaTexto = Math.max(420, linhas.length*38 + margem*2);
    const dims = imagens.map(img=>{
        const w=largura-margem*2;
        const h=Math.round(img.height*(w/img.width));
        return {img,w,h};
    });
    const altura = alturaTexto + dims.reduce((a,x)=>a+x.h+30,0)+margem;
    const canvas=document.createElement("canvas");
    canvas.width=largura; canvas.height=altura;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#100b18"; ctx.fillRect(0,0,largura,altura);
    ctx.fillStyle="#fff"; ctx.font="28px Arial";
    let y=margem+28;
    for(const linha of linhas){ctx.fillText(linha,margem,y);y+=38}
    y=alturaTexto;
    for(const d of dims){ctx.drawImage(d.img,margem,y,d.w,d.h);y+=d.h+30}
    return await new Promise(resolve=>canvas.toBlob(resolve,"image/png",1));
}
