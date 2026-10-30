import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, findGame } from './games.mjs';
import { writeAndroidResources } from './android-res.mjs';

/**
 * Membangun APK (dan AAB saat --release) untuk satu game.
 *
 * Script yang sama dipakai di lokal maupun di GitHub Actions, jadi kegagalan CI
 * selalu bisa direproduksi dengan satu perintah.
 *
 *   node scripts/build-android.mjs tower-defense
 *   node scripts/build-android.mjs tower-defense --release
 *
 * Mode --release butuh variabel berikut (di CI datang dari GitHub Secrets):
 *   ANDROID_KEYSTORE_BASE64  keystore .jks yang di-base64
 *   ANDROID_KEYSTORE_PASSWORD
 *   ANDROID_KEY_ALIAS
 *   ANDROID_KEY_PASSWORD
 *
 * Proyek native di android/ digenerate ulang setiap kali dan tidak pernah
 * di-commit, supaya tidak ada hasil build basi yang ikut terbawa.
 */

const args = process.argv.slice(2);
const release = args.includes('--release');
const gameId = args.find((a) => !a.startsWith('--'));

if (!gameId) {
  console.error('Pemakaian: node scripts/build-android.mjs <game-id> [--release]');
  process.exit(1);
}

const game = findGame(gameId);
const androidDir = join(game.dir, 'android');

const run = (cmd, cmdArgs, cwd = game.dir) => {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
  execFileSync(cmd, cmdArgs, { cwd, stdio: 'inherit' });
};

/** Play Store menolak upload dengan versionCode yang tidak naik. */
function versionCodeFrom(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) throw new Error(`Versi "${version}" bukan semver — tidak bisa dijadikan versionCode`);
  const [, major, minor, patch] = m.map(Number);
  if (minor > 99 || patch > 99) {
    throw new Error(`Versi "${version}": minor/patch harus <= 99 agar versionCode tetap naik`);
  }
  return major * 10000 + minor * 100 + patch;
}

function applyVersion(version) {
  const gradlePath = join(androidDir, 'app', 'build.gradle');
  let gradle = readFileSync(gradlePath, 'utf8');
  const code = versionCodeFrom(version);

  // Patch sempit dan sengaja gagal keras: kalau template Capacitor berubah,
  // lebih baik build berhenti daripada diam-diam mengirim versi yang salah.
  const before = gradle;
  gradle = gradle
    .replace(/versionCode\s+\d+/, `versionCode ${code}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);

  if (gradle === before) {
    throw new Error(`Tidak menemukan versionCode/versionName di ${gradlePath} — template Capacitor mungkin berubah`);
  }
  writeFileSync(gradlePath, gradle);
  console.log(`\nversi: ${version} (versionCode ${code})`);
}

function buildTools() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!sdk) throw new Error('ANDROID_HOME / ANDROID_SDK_ROOT belum diset — Android SDK tidak ditemukan');

  const dir = join(sdk, 'build-tools');
  if (!existsSync(dir)) throw new Error(`Tidak ada build-tools di ${dir}`);

  // Ambil versi build-tools tertinggi yang terpasang.
  const versions = readdirSync(dir).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const latest = versions[versions.length - 1];
  if (!latest) throw new Error(`Tidak ada versi build-tools terpasang di ${dir}`);
  return join(dir, latest);
}

function writeKeystore() {
  const required = ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Build release butuh variabel berikut tapi belum ada: ${missing.join(', ')}`);
  }

  const path = join(androidDir, 'signing.jks');
  writeFileSync(path, Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, 'base64'));
  return path;
}

// ---------------------------------------------------------------- jalankan

console.log(`▸ ${game.title} (${game.id}) — ${release ? 'release' : 'debug'}`);

run('npm', ['run', 'build', '--workspace', game.pkgName], ROOT);
rmSync(androidDir, { recursive: true, force: true });
run('npx', ['cap', 'add', 'android']);
run('npx', ['cap', 'sync', 'android']);
writeAndroidResources(game);

applyVersion(game.version);

const outDir = join(ROOT, 'dist-android');
mkdirSync(outDir, { recursive: true });

if (!release) {
  run('./gradlew', ['assembleDebug', '--no-daemon'], androidDir);
  const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const dest = join(outDir, `${game.id}-${game.version}-debug.apk`);
  copyFileSync(apk, dest);
  console.log(`\n✓ ${dest}`);
} else {
  const keystore = writeKeystore();
  const tools = buildTools();
  const storePass = process.env.ANDROID_KEYSTORE_PASSWORD;
  const keyPass = process.env.ANDROID_KEY_PASSWORD;
  const alias = process.env.ANDROID_KEY_ALIAS;

  run('./gradlew', ['assembleRelease', 'bundleRelease', '--no-daemon'], androidDir);

  // Menandatangani di luar Gradle: tidak perlu menambal build.gradle hasil
  // generate, jadi tahan terhadap perubahan template Capacitor.
  const unsignedApk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
  const alignedApk = join(outDir, `${game.id}-${game.version}.apk`);

  run(join(tools, 'zipalign'), ['-p', '-f', '4', unsignedApk, alignedApk], ROOT);
  run(
    join(tools, 'apksigner'),
    ['sign', '--ks', keystore, '--ks-pass', `pass:${storePass}`, '--ks-key-alias', alias, '--key-pass', `pass:${keyPass}`, alignedApk],
    ROOT,
  );
  run(join(tools, 'apksigner'), ['verify', '--verbose', alignedApk], ROOT);

  const aab = join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  const destAab = join(outDir, `${game.id}-${game.version}.aab`);
  copyFileSync(aab, destAab);
  run('jarsigner', [
    '-keystore', keystore,
    '-storepass', storePass,
    '-keypass', keyPass,
    '-sigalg', 'SHA256withRSA',
    '-digestalg', 'SHA-256',
    destAab,
    alias,
  ], ROOT);

  rmSync(keystore, { force: true });
  console.log(`\n✓ ${alignedApk}\n✓ ${destAab}`);
}
