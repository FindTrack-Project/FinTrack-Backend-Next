# Dokumentasi API Fintrack Backend

**Versi:** 1.0
**Tanggal:** 2 Juni 2025
**Lokasi:** Yogyakarta, Indonesia

---

## 1. Pendahuluan

Dokumen ini menjelaskan endpoint-endpoint yang tersedia di Fintrack Backend API. API ini dirancang untuk mendukung aplikasi manajemen keuangan pribadi, memungkinkan pengguna untuk mengelola pemasukan, pengeluaran, melihat saldo, dan mendapatkan prediksi pengeluaran.

---

## 2. Base URL

Semua request API harus diawali dengan Base URL berikut:

`http://localhost:3000/api`

*(Catatan: Ganti `3000` dengan port server Anda jika konfigurasi berbeda.)*

---

## 3. Autentikasi (JWT)

Aplikasi ini menggunakan JSON Web Tokens (JWT) untuk tujuan autentikasi.

### 3.1 Alur Autentikasi

1.  **Login:** Pengguna mengirimkan kredensial (email dan password) ke endpoint `/auth/login`.
2.  **Penerimaan Token:** Jika kredensial valid, server akan mengembalikan JWT.
3.  **Penggunaan Token:** Untuk mengakses endpoint yang dilindungi (selain register dan login), klien harus menyertakan JWT ini dalam header `Authorization` pada setiap request.

### 3.2 Header Autentikasi

* **Key:** `Authorization`
* **Value:** `Bearer <YOUR_JWT_TOKEN>`
    *(Ganti `<YOUR_JWT_TOKEN>` dengan token yang Anda dapatkan setelah login. Pastikan ada kata `Bearer` diikuti satu spasi.)*

---

## 4. Daftar Endpoint

### 4.1. Endpoint Autentikasi Pengguna

#### 4.1.1. Registrasi Pengguna

* **HTTP Method:** `POST`
* **URL:** `/auth/register`
* **Deskripsi:** Mendaftarkan pengguna baru ke sistem.
* **Autentikasi:** Tidak diperlukan
* **Request Headers:**
    * `Content-Type: application/json`
* **Request Body (JSON):**
    ```json
    {
        "email": "user.baru@example.com",
        "name": "Nama Pengguna",
        "password": "kataSandiAman123",
        "initialBalance": 0.00
    }
    ```
* **Success Response (Status: 201 Created):**
    ```json
    {
        "message": "User registered successfully",
        "user": {
            "id": "6532d88009d1e3d3f4b4a687",
            "email": "user.baru@example.com",
            "name": "Nama Pengguna",
            "currentBalance": 0,
            "createdAt": "2025-06-02T08:00:00.000Z"
        }
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: `{ "message": "Email and password are required" }`
    * `409 Conflict`: `{ "message": "User with this email already exists" }`
    * `500 Internal Server Error`: `{ "message": "Failed to register user", "error": "..." }`

#### 4.1.2. Login Pengguna

* **HTTP Method:** `POST`
* **URL:** `/auth/login`
* **Deskripsi:** Mengautentikasi pengguna dan mengembalikan token JWT.
* **Autentikasi:** Tidak diperlukan
* **Request Headers:**
    * `Content-Type: application/json`
* **Request Body (JSON):**
    ```json
    {
        "email": "user.test@example.com",
        "password": "strongPassword123"
    }
    ```
* **Success Response (Status: 200 OK):**
    ```json
    {
        "message": "Login successful",
        "token": "YOUR_ACTUAL_JWT_TOKEN_HERE",
        "userId": "665b1d7d2a3c4f5e6d7e8f90",
        "name": "Testing User"
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: `{ "message": "Email and password are required" }`
    * `401 Unauthorized`: `{ "message": "Invalid credentials" }`
    * `500 Internal Server Error`: `{ "message": "Failed to login", "error": "..." }`

---

### 4.2. Endpoint Pengeluaran (Expenses)

#### 4.2.1. Tambah Pengeluaran

* **HTTP Method:** `POST`
* **URL:** `/expenses`
* **Deskripsi:** Menambahkan entri pengeluaran baru untuk pengguna yang terautentikasi dan menyesuaikan saldo.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Content-Type: application/json`
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **Request Body (JSON):** (`userId` diambil dari token, tidak perlu di body)
    ```json
    {
        "amount": 50.75,
        "date": "2025-06-02T14:30:00Z",
        "description": "Makan siang di kantor",
        "category": "Food"
    }
    ```
* **Success Response (Status: 201 Created):**
    ```json
    {
        "message": "Expense added successfully and balance updated",
        "expense": {
            "id": "665b2a2e1f2e3d4c5b6a7d8e",
            "amount": 50.75,
            "date": "2025-06-02T14:30:00.000Z",
            "description": "Makan siang di kantor",
            "userId": "665b1d7d2a3c4f5e6d7e8f90",
            "category": "Food",
            "createdAt": "2025-06-02T14:30:00.000Z",
            "updatedAt": "2025-06-02T14:30:00.000Z"
        },
        "newBalance": 1234.56
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: `{ "message": "Invalid amount. Must be a positive number." }`
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `404 Not Found`: `{ "message": "User not found" }`
    * `500 Internal Server Error`: `{ "message": "Failed to add expense or update balance", "error": "..." }`

#### 4.2.2. Lihat Semua Pengeluaran

* **HTTP Method:** `GET`
* **URL:** `/expenses`
* **Deskripsi:** Mengambil semua entri pengeluaran untuk pengguna yang terautentikasi.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **Success Response (Status: 200 OK):**
    ```json
    {
        "expenses": [
            {
                "id": "665b2a2e1f2e3d4c5b6a7d8e",
                "amount": 50.75,
                "date": "2025-06-02T14:30:00.000Z",
                "description": "Makan siang di kantor",
                "userId": "665b1d7d2a3c4f5e6d7e8f90",
                "category": "Food",
                "createdAt": "2025-06-02T14:30:00.000Z",
                "updatedAt": "2025-06-02T14:30:00.000Z"
            },
            // ... more expense objects
        ]
    }
    ```
* **Error Responses:**
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `500 Internal Server Error`: `{ "message": "Failed to fetch expenses", "error": "..." }`

#### 4.2.3. Update Pengeluaran Berdasarkan ID

* **HTTP Method:** `PUT`
* **URL:** `/expenses/:expenseId`
* **Deskripsi:** Memperbarui detail pengeluaran yang sudah ada dan menyesuaikan saldo.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Content-Type: application/json`
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **URL Params:**
    * `:expenseId` (String): ID unik pengeluaran yang akan diperbarui.
* **Request Body (JSON):** Sertakan field yang ingin diperbarui.
    ```json
    {
        "amount": 60.00,
        "date": "2025-06-02T14:30:00Z",
        "description": "Makan siang di kantor (revisi)",
        "category": "Food"
    }
    ```
* **Success Response (Status: 200 OK):**
    ```json
    {
        "message": "Expense updated successfully and balance adjusted.",
        "expense": {
            "id": "665b2a2e1f2e3d4c5b6a7d8e",
            "amount": 60.00,
            "date": "2025-06-02T14:30:00.000Z",
            "description": "Makan siang di kantor (revisi)",
            "userId": "665b1d7d2a3c4f5e6d7e8f90",
            "category": "Food",
            "createdAt": "2025-06-02T14:30:00.000Z",
            "updatedAt": "2025-06-02T14:35:00.000Z"
        },
        "newBalance": 1234.56 // Saldo setelah penyesuaian
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: `{ "message": "Invalid amount..." }` atau `{ "message": "Expense ID is required." }`
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `403 Forbidden`: `{ "message": "Unauthorized: You do not own this expense." }`
    * `404 Not Found`: `{ "message": "Expense not found." }`
    * `500 Internal Server Error`: `{ "message": "Failed to update expense.", "error": "..." }`

#### 4.2.4. Hapus Pengeluaran Berdasarkan ID

* **HTTP Method:** `DELETE`
* **URL:** `/expenses/:expenseId`
* **Deskripsi:** Menghapus entri pengeluaran dan menyesuaikan saldo.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **URL Params:**
    * `:expenseId` (String): ID unik pengeluaran yang akan dihapus.
* **Success Response (Status: 200 OK):**
    ```json
    {
        "message": "Expense deleted successfully and balance adjusted.",
        "newBalance": 1234.56 // Saldo setelah penyesuaian
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: `{ "message": "Expense ID is required." }`
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `403 Forbidden`: `{ "message": "Unauthorized: You do not own this expense." }`
    * `404 Not Found`: `{ "message": "Expense not found." }`
    * `500 Internal Server Error`: `{ "message": "Failed to delete expense.", "error": "..." }`

---

### 4.3. Endpoint Pemasukan (Incomes)

#### 4.3.1. Tambah Pemasukan

* **HTTP Method:** `POST`
* **URL:** `/incomes`
* **Deskripsi:** Menambahkan entri pemasukan baru untuk pengguna yang terautentikasi dan menyesuaikan saldo.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Content-Type: application/json`
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **Request Body (JSON):** (`userId` diambil dari token, tidak perlu di body)
    ```json
    {
        "amount": 500.00,
        "date": "2025-06-01T09:00:00Z",
        "description": "Pembayaran gaji",
        "source": "Salary"
    }
    ```
* **Success Response (Status: 201 Created):**
    ```json
    {
        "message": "Income added successfully and balance updated",
        "income": {
            "id": "665b2a2e1f2e3d4c5b6a7d8e",
            "amount": 500.00,
            "date": "2025-06-01T09:00:00.000Z",
            "description": "Pembayaran gaji",
            "userId": "665b1d7d2a3c4f5e6d7e8f90",
            "source": "Salary",
            "createdAt": "2025-06-01T09:00:00.000Z",
            "updatedAt": "2025-06-01T09:00:00.000Z"
        },
        "newBalance": 1234.56
    }
    ```
* **Error Responses:** (Serupa dengan Pengeluaran)

#### 4.3.2. Lihat Semua Pemasukan

* **HTTP Method:** `GET`
* **URL:** `/incomes`
* **Deskripsi:** Mengambil semua entri pemasukan untuk pengguna yang terautentikasi.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **Success Response (Status: 200 OK):** (Serupa dengan Pengeluaran)
* **Error Responses:** (Serupa dengan Pengeluaran)

#### 4.3.3. Update Pemasukan Berdasarkan ID

* **HTTP Method:** `PUT`
* **URL:** `/incomes/:incomeId`
* **Deskripsi:** Memperbarui detail pemasukan yang sudah ada dan menyesuaikan saldo.
* **Autentikasi:** JWT Required
* **Request Headers:** (Sama dengan Pengeluaran)
* **URL Params:**
    * `:incomeId` (String): ID unik pemasukan yang akan diperbarui.
* **Request Body (JSON):** Sertakan field yang ingin diperbarui.
    ```json
    {
        "amount": 550.00,
        "date": "2025-06-01T09:00:00Z",
        "description": "Pembayaran gaji (revisi)",
        "source": "Salary"
    }
    ```
* **Success Response (Status: 200 OK):** (Serupa dengan Pengeluaran)
* **Error Responses:** (Serupa dengan Pengeluaran)

#### 4.3.4. Hapus Pemasukan Berdasarkan ID

* **HTTP Method:** `DELETE`
* **URL:** `/incomes/:incomeId`
* **Deskripsi:** Menghapus entri pemasukan dan menyesuaikan saldo.
* **Autentikasi:** JWT Required
* **Request Headers:** (Sama dengan Pengeluaran)
* **URL Params:**
    * `:incomeId` (String): ID unik pemasukan yang akan dihapus.
* **Success Response (Status: 200 OK):** (Serupa dengan Pengeluaran)
* **Error Responses:** (Serupa dengan Pengeluaran)

---

### 4.4. Endpoint Pengguna (Users)

#### 4.4.1. Lihat Saldo Pengguna

* **HTTP Method:** `GET`
* **URL:** `/users/balance`
* **Deskripsi:** Mengambil saldo terkini pengguna yang terautentikasi.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **Success Response (Status: 200 OK):**
    ```json
    {
        "currentBalance": 1234.56
    }
    ```
* **Error Responses:**
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `404 Not Found`: `{ "message": "User not found" }`
    * `500 Internal Server Error`: `{ "message": "Failed to fetch user balance", "error": "..." }`

#### 4.4.2. Lihat Detail Pengguna Berdasarkan ID

* **HTTP Method:** `GET`
* **URL:** `/users/:userId`
* **Deskripsi:** Mengambil detail profil pengguna berdasarkan ID. Membutuhkan `userId` di URL yang harus cocok dengan `userId` dari token.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **URL Params:**
    * `:userId` (String): ID unik pengguna.
* **Success Response (Status: 200 OK):**
    ```json
    {
        "user": {
            "id": "665b1d7d2a3c4f5e6d7e8f90",
            "email": "user.test@example.com",
            "name": "Testing User",
            "currentBalance": 1234.56,
            "createdAt": "2025-06-02T08:00:00.000Z",
            "updatedAt": "2025-06-02T14:30:00.000Z"
        }
    }
    ```
* **Error Responses:**
    * `400 Bad Request`: `{ "message": "User ID is required" }`
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `403 Forbidden`: `{ "message": "Unauthorized: Token does not match requested user ID" }`
    * `404 Not Found`: `{ "message": "User not found" }`
    * `500 Internal Server Error`: `{ "message": "Failed to fetch user details", "error": "..." }`

---

### 4.5. Endpoint Prediksi Pengeluaran (Machine Learning Integration)

#### 4.5.1. Prediksi Pengeluaran Bulanan

* **HTTP Method:** `POST`
* **URL:** `/predict-expense`
* **Deskripsi:** Memicu prediksi pengeluaran untuk bulan berikutnya berdasarkan data historis 6 bulan terakhir dari pengguna yang terautentikasi. Hasil prediksi juga disimpan sebagai rekomendasi anggaran.
* **Autentikasi:** JWT Required
* **Request Headers:**
    * `Content-Type: application/json`
    * `Authorization: Bearer <YOUR_JWT_TOKEN>`
* **Request Body (JSON):**
    * Body dapat kosong (`{}`) karena semua data yang dibutuhkan (userId, data historis) diambil dari token dan database.
    ```json
    {}
    ```
* **Success Response (Status: 200 OK):**
    ```json
    {
        "predicted_expense": 500.25,
        "message": "Prediction successful"
    }
    ```
    * Atau jika tidak ada data historis:
        ```json
        {
            "predicted_expense": 0,
            "message": "No historical expenses found for prediction. Returning default budget."
        }
    ```
* **Error Responses:**
    * `401 Unauthorized`: `{ "message": "Invalid or expired token" }`
    * `500 Internal Server Error`: `{ "error": "Internal server error: Failed to process request.", "details": "..." }`

---
