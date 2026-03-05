import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';

export const uploadRouter = Router();
uploadRouter.use(authenticate);

// uploads 디렉토리 생성
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 메모리에 임시 저장 후 sharp로 압축
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 원본 최대 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'));
    }
  },
});

const TARGET_SIZE = 100 * 1024; // 100KB

async function compressToTarget(buffer: Buffer): Promise<Buffer> {
  // 먼저 리사이즈 (최대 800px) + quality 80으로 시작
  let quality = 80;
  let width = 800;

  let result = await sharp(buffer)
    .rotate()
    .resize(width, width, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  // 100KB 이하가 될 때까지 quality를 낮춤
  while (result.length > TARGET_SIZE && quality > 20) {
    quality -= 10;
    result = await sharp(buffer)
      .rotate()
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  // 아직도 크면 해상도도 줄임
  while (result.length > TARGET_SIZE && width > 200) {
    width -= 100;
    result = await sharp(buffer)
      .rotate()
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  return result;
}

uploadRouter.post('/photo', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '파일이 없습니다' });
    return;
  }

  try {
    const compressed = await compressToTarget(req.file.buffer);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, compressed);

    const sizeKB = (compressed.length / 1024).toFixed(1);
    const url = `/uploads/${filename}`;
    res.json({ url, sizeKB });
  } catch {
    res.status(500).json({ error: '이미지 압축 실패' });
  }
});
