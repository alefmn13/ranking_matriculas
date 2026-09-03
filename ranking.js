async function carregarRanking() {
    const response = await fetch("./data/ranking.json", {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Erro ao carregar ranking: ${response.status}`);
    }

    return response.json();
}

async function main() {
    const ranking = await carregarRanking();

    console.log(ranking.gerado_em);
    console.table(ranking.dados);
}

main();
