# Web Worker 구현 계획

## Context

### Problem
Magenta 모델 로딩이 메인 스레드를 블로킹하여 브라우저가 응답하지 않음.
파일 업로드 후 UI가 완전히 멈춰서 사용자 경험 최악.

### Solution
Web Worker를 사용하여 모델 로딩 및 전사 작업을 별도 스레드에서 실행.

---

## Work Objectives

### Core Objective
Magenta 모델 로딩 및 오디오 전사를 Web Worker로 분리하여 메인 스레드 블로킹 방지

### Concrete Deliverables
1. `services/audio/magentaWorker.ts` - Web Worker 구현
2. `services/audio/magentaTranscriber.ts` - Worker 사용하도록 수정
3. `vite.config.ts` - Worker 빌드 설정 추가

### Definition of Done
- [ ] Web Worker에서 모델 로딩 성공
- [ ] 파일 업로드 시 UI 응답성 유지
- [ ] 진행률 업데이트 정상 동작
- [ ] 악보 생성 완료

---

## TODOs

- [ ] 1. Web Worker 파일 생성

  **What to do**:
  - `services/audio/magentaWorker.ts` 생성
  - 모델 초기화 로직 구현
  - 오디오 전사 로직 구현
  - 진행률 콜백을 postMessage로 전달

  **Code**:
  ```typescript
  // services/audio/magentaWorker.ts
  import * as mm from '@magenta/music';
  import * as tf from '@tensorflow/tfjs';
  
  const MAGENTA_CHECKPOINT_URL = 'https://storage.googleapis.com/magentadata/js/checkpoints/transcription/onsets_frames_uni';
  
  let model: mm.OnsetsAndFrames | null = null;
  
  self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;
    
    try {
      if (type === 'INIT_MODEL') {
        // TensorFlow.js 백엔드 초기화
        self.postMessage({ type: 'PROGRESS', progress: 5, message: 'Initializing TensorFlow.js...' });
        
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          self.postMessage({ type: 'PROGRESS', progress: 7, message: 'Trying WebGL backend...' });
        } catch (webglError) {
          console.warn('WebGL backend failed, falling back to CPU:', webglError);
          await tf.setBackend('cpu');
          await tf.ready();
          self.postMessage({ type: 'PROGRESS', progress: 7, message: 'WebGL failed, using CPU backend...' });
        }
        
        self.postMessage({ type: 'PROGRESS', progress: 10, message: 'Loading Magenta AI model...' });
        
        model = new mm.OnsetsAndFrames(MAGENTA_CHECKPOINT_URL);
        await model.initialize();
        
        self.postMessage({ type: 'PROGRESS', progress: 15, message: 'Model loaded successfully' });
        self.postMessage({ type: 'MODEL_READY' });
      }
      
      if (type === 'TRANSCRIBE') {
        if (!model) {
          throw new Error('Model not initialized');
        }
        
        const { audioBuffer } = data;
        
        self.postMessage({ type: 'PROGRESS', progress: 30, message: 'Transcribing with AI model...' });
        
        const noteSequence = await model.transcribeFromAudioBuffer(audioBuffer);
        
        self.postMessage({ type: 'PROGRESS', progress: 70, message: 'Extracting notes...' });
        
        self.postMessage({ 
          type: 'TRANSCRIPTION_COMPLETE', 
          data: { noteSequence } 
        });
      }
      
      if (type === 'DISPOSE') {
        if (model) {
          model.dispose();
          model = null;
        }
        self.postMessage({ type: 'DISPOSED' });
      }
      
    } catch (error) {
      self.postMessage({ 
        type: 'ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };
  ```

  **Acceptance Criteria**:
  - [ ] Worker 파일 생성됨
  - [ ] 모델 초기화 로직 구현됨
  - [ ] 진행률 메시지 전송됨

---

- [ ] 2. magentaTranscriber.ts 수정

  **What to do**:
  - Worker 인스턴스 생성 및 관리
  - Worker와 메시지 통신
  - 기존 로직을 Worker 호출로 변경

  **Code**:
  ```typescript
  // services/audio/magentaTranscriber.ts 수정
  import MagentaWorker from './magentaWorker?worker';
  
  let worker: Worker | null = null;
  let modelReady = false;
  
  async function initWorker(onProgress?: (progress: number, message: string) => void): Promise<void> {
    if (modelReady) return;
    
    return new Promise((resolve, reject) => {
      worker = new MagentaWorker();
      
      worker.onmessage = (e: MessageEvent) => {
        const { type, progress, message } = e.data;
        
        if (type === 'PROGRESS') {
          onProgress?.(progress, message);
        }
        
        if (type === 'MODEL_READY') {
          modelReady = true;
          resolve();
        }
        
        if (type === 'ERROR') {
          reject(new Error(e.data.error));
        }
      };
      
      worker.postMessage({ type: 'INIT_MODEL' });
    });
  }
  
  export async function transcribeAudioWithMagenta(
    file: File,
    onProgress?: (progress: number, message: string) => void
  ): Promise<TranscriptionData> {
    // Worker 초기화
    await initWorker(onProgress);
    
    // 오디오 디코딩 (메인 스레드에서 수행)
    onProgress?.(20, 'Decoding audio file...');
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();
    let audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    
    // 리샘플링
    if (audioBuffer.sampleRate !== 16000) {
      onProgress?.(25, 'Resampling audio to 16kHz...');
      const offlineCtx = new OfflineAudioContext(1, Math.floor(audioBuffer.duration * 16000), 16000);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      audioBuffer = await offlineCtx.startRendering();
    }
    
    // Worker에서 전사 수행
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      worker.onmessage = (e: MessageEvent) => {
        const { type, data, progress, message } = e.data;
        
        if (type === 'PROGRESS') {
          onProgress?.(progress, message);
        }
        
        if (type === 'TRANSCRIPTION_COMPLETE') {
          const { noteSequence } = data;
          
          // 나머지 처리 (메인 스레드)
          onProgress?.(80, 'Detecting tempo and key...');
          const bpm = estimateBPM(noteSequence.notes || []);
          const keySignature = detectKeySignatureFromAudio(audioBuffer);
          
          onProgress?.(90, 'Generating sheet music...');
          const { measures, dynamics } = notesToMeasures(noteSequence.notes || [], bpm, keySignature, BEATS_PER_MEASURE);
          
          const validatedMeasures = measures.map(measure => {
            if (!validateMeasureBeats(measure)) {
              return fixMeasureBeats(measure);
            }
            return measure;
          });
          
          onProgress?.(100, 'Complete!');
          
          audioContext.close();
          
          resolve({
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Transcribed by Magenta AI',
            bpm,
            timeSignature: '4/4',
            keySignature,
            measures: validatedMeasures,
            dynamics
          });
        }
        
        if (type === 'ERROR') {
          reject(new Error(data.error));
        }
      };
      
      worker.postMessage({ 
        type: 'TRANSCRIBE', 
        data: { audioBuffer } 
      });
    });
  }
  ```

  **Acceptance Criteria**:
  - [ ] Worker 인스턴스 생성됨
  - [ ] 메시지 통신 구현됨
  - [ ] 기존 로직 유지됨

---

- [ ] 3. Vite 설정 업데이트

  **What to do**:
  - Worker 빌드 설정 추가
  - Worker에서 TensorFlow.js 사용 가능하도록 설정

  **Code**:
  ```typescript
  // vite.config.ts에 추가
  export default defineConfig({
    // ... 기존 설정
    worker: {
      format: 'es',
      plugins: () => [
        nodePolyfills({
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
      ],
    },
  });
  ```

  **Acceptance Criteria**:
  - [ ] Worker 빌드 설정 추가됨
  - [ ] `npm run build` 성공

---

- [ ] 4. 브라우저 테스트

  **What to do**:
  - 개발 서버 재시작
  - Playwright로 파일 업로드
  - UI 응답성 확인
  - 악보 생성 완료 확인

  **Acceptance Criteria**:
  - [ ] 파일 업로드 시 UI 응답함
  - [ ] 진행률 정상 표시
  - [ ] 악보 생성 완료
  - [ ] 콘솔 에러 없음

---

## Success Criteria

- [ ] Web Worker 구현 완료
- [ ] 빌드 성공
- [ ] 브라우저 테스트 통과
- [ ] 메인 스레드 블로킹 해결
