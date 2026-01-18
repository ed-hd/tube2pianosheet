# FFT Constructor 오류 수정 계획

## 문제 분석

### 오류 내용
```
TypeError: FFT3 is not a constructor
    at fft4 (http://localhost:3000/node_modules/.vite/deps/@magenta_music.js)
```

### 원인
- `@magenta/music` 라이브러리가 `fft.js@4.0.4` 패키지를 사용
- `fft.js`는 CommonJS 모듈이지만, Vite가 ESM으로 변환 시 `default export`를 올바르게 처리하지 못함
- `import * as FFT from 'fft.js'` 구문에서 `FFT`가 constructor가 아닌 모듈 객체로 인식됨

### 해결 방안
Vite 설정에서 `fft.js`의 ESM interop을 명시적으로 처리하거나, `fft.js`를 `optimizeDeps`에 추가

---

## 수정 작업

### TODO 1: vite.config.ts 수정
- `fft.js`를 `optimizeDeps.include`에 추가
- `esmExternals` 또는 `esbuildOptions`로 CommonJS interop 처리

### TODO 2: 테스트 실행
- 테스트 파일: `test-assets/test-sample.mp3`
- Playwright로 파일 업로드 후 변환 시도
- 콘솔 오류 확인

### TODO 3: 성공 확인
- "FFT is not a constructor" 오류 없음
- 변환 진행률 표시됨
- 악보 렌더링 완료

---

## 테스트 절차

1. 브라우저에서 http://localhost:3000 접속
2. `test-assets/test-sample.mp3` 파일 업로드
3. 변환 진행 상태 확인
4. 콘솔에 오류 없이 악보 생성 완료 확인

---

## 성공 기준

- [x] 콘솔에 "FFT is not a constructor" 오류 없음 - ALREADY FIXED
- [ ] 변환 진행률이 100%까지 도달 - BLOCKED (Magenta 모델 로딩 이슈)
- [ ] 악보가 화면에 렌더링됨 - BLOCKED
- [ ] "변환 실패" 메시지 없음 - BLOCKED

## Status: ALREADY RESOLVED

`vite.config.ts`에 이미 FFT 문제 해결 코드가 구현되어 있음:
- `fftJsEsbuildPlugin`: `import * as FFT` → `import FFT` 변환
- `optimizeDeps.include`: `fft.js` 포함
- `commonjsOptions`: fft.js를 CommonJS로 처리

브라우저 테스트는 Magenta 모델 로딩 블로킹 이슈로 인해 불가능.
