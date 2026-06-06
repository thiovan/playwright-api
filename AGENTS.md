# Product Requirements Document (PRD)

**Project Name:** Playwright API Automation Engine
**Description:** Sebuah web server berbasis Node.js yang menerima request API berupa JSON workflow untuk menjalankan otomatisasi browser menggunakan Playwright. Sistem ini mendukung eksekusi sinkron dan asinkron (queue/webhook), multi-instance concurrency, konfigurasi browser dinamis, serta mode stealth untuk menghindari deteksi bot.

## 1. Tech Stack & Infrastructure

- **Language:** Node.js (TypeScript/JavaScript)
- **Web Server:** Express.js atau Fastify
- **Automation:** Playwright (`playwright` & `playwright-extra`)
- **Stealth Plugin:** `puppeteer-extra-plugin-stealth` (kompatibel dengan playwright-extra)
- **Queue System:** BullMQ (membutuhkan Redis) untuk manajemen antrian dan multi-instance concurrency.
- **Containerization:** Docker & Docker Compose (menggunakan official Playwright image untuk menghindari isu dependensi OS).

## 2. System Architecture

Sistem terdiri dari dua komponen utama yang dapat di-scale:

1.  **API Web Server:** Menerima HTTP request, melakukan validasi JSON, meneruskan ke engine eksekusi (untuk sync) atau memasukkan ke Redis Queue (untuk async).
2.  **Playwright Workers (Queue Processors):** Mendengarkan antrian dari Redis, mengeksekusi workflow secara konkuren (multi-instance), dan mengirimkan hasil eksekusi ke Callback URL (Webhook).

## 3. API Endpoints

### 3.1. Endpoint 1: Synchronous Execution

- **Path:** `POST /api/v1/sync`
- **Behavior:** Menunggu seluruh proses Playwright selesai. Koneksi tetap terbuka (keep-alive) hingga workflow berakhir.
- **Response:** Mengembalikan hasil eksekusi (success/error, data ekstraksi, atau base64 screenshot).

### 3.2. Endpoint 2: Asynchronous Execution (Queue)

- **Path:** `POST /api/v1/async`
- **Behavior:** Langsung memberikan response HTTP 200/202 bahwa job telah masuk antrian.
- **Requirement:** Payload JSON wajib menyertakan `webhook_url`.
- **Callback:** Setelah worker selesai mengeksekusi workflow, worker akan mengirimkan `POST` request berisi hasil eksekusi ke `webhook_url` tersebut.

## 4. JSON Payload Schema

Format payload JSON yang diterima oleh API:

```json
{
  "config": {
    "headless": true,
    "viewport": { "width": 1280, "height": 720 },
    "userAgent": "custom-user-agent-string",
    "proxy": {
      "server": "[http://proxy.example.com:8000](http://proxy.example.com:8000)"
    } // opsional
  },
  "webhook_url": "[https://client-domain.com/callback](https://client-domain.com/callback)", // Wajib untuk /async
  "workflow": [
    { "action": "goto", "value": "[https://example.com](https://example.com)" },
    { "action": "type", "selector": "input#search", "value": "Playwright" },
    { "action": "click", "selector": "button#submit" }
  ]
}
```

## 5. Workflow Action Handlers

Engine harus melakukan mapping (switch-case atau pattern matching) pada array `workflow` secara sekuensial. Definisi instruksi yang harus didukung:

| Action         | JSON Format Example                                                | Playwright API Equivalent                                                          |
| -------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **goto**       | `{"action": "goto", "value": "<url>"}`                             | `page.goto(value)`                                                                 |
| **close**      | `{"action": "close"}`                                              | `page.close()`                                                                     |
| **click**      | `{"action": "click", "selector": "<ref>"}`                         | `page.locator(selector).click()`                                                   |
| **dblclick**   | `{"action": "dblclick", "selector": "<ref>"}`                      | `page.locator(selector).dblclick()`                                                |
| **type**       | `{"action": "type", "selector": "<ref>", "value": "<text>"}`       | `page.locator(selector).fill(value)`                                               |
| **select**     | `{"action": "select", "selector": "<ref>", "value": "<val>"}`      | `page.locator(selector).selectOption(value)`                                       |
| **check**      | `{"action": "check", "selector": "<ref>"}`                         | `page.locator(selector).check()`                                                   |
| **uncheck**    | `{"action": "uncheck", "selector": "<ref>"}`                       | `page.locator(selector).uncheck()`                                                 |
| **hover**      | `{"action": "hover", "selector": "<ref>"}`                         | `page.locator(selector).hover()`                                                   |
| **drag**       | `{"action": "drag", "selector": "<start>", "value": "<end>"}`      | `page.locator(selector).dragTo(page.locator(value))`                               |
| **upload**     | `{"action": "upload", "selector": "<ref>", "value": "<filepath>"}` | `page.locator(selector).setInputFiles(value)`                                      |
| **screenshot** | `{"action": "screenshot", "selector": "[ref]"}`                    | `page.screenshot()` atau `locator.screenshot()`. Kembalikan sebagai base64 string. |
| **eval**       | `{"action": "eval", "selector": "[ref]", "value": "<func>"}`       | `page.evaluate(func)` atau `locator.evaluate(func)`                                |
| **press**      | `{"action": "press", "value": "<key>"}`                            | `page.keyboard.press(value)`                                                       |
| **keydown**    | `{"action": "keydown", "value": "<key>"}`                          | `page.keyboard.down(value)`                                                        |
| **keyup**      | `{"action": "keyup", "value": "<key>"}`                            | `page.keyboard.up(value)`                                                          |
| **mousewheel** | `{"action": "mousewheel", "dx": <dx>, "dy": <dy>}`                 | `page.mouse.wheel(dx, dy)`                                                         |
| **cookie-set** | `{"action": "cookie-set", "name": "<name>", "value": "<val>"}`     | `context.addCookies([{name, value, url}])`                                         |
| **cookie-get** | `{"action": "cookie-get", "name": "<name>"}`                       | `context.cookies()`, filter by name                                                |
| **wait**       | `{"action": "wait", "value": <milliseconds>}`                      | `page.waitForTimeout(value)` (Tambahan untuk stabilitas)                           |
| **wait-for**   | `{"action": "wait-for", "selector": "<ref>"}`                      | `page.waitForSelector(selector)`                                                   |

## 6. Fitur Spesifik

1. **Stealth Mode:** Wajib menggunakan `playwright-extra` dan mengaktifkan `puppeteer-extra-plugin-stealth` pada inisialisasi browser untuk membypass perlindungan seperti Cloudflare atau Datadome (secara basic).
2. **Concurrency / Multi-instance:** Worker BullMQ harus dikonfigurasi dengan properti `concurrency: N` agar dapat menjalankan `N` instance browser secara paralel tanpa saling blocking. Pastikan setiap workflow berjalan di `BrowserContext` atau instance Browser yang terisolasi.
3. **Error Handling:** Jika suatu step dalam workflow gagal, engine harus menangkap error, menutup browser context, dan mengembalikan/mengirimkan log error tersebut (beserta index action yang gagal) ke response atau webhook.

## 7. Docker Configuration

Buatkan `Dockerfile` dan `docker-compose.yml` dengan spesifikasi berikut:

- Gunakan image dasar dari Microsoft Playwright (misal: `mcr.microsoft.com/playwright:v1.4x.x-focal`) agar seluruh dependensi browser (WebKit, Chromium, Firefox) sudah terinstall di OS level.
- `docker-compose.yml` harus memiliki minimal dua service:

1. **redis:** Menggunakan image `redis:alpine` sebagai message broker untuk antrian.
2. **app:** Service Node.js yang menjalankan API dan Worker, terhubung ke service `redis`.

## 8. AI Implementation Instructions

Kepada AI Agent pembaca dokumen ini, tolong buatkan project ini dengan langkah-langkah berikut:

1. Inisialisasi `package.json` dengan dependensi yang disebutkan (`express`, `playwright`, `playwright-extra`, `puppeteer-extra-plugin-stealth`, `bullmq`, dll).
2. Buat modul `executor.js` yang mem-parsing JSON workflow dan menjalankan Playwright instance secara stealth.
3. Buat modul `queue.js` untuk setup BullMQ worker dan producer.
4. Buat `server.js` untuk mendefinisikan endpoint `/api/v1/sync` dan `/api/v1/async`.
5. Tulis `Dockerfile` dan `docker-compose.yml` yang siap di-build dan di-run.
6. Berikan instruksi cara menjalankan project ini menggunakan `docker-compose up`.

## 9. AI State & Context Management (MEMORY.md) - CRITICAL

Di dalam direktori utama proyek ini, terdapat sebuah file bernama `MEMORY.md`. File ini adalah **jurnal hidup** yang mencatat segala bentuk pengerjaan proyek.

Sebagai AI Agent yang mengerjakan tugas ini, Anda diwajibkan untuk:

1. **Membaca Sebelum Mengeksekusi:** Selalu periksa `MEMORY.md` sebelum menulis atau memodifikasi kode untuk memahami progres terakhir, strategi yang sedang digunakan, dan kendala/bug yang sebelumnya terjadi.
2. **Menulis & Memperbarui secara Real-time:** Setiap kali Anda menyelesaikan sebuah tahapan (Step), menemukan bug/error baru, menerapkan perbaikan, atau membuat keputusan arsitektur penting, Anda **wajib** mencatatnya ke dalam `MEMORY.md`.
3. **Mencegah Repetisi Kesalahan:** Gunakan informasi di `MEMORY.md` untuk menghindari pengulangan pendekatan yang sudah terbukti gagal di sesi sebelumnya, sehingga proses _handover_ ke sesi AI berikutnya berjalan mulus.
