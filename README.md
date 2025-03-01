# API Lookup NIK
API ini digunakan untuk parsing NIK dan mendapatkan informasi wilayah serta umur.

## Endpoint
- **GET /lookup/nik?nik=3204110101010001**
  
## Response
```json
{
  "status": "success",
  "creator": "Aortadev",
  "data": {
    "Nik": "3204110101010001",
    "Kabupaten": "Kabupaten Bandung",
    "Kecamatan": "Cileunyi",
    "Provinsi": "Jawa Barat"
  },
  "Info": {
    "TanggalLahir": "01-01-2001",
    "Umur": "24 tahun",
    "NomorUrut": "0001"
  }
}
```
---

## **🔧 Cara Deploy dari GitHub ke Vercel**
Setelah semua file siap di **repository GitHub**, ikuti langkah ini:

1. **Buka [Vercel Dashboard](https://vercel.com/)**
2. **Klik "New Project"**
3. **Pilih repository GitHub-mu**
4. **Klik "Import"**
5. **Pada "Root Directory", biarkan default**
6. **Klik "Deploy"**
7. **Tunggu beberapa detik, lalu API-mu aktif!**

---

## **🎯 Contoh API yang Berjalan di Vercel**
Setelah deploy, API bisa diakses seperti ini:

https://domain/lookup/nik?nik=3204110101010001

 Don't delete the creator ✨

## **👨‍💻 Creator**
- Aortadev
- Radzz
