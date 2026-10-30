import { listGames } from './games.mjs';

const games = listGames();

if (process.argv.includes('--json')) {
  // Dipakai GitHub Actions untuk membangun build matrix.
  console.log(JSON.stringify(games.map((g) => ({ id: g.id, title: g.title, appId: g.appId }))));
} else if (games.length === 0) {
  console.log('Belum ada game di games/.');
} else {
  const width = Math.max(...games.map((g) => g.id.length));
  for (const g of games) {
    console.log(`${g.id.padEnd(width)}  ${g.version.padStart(7)}  ${g.appId}`);
  }
}
