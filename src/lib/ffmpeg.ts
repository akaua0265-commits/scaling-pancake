import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let progressHandler: ((progress: { progress: number; time: number }) => void) | null = null;
let logHandler: ((log: { type: string; message: string }) => void) | null = null;

export const setFFmpegProgressHandler = (handler: ((progress: { progress: number; time: number }) => void) | null) => {
  progressHandler = handler;
};

export const setFFmpegLogHandler = (handler: ((log: { type: string; message: string }) => void) | null) => {
  logHandler = handler;
};

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  
  // Use the multi-threaded version of ffmpeg-core for better performance
  const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
  });

  ffmpeg.on('progress', (progress) => {
    if (progressHandler) {
      progressHandler(progress);
    }
  });

  ffmpeg.on('log', (log) => {
    if (logHandler) {
      logHandler(log);
    }
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

export interface SilenceSegment {
  start: number;
  end: number;
}

// As funções de detecção e remoção agora são mais simples,
// pois a lógica de parsing de logs e progresso foi movida para o componente.

export const runDurationAnalysis = (ffmpeg: FFmpeg, inputFile: string) => {
  return ffmpeg.exec(['-i', inputFile, '-f', 'null', '-']);
};

export const runSilenceDetection = (ffmpeg: FFmpeg, inputFile: string, threshold: number) => {
  const thresholdDB = -60 + (threshold * 0.6);
  return ffmpeg.exec([
    '-i', inputFile,
    '-af', `silencedetect=noise=${thresholdDB}dB:d=0.5`,
    '-f', 'null',
    '-'
  ]);
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