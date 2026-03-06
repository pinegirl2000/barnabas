import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { authenticate } from '../middleware/auth';

export const uploadRouter = Router();
uploadRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'));
    }
  },
});

const FULL_TARGET = 20 * 1024; // 20KB

async function compressToTarget(buffer: Buffer, targetSize: number, maxWidth: number): Promise<Buffer> {
  let quality = 80;
  let width = maxWidth;

  let result = await sharp(buffer)
    .rotate()
    .resize(width, width, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  while (result.length > targetSize && quality > 20) {
    quality -= 10;
    result = await sharp(buffer)
      .rotate()
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  while (result.length > targetSize && width > 100) {
    width -= 50;
    result = await sharp(buffer)
      .rotate()
      .resize(width, width, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  return result;
}

async function createThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(80, 80, { fit: 'cover' })
    .jpeg({ quality: 60 })
    .toBuffer();
}

function toDataUrl(buf: Buffer): string {
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

uploadRouter.post('/photo', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '파일이 없습니다' });
    return;
  }

  try {
    const [full, thumb] = await Promise.all([
      compressToTarget(req.file.buffer, FULL_TARGET, 600),
      createThumbnail(req.file.buffer),
    ]);

    const url = toDataUrl(full);
    const thumbnail = toDataUrl(thumb);
    const sizeKB = (full.length / 1024).toFixed(1);
    res.json({ url, thumbnail, sizeKB });
  } catch {
    res.status(500).json({ error: '이미지 압축 실패' });
  }
});
