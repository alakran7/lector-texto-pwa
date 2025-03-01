let scrollInterval;
let isPaused = false;

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
            startScrolling();  // Inicia el scroll si no ha sido iniciado aún
        } else if (isPaused) {
            isPaused = false;  // Reanuda si estaba pausado
        }
    });

    pauseButton.addEventListener("click", () => {
        isPaused = true;  // Pausa el scroll
    });

    stopButton.addEventListener("click", () => {
        clearInterval(scrollInterval);
        scrollInterval = null;  // Restablece el intervalo al detener el scroll
        textContainer.scrollTop = 0;  // Vuelve al inicio
        localStorage.removeItem("posicionScroll");  // Limpia la posición del scroll en localStorage
    });

    speedInput.addEventListener("input", () => {
        document.getElementById("speedDisplay").innerText = speedInput.value;
    });

    cargarArchivoPorDefecto();
});

function startScrolling() {
    const ppm = parseInt(speedInput.value) || 200;
    const velocidadScroll = (textContainer.scrollHeight / ppm) * 10; // Ajuste dinámico

    clearInterval(scrollInterval);  // Limpia cualquier intervalo anterior
    scrollInterval = setInterval(() => {
        if (!isPaused) {
            textContainer.scrollTop += 2; // Incremento más visible
        }
    }, velocidadScroll);
}

async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        if (file.type === "text/plain") {
            reader.readAsText(file);
        } else if (file.type === "application/pdf") {
            readPDF(file).then(resolve).catch(reject);
        } else {
            reject("Unsupported file format");
        }
    });
}

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
