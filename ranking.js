async function carregarRanking() {
    const response = await fetch("./data/ranking.json", {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Erro ao carregar ranking: ${response.status}`);
    }

    return response.json();
}
