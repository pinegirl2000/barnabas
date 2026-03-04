import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// .env 파일 로드 (프로젝트 루트)
const envPath = path.resolve(process.cwd(), '.env');
const envPath2 = path.resolve(process.cwd(), '../.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  dotenv.config({ path: envPath2 });
}

console.log('KAKAO_CLIENT_ID loaded:', !!process.env.KAKAO_CLIENT_ID);

import app from './app';
import { runMigrations } from './migrations';

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await runMigrations();
});
