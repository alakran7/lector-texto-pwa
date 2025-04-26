let scrollInterval;
let lineInterval;
let isPaused = false;
let currentLineIndex = 0;
let lines = [];

document.addEventListener("DOMContentLoaded", () => {
	// Aseguramos que solo textContainer esté visible inicialmente
    document.getElementById("textContainer").style.display = "block";
    document.getElementById("lineContainer").style.display = "none";
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/lector-texto-pwa/sw.js")
            .then(() => console.log("Service Worker registrado"))
            .catch((error) => console.log("Error al registrar el Service Worker:", error));
    }

    // Botones de tabs
    document.getElementById("tabScroll").addEventListener("click", () => {
        document.getElementById("textContainer").style.display = "block";
        document.getElementById("lineContainer").style.display = "none";
        document.getElementById("tabScroll").classList.add("active");
        document.getElementById("tabLine").classList.remove("active");
    });

    document.getElementById("tabLine").addEventListener("click", () => {
        document.getElementById("textContainer").style.display = "none";
        document.getElementById("lineContainer").style.display = "block";
        document.getElementById("tabLine").classList.add("active");
        document.getElementById("tabScroll").classList.remove("active");
    });


	
	
	fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        const text = await readFile(file);

        // Usamos la nueva función para formatear el texto por palabras
        const formattedText = formatTextToLinesByWords(text);
        textContainer.innerHTML = formattedText;

        // Dividimos el texto en líneas para la lectura línea por línea
        lines = text.split(/\s+/).reduce((acc, word, index) => {
			const i = Math.floor(index / 7);
			acc[i] = acc[i] ? acc[i] + ' ' + word : word;
			return acc;
		}, []);
        lineContainer.textContent = lines[0] || "";
        currentLineIndex = 0;
    }
});

    startButton.addEventListener("click", () => {
        const isLineMode = document.getElementById("lineContainer").style.display === "block";

        if (isLineMode) {
            startLineByLineReading();
        } else {
            if (!scrollInterval) {
                startScrolling();
            } else if (isPaused) {
                isPaused = false;
            }
        }
    });

    pauseButton.addEventListener("click", () => {
        isPaused = true;
    });

    stopButton.addEventListener("click", () => {
        clearInterval(scrollInterval);
        clearInterval(lineInterval);
        scrollInterval = null;
        lineInterval = null;
        isPaused = false;
        textContainer.scrollTop = 0;
        currentLineIndex = 0;
        lineContainer.textContent = lines[0] || "";
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
    const velocidadScroll = (textContainer.scrollHeight / ppm) * 10;

    clearInterval(scrollInterval);
    scrollInterval = setInterval(() => {
        if (!isPaused) {
            textContainer.scrollTop += 2;
        }
    }, velocidadScroll);
}

function startLineByLineReading() {
    const ppm = parseInt(speedInput.value) || 200;
    const interval = Math.floor(60000 / ppm * 7); // Aproximadamente 7 palabras por línea

    if (lines.length === 0) {
        return; // Si no hay líneas cargadas, no hacemos nada
    }

    clearInterval(lineInterval);
    currentLineIndex = 0; // Reiniciamos el índice de la línea
    const display = document.getElementById("lineContainer");
    display.innerHTML = ""; // Asegúrate de que esté vacío al inicio

    lineInterval = setInterval(() => {
        if (currentLineIndex < lines.length) {
            display.innerHTML = `<p>${lines[currentLineIndex]}</p>`;
            currentLineIndex++;
        } else {
            clearInterval(lineInterval); // Detenemos el intervalo cuando se acaben las líneas
        }
    }, interval);
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
    const defaultFile = "Cap13-16 libro.txt";
    const fileUrl = window.location.origin + "/lector-texto-pwa/" + defaultFile;

    fetch(fileUrl)
        .then(response => {
            if (!response.ok) throw new Error("Error al cargar archivo por defecto");
            return response.blob();
        })
        .then(blob => {
            if (defaultFile.endsWith(".txt")) {
                blob.text().then(text => {
					const formatted = formatTextToLinesByWords(text);
					textContainer.innerHTML = formatted;

					lines = text.split(/\s+/).reduce((acc, word, index) => {
						const i = Math.floor(index / 7);
						acc[i] = acc[i] ? acc[i] + ' ' + word : word;
						return acc;
					}, []);

					lineContainer.textContent = lines[0] || "";
					currentLineIndex = 0;
				});
            } else if (defaultFile.endsWith(".pdf")) {
                leerPDF(blob);
            }
        })
        .catch(console.error);
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
                textContainer.innerHTML = formatTextToLinesByWords(textContent);

				lines = textContent.split(/\s+/).reduce((acc, word, index) => {
					const i = Math.floor(index / 7);
					acc[i] = acc[i] ? acc[i] + ' ' + word : word;
					return acc;
				}, []);

				lineContainer.textContent = lines[0] || "";
				currentLineIndex = 0;
            });
        });
    };
}

function formatTextToLinesByWords(text, wordsPerLine = 7) {
    const words = text.split(/\s+/);  // Dividimos el texto en palabras
    let formattedText = "";
    let currentLine = [];
    
    words.forEach(word => {
        currentLine.push(word);
        
        if (currentLine.length === wordsPerLine) {
            formattedText += currentLine.join(" ") + "<br>";  // Unimos las palabras y las agregamos como una línea
            currentLine = [];  // Reiniciamos la línea
        }
    });
    
    // Si quedan palabras en la última línea
    if (currentLine.length > 0) {
        formattedText += currentLine.join(" ");
    }

    return formattedText;
}
