const fileInput = document.getElementById("fileInput");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const stopButton = document.getElementById("stopButton");
const speedInput = document.getElementById("speedInput");
const textContainer = document.getElementById("textContainer");

let scrollInterval;
let isPaused = false;

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
});

function startScrolling() {
    const ppm = parseInt(speedInput.value) || 200;
    const velocidadScroll = (textContainer.scrollHeight / ppm) * 10; // Ajuste más dinámico

    clearInterval(scrollInterval);
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

async function readPDF(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async function () {
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(reader.result) }).promise;
            let text = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ") + "\n";
            }
            resolve(text);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}
speedInput.addEventListener("input", () => {
    document.getElementById("speedDisplay").innerText = speedInput.value;
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registrado"))
        .catch((error) => console.log("Error al registrar el Service Worker:", error));
}

const modoOscuroBtn = document.getElementById("dark-mode");

// Verificar si el usuario ya activó el modo oscuro antes
if (localStorage.getItem("modoOscuro") === "activado") {
    document.body.classList.add("dark-mode");
    modoOscuroBtn.textContent = "☀️ Modo Claro";
}

modoOscuroBtn.addEventListener("click", function() {
    document.body.classList.toggle("dark-mode");

    // Guardar la preferencia en localStorage
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("modoOscuro", "activado");
        modoOscuroBtn.textContent = "☀️ Modo Claro";
    } else {
        localStorage.setItem("modoOscuro", "desactivado");
        modoOscuroBtn.textContent = "🌙 Modo Oscuro";
    }
});


const textoContainer = document.getElementById("textContainer");

// Función para guardar la posición del scroll
function guardarPosicionScroll() {
    localStorage.setItem("posicionScroll", textoContainer.scrollTop);
}

// Guardar la posición del scroll cada vez que se mueve
textoContainer.addEventListener("scroll", guardarPosicionScroll);


document.addEventListener("DOMContentLoaded", function () {
    const posicionGuardada = localStorage.getItem("posicionScroll");

    if (posicionGuardada) {
        textoContainer.scrollTop = posicionGuardada;
    }
});



stopButton.addEventListener("click", function() {
    localStorage.removeItem("posicionScroll");
});


function cargarArchivoPorDefecto() {
    const defaultFile = "textoWarmup.txt"; // Cambia a "default.pdf" si prefieres un PDF

    fetch(defaultFile)
        .then(response => {
            if (!response.ok) {
                throw new Error("Error al cargar el archivo por defecto");
            }
            return response.blob(); // Convertirlo en un blob
        })
        .then(blob => {
            if (defaultFile.endsWith(".txt")) {
                // Leer archivo TXT
                blob.text().then(text => {
                    textoContainer.textContent = text;
                });
            } else if (defaultFile.endsWith(".pdf")) {
                // Leer archivo PDF con PDF.js
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
                            textoContainer.textContent = textContent;
                        });
                    });
                };
            }
        })
        .catch(error => console.error("Error al cargar el archivo por defecto:", error));
}

// Llamar la función al cargar la página
window.onload = cargarArchivoPorDefecto;
