# PPT 이미지 변환기

PowerPoint 파일을 업로드하여 원하는 슬라이드를 이미지로 변환할 수 있는 웹 애플리케이션입니다.

## 🚀 주요 기능

- PPTX 파일 업로드 및 슬라이드 정보 확인
- 특정 슬라이드 선택 및 이미지 변환
- 키워드 하이라이트 기능
- 반응형 웹 디자인
- shadcn-ui 컴포넌트 기반 UI

## 🛠️ 기술 스택

### Frontend
- **React 18** + **TypeScript**
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **shadcn-ui** - UI 컴포넌트
- **Axios** - HTTP 클라이언트

### Backend
- **FastAPI** - Python 웹 프레임워크
- **python-pptx** - PowerPoint 파일 처리
- **Pillow (PIL)** - 이미지 처리
- **matplotlib** - 차트 및 그래프 처리

## 📋 사전 요구사항

- **Node.js** 18.0.0 이상
- **Python** 3.8 이상
- **npm** 또는 **yarn**

## 🚀 설치 및 실행 방법

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd ppt-to-image-converter
```

### 2. Frontend 의존성 설치

```bash
npm install
```

### 3. Backend 의존성 설치

```bash
# Python 가상환경 생성 (권장)
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Python 패키지 설치
pip install -r requirements.txt
```

### 4. Backend 서버 실행

```bash
# 가상환경이 활성화된 상태에서
cd api
uvicorn process:app --reload --host 0.0.0.0 --port 8000
```

### 5. Frontend 개발 서버 실행

새 터미널에서:

```bash
# 프로젝트 루트 디렉토리에서
npm run dev
```

### 6. 브라우저에서 접속

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000

## 📁 프로젝트 구조

```
ppt-to-image-converter/
├── api/                    # Backend API 서버
│   └── process.py         # FastAPI 메인 서버
├── src/                   # Frontend 소스 코드
│   ├── components/        # React 컴포넌트
│   │   ├── ui/           # shadcn-ui 컴포넌트
│   │   ├── SlideSelector.tsx
│   │   ├── SlideViewer.tsx
│   │   └── CanvasSlideRenderer.tsx
│   ├── lib/              # 유틸리티 함수
│   ├── styles/           # CSS 스타일
│   ├── App.tsx           # 메인 앱 컴포넌트
│   └── main.tsx          # 앱 진입점
├── package.json          # Node.js 의존성
├── requirements.txt      # Python 의존성
└── README.md            # 프로젝트 문서
```

## 🔧 사용 가능한 스크립트

### Frontend
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드된 앱 미리보기
npm run lint         # ESLint 검사
```

### Backend
```bash
# API 서버 실행
uvicorn process:app --reload --host 0.0.0.0 --port 8000

# 또는 다른 포트로 실행
uvicorn process:app --reload --port 8080
```

## 🌐 API 엔드포인트

- `POST /api/slide-info` - PPT 파일의 슬라이드 정보 조회
- `POST /api/get-slide-text` - 특정 슬라이드의 텍스트 추출
- `POST /api/convert-slide` - 슬라이드를 이미지로 변환

## 🚀 배포

### Vercel 배포 (Frontend)
```bash
npm run build
# Vercel CLI 또는 GitHub 연동으로 배포
```

### Backend 배포
- **Railway**, **Render**, **Heroku** 등 지원
- `requirements.txt`와 `api/process.py` 파일 포함

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🆘 문제 해결

### 일반적인 문제들

1. **포트 충돌**: 다른 포트를 사용하거나 실행 중인 프로세스를 종료
2. **Python 가상환경**: 가상환경이 활성화되지 않은 경우 의존성 설치 실패
3. **CORS 오류**: Backend 서버가 실행되지 않았거나 포트가 다른 경우

### 로그 확인
- Frontend: 브라우저 개발자 도구 콘솔
- Backend: 터미널 출력

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 생성해주세요. 