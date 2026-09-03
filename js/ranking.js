async function carregarJson(caminho) {
    const response = await fetch(caminho, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Erro ao carregar ${caminho}: ${response.status}`
        );
    }

    return response.json();
}


/* =========================================================
   DATAS
   ========================================================= */

/*
    Converte uma data JS para o mesmo conceito de número
    serial utilizado no Excel.

    Para a fórmula propriamente dita nem precisamos do
    serial, porque diferença entre datas produz o mesmo
    resultado.

    Estou trabalhando diretamente com dias.
*/
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
    /*
        Neste projeto:
        data final = 30/09/2026
    */

    const dataFinal = new Date(2026, 8, 30);

    const diasRestantes = diferencaDias(
        dataAtual,
        dataFinal
    );

    /*
        Sua fórmula original:

        30 - (data_final - hoje)
    */
    const diasDecorridos = 30 - diasRestantes;

    /*
        1,333333333333334 por dia
    */
    return diasDecorridos * 1.333333333333334;
}


function calcularRazao(percentualMeta, dataAtual) {
    const esperado = calcularEsperado(dataAtual);

    if (esperado <= 0) {
        return 0;
    }

    /*
        percentualMeta está em escala 0..100.

        Exemplo:
        55,6 / 4 = 13,9
    */
    const razao = percentualMeta / esperado;

    /*
        Para fins de gradiente:
        qualquer valor >= 1 equivale a 1.
    */
    return Math.min(
        Math.max(razao, 0),
        1
    );
}


/* =========================================================
   GRADIENTE
   ========================================================= */

function corGradiente(razao) {
    /*
        Gradiente pastel:

        0   -> vermelho muito suave
        0.5 -> amarelo muito suave
        1   -> verde muito suave
    */

    const vermelho = [248, 218, 215];
    const amarelo  = [250, 239, 194];
    const verde    = [214, 237, 217];

    let inicio;
    let fim;
    let t;

    if (razao <= 0.5) {
        inicio = vermelho;
        fim = amarelo;
        t = razao / 0.5;
    } else {
        inicio = amarelo;
        fim = verde;
        t = (razao - 0.5) / 0.5;
    }

    const rgb = inicio.map(
        (valor, i) =>
            Math.round(valor + (fim[i] - valor) * t)
    );

    return `rgb(${rgb.join(",")})`;
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

    const dataTexto = data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

    const horaTexto = data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

    return `${dataTexto} - ${horaTexto}`;
}


/* =========================================================
   IDENTIFICAÇÃO
   ========================================================= */

function siglaCompleta(item) {

    if (item.unidade === "UNIAENE-CFABA") {
        return "UNIAENE-CFABA";
    }

    if (item.unidade.startsWith("ULB-")) {
        return item.unidade;
    }

    return `ULB-${item.campo}-${item.unidade}`;
}


function nomeExibicaoUnidade(item) {

    if (item.unidade === "UNIAENE-CFABA") {
        return "CFABA-UNIAENE";
    }

    if (item.unidade.startsWith("ULB-")) {

        const partes = item.unidade.split("-");

        return `${partes[2]}-${partes[1]}`;
    }

    return `${item.unidade}-${item.campo}`;
}


/* =========================================================
   UNIDADES
   ========================================================= */

function prepararUnidades(dados, metas, dataAtual) {

    return dados.map(item => {

        const sigla = siglaCompleta(item);

        const meta = metas[sigla] ?? 0;

        const total =
            Number(item.novos) +
            Number(item.rematricula);

        const percentualMeta =
            meta > 0
                ? total / meta * 100
                : 0;

        const razao = calcularRazao(
            percentualMeta,
            dataAtual
        );

        return {
            ...item,

            sigla,
            nome: nomeExibicaoUnidade(item),

            total,
            meta,

            percentualMeta,
            razao
        };

    }).sort(
        (a, b) =>
            b.percentualMeta -
            a.percentualMeta
    );
}


/* =========================================================
   CAMPOS
   ========================================================= */

function campoExibicao(item) {
    if (item.unidade === "UNIAENE-CFABA") {
        return "UNIAENE";
    }

    return item.campo;
}


function prepararCampos(unidades, dataAtual) {

    const mapa = new Map();
    const nomeCampo = campoExibicao(item);

    for (const item of unidades) {

        if (!mapa.has(nomeCampo)) {
            mapa.set(
                nomeCampo,
                {
                    campo: nomeCampo,
                    novos: 0,
                    rematricula: 0,
                    total: 0,
                    meta: 0
                }
            );
        }

        const campo = mapa.get(nomeCampo);

        campo.novos += Number(item.novos);

        campo.rematricula += Number(item.rematricula);

        campo.total += item.total;

        campo.meta += item.meta;
    }


    const campos = Array.from(
        mapa.values()
    );


    for (const campo of campos) {

        campo.percentualMeta =
            campo.meta > 0
                ? campo.total / campo.meta * 100
                : 0;

        campo.razao = calcularRazao(
            campo.percentualMeta,
            dataAtual
        );
    }


    campos.sort(
        (a, b) =>
            b.percentualMeta -
            a.percentualMeta
    );


    return campos;
}


/* =========================================================
   BADGE
   ========================================================= */

function htmlPosicao(posicao) {

    if (posicao <= 3) {

        return `
            <span class="badge badge-${posicao}">
                ${posicao}
            </span>
        `;
    }

    return posicao;
}


/* =========================================================
   LINHA
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
            corGradiente(item.razao)
        );
    }

    tr.innerHTML = `
        <td class="posicao">
            ${htmlPosicao(posicao)}
        </td>

        <td class="nome">
            ${item[propriedadeNome]}
        </td>

        <td>
            ${formatarNumero(item.novos)}
        </td>

        <td>
            ${formatarNumero(item.rematricula)}
        </td>

        <td>
            ${formatarNumero(item.total)}
        </td>

        <td>
            ${formatarNumero(item.meta)}
        </td>

        <td class="percentual">
            ${formatarPercentual(item.percentualMeta)}
        </td>
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

        ulb.novos += Number(item.novos);

        ulb.rematricula += Number(item.rematricula);

        ulb.total += item.total;

        ulb.meta += item.meta;
    }


    ulb.percentualMeta =
        ulb.meta > 0
            ? ulb.total / ulb.meta * 100
            : 0;


    ulb.razao = calcularRazao(
        ulb.percentualMeta,
        dataAtual
    );


    return ulb;
}


/* =========================================================
   RENDER
   ========================================================= */

function renderizarUnidades(
    unidades,
    ulb
) {
    const tbody = document.getElementById(
        "tbody-unidades"
    );

    tbody.innerHTML = "";

    unidades.forEach(
        (item, index) => {
            tbody.appendChild(
                criarLinha(
                    item,
                    index + 1,
                    "nome"
                )
            );
        }
    );

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


function renderizarCampos(
    campos,
    ulb
) {

    const tbody = document.getElementById(
        "tbody-campos"
    );


    tbody.innerHTML = "";


    campos.forEach(
        (item, index) => {

            tbody.appendChild(
                criarLinha(
                    item,
                    index + 1,
                    "campo"
                )
            );

        }
    );


    const linhaULB = criarLinha(
        ulb,
        "",
        "campo",
        false
    );


    linhaULB.classList.add(
        "linha-total"
    );


    /*
        Remove posição da ULB.
    */
    linhaULB.children[0].innerHTML = "";


    tbody.appendChild(
        linhaULB
    );
}


/* =========================================================
   MAIN
   ========================================================= */

async function main() {

    try {

        const [
            ranking,
            metas
        ] = await Promise.all([
            carregarJson("./data/ranking.json"),
            carregarJson("./data/metas.json")
        ]);


        /*
            Para o cálculo do ritmo, acho mais correto usar
            a data em que os dados foram gerados, e não
            necessariamente o instante em que alguém abriu
            a página.

            Assim o gradiente permanece coerente com o
            snapshot exibido.
        */
        const dataAtual =
            new Date(ranking.gerado_em);


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


        renderizarUnidades(
            unidades,
            ulb
        );


        renderizarCampos(
            campos,
            ulb
        );


        document.getElementById(
            "data-geracao"
        ).textContent =
            formatarData(
                ranking.gerado_em
            );


    } catch (erro) {

        console.error(
            "Erro ao montar ranking:",
            erro
        );

    }
}


main();
