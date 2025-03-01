let scrollInterval;
let isPaused = false;
document.addEventListener("DOMContentLoaded", () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/lector-texto-pwa/sw.js")
            .then(() => console.log("Service Worker registrado"))
            .catch((error) => console.log("Error al registrar el Service Worker:", error));
    }

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (file) {
            const text = await readFile(file);
            textContainer.innerHTML = formatTextToThreeWordsPerLine(text);
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

function formatTextToThreeWordsPerLine(text) {
    const words = text.split(/\s+/);
    let formattedText = "";
    for (let i = 0; i < words.length; i += 7) {
        formattedText += words.slice(i, i + 7).join(" ") + "<br>";
    }
    return formattedText;
}

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
    const defaultFile = "Cap13-16 libro.txt"; // Cambia a "default.pdf" si prefieres un PDF
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
					textContainer.innerHTML =formatTextToThreeWordsPerLine(text);
//                    document.getElementById("textContainer").textContent = formatTextToThreeWordsPerLine(text);
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