# Merilis

Tiga kanal, satu tag. Setelah persiapan sekali di bawah selesai, merilis cukup
dengan mendorong satu tag.

## Sekali saja: siapkan signing

Android menolak APK tanpa tanda tangan, dan Play Store mengunci aplikasi ke
keystore yang dipakai pertama kali. **Kalau keystore ini hilang, kamu tidak bisa
lagi mengirim update untuk aplikasi itu selamanya** — simpan baik-baik di luar
repo.

```bash
keytool -genkeypair -v \
  -keystore upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

Ubah ke base64 lalu salin (macOS):

```bash
base64 -i upload.jks | pbcopy
```

Simpan sebagai **repository secrets** di GitHub
(Settings → Secrets and variables → Actions):

| Secret | Isi |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | hasil base64 di atas |
| `ANDROID_KEYSTORE_PASSWORD` | password keystore |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | password key |

Opsional, untuk itch.io:

| | |
|---|---|
| Secret `BUTLER_API_KEY` | dari https://itch.io/user/settings/api-keys |
| Variable `ITCH_USER` | username itch.io kamu |

Job itch.io dilewati diam-diam selama `ITCH_USER` belum diisi, jadi rilis
Android tidak ikut gagal.

## Merilis satu game

1. Naikkan `version` di `games/<id>/package.json`.
2. Commit dan merge ke `main`.
3. Beri tag dan dorong:

```bash
git tag tower-defense-v0.2.0
git push origin tower-defense-v0.2.0
```

Workflow akan membangun APK dan AAB bertanda tangan, membuat GitHub Release
berisi keduanya, dan mendorong build web ke itch.io.

Formatnya `<game-id>-v<versi>`. Workflow menolak jalan kalau versi di tag tidak
sama dengan yang ada di `package.json` — supaya rilis tidak pernah salah label.

### versionCode

Diturunkan otomatis dari versi semver: `major*10000 + minor*100 + patch`.
Jadi `0.2.0` → `200`, `1.0.0` → `10000`. Play Store mewajibkan angka ini selalu
naik di tiap upload, dan rumus ini menjaminnya selama minor dan patch tetap
di bawah 100 — build akan berhenti dengan pesan jelas kalau dilanggar.

## Google Play: unggahan pertama harus manual

Ini satu-satunya bagian yang tidak bisa diotomasi dari GitHub, dan hanya berlaku
sekali per aplikasi.

1. Daftar Play Console — **$25, sekali bayar untuk seumur hidup akun**.
2. Create app, isi nama dan bahasa.
3. Unggah `.aab` dari GitHub Release ke track **Internal testing**.
4. Lengkapi yang diminta Google sebelum bisa publik: store listing (ikon,
   screenshot, deskripsi), content rating, data safety, target audience, dan
   privacy policy.
5. Review Google biasanya 1–7 hari untuk aplikasi baru.

Setelah unggahan pertama berhasil, sisanya bisa diotomasi dengan service account
Play Developer API — bisa ditambahkan ke `release-android.yml` kapan saja.

> **APK vs AAB.** Aplikasi baru di Play Store wajib AAB. APK tetap dibangun
> karena itu yang bisa langsung di-sideload dan dibagikan lewat GitHub Release
> maupun itch.io.

## Build lokal

```bash
node scripts/build-android.mjs tower-defense             # APK debug
node scripts/build-android.mjs tower-defense --release   # APK + AAB bertanda tangan
```

Butuh Android SDK (`ANDROID_HOME` terpasang) dan JDK 21. Mode `--release`
membaca empat variabel yang sama dengan daftar secret di atas, lewat environment.

Script ini persis yang dijalankan CI, jadi kegagalan di GitHub selalu bisa
direproduksi di mesin sendiri.

## Kalau ada yang gagal

| Gejala | Penyebab biasanya |
|---|---|
| `Tidak menemukan versionCode/versionName` | Template Capacitor berubah setelah upgrade versi; perbaiki `applyVersion()` di `scripts/build-android.mjs` |
| `Build release butuh variabel berikut` | Secret belum diisi, atau workflow dijalankan dari fork (fork tidak mendapat secret) |
| `Tag menyebut vX tapi package.json berisi Y` | Naikkan versi di `package.json` dulu, baru beri tag |
| Gradle gagal soal JDK | Capacitor 8 butuh JDK 21; CI sudah memasangnya lewat `setup-java` |
