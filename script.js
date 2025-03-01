document.addEventListener("DOMContentLoaded", () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js")
            .then(() => console.log("Service Worker registrado"))
            .catch((error) => console.log("Error al registrar el Service Worker:", error));
    }

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file) {
            const text = await readFile(file);
            textContainer.innerText = text;
        }
    });

    startButton.addEventListener("click", () => {
        if (!scrollInterval) {
            startScrolling();
        } else if (isPaused) {
            isPaused = false;
        }
    });

    pauseButton.addEventListener("click", () => {
        isPaused = true;
    });

    stopButton.addEventListener("click", () => {
        clearInterval(scrollInterval);
        scrollInterval = null;
        textContainer.scrollTop = 0;
        localStorage.removeItem("posicionScroll");
    });

    speedInput.addEventListener("input", () => {
        document.getElementById("speedDisplay").innerText = speedInput.value;
    });

    cargarArchivoPorDefecto();
});

function cargarArchivoPorDefecto() {
    const defaultFile = "textoWarmup.txt"; // Cambia a "default.pdf" si prefieres un PDF
    const fileUrl = window.location.origin + "/lector-texto-pwa/" + defaultFile;

    fetch(fileUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error("Error al cargar el archivo por defecto");
            }
            return response.blob();
        })
        .then(blob => {
            if (defaultFile.endsWith(".txt")) {
                blob.text().then(text => {
                    document.getElementById("textContainer").textContent = text;
                });
            } else if (defaultFile.endsWith(".pdf")) {
                leerPDF(blob);
            }
        })
        .catch(error => console.error("Error al cargar el archivo por defecto:", error));
}

function leerPDF(blob) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onload = function(event) {
        const typedarray = new Uint8Array(event.target.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            let textContent = "";
            const pages = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                pages.push(pdf.getPage(i).then(page => {
                    return page.getTextContent().then(text => {
                        return text.items.map(s => s.str).join(" ");
                    });
                }));
            }

            Promise.all(pages).then(textArray => {
                textContent = textArray.join("\n\n");
                document.getElementById("textContainer").textContent = textContent;
            });
        });
    };
}
