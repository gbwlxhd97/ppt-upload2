# PPT 이미지 변환기 🎨

PowerPoint 슬라이드를 고품질 이미지로 변환하고, 색상과 키워드 하이라이트를 적용할 수 있는 웹 애플리케이션입니다.

## 🚀 기능

- **📁 PPT 업로드**: .pptx 파일 드래그 앤 드롭 업로드
- **🖼️ 슬라이드 미리보기**: 실시간 슬라이드 이미지 미리보기
- **🎨 색상 커스터마이징**: 배경색, 텍스트색 자유 설정
- **🌟 키워드 하이라이트**: 특정 단어를 다양한 색상으로 강조
- **🎯 테마 선택**: 8가지 사전 정의된 색상 테마
- **📦 일괄 다운로드**: 선택된 슬라이드들을 ZIP으로 다운로드

## 🛠️ 기술 스택

### Frontend
- **React 18** + **TypeScript**
- **Vite** (빌드 도구)
- **Axios** (HTTP 클라이언트)

### Backend
- **FastAPI** (Python)
- **python-pptx** (PPT 파일 처리)
- **Pillow** (이미지 생성)
- **matplotlib** (폰트 지원)

## 🌐 Vercel 배포

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd ppt-to-image-converter
```

### 2. Vercel CLI 설치 및 로그인
```bash
npm i -g vercel
vercel login
```

### 3. 배포
```bash
vercel --prod
```

### 4. 환경 변수 설정 (선택사항)
Vercel 대시보드에서 다음 환경 변수를 설정할 수 있습니다:
- `PYTHON_VERSION`: `3.9` (기본값)

## 🖥️ 로컬 개발

### 1. 의존성 설치
```bash
# 프론트엔드
npm install

# 백엔드 (Python 가상환경)
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 개발 서버 실행
```bash
# 백엔드 서버 (터미널 1)
source venv/bin/activate
uvicorn api.process:app --reload --port 8000

# 프론트엔드 서버 (터미널 2)
npm run dev
```

## 📁 프로젝트 구조

```
ppt-to-image-converter/
├── api/
│   └── process.py          # FastAPI 백엔드
├── src/
│   ├── components/
│   │   ├── SlideSelector.tsx  # 슬라이드 선택 컴포넌트
│   │   └── ui/             # shadcn-ui 컴포넌트들
│   ├── App.tsx             # 메인 앱 컴포넌트
│   └── main.tsx            # 엔트리 포인트
├── vercel.json             # Vercel 배포 설정
├── requirements.txt        # Python 의존성
└── package.json            # Node.js 의존성
```

## 🎨 사용법

1. **파일 업로드**: .pptx 파일을 드래그 앤 드롭 또는 클릭하여 업로드
2. **테마 선택**: 8가지 사전 정의된 테마 중 선택 또는 직접 색상 설정
3. **키워드 입력**: 하이라이트할 키워드들을 쉼표로 구분하여 입력
4. **슬라이드 선택**: 변환하고 싶은 슬라이드들을 체크박스로 선택
5. **변환 및 다운로드**: "변환하기" 버튼 클릭 후 ZIP 파일 다운로드

## 🎯 색상 테마

- 🤍 **클래식**: 흰색 배경, 검정 텍스트
- 🌙 **다크모드**: 어두운 배경, 흰색 텍스트  
- 💙 **파스텔 블루**: 연한 파란색 배경
- 💚 **자연**: 연한 초록색 배경
- 💜 **로얄**: 연한 보라색 배경
- 🧡 **따뜻함**: 연한 주황색 배경
- ❤️ **정열**: 연한 빨간색 배경
- ⚫ **모노크롬**: 회색 배경

## 🔧 Vercel 환경에서의 주요 변경사항

1. **CORS 설정**: Vercel 도메인 추가
2. **폰트 시스템**: matplotlib의 DejaVu Sans 폰트 사용
3. **API 경로**: 절대 경로에서 상대 경로로 변경
4. **서버리스 함수**: FastAPI를 Vercel 서버리스 함수로 변환

## 📝 라이선스

MIT License

## 🤝 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request 