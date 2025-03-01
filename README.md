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
