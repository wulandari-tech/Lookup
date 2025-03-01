const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Load data wilayah dari file JSON
const provinces = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/provinces.json")));
const regencies = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/regencies.json")));
const districts = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/districts.json")));

// Fungsi untuk mendapatkan data wilayah dari kode NIK
function getRegionFromNIK(nik) {
    if (nik.length !== 16) return { error: "NIK harus 16 digit" };

    const kodeKabupaten = nik.substring(0, 4);
    const kodeKecamatan = nik.substring(0, 6);
    const kodeProvinsi = nik.substring(0, 2) + "00";

    const provinsi = provinces.find((p) => p.code === kodeProvinsi);
    const kabupaten = regencies.find((r) => r.code.startsWith(kodeKabupaten));
    const kecamatan = districts.find((d) => d.code.startsWith(kodeKecamatan));

    // Parsing tanggal lahir
    let tanggalLahir = nik.substring(6, 12);
    let hari = parseInt(tanggalLahir.substring(0, 2), 10);
    let bulan = tanggalLahir.substring(2, 4);
    let tahun = parseInt("19" + tanggalLahir.substring(4, 6));

    // Jika hari lebih dari 40, berarti wanita
    if (hari > 40) hari -= 40;
    tanggalLahir = `${hari.toString().padStart(2, "0")}-${bulan}-${tahun}`;

    // Hitung umur berdasarkan tahun sekarang
    const tahunSekarang = new Date().getFullYear();
    let umur = tahunSekarang - tahun;

    return {
        Nik: nik,
        Kabupaten: kabupaten ? kabupaten.name : "Tidak ditemukan",
        Kecamatan: kecamatan ? kecamatan.name : "Tidak ditemukan",
        Provinsi: provinsi ? provinsi.name : "Tidak ditemukan",
        TanggalLahir: tanggalLahir,
        Umur: umur,
        NomorUrut: nik.substring(12, 16),
    };
}

// API untuk lookup NIK
app.get("/lookup/nik", (req, res) => {
    const { nik } = req.query;

    if (!nik) {
        return res.status(400).json({ status: "error", message: "NIK diperlukan" });
    }
    const result = getRegionFromNIK(nik);
    if (result.error) {
        return res.status(400).json({ status: "error", message: result.error });
    }
  
res.json({
        status: "success",
        creator: "Aortadev",
        data: {
            Nik: result.Nik,
            Kabupaten: result.Kabupaten,
            Kecamatan: result.Kecamatan,
            Provinsi: result.Provinsi,
        },
        Info: {
            TanggalLahir: result.TanggalLahir,
            Umur: result.Umur + " tahun",
            NomorUrut: result.NomorUrut,
        },
    });
});

// Export handler untuk Vercel
module.exports = app;
