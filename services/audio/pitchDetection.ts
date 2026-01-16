import { YIN_THRESHOLD } from '../../constants/audio';

export function detectPitchYIN(buffer: Float32Array, sampleRate: number): number | null {
  const bufferSize = buffer.length;
  const halfBufferSize = Math.floor(bufferSize / 2);
  
  const yinBuffer = new Float32Array(halfBufferSize);
  
  for (let tau = 0; tau < halfBufferSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }
  
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }
  
  let tau = 2;
  while (tau < halfBufferSize) {
    if (yinBuffer[tau] < YIN_THRESHOLD) {
      while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      break;
    }
    tau++;
  }
  
  if (tau === halfBufferSize || yinBuffer[tau] >= YIN_THRESHOLD) {
    return null;
  }
  
  let betterTau: number;
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < halfBufferSize ? tau + 1 : tau;
  
  if (x0 === tau) {
    betterTau = yinBuffer[tau] <= yinBuffer[x2] ? tau : x2;
  } else if (x2 === tau) {
    betterTau = yinBuffer[tau] <= yinBuffer[x0] ? tau : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tau];
    const s2 = yinBuffer[x2];
    betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }
  
  return sampleRate / betterTau;
}

export function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}
