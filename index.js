const express = require("express");
const app = express();

app.use(express.json());

// Import API
const lookupRouter = require("./api/lookup");
app.use("/api", lookupRouter);

// Route Utama
app.get("/", (req, res) => {
    res.json({ status: "success", message: "Welcome to NIK Lookup API!" });
});

// Error Handling
app.use((req, res) => {
    res.status(404).json({ status: "error", message: "Endpoint not found" });
});

// Port (untuk dev lokal)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});

module.exports = app;
