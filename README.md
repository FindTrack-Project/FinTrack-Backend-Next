# Fintrack Backend API

## Deskripsi Proyek

Fintrack Backend API adalah tulang punggung aplikasi manajemen keuangan pribadi Fintrack. API ini menyediakan fungsionalitas untuk otentikasi pengguna, pelacakan pemasukan dan pengeluaran berdasarkan akun, pengelolaan saldo per akun, dan fitur prediksi pengeluaran bulanan menggunakan model Machine Learning eksternal.

## Fitur Utama

- **Autentikasi Pengguna**: Registrasi dan login pengguna menggunakan JWT (JSON Web Tokens) untuk keamanan
- **Manajemen Akun**: Buat, lihat, kelola akun keuangan (misalnya, rekening bank, e-wallet, kas tunai), dan deposit langsung
- **Pelacakan Transaksi**: Catat pemasukan dan pengeluaran, yang masing-masing terkait dengan akun spesifik
- **Manajemen Saldo Akun**: Setiap akun memiliki saldonya sendiri yang diperbarui secara otomatis dengan setiap transaksi
- **Total Saldo Pengguna**: Saldo total pengguna dihitung secara dinamis sebagai penjumlahan dari semua saldo akun mereka
- **Edit & Hapus Transaksi**: Kemampuan untuk memperbarui atau menghapus entri transaksi, dengan penyesuaian saldo akun yang otomatis
- **Validasi Saldo**: Mencegah pengeluaran yang melebihi saldo akun yang tersedia
- **Tujuan Tabungan**: Membuat dan melacak tujuan tabungan, serta mengalokasikan dana dari akun ke tujuan tersebut
- **Transfer Antar Akun**: Memindahkan dana antar akun keuangan pribadi pengguna
- **Prediksi Pengeluaran**: Mengintegrasikan dengan model Machine Learning (Flask API) untuk memprediksi pengeluaran bulan berikutnya berdasarkan riwayat transaksi

## Teknologi yang Digunakan

- **Framework**: Next.js (untuk API Routes)
- **Bahasa Pemrograman**: TypeScript
- **ORM**: Prisma
- **Database**: MongoDB
- **Autentikasi**: JWT (jsonwebtoken), bcryptjs
- **Integrasi ML**: Interaksi dengan Flask API eksternal (membutuhkan Flask API terpisah untuk fitur prediksi)

## Dokumentasi API Endpoints

Semua endpoint API Anda berada di bawah Base URL `https://fintrack-o1bw.vercel.app/api`.

### 1. Autentikasi Pengguna

#### POST /auth/register - Registrasi Pengguna

- **Deskripsi**: Mendaftarkan pengguna baru ke sistem dengan akun default pertama
- **Autentikasi**: Tidak diperlukan
- **Request Body (JSON)**:

```json
{
  "email": "user.baru@example.com",
  "name": "Nama Pengguna",
  "password": "kataSandiAman123",
  "initialBalance": 0.0
}
```

- **Success Response**: 201 Created

#### POST /auth/login - Login Pengguna

- **Deskripsi**: Mengautentikasi pengguna dan mengembalikan token JWT
- **Autentikasi**: Tidak diperlukan
- **Request Body (JSON)**:

```json
{
  "email": "user.test@example.com",
  "password": "strongPassword123"
}
```

- **Success Response**: 200 OK, `{ "token": "...", "userId": "...", "name": "..." }`

### 2. Manajemen Akun

#### POST /accounts - Buat Akun Baru

- **Deskripsi**: Membuat akun bank/wallet baru untuk pengguna yang terautentikasi.
- **Autentikasi**: JWT Required (Header: `Authorization: Bearer <token>`)
- **Request Body (JSON)**:
  ```json
  {
    "name": "BCA Savings",
    "initialBalance": 1000000.0,
    "type": "Bank"
  }
  ```
- **Success Response**:
  - **Status**: 201 Created
  - **Body**:
    ```json
    {
      "message": "Account created successfully.",
      "account": {
        "id": "account_id",
        "name": "BCA Savings",
        "currentBalance": 1000000,
        "type": "Bank",
        "createdAt": "2025-06-12T10:00:00.000Z"
      }
    }
    ```
- **Error Response**:
  - **Status**: 400/401/404/500
  - **Body**:
    ```json
    {
      "message": "Account name is required and must be a non-empty string."
    }
    ```

#### GET /accounts - Lihat Semua Akun Pengguna

- **Deskripsi**: Mengambil semua akun keuangan milik pengguna yang terautentikasi.
- **Autentikasi**: JWT Required
- **Success Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "message": "Accounts fetched successfully.",
      "accounts": [
        {
          "id": "account_id",
          "name": "BCA Savings",
          "currentBalance": 1000000,
          "type": "Bank",
          "createdAt": "2025-06-12T10:00:00.000Z"
        }
      ]
    }
    ```

#### PUT /accounts - Update Akun

- **Deskripsi**: Memperbarui data akun milik pengguna.
- **Autentikasi**: JWT Required
- **Request Body (JSON)**:
  ```json
  {
    "id": "account_id",
    "name": "Tabungan Mandiri",
    "currentBalance": 2000000,
    "type": "Bank"
  }
  ```
- **Success Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "message": "Account updated successfully.",
      "account": {
        "id": "account_id",
        "name": "Tabungan Mandiri",
        "currentBalance": 2000000,
        "type": "Bank",
        "createdAt": "2025-06-12T10:00:00.000Z"
      }
    }
    ```
- **Error Response**:
  - **Status**: 404/400/500
  - **Body**:
    ```json
    {
      "message": "Account not found or not owned by user."
    }
    ```

#### DELETE /accounts - Hapus Akun

- **Deskripsi**: Menghapus akun milik pengguna.
- **Autentikasi**: JWT Required
- **Request Body (JSON)**:
  ```json
  {
    "id": "account_id"
  }
  ```
- **Success Response**:
  - **Status**: 200 OK
  - **Body**:
    ```json
    {
      "message": "Account deleted successfully."
    }
    ```
- **Error Response**:
  - **Status**: 404/400/500
  - **Body**:
    ```json
    {
      "message": "Account not found or not owned by user."
    }
    ```

### 3. Pengeluaran (Expenses)

#### POST /expenses - Tambah Pengeluaran

- **Deskripsi**: Menambahkan entri pengeluaran baru dan menyesuaikan saldo akun terkait
- **Autentikasi**: JWT Required
- **Request Body (JSON)**:

```json
{
  "amount": 50.75,
  "date": "2025-06-02T14:30:00Z",
  "description": "Makan siang",
  "category": "Food",
  "accountId": "YOUR_ACCOUNT_ID"
}
```

- **Success Response**: 201 Created
- **Error**: 400 Bad Request ("Insufficient balance in selected account.")

#### GET /expenses - Lihat Semua Pengeluaran

- **Deskripsi**: Mengambil semua entri pengeluaran untuk pengguna yang terautentikasi
- **Autentikasi**: JWT Required
- **Success Response**: 200 OK, `{ "expenses": [...] }`

#### PUT /expenses/:expenseId - Update Pengeluaran Berdasarkan ID

- **Deskripsi**: Memperbarui detail pengeluaran dan menyesuaikan saldo akun terkait
- **Autentikasi**: JWT Required
- **URL Params**: `:expenseId` (ID pengeluaran)
- **Request Body (JSON)**:

```json
{
  "amount": 60.0,
  "date": "2025-06-02T14:30:00Z",
  "description": "Makan siang (revisi)",
  "category": "Food"
}
```

- **Success Response**: 200 OK
- **Error**: 400 Bad Request ("Insufficient balance in account to increase expense amount.")

#### DELETE /expenses/:expenseId - Hapus Pengeluaran Berdasarkan ID

- **Deskripsi**: Menghapus entri pengeluaran dan menyesuaikan saldo
- **Autentikasi**: JWT Required
- **URL Params**: `:expenseId` (ID pengeluaran)
- **Success Response**: 200 OK

### 4. Pemasukan (Incomes)

#### POST /incomes - Tambah Pemasukan

- **Deskripsi**: Menambahkan entri pemasukan baru untuk pengguna yang terautentikasi dan menyesuaikan saldo
- **Autentikasi**: JWT Required
- **Request Body (JSON)**:

```json
{
  "amount": 500.0,
  "date": "2025-06-01T09:00:00Z",
  "description": "Pembayaran gaji",
  "source": "Salary",
  "accountId": "YOUR_ACCOUNT_ID"
}
```

- **Success Response**: 201 Created

#### GET /incomes - Lihat Semua Pemasukan

- **Deskripsi**: Mengambil semua entri pemasukan untuk pengguna yang terautentikasi
- **Autentikasi**: JWT Required
- **Success Response**: 200 OK, `{ "incomes": [...] }`

#### PUT /incomes/:incomeId - Update Pemasukan Berdasarkan ID

- **Deskripsi**: Memperbarui detail pemasukan yang sudah ada dan menyesuaikan saldo
- **Autentikasi**: JWT Required
- **URL Params**: `:incomeId` (ID pemasukan)
- **Request Body (JSON)**:

```json
{
  "amount": 550.0,
  "date": "2025-06-01T09:00:00Z",
  "description": "Pembayaran gaji (revisi)",
  "source": "Salary"
}
```

- **Success Response**: 200 OK

#### DELETE /incomes/:incomeId - Hapus Pemasukan Berdasarkan ID

- **Deskripsi**: Menghapus entri pemasukan dan menyesuaikan saldo
- **Autentikasi**: JWT Required
- **URL Params**: `:incomeId` (ID pemasukan)
- **Success Response**: 200 OK

### 5. Tujuan Tabungan (Saving Goals)

#### POST /saving-goals - Buat Tujuan Tabungan Baru

- **Deskripsi**: Membuat tujuan tabungan baru dengan target jumlah
- **Autentikasi**: JWT Required
- **Request Body (JSON)**:

```json
{
  "name": "Beli Sepeda Baru",
  "targetAmount": 1200000.0
}
```

- **Success Response**: 201 Created

#### GET /saving-goals - Lihat Semua Tujuan Tabungan

- **Deskripsi**: Mengambil semua tujuan tabungan yang dimiliki pengguna
- **Autentikasi**: JWT Required
- **Success Response**: 200 OK

#### POST /saving-goals/:goalId/allocate - Alokasikan Dana ke Tujuan Tabungan

- **Deskripsi**: Mengalokasikan sejumlah dana dari akun sumber spesifik ke tujuan tabungan
- **Autentikasi**: JWT Required
- **URL Params**: `:goalId` (ID tujuan tabungan)
- **Request Body (JSON)**:

```json
{
  "amount": 500000.0,
  "accountId": "YOUR_SOURCE_ACCOUNT_ID"
}
```

- **Success Response**: 200 OK
- **Error**: 400 Bad Request ("Insufficient balance in source account..." atau "Allocation amount exceeds..." atau "Saving Goal is already completed.")

### 6. Transfer Antar Akun

#### POST /transfers - Transfer Dana Antar Akun

- **Deskripsi**: Melakukan transfer dana dari satu akun pengguna ke akun pengguna lainnya
- **Autentikasi**: JWT Required
- **Request Body (JSON)**:

```json
{
  "sourceAccountId": "YOUR_SOURCE_ACCOUNT_ID",
  "destinationAccountId": "YOUR_DESTINATION_ACCOUNT_ID",
  "amount": 150000.0,
  "description": "Uang makan"
}
```

- **Success Response**: 200 OK
- **Error**: 400 Bad Request ("Insufficient balance in source account..." atau "Source and destination accounts cannot be the same.")

### 7. Pengguna (Users)

#### GET /users/balance - Lihat Saldo Total Pengguna

- **Deskripsi**: Mengambil saldo total terkini pengguna (penjumlahan saldo dari semua akun)
- **Autentikasi**: JWT Required
- **Success Response**: 200 OK, `{ "currentBalance": 1234.56 }`

#### GET /users/:userId - Lihat Detail Pengguna Berdasarkan ID

- **Deskripsi**: Mengambil detail profil pengguna. Membutuhkan userId di URL yang harus cocok dengan userId dari token
- **Autentikasi**: JWT Required
- **URL Params**: `:userId` (ID pengguna)
- **Success Response**: 200 OK, `{ "user": { "id": "...", "email": "...", "name": "..." } }`

### 8. Prediksi Pengeluaran

#### POST /predict-expense - Prediksi Pengeluaran Bulanan

- **Deskripsi**: Memicu prediksi pengeluaran untuk bulan berikutnya berdasarkan data historis 6 bulan terakhir dari pengguna yang terautentikasi. Hasil prediksi juga disimpan sebagai rekomendasi anggaran
- **Autentikasi**: JWT Required
- **Request Body (JSON)**: `{}` (body bisa kosong)
- **Success Response**: 200 OK, `{ "predicted_expense": 500.25, "message": "..." }`

## Kontribusi

Kontribusi disambut baik! Silakan ajukan pull request atau laporkan masalah.

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.
