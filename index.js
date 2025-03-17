// Created by Aort4 , And Dont delete yg credit

const express = require("express");
const app = express();

app.use(express.json());

const lookupRouter = require("./api/lookup");
app.use("/api", lookupRouter);

app.get("/", (req, res) => {
    res.json({ status: "success", message: "Welcome to NIK Lookup API!" });
});

app.use((req, res) => {
    res.status(404).json({ status: "error", message: "Endpoint not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
module.exports = app;
