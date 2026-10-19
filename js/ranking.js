async function carregarJson(caminho) {
    const response = await fetch(caminho, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Erro ao carregar ${caminho}: ${response.status}`);
    }

    return response.json();
}


/* =========================================================
   NORMALIZAÇÃO DOS DADOS
   ========================================================= */

function normalizarItem(item) {
    return {
        escola_cod: item.EscolaCod ?? item.escola_cod,
        campo: item.Campo ?? item.campo,
        unidade: item.Unidade ?? item.unidade,
        novos: Number(item.Novos ?? item.novos ?? 0),
        rematricula: Number(item.Rematricula ?? item.rematricula ?? 0)
    };
}


/* =========================================================
   DATAS
   ========================================================= */

function diferencaDias(data1, data2) {
    const MS_DIA = 1000 * 60 * 60 * 24;

    const a = Date.UTC(
        data1.getFullYear(),
        data1.getMonth(),
        data1.getDate()
    );

    const b = Date.UTC(
        data2.getFullYear(),
        data2.getMonth(),
        data2.getDate()
    );

    return Math.round((b - a) / MS_DIA);
}


function calcularEsperado(dataAtual) {
    const dataInicial = new Date(2026, 8, 1);
    const dataFinal = new Date(2026, 10, 30);

    const diasTotais = diferencaDias(dataInicial, dataFinal);
    const diasDecorridos = diferencaDias(dataInicial, dataAtual);

    const progressoTempo = diasDecorridos / diasTotais;

    return 80 * progressoTempo;
}


function calcularRazao(percentualMeta, dataAtual) {
    const esperado = calcularEsperado(dataAtual);

    if (esperado <= 0) {
        return 0;
    }

    return Math.min(
        Math.max(percentualMeta / esperado, 0),
        1
    );
}


/* =========================================================
   GRADIENTE
   ========================================================= */

const THRESHOLD_1 = 0.5;
const THRESHOLD_2 = 1.0;

const COR_FAIXA_1_INICIO = "#E67A7A";
const COR_FAIXA_1_FIM    = "#F2BF91";

const COR_FAIXA_2_INICIO = "#FCDB7E";
const COR_FAIXA_2_FIM    = "#E6F7C8";

const COR_FAIXA_3 = "#D3F2C9";


function definirCorLinha(percentualMeta, razao) {
    if (percentualMeta >= 80) {
        return "rgb(218, 235, 248)";
    }

    return corGradiente(razao);
}


function hexParaRgb(hex) {
    const valor = hex.replace("#", "");

    return [
        parseInt(valor.slice(0, 2), 16),
        parseInt(valor.slice(2, 4), 16),
        parseInt(valor.slice(4, 6), 16)
    ];
}


function interpolarCor(inicio, fim, t) {
    const rgbInicio = hexParaRgb(inicio);
    const rgbFim = hexParaRgb(fim);

    const rgb = rgbInicio.map(
        (valor, i) =>
            Math.round(
                valor + (rgbFim[i] - valor) * t
            )
    );

    return `rgb(${rgb.join(",")})`;
}


function corGradiente(razao) {
    if (razao < THRESHOLD_1) {
        return interpolarCor(
            COR_FAIXA_1_INICIO,
            COR_FAIXA_1_FIM,
            razao / THRESHOLD_1
        );
    }

    if (razao < THRESHOLD_2) {
        return interpolarCor(
            COR_FAIXA_2_INICIO,
            COR_FAIXA_2_FIM,
            (razao - THRESHOLD_1)
            / (THRESHOLD_2 - THRESHOLD_1)
        );
    }

    return COR_FAIXA_3;
}


/* =========================================================
   FORMATAÇÃO
   ========================================================= */

const formatadorNumero = new Intl.NumberFormat("pt-BR");

function formatarNumero(valor) {
    return formatadorNumero.format(valor);
}

function formatarPercentual(valor) {
    return `${valor.toFixed(1).replace(".", ",")}%`;
}

function formatarData(dataIso) {
    const data = new Date(dataIso);

    const dataTexto = data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const horaTexto = data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    return `${dataTexto} - ${horaTexto}`;
}


/* =========================================================
   IDENTIFICAÇÃO / EXIBIÇÃO
   ========================================================= */

function nomeExibicaoUnidade(item) {
    if (item.unidade === "UNIAENE-CFABA") {
        return "CFABA-UNIAENE";
    }

    if (item.unidade.startsWith("ULB-")) {
        const partes = item.unidade.split("-");
        return `${partes[2]}-${partes[1]}`;
    }

    const partes = item.unidade.split("-");

    if (partes.length >= 2) {
        return `${partes[1]}-${partes[0]}`;
    }

    return item.unidade;
}


function campoExibicao(item) {
    if (item.unidade === "UNIAENE-CFABA") {
        return "UNIAENE";
    }

    return item.campo;
}


/* =========================================================
   UNIDADES
   ========================================================= */

function prepararUnidades(dados, metas, dataAtual) {
    return dados
        .map(normalizarItem)
        .map(item => {
            const meta = metas[item.escola_cod] ?? 0;
            const total = item.novos + item.rematricula;

            const percentualMeta =
                meta > 0
                    ? total / meta * 100
                    : 0;

            const razao = calcularRazao(percentualMeta, dataAtual);

            return {
                ...item,
                nome: nomeExibicaoUnidade(item),
                total,
                meta,
                percentualMeta,
                razao
            };
        })
        .sort((a, b) => b.percentualMeta - a.percentualMeta);
}


/* =========================================================
   CAMPOS
   ========================================================= */

function prepararCampos(unidades, dataAtual) {
    const mapa = new Map();

    for (const item of unidades) {
        const nomeCampo = campoExibicao(item);

        if (!mapa.has(nomeCampo)) {
            mapa.set(nomeCampo, {
                campo: nomeCampo,
                novos: 0,
                rematricula: 0,
                total: 0,
                meta: 0
            });
        }

        const campo = mapa.get(nomeCampo);

        campo.novos += item.novos;
        campo.rematricula += item.rematricula;
        campo.total += item.total;
        campo.meta += item.meta;
    }

    const campos = Array.from(mapa.values());

    for (const campo of campos) {
        campo.percentualMeta =
            campo.meta > 0
                ? campo.total / campo.meta * 100
                : 0;

        campo.razao = calcularRazao(campo.percentualMeta, dataAtual);
    }

    campos.sort((a, b) => b.percentualMeta - a.percentualMeta);

    return campos;
}


/* =========================================================
   LINHAS
   ========================================================= */

function criarLinha(
    item,
    posicao,
    propriedadeNome,
    usarGradiente = true
) {
    const tr = document.createElement("tr");

    if (usarGradiente) {
        tr.style.setProperty(
            "--cor-linha",
            definirCorLinha(item.percentualMeta, item.razao)
        );
    }

    if (posicao >= 1 && posicao <= 3) {
        tr.classList.add(`top-${posicao}`);
    }

    tr.innerHTML = `
        <td class="posicao">${posicao}</td>
        <td class="nome">${item[propriedadeNome]}</td>
        <td>${formatarNumero(item.novos)}</td>
        <td>${formatarNumero(item.rematricula)}</td>
        <td>${formatarNumero(item.total)}</td>
        <td>${formatarNumero(item.meta)}</td>
        <td class="percentual">${formatarPercentual(item.percentualMeta)}</td>
    `;

    return tr;
}


/* =========================================================
   TOTAL ULB
   ========================================================= */

function calcularULB(unidades, dataAtual) {
    const ulb = {
        campo: "ULB",
        novos: 0,
        rematricula: 0,
        total: 0,
        meta: 0
    };

    for (const item of unidades) {
        ulb.novos += item.novos;
        ulb.rematricula += item.rematricula;
        ulb.total += item.total;
        ulb.meta += item.meta;
    }

    ulb.percentualMeta =
        ulb.meta > 0
            ? ulb.total / ulb.meta * 100
            : 0;

    ulb.razao = calcularRazao(ulb.percentualMeta, dataAtual);

    return ulb;
}


/* =========================================================
   RENDER
   ========================================================= */

function renderizarUnidades(unidades, ulb) {
    const tbody = document.getElementById("tbody-unidades");
    tbody.innerHTML = "";

    unidades.forEach((item, index) => {
        tbody.appendChild(
            criarLinha(item, index + 1, "nome")
        );
    });

    const linhaULB = criarLinha(
        {
            ...ulb,
            nome: "ULB"
        },
        "",
        "nome",
        false
    );

    linhaULB.classList.add("linha-total");
    linhaULB.children[0].innerHTML = "";

    tbody.appendChild(linhaULB);
}


function renderizarCampos(campos, ulb) {
    const tbody = document.getElementById("tbody-campos");
    tbody.innerHTML = "";

    campos.forEach((item, index) => {
        tbody.appendChild(
            criarLinha(item, index + 1, "campo")
        );
    });

    const linhaULB = criarLinha(
        ulb,
        "",
        "campo",
        false
    );

    linhaULB.classList.add("linha-total");
    linhaULB.children[0].innerHTML = "";

    tbody.appendChild(linhaULB);
}


/* =========================================================
   TELA CHEIA
   ========================================================= */




/* =========================================================
   MAIN
   ========================================================= */

async function main() {
    try {

        const [ranking, metas] = await Promise.all([
            carregarJson("./data/ranking.json"),
            carregarJson("./data/metas.json")
        ]);

        const dataAtual = new Date(ranking.gerado_em);

        const unidades = prepararUnidades(
            ranking.dados,
            metas,
            dataAtual
        );

        const campos = prepararCampos(
            unidades,
            dataAtual
        );

        const ulb = calcularULB(
            unidades,
            dataAtual
        );

        renderizarUnidades(unidades, ulb);
        renderizarCampos(campos, ulb);

        document.getElementById("data-geracao").textContent =
            formatarData(ranking.gerado_em);

    } catch (erro) {
        console.error("Erro ao montar ranking:", erro);
    }
}

main();
