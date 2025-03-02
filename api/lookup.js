const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// Fungsi untuk membaca JSON dengan aman
const loadJSON = (fileName) => {
    try {
        const filePath = path.join(__dirname, "../data", fileName);
        console.log(`Membaca file: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.error(`⚠️ File ${fileName} tidak ditemukan!`);
            return [];
        }

        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Gagal membaca ${fileName}:`, error.message);
        return [];
    }
};

// Load data wilayah
const provinces = loadJSON("provinces.json");
const regencies = loadJSON("regencies.json");
const districts = loadJSON("districts.json");

app.get("/lookup/nik", (req, res) => {
    const nik = req.query.nik;
    
    if (!nik || nik.length !== 16) {
        return res.status(400).json({ status: "error", message: "NIK harus 16 digit!" });
    }

    // Ambil kode wilayah
    const provinceCode = nik.substring(0, 2) + "00";
    const regencyCode = nik.substring(0, 4);
    const districtCode = nik.substring(0, 6);

    // Cari data wilayah
    const provinceData = provinces.find(p => p.code === provinceCode);
    const regencyData = regencies.find(r => r.code === regencyCode);
    const districtData = districts.find(d => d.code === districtCode);

    const province = provinceData ? provinceData.name : "Tidak ditemukan";
    const regency = regencyData ? regencyData.name : "Tidak ditemukan";
    const district = districtData ? districtData.name : "Tidak ditemukan";

    // Ambil tanggal lahir
    let day = parseInt(nik.substring(6, 8), 10);
    const month = parseInt(nik.substring(8, 10), 10);
    const year = parseInt(nik.substring(10, 12), 10);

    // Jika angka hari > 40, berarti perempuan (dikurangi 40)
    if (day > 40) day -= 40;

    const birthYear = year >= 25 ? 1900 + year : 2000 + year;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    const birthDate = `${day.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}-${birthYear}`;
    const serialNumber = nik.substring(12, 16);

    res.json({
        status: "success",
        creator: "Aortadev",
        data: {
            Nik: nik,
            Kabupaten: regency,
            Kecamatan: district,
            Provinsi: province
        },
        Info: {
            TanggalLahir: birthDate,
            Umur: `${age} tahun`,
            NomorUrut: serialNumber
        }
    });
});

// Ekspor untuk Vercel
module.exports = app;
