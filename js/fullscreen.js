(() => {
    const botao = document.getElementById("btn-fullscreen");
    const pagina = document.querySelector(".page");

    if (!botao || !pagina) return;

    function elementoFullscreenAtual() {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    function atualizarEstado() {
        const ativo = Boolean(elementoFullscreenAtual()) || pagina.classList.contains("fullscreen-fallback");

        botao.classList.toggle("is-fullscreen", ativo);

        const descricao = ativo
            ? "Sair da tela cheia"
            : "Abrir em tela cheia";

        botao.title = descricao;
        botao.setAttribute("aria-label", descricao);
    }

    async function entrarFullscreenNativo() {
        if (pagina.requestFullscreen) {
            await pagina.requestFullscreen();
            return true;
        }

        if (pagina.webkitRequestFullscreen) {
            pagina.webkitRequestFullscreen();
            return true;
        }

        return false;
    }

    async function sairFullscreenNativo() {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
            return true;
        }

        if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
            return true;
        }

        return false;
    }

    function entrarFallback() {
        pagina.classList.add("fullscreen-fallback");
        document.body.classList.add("fullscreen-fallback-ativo");
        atualizarEstado();
    }

    function sairFallback() {
        pagina.classList.remove("fullscreen-fallback");
        document.body.classList.remove("fullscreen-fallback-ativo");
        atualizarEstado();
    }

    botao.addEventListener("click", async () => {
        const nativoAtivo = Boolean(elementoFullscreenAtual());
        const fallbackAtivo = pagina.classList.contains("fullscreen-fallback");

        try {
            if (nativoAtivo) {
                await sairFullscreenNativo();
                return;
            }

            if (fallbackAtivo) {
                sairFallback();
                return;
            }

            const suportado = await entrarFullscreenNativo();

            if (!suportado) {
                entrarFallback();
            }
        } catch (erro) {
            console.warn("Fullscreen nativo foi bloqueado. Usando modo expandido como fallback.", erro);
            entrarFallback();
        }
    });

    document.addEventListener("fullscreenchange", atualizarEstado);
    document.addEventListener("webkitfullscreenchange", atualizarEstado);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && pagina.classList.contains("fullscreen-fallback")) {
            sairFallback();
        }
    });

    atualizarEstado();
})();
