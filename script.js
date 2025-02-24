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
