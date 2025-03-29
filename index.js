const express = require('express');
const bodyParser = require('body-parser');
const { js_beautify } = require('js-beautify');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Kirim file index.html
});
app.get('/wanzbrayy', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html')); // Kirim file index.html
});
app.post('/process', (req, res) => {
    const { code, mode, formattingOptions } = req.body;
    let cleanedCode = "";

    try {
        switch (mode) {
            case "clean":
                cleanedCode = removeComments(code);
                break;
            case "minify":
                cleanedCode = minifyCode(code);
                break;
            case "format":
                cleanedCode = formatCode(code, formattingOptions);
                break;
            case "beautify-html":
                cleanedCode = js_beautify.html(code, formattingOptions);
                break;
            case "beautify-css":
                cleanedCode = js_beautify.css(code, formattingOptions);
                break;
            case "beautify-js":
                cleanedCode = js_beautify(code, formattingOptions);
                break;
            case "convert-to-uppercase":
                cleanedCode = code.toUpperCase();
                break;
            case "convert-to-lowercase":
                cleanedCode = code.toLowerCase();
                break;
            default:
                cleanedCode = removeComments(code);
        }
    } catch (error) {
        console.error("Error processing code:", error);
        return res.status(500).json({ error: "Terjadi kesalahan saat memproses kode." });
    }

    res.json({ cleanedCode });
});

function removeComments(code) {
    let cleaned = code.replace(/\/\/.*$/gm, "");
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//gm, "");
    return cleaned;
}

function minifyCode(code) {
    return code.replace(/\s+/gm, ' ');
}

function formatCode(code, options = {}) {
    try {
        return js_beautify(code, { indent_size: options.indent_size || 2, indent_char: options.indent_char || ' ' });
    } catch (error) {
        console.error("Error formatting code:", error);
        return code;
    }
}

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
