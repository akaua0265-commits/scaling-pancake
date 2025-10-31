import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

export interface SilenceSegment {
  start: number;
  end: number;
}

export const detectSilences = async (
  ffmpeg: FFmpeg,
  inputFile: string,
  threshold: number
): Promise<SilenceSegment[]> => {
  const silences: SilenceSegment[] = [];
  const thresholdDB = -60 + (threshold * 0.6);
  let currentSilence: { start: number } | null = null;

  const logCallback = ({ message }: { message: string }) => {
    const silenceStartMatch = message.match(/silence_start: ([\d.]+)/);
    if (silenceStartMatch) {
      currentSilence = { start: parseFloat(silenceStartMatch[1]) };
    }
    
    const silenceEndMatch = message.match(/silence_end: ([\d.]+)/);
    if (silenceEndMatch && currentSilence) {
      const end = parseFloat(silenceEndMatch[1]);
      if (end - currentSilence.start > 0.5) {
        silences.push({
          start: currentSilence.start,
          end: end,
        });
      }
      currentSilence = null;
    }
  };

  ffmpeg.on('log', logCallback);

  try {
    await ffmpeg.exec([
      '-i', inputFile,
      '-af', `silencedetect=noise=${thresholdDB}dB:d=0.5`,
      '-f', 'null',
      '-'
    ]);
  } finally {
    ffmpeg.off('log', logCallback);
  }

  return silences;
};

export const removeSilences = async (
  ffmpeg: FFmpeg,
  inputFile: string,
  silences: SilenceSegment[],
  duration: number,
  onProgress: (progress: number) => void
): Promise<Uint8Array> => {
  if (silences.length === 0) {
    const data = await ffmpeg.readFile(inputFile);
    return data as Uint8Array;
  }

  const segments: Array<{ start: number; end: number }> = [];
  let lastEnd = 0;
  for (const silence of silences) {
    if (silence.start > lastEnd) {
      segments.push({ start: lastEnd, end: silence.start });
    }
    lastEnd = silence.end;
  }
  
  if (lastEnd < duration) {
    segments.push({ start: lastEnd, end: duration });
  }

  if (segments.length === 0) {
    throw new Error('Nenhum segmento de áudio válido encontrado');
  }

  const segmentFiles: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentFile = `segment_${i}.mp4`;
    
    await ffmpeg.exec([
      '-i', inputFile,
      '-ss', segment.start.toString(),
      '-to', segment.end.toString(),
      '-c', 'copy',
      segmentFile
    ]);
    
    segmentFiles.push(segmentFile);
    onProgress(((i + 1) / segments.length) * 80);
  }

  const concatList = segmentFiles.map(f => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat_list.txt', concatList);

  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat_list.txt',
    '-c', 'copy',
    'output.mp4'
  ]);

  onProgress(100);

  const data = await ffmpeg.readFile('output.mp4') as Uint8Array;

  for (const file of segmentFiles) {
    try {
      await ffmpeg.deleteFile(file);
    } catch (e) {
      console.warn(`Failed to delete ${file}:`, e);
    }
  }
  
  try {
    await ffmpeg.deleteFile('concat_list.txt');
    await ffmpeg.deleteFile('output.mp4');
  } catch (e) {
    console.warn('Failed to delete temp files:', e);
  }

  return data;
};

export const getVideoDuration = async (
  ffmpeg: FFmpeg,
  inputFile: string
): Promise<number> => {
  let duration = 0;
  
  const logCallback = ({ message }: { message: string }) => {
    const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }
  };

  ffmpeg.on('log', logCallback);

  try {
    await ffmpeg.exec(['-i', inputFile, '-f', 'null', '-']);
  } finally {
    ffmpeg.off('log', logCallback);
  }
  
  return duration;
};