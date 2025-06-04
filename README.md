# Fintrack Backend API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Deskripsi Proyek

Fintrack Backend API adalah tulang punggung aplikasi manajemen keuangan pribadi Fintrack. API ini menyediakan fungsionalitas untuk otentikasi pengguna, pelacakan pemasukan dan pengeluaran berdasarkan akun, pengelolaan saldo per akun, dan fitur prediksi pengeluaran bulanan menggunakan model Machine Learning eksternal.

## Fitur Utama

* **Autentikasi Pengguna:** Registrasi dan login pengguna menggunakan JWT (JSON Web Tokens) untuk keamanan.

* **Manajemen Akun:** Buat, lihat, dan kelola berbagai akun keuangan (misalnya, rekening bank, e-wallet, kas tunai).

* **Pelacakan Transaksi:** Catat pemasukan dan pengeluaran, yang masing-masing terkait dengan akun spesifik.

* **Manajemen Saldo Akun:** Setiap akun memiliki saldonya sendiri yang diperbarui secara otomatis dengan setiap transaksi.

* **Total Saldo Pengguna:** Saldo total pengguna dihitung secara dinamis sebagai penjumlahan dari semua saldo akun mereka.

* **Edit & Hapus Transaksi:** Kemampuan untuk memperbarui atau menghapus entri transaksi, dengan penyesuaian saldo akun yang otomatis.

* **Validasi Saldo:** Mencegah pengeluaran yang melebihi saldo akun yang tersedia.

* **Prediksi Pengeluaran:** Mengintegrasikan dengan model Machine Learning (Flask API) untuk memprediksi pengeluaran bulan berikutnya berdasarkan riwayat transaksi.

## Teknologi yang Digunakan

* **Framework:** Next.js (untuk API Routes)

* **Bahasa Pemrograman:** TypeScript

* **ORM:** Prisma

* **Database:** MongoDB

* **Autentikasi:** JWT (jsonwebtoken), bcryptjs

* **Integrasi ML:** Interaksi dengan Flask API eksternal (membutuhkan Flask API terpisah untuk fitur prediksi)

## Setup Proyek Lokal

Ikuti langkah-langkah di bawah ini untuk menjalankan proyek Fintrack Backend API di lingkungan lokal Anda.

### 1. Klon Repositori

```bash
git clone https://github.com/your-username/Fintrack-Backend.git # Ganti dengan URL repo Anda
cd Fintrack-Backend
```

### 2. Instal Dependensi

Instal semua paket yang diperlukan menggunakan npm atau yarn:

```bash
npm install
# atau
yarn install
```

### 3. Konfigurasi Environment Variables

Buat file `.env` di root proyek Anda (`Fintrack-Backend/`) dan tambahkan variabel lingkungan berikut:

```dotenv
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster-url>/Fintrack-nextjs?retryWrites=true&w=majority"
JWT_SECRET="YOUR_VERY_STRONG_AND_RANDOM_JWT_SECRET_KEY_HERE"
FLASK_API_URL="http://localhost:5000/predict_expense" # Ganti jika Flask API Anda di URL lain
```

* Ganti `<username>`, `<password>`, dan `<cluster-url>` dengan kredensial database MongoDB Anda.

* Ganti `YOUR_VERY_STRONG_AND_RANDOM_JWT_SECRET_KEY_HERE` dengan string acak yang panjang dan kompleks. Anda bisa menggunakan generator string acak online atau `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` di terminal.

### 4. Setup Prisma dan Database

Pastikan skema database Prisma Anda sudah benar. Proyek ini menggunakan model `User`, `Account`, `Expense`, `Income`, `Post`, dan `BudgetRecommendation`.

* **Generasi Prisma Client:**
  Setelah mengatur `.env` dan menginstal dependensi, generate Prisma Client untuk memastikan tipenya selaras dengan skema Anda:

  ```bash
  npx prisma generate
  ```

  *(Catatan: Karena menggunakan MongoDB, Prisma tidak memerlukan `migrate dev`. Perubahan skema langsung diterapkan saat operasi data dilakukan atau setelah `generate`.)*

* **Pembersihan Data Awal (Opsional tapi Direkomendasikan):**
  Jika Anda ingin memulai dengan data keuangan yang bersih (tetapi mempertahankan data pengguna), Anda bisa menjalankan script pembersih:

  1. Buat file `scripts/clear-financial-data.ts` di root proyek.

  2. Isi dengan kode dari sesi kita sebelumnya.

  3. Jalankan `npx tsc scripts/clear-financial-data.ts` lalu `node scripts/clear-financial-data.js`.

### 5. Menjalankan Server Pengembangan

Mulai server Next.js dalam mode pengembangan:

```bash
npm run dev
# atau
yarn dev
```

API Anda akan berjalan di `http://localhost:3000` (atau port lain yang dikonfigurasi oleh Next.js).

## Dokumentasi API Endpoints

Semua endpoint API Anda berada di bawah Base URL `http://localhost:3000/api`.

### Autentikasi Pengguna

#### `POST /auth/register` - Registrasi Pengguna

* **Deskripsi:** Mendaftarkan pengguna baru ke sistem dengan akun default pertama.

* **Autentikasi:** Tidak diperlukan

* **Request Body (JSON):**

  ```json
  {
    "email": "user.baru@example.com",
    "name": "Nama Pengguna",
    "password": "kataSandiAman123",
    "initialBalance": 0.00
  }
  ```

* **Success Response:** `201 Created`

#### `POST /auth/login` - Login Pengguna

* **Deskripsi:** Mengautentikasi pengguna dan mengembalikan token JWT.

* **Autentikasi:** Tidak diperlukan

* **Request Body (JSON):**

  ```json
  {
    "email": "user.test@example.com",
    "password": "strongPassword123"
  }
  ```

* **Success Response:** `200 OK`, `{ "token": "...", "userId": "...", "name": "..." }`

### Manajemen Akun

#### `POST /accounts` - Buat Akun Baru

* **Deskripsi:** Membuat akun bank/wallet baru untuk pengguna yang terautentikasi.

* **Autentikasi:** JWT Required

* **Request Body (JSON):**

  ```json
  {
    "name": "BCA Savings",
    "initialBalance": 1000000.00,
    "type": "Bank"
  }
  ```

* **Success Response:** `201 Created`

#### `GET /accounts` - Lihat Semua Akun Pengguna

* **Deskripsi:** Mengambil semua akun keuangan milik pengguna yang terautentikasi.

* **Autentikasi:** JWT Required

* **Success Response:** `200 OK`, `{ "accounts": [...] }`

### Pengeluaran (Expenses)

#### `POST /expenses` - Tambah Pengeluaran

* **Deskripsi:** Menambahkan entri pengeluaran baru dan menyesuaikan saldo akun terkait.

* **Autentikasi:** JWT Required

* **Request Body (JSON):**

  ```json
  {
    "amount": 50.75,
    "date": "2025-06-02T14:30:00Z",
    "description": "Makan siang",
    "category": "Food",
    "accountId": "YOUR_ACCOUNT_ID"
  }
  ```

* **Success Response:** `201 Created`

* **Error:** `400 Bad Request` (`"Insufficient balance in selected account."`)

#### `GET /expenses` - Lihat Semua Pengeluaran

* **Deskripsi:** Mengambil semua entri pengeluaran untuk pengguna yang terautentikasi.

* **Autentikasi:** JWT Required

* **Success Response:** `200 OK`, `{ "expenses": [...] }`

#### `PUT /expenses/:expenseId` - Update Pengeluaran Berdasarkan ID

* **Deskripsi:** Memperbarui detail pengeluaran dan menyesuaikan saldo akun terkait.

* **Autentikasi:** JWT Required

* **URL Params:** `:expenseId` (ID pengeluaran)

* **Request Body (JSON):**

  ```json
  {
    "amount": 60.00,
    "date": "2025-06-02T14:30:00Z",
    "description": "Makan siang (revisi)",
    "category": "Food"
  }
  ```

* **Success Response:** `200 OK`

* **Error:** `400 Bad Request` (`"Insufficient balance in account to increase expense amount."`)

#### `DELETE /expenses/:expenseId` - Hapus Pengeluaran Berdasarkan ID

* **Deskripsi:** Menghapus entri pengeluaran dan menyesuaikan saldo.

* **Autentikasi:** JWT Required

* **URL Params:** `:expenseId` (ID pengeluaran)

* **Success Response:** `200 OK`

### Pemasukan (Incomes)

#### `POST /incomes` - Tambah Pemasukan

* **Deskripsi:** Menambahkan entri pemasukan baru untuk pengguna yang terautentikasi dan menyesuaikan saldo.

* **Autentikasi:** JWT Required

* **Request Body (JSON):**

  ```json
  {
    "amount": 500.00,
    "date": "2025-06-01T09:00:00Z",
    "description": "Pembayaran gaji",
    "source": "Salary",
    "accountId": "YOUR_ACCOUNT_ID"
  }
  ```

* **Success Response:** `201 Created`

#### `GET /incomes` - Lihat Semua Pemasukan

* **Deskripsi:** Mengambil semua entri pemasukan untuk pengguna yang terautentikasi.

* **Autentikasi:** JWT Required

* **Success Response:** `200 OK`, `{ "incomes": [...] }`

#### `PUT /incomes/:incomeId` - Update Pemasukan Berdasarkan ID

* **Deskripsi:** Memperbarui detail pemasukan yang sudah ada dan menyesuaikan saldo.

* **Autentikasi:** JWT Required

* **URL Params:** `:incomeId` (ID pemasukan)

* **Request Body (JSON):**

  ```json
  {
    "amount": 550.00,
    "date": "2025-06-01T09:00:00Z",
    "description": "Pembayaran gaji (revisi)",
    "source": "Salary"
  }
  ```

* **Success Response:** `200 OK`

#### `DELETE /incomes/:incomeId` - Hapus Pemasukan Berdasarkan ID

* **Deskripsi:** Menghapus entri pemasukan dan menyesuaikan saldo.

* **Autentikasi:** JWT Required

* **URL Params:** `:incomeId` (ID pemasukan)

* **Success Response:** `200 OK`

### Pengguna (Users)

#### `GET /users/balance` - Lihat Saldo Total Pengguna

* **Deskripsi:** Mengambil saldo total terkini pengguna (penjumlahan saldo dari semua akun).

* **Autentikasi:** JWT Required

* **Success Response:** `200 OK`, `{ "currentBalance": 1234.56 }`

#### `GET /users/:userId` - Lihat Detail Pengguna Berdasarkan ID

* **Deskripsi:** Mengambil detail profil pengguna. Membutuhkan `userId` di URL yang harus cocok dengan `userId` dari token.

* **Autentikasi:** JWT Required

* **URL Params:** `:userId` (ID pengguna)

* **Success Response:** `200 OK`, `{ "user": { "id": "...", "email": "...", "name": "..." } }`

### Prediksi Pengeluaran

#### `POST /predict-expense` - Prediksi Pengeluaran Bulanan

* **Deskripsi:** Memicu prediksi pengeluaran untuk bulan berikutnya berdasarkan data historis 6 bulan terakhir dari pengguna yang terautentikasi. Hasil prediksi juga disimpan sebagai rekomendasi anggaran.

* **Autentikasi:** JWT Required

* **Request Body (JSON):**

  ```json
  {}
  ```

* **Success Response:** `200 OK`, `{ "predicted_expense": 500.25, "message": "..." }`

## Kontribusi

Kontribusi disambut baik! Silakan ajukan pull request atau laporkan masalah.

## Lisensi

Proyek ini dilisensikan di bawah [Lisensi MIT](https://opensource.org/licenses/MIT).
