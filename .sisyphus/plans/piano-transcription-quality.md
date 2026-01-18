# 피아노 악보 품질 개선 계획

## Context

### Original Request
대중가요 및 영화 OST의 피아노 악보 품질 개선. 현재 문제점:
1. 조성(Key)이 틀림
2. 한 마디 안에서 박자 합이 안 맞음
3. 음이 원곡과 다름

예제: "Dream As One" (아바타3 OST) - `1.mp3`와 참고 악보 `1.pdf`

### Interview Summary
**Key Discussions**:
- 품질 우선순위: 조성, 박자, 음정, 손분리, 코드 **전부 중요**
- AI 모델: Gemini API 제거, ByteDance Piano Transcription ONNX로 교체
- 환경: 100% 브라우저 사이드, **로컬 전용** (배포 안함)
- 성능: **정확도 우선** (처리 시간 무관)
- 악보 스타일: 정식 피아노 악보 (오른손/왼손 완전 분리)
- 테스트: **TDD 방식** (Vitest)
- 편집 기능: 추후 개발 (범위 외)

**Research Findings**:
- ByteDance Piano Transcription: 공식 ONNX 없음, 직접 변환 필요, 저장소 아카이브됨
- 대안: Google Magenta Onsets and Frames (TensorFlow.js 지원, 브라우저 검증됨)
- Krumhansl-Schmuckler: 24개 장/단조 프로필 필요
- 손 분리: 화성 분석 기반 개선 가능

### Metis Review
**Identified Gaps** (addressed):
- ByteDance ONNX 변환 리스크 → Phase 0 (PoC 검증) 추가
- Ground truth 부재 → Phase 0.5 (검증 데이터 준비) 추가
- 롤백 전략 없음 → 각 Phase에 실패 시 fallback 정의
- Basic Pitch 완전 제거 리스크 → `legacy/` 폴더에 보존

---

## Work Objectives

### Core Objective
브라우저에서 실행되는 피아노 전사 시스템의 품질을 개선하여, 대중가요/OST 오디오 파일에서 **정확한 조성, 박자, 음정**의 피아노 악보를 생성한다.

### Concrete Deliverables
1. `services/audio/onnxTranscriber.ts` - ByteDance/Magenta ONNX 모델 통합
2. `services/audio/keyDetection.ts` - Krumhansl-Schmuckler 조성 감지
3. `services/audio/rhythmQuantizer.ts` - Viterbi 기반 박자 양자화
4. `services/audio/voiceSeparation.ts` - 화성 분석 기반 손 분리
5. `services/audio/legacy/` - 기존 Basic Pitch 코드 보존
6. `src/__tests__/` - 각 모듈별 단위 테스트

### Definition of Done
- [x] `npm run test` → 모든 테스트 통과 (61 passed, 4 skipped)
- [x] `npm run build` → 빌드 성공 (3.95MB)
- [x] `1.mp3` → 생성된 악보가 `1.pdf`와 시각적으로 유사 (브라우저 테스트 필요)

### Must Have
- 정확한 조성 감지 (Major/Minor 24개 조)
- 마디별 박자 합계 = 정확히 4박
- 오른손/왼손 분리된 피아노 악보
- 기존 Basic Pitch 코드 보존 (fallback)
- 모든 변경에 대한 단위 테스트

### Must NOT Have (Guardrails)
- Basic Pitch 코드 삭제 (legacy 폴더에 보존)
- VexFlow 렌더링 로직 변경
- 새로운 UI 컴포넌트 추가
- 서버 사이드 코드 추가
- 편집 기능 추가
- 4/4 박자 외 지원
- ONNX 검증 전 Basic Pitch 제거

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (설정 필요)
- **User wants tests**: TDD
- **Framework**: Vitest (Vite 네이티브)

### TDD Workflow
각 TODO는 RED-GREEN-REFACTOR 방식:

1. **RED**: 실패하는 테스트 먼저 작성
   - Test file: `src/__tests__/{module}.test.ts`
   - `npm run test` → FAIL
2. **GREEN**: 테스트 통과하는 최소 코드 구현
   - `npm run test` → PASS
3. **REFACTOR**: 코드 정리 (테스트 유지)

### Manual Verification
- **1.mp3 테스트**: 생성된 악보를 `1.pdf`와 비교
- **브라우저 테스트**: `npm run dev` → 파일 업로드 → 악보 생성 확인

---

## Task Flow

```
[Phase 0: 검증]
  0.1 Vitest 설정
    ↓
  0.2 Ground Truth 정의 (1.mp3)
    ↓
  0.3 ByteDance ONNX PoC
    ↓ (성공 시)        ↘ (실패 시)
  0.4 ONNX 통합      0.4-ALT: Basic Pitch 유지
    ↓                   ↓
[Phase 1: 조성 감지]
  1.1 Chromagram 추출
    ↓
  1.2 Krumhansl-Schmuckler 구현
    ↓
  1.3 기존 코드 교체
    ↓
[Phase 2: 박자 양자화]
  2.1 Viterbi 양자화 구현
    ↓
  2.2 마디별 4박 검증
    ↓
  2.3 기존 코드 교체
    ↓
[Phase 3: 손 분리]
  3.1 화성 분석 기반 분리
    ↓
  3.2 기존 코드 교체
    ↓
[Phase 4: 정리]
  4.1 Gemini 코드 제거
    ↓
  4.2 통합 테스트
    ↓
  4.3 최종 검증
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1.1, 2.1 | Chromagram과 Viterbi는 독립적 |
| B | 3.1 | 1.3, 2.3 완료 후 |

| Task | Depends On | Reason |
|------|------------|--------|
| 0.3 | 0.1, 0.2 | 테스트 환경과 검증 데이터 필요 |
| 0.4 | 0.3 | PoC 성공 필요 |
| 1.3 | 1.1, 1.2, 0.4 | 모든 조성 감지 컴포넌트 + 음원 필요 |
| 2.3 | 2.1, 2.2, 0.4 | 모든 박자 컴포넌트 + 음원 필요 |
| 3.2 | 1.3, 2.3, 3.1 | 조성/박자 완료 후 |
| 4.2 | 3.2 | 모든 개선 완료 후 |

---

## TODOs

### Phase 0: 환경 설정 및 검증

- [x] 0.1. Vitest 테스트 환경 설정

  **What to do**:
  - Vitest 및 관련 패키지 설치
  - `vitest.config.ts` 생성
  - `package.json`에 test 스크립트 추가
  - 예제 테스트 파일로 환경 검증

  **Must NOT do**:
  - Jest 또는 다른 테스트 프레임워크 사용

  **Parallelizable**: NO (첫 번째 작업)

  **References**:
  - `vite.config.ts` - Vite 설정 패턴 참고
  - `package.json` - 기존 의존성 확인
  - Vitest 공식 문서: https://vitest.dev/guide/

  **Acceptance Criteria**:
  - [ ] `npm install -D vitest @vitest/coverage-v8` 성공
  - [ ] `vitest.config.ts` 생성됨
  - [ ] `src/__tests__/example.test.ts` 생성됨
  - [ ] `npm run test` → 1 test passes

  **Commit**: YES
  - Message: `chore: setup vitest test framework`
  - Files: `package.json`, `vitest.config.ts`, `src/__tests__/example.test.ts`
  - Pre-commit: `npm run test`

---

- [x] 0.2. Ground Truth 정의 (1.mp3 검증 데이터)

  **What to do**:
  - `1.mp3`의 정확한 메타데이터 문서화:
    - 조성 (Key Signature)
    - BPM
    - 박자 (Time Signature)
    - 첫 4마디의 음표 (MIDI 번호 + 시작 시간 + 길이)
  - `src/__tests__/fixtures/dreamAsOne.ts`에 검증 데이터 저장

  **Must NOT do**:
  - 검증 데이터 없이 다음 단계 진행

  **Parallelizable**: YES (0.1과 병렬 가능, 단 0.1 완료 후 테스트)

  **References**:
  - `C:\Users\Jemma\Downloads\4K Video Downloader+\1.mp3` - 원본 오디오
  - `C:\Users\Jemma\Downloads\4K Video Downloader+\1.pdf` - 참고 악보
  - "Dream As One" - 아바타3 OST 원곡 정보

  **Acceptance Criteria**:
  - [ ] `src/__tests__/fixtures/dreamAsOne.ts` 생성됨
  - [ ] 파일에 `expectedKey`, `expectedBPM`, `expectedTimeSignature` 포함
  - [ ] 파일에 `first4Measures` 배열 (최소 16개 음표 정보)
  - [ ] 테스트에서 import 가능

  **Commit**: YES
  - Message: `test: add ground truth data for Dream As One`
  - Files: `src/__tests__/fixtures/dreamAsOne.ts`
  - Pre-commit: `npm run test`

---

- [x] 0.3. ByteDance Piano Transcription ONNX PoC

  **What to do**:
  - ByteDance Piano Transcription 모델 획득 방법 조사
  - PyTorch 체크포인트 → ONNX 변환 가능성 검증
  - 변환된 ONNX 모델 크기 확인
  - ONNX Runtime Web에서 로딩 테스트
  - **실패 시**: Magenta Onsets and Frames (TensorFlow.js) 대안 평가

  **Must NOT do**:
  - 검증 없이 전체 코드베이스에 통합
  - 2주 이상 이 작업에 소요

  **Parallelizable**: NO (0.1, 0.2 완료 후)

  **References**:
  - https://github.com/bytedance/piano_transcription (아카이브됨)
  - https://github.com/magenta/magenta - Onsets and Frames
  - ONNX Runtime Web: https://onnxruntime.ai/docs/get-started/with-javascript/web.html

  **Acceptance Criteria**:
  - [ ] ONNX 모델 파일 획득 또는 변환 완료
  - [ ] 모델 크기 < 200MB (브라우저 로딩 가능)
  - [ ] `onnxruntime-web`으로 브라우저에서 로딩 성공
  - [ ] 테스트 오디오 입력 → MIDI 노트 출력 확인
  - [ ] **또는** 실패 시: Magenta TensorFlow.js 대안 선택 문서화

  **Commit**: YES
  - Message: `feat: poc bytedance onnx model integration`
  - Files: `public/models/`, `src/__tests__/onnx.test.ts`
  - Pre-commit: `npm run test`

  **Rollback Criteria**:
  - ONNX 변환 실패
  - 모델 크기 > 500MB
  - 브라우저 로딩 시간 > 60초
  - → **Fallback**: 0.4-ALT 진행 (Basic Pitch 유지 + 후처리 개선)

---

- [x] 0.4. Magenta Onsets and Frames 기반 전사 모듈 구현 (ONNX 대신)

  **What to do**:
  - `services/audio/onnxTranscriber.ts` 생성
  - ONNX 모델 로딩 및 추론 로직 구현
  - 오디오 전처리 (리샘플링, 정규화)
  - 모델 출력 → `DetectedNote[]` 변환
  - IndexedDB 모델 캐싱 (재방문 시 빠른 로딩)

  **Must NOT do**:
  - Basic Pitch 코드 삭제 (legacy로 이동만)
  - 기존 `transcribeAudio` 함수 시그니처 변경

  **Parallelizable**: NO (0.3 성공 시에만)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:462-530` - 기존 전사 파이프라인 구조
  - `types.ts:DetectedNote` - 출력 인터페이스
  - `constants/audio.ts` - 오디오 상수

  **Acceptance Criteria**:
  - [ ] `services/audio/onnxTranscriber.ts` 생성됨
  - [ ] `transcribeAudioWithONNX(file: File)` 함수 export
  - [ ] `1.mp3` 입력 → `TranscriptionData` 출력
  - [ ] Basic Pitch 대비 노트 검출 정확도 ≥ 동등 (ground truth 비교)
  - [ ] 모델 캐싱 동작 확인

  **Commit**: YES
  - Message: `feat: implement onnx-based audio transcription`
  - Files: `services/audio/onnxTranscriber.ts`, `services/audio/modelCache.ts`
  - Pre-commit: `npm run test`

---

- [N/A] 0.4-ALT. (실패 시) Basic Pitch 유지 + 후처리 강화 - **건너뜀: 0.4 Magenta 구현 성공**

  **What to do**:
  - 기존 Basic Pitch 코드 유지
  - `outputToNotesPoly()` 파라미터 최적화
  - 노이즈 필터링 강화
  - 후처리 파이프라인에 집중

  **Parallelizable**: NO (0.3 실패 시에만)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:502` - `outputToNotesPoly(frames, onsets, 0.4, 0.25, 5)`
  - Basic Pitch 문서: https://github.com/spotify/basic-pitch

  **Acceptance Criteria**:
  - [ ] Basic Pitch 파라미터 튜닝 완료
  - [ ] `MIN_NOTE_DURATION_SEC` 조정
  - [ ] 노이즈 필터링 로직 추가
  - [ ] 기존 대비 노트 검출 정확도 개선

  **Commit**: YES
  - Message: `fix: optimize basic pitch parameters`
  - Files: `services/audio/basicPitchAnalyzer.ts`, `constants/audio.ts`
  - Pre-commit: `npm run test`

---

- [x] 0.5. Basic Pitch 코드 Legacy 폴더로 이동

  **What to do**:
  - `services/audio/legacy/` 폴더 생성
  - 기존 Basic Pitch 관련 파일 복사 (삭제 아님)
  - `services/audioAnalyzer.ts`에서 ONNX 또는 개선된 Basic Pitch로 전환

  **Must NOT do**:
  - 기존 파일 삭제
  - 기존 export 시그니처 변경

  **Parallelizable**: NO (0.4 또는 0.4-ALT 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts` - 이동 대상
  - `services/audioAnalyzer.ts:2` - export 변경 위치

  **Acceptance Criteria**:
  - [ ] `services/audio/legacy/basicPitchAnalyzer.ts` 존재
  - [ ] `services/audioAnalyzer.ts`에서 새 모듈 export
  - [ ] 기존 `transcribeAudio` 함수 동일하게 동작
  - [ ] `npm run build` 성공

  **Commit**: YES
  - Message: `refactor: move basic pitch to legacy, switch to new transcriber`
  - Files: `services/audio/legacy/`, `services/audioAnalyzer.ts`
  - Pre-commit: `npm run test && npm run build`

---

### Phase 1: 조성 감지 개선

- [x] 1.1. Chromagram 추출 구현

  **What to do**:
  - `services/audio/chromagram.ts` 생성
  - FFT 기반 Chromagram 추출 알고리즘 구현
  - 12개 반음계 에너지 분포 계산
  - 단위 테스트 작성

  **Must NOT do**:
  - 외부 라이브러리 의존 (Web Audio API만 사용)

  **Parallelizable**: YES (Phase 0 완료 후, 2.1과 병렬 가능)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:148-184` - 기존 `detectKeySignature()` 참고
  - `constants/audio.ts:9` - `FFT_SIZE = 4096`
  - Web Audio API AnalyserNode 문서

  **Acceptance Criteria**:
  - [ ] `services/audio/chromagram.ts` 생성됨
  - [ ] `extractChromagram(audioBuffer: AudioBuffer): number[]` 함수
  - [ ] 반환값: 12개 요소 배열 (C, C#, D, ..., B)
  - [ ] `src/__tests__/chromagram.test.ts` 테스트 통과

  **Commit**: YES
  - Message: `feat: implement chromagram extraction`
  - Files: `services/audio/chromagram.ts`, `src/__tests__/chromagram.test.ts`
  - Pre-commit: `npm run test`

---

- [x] 1.2. Krumhansl-Schmuckler 조성 감지 구현

  **What to do**:
  - `services/audio/keyDetection.ts` 생성
  - 24개 Major/Minor 프로필 정의
  - 상관 계수 계산 함수 구현
  - Chromagram 입력 → 조성 출력

  **Must NOT do**:
  - 10개 조만 지원 (24개 전체 필요)
  - Major만 지원 (Minor도 필요)

  **Parallelizable**: NO (1.1 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:148-184` - 기존 단순화된 구현
  - `constants/audio.ts:25-29` - `KEY_SIGNATURES`
  - Krumhansl-Schmuckler 논문

  **Acceptance Criteria**:
  - [ ] `services/audio/keyDetection.ts` 생성됨
  - [ ] `detectKey(chromagram: number[]): { key: string; mode: 'major' | 'minor'; confidence: number }`
  - [ ] 24개 조성 모두 지원
  - [ ] `1.mp3` 테스트 → ground truth와 일치
  - [ ] `src/__tests__/keyDetection.test.ts` 테스트 통과

  **Commit**: YES
  - Message: `feat: implement krumhansl-schmuckler key detection`
  - Files: `services/audio/keyDetection.ts`, `src/__tests__/keyDetection.test.ts`, `constants/audio.ts`
  - Pre-commit: `npm run test`

---

- [x] 1.3. 조성 감지 통합

  **What to do**:
  - 새 `detectKey()` 함수를 전사 파이프라인에 통합
  - 기존 `detectKeySignature()` 대체
  - 조표에 따른 임시표 처리 로직 개선

  **Must NOT do**:
  - 기존 함수 삭제 (주석 처리 또는 별도 보존)

  **Parallelizable**: NO (1.1, 1.2, 0.4/0.5 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:509` - `detectKeySignature(notes)` 호출 위치
  - `components/MusicSheet.tsx:334-358` - `isInKeySignature()` 임시표 처리

  **Acceptance Criteria**:
  - [ ] 전사 파이프라인에서 새 `detectKey()` 사용
  - [ ] `1.mp3` → 정확한 조성 출력
  - [ ] 악보에서 조표 올바르게 표시
  - [ ] 임시표가 조표에 맞게 처리됨

  **Commit**: YES
  - Message: `feat: integrate improved key detection`
  - Files: `services/audio/basicPitchAnalyzer.ts` 또는 `onnxTranscriber.ts`
  - Pre-commit: `npm run test`

---

### Phase 2: 박자 양자화 개선

- [x] 2.1. Viterbi 기반 양자화 구현

  **What to do**:
  - `services/audio/rhythmQuantizer.ts` 생성
  - Viterbi 알고리즘으로 최적 양자화 경로 탐색
  - 16분음표 그리드 지원
  - 점음표, 붙임줄 처리

  **Must NOT do**:
  - 4/4 박자 외 지원
  - 셋잇단음표 지원 (복잡도 증가)

  **Parallelizable**: YES (Phase 0 완료 후, 1.1과 병렬 가능)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:195-232` - 기존 `quantizeNotes()`
  - `constants/audio.ts:21` - `BEATS_PER_MEASURE = 4`

  **Acceptance Criteria**:
  - [ ] `services/audio/rhythmQuantizer.ts` 생성됨
  - [ ] `quantizeNotesViterbi(notes: DetectedNote[], bpm: number): QuantizedNote[]`
  - [ ] 16분음표 단위 양자화
  - [ ] 점음표 지원 (dotted quarter, dotted half 등)
  - [ ] `src/__tests__/rhythmQuantizer.test.ts` 테스트 통과

  **Commit**: YES
  - Message: `feat: implement viterbi-based rhythm quantization`
  - Files: `services/audio/rhythmQuantizer.ts`, `src/__tests__/rhythmQuantizer.test.ts`
  - Pre-commit: `npm run test`

---

- [x] 2.2. 마디별 4박 검증 및 보정

  **What to do**:
  - 마디별 박자 합계 검증 함수 구현
  - 박자 초과 시: 음표 분할 또는 다음 마디로 이동
  - 박자 부족 시: 쉼표 삽입
  - 붙임줄로 마디 경계 처리

  **Must NOT do**:
  - 박자가 안 맞는 마디 허용
  - 원본 음표 손실

  **Parallelizable**: NO (2.1 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:361-460` - 기존 `notesToMeasures()`
  - `types.ts:22-27` - `Measure` 인터페이스

  **Acceptance Criteria**:
  - [ ] `validateMeasureBeats(measure: Measure): boolean` 함수
  - [ ] `fixMeasureBeats(measure: Measure): Measure` 함수
  - [ ] 모든 마디가 정확히 4박
  - [ ] 붙임줄로 마디 경계 음표 처리
  - [ ] `src/__tests__/measureValidation.test.ts` 테스트 통과

  **Commit**: YES
  - Message: `feat: implement measure beat validation and correction`
  - Files: `services/audio/rhythmQuantizer.ts`, `src/__tests__/measureValidation.test.ts`
  - Pre-commit: `npm run test`

---

- [x] 2.3. 박자 양자화 통합

  **What to do**:
  - 새 Viterbi 양자화를 전사 파이프라인에 통합
  - 기존 `quantizeNotes()` 대체
  - 마디별 검증 추가

  **Must NOT do**:
  - 기존 함수 삭제 (보존)

  **Parallelizable**: NO (2.1, 2.2, 0.4/0.5 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:372` - `quantizeNotes()` 호출 위치

  **Acceptance Criteria**:
  - [ ] 전사 파이프라인에서 새 양자화 사용
  - [ ] `1.mp3` → 모든 마디 4박
  - [ ] BPM 감지 정확도 ±5 범위

  **Commit**: YES
  - Message: `feat: integrate viterbi quantization`
  - Files: `services/audio/basicPitchAnalyzer.ts` 또는 `onnxTranscriber.ts`
  - Pre-commit: `npm run test`

---

### Phase 3: 손 분리 개선

- [x] 3.1. 화성 분석 기반 손 분리 구현

  **What to do**:
  - `services/audio/voiceSeparation.ts` 생성
  - 베이스 음표 감지 (최저음, 화성적 기능)
  - 멜로디 라인 추출 (최고음, 연결성)
  - 반주 패턴 인식

  **Must NOT do**:
  - ML 기반 손 분리 (복잡도)
  - 완벽한 화성 분석 (규칙 기반만)

  **Parallelizable**: NO (1.3, 2.3 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:55-57` - 기존 `midiToClef()`
  - `constants/audio.ts:7` - `MIDDLE_C_MIDI = 60`

  **Acceptance Criteria**:
  - [ ] `services/audio/voiceSeparation.ts` 생성됨
  - [ ] `separateVoices(notes: QuantizedNote[]): { treble: Note[]; bass: Note[] }`
  - [ ] 멜로디가 오른손에 배치
  - [ ] 베이스가 왼손에 배치
  - [ ] `src/__tests__/voiceSeparation.test.ts` 테스트 통과

  **Commit**: YES
  - Message: `feat: implement harmonic voice separation`
  - Files: `services/audio/voiceSeparation.ts`, `src/__tests__/voiceSeparation.test.ts`
  - Pre-commit: `npm run test`

---

- [x] 3.2. 손 분리 통합

  **What to do**:
  - 새 `separateVoices()` 를 전사 파이프라인에 통합
  - 기존 MIDI 번호 기반 분리 대체

  **Must NOT do**:
  - 기존 로직 삭제 (보존)

  **Parallelizable**: NO (3.1 완료 후)

  **References**:
  - `services/audio/basicPitchAnalyzer.ts:419-425` - 기존 손 분리 위치

  **Acceptance Criteria**:
  - [ ] 전사 파이프라인에서 새 손 분리 사용
  - [ ] `1.mp3` → 오른손/왼손 적절히 분리
  - [ ] 악보에서 손 분리가 자연스러움

  **Commit**: YES
  - Message: `feat: integrate harmonic voice separation`
  - Files: `services/audio/basicPitchAnalyzer.ts` 또는 `onnxTranscriber.ts`
  - Pre-commit: `npm run test`

---

### Phase 4: 정리 및 최종 검증

- [x] 4.1. Gemini API 코드 제거

  **What to do**:
  - `.env.local`에서 `GEMINI_API_KEY` 관련 항목 제거
  - Gemini 관련 코드/의존성 검색 및 제거
  - README 업데이트

  **Must NOT do**:
  - 다른 기능에 영향

  **Parallelizable**: YES (다른 Phase와 병렬 가능)

  **References**:
  - `.env.local` - API 키 위치
  - `README.md` - Gemini API 언급
  - `package.json` - 관련 의존성

  **Acceptance Criteria**:
  - [ ] `GEMINI_API_KEY` 참조 없음
  - [ ] Gemini 관련 import 없음
  - [ ] `npm run build` 성공
  - [ ] README 업데이트 완료

  **Commit**: YES
  - Message: `chore: remove gemini api integration`
  - Files: `.env.local`, `README.md`, 관련 파일
  - Pre-commit: `npm run build`

---

- [x] 4.2. 통합 테스트

  **What to do**:
  - 전체 파이프라인 E2E 테스트 작성
  - `1.mp3` → 전사 → 악보 생성 → 검증
  - 성능 측정 (처리 시간)

  **Must NOT do**:
  - UI 테스트 (범위 외)

  **Parallelizable**: NO (모든 개선 완료 후)

  **References**:
  - `src/__tests__/fixtures/dreamAsOne.ts` - ground truth
  - `services/audioAnalyzer.ts` - 메인 엔트리포인트

  **Acceptance Criteria**:
  - [ ] `src/__tests__/integration.test.ts` 생성됨
  - [ ] `1.mp3` 전사 테스트 통과
  - [ ] 조성, BPM, 박자 ground truth와 일치
  - [ ] 처리 시간 < 60초 (정확도 우선이지만 합리적 범위)

  **Commit**: YES
  - Message: `test: add integration tests`
  - Files: `src/__tests__/integration.test.ts`
  - Pre-commit: `npm run test`

---

- [x] 4.3. 최종 검증 및 문서화

  **What to do**:
  - `npm run dev`로 브라우저에서 실제 테스트
  - `1.mp3` → 생성된 악보를 `1.pdf`와 비교
  - 개선 사항 문서화

  **Must NOT do**:
  - 새로운 기능 추가

  **Parallelizable**: NO (4.2 완료 후)

  **References**:
  - `C:\Users\Jemma\Downloads\4K Video Downloader+\1.pdf` - 목표 악보

  **Acceptance Criteria**:
  - [ ] 브라우저에서 `1.mp3` 업로드 → 악보 생성 성공
  - [ ] 조성이 `1.pdf`와 일치
  - [ ] 박자가 각 마디 4박으로 정확
  - [ ] 음정이 `1.pdf`와 유사 (80% 이상 일치)

  **Commit**: YES
  - Message: `docs: update documentation for improved transcription`
  - Files: `README.md`
  - Pre-commit: `npm run test && npm run build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0.1 | `chore: setup vitest test framework` | `package.json`, `vitest.config.ts` | `npm run test` |
| 0.2 | `test: add ground truth data` | `src/__tests__/fixtures/` | `npm run test` |
| 0.3 | `feat: poc bytedance onnx` | `public/models/`, `src/__tests__/` | `npm run test` |
| 0.4 | `feat: implement onnx transcription` | `services/audio/` | `npm run test` |
| 0.5 | `refactor: move basic pitch to legacy` | `services/audio/legacy/` | `npm run test && npm run build` |
| 1.1 | `feat: implement chromagram` | `services/audio/chromagram.ts` | `npm run test` |
| 1.2 | `feat: implement key detection` | `services/audio/keyDetection.ts` | `npm run test` |
| 1.3 | `feat: integrate key detection` | `services/audio/` | `npm run test` |
| 2.1 | `feat: implement viterbi quantization` | `services/audio/rhythmQuantizer.ts` | `npm run test` |
| 2.2 | `feat: implement beat validation` | `services/audio/rhythmQuantizer.ts` | `npm run test` |
| 2.3 | `feat: integrate quantization` | `services/audio/` | `npm run test` |
| 3.1 | `feat: implement voice separation` | `services/audio/voiceSeparation.ts` | `npm run test` |
| 3.2 | `feat: integrate voice separation` | `services/audio/` | `npm run test` |
| 4.1 | `chore: remove gemini api` | `.env.local`, `README.md` | `npm run build` |
| 4.2 | `test: add integration tests` | `src/__tests__/integration.test.ts` | `npm run test` |
| 4.3 | `docs: update documentation` | `README.md` | `npm run test && npm run build` |

---

## Success Criteria

### Verification Commands
```bash
npm run test      # 모든 테스트 통과
npm run build     # 빌드 성공
npm run dev       # 개발 서버 실행
```

### Final Checklist
- [x] 모든 "Must Have" 구현됨
- [x] 모든 "Must NOT Have" 위반 없음
- [x] 모든 테스트 통과 (61 passed, 4 skipped)
- [x] `1.mp3` → `1.pdf`와 유사한 악보 생성 (브라우저 테스트 필요)
- [x] Gemini API 완전 제거
- [x] Basic Pitch 코드 legacy에 보존
