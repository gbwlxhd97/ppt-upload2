from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pptx import Presentation
from PIL import Image, ImageDraw, ImageFont
import io
import zipfile
import json
import base64
from datetime import datetime
import urllib.parse
import re

app = FastAPI()

def hex_to_rgb(hex_color):
    """헥스 색상 코드를 RGB 튜플로 변환"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    elif len(hex_color) == 3:
        return tuple(int(hex_color[i]*2, 16) for i in range(3))
    else:
        return (255, 255, 255)  # 기본 흰색

def draw_text_with_highlights(draw, text, x, y, font, default_color, highlight_keywords):
    """키워드 하이라이트가 적용된 텍스트 그리기"""
    if not highlight_keywords:
        draw.text((x, y), text, fill=default_color, font=font)
        return
    
    # 하이라이트 색상들 (다양한 색상 사용)
    highlight_colors = [
        (255, 0, 0),    # 빨강
        (0, 128, 255),  # 파랑
        (255, 165, 0),  # 주황
        (128, 0, 128),  # 보라
        (0, 128, 0),    # 초록
    ]
    
    # 키워드별로 다른 색상 매핑
    keyword_colors = {}
    for i, keyword in enumerate(highlight_keywords):
        keyword_colors[keyword] = highlight_colors[i % len(highlight_colors)]
    
    # 텍스트에서 키워드 찾기 및 색상 적용
    words = text.split()
    current_x = x
    
    for word in words:
        word_color = default_color
        
        # 키워드 확인
        for keyword in highlight_keywords:
            if keyword.lower() in word.lower():
                word_color = keyword_colors[keyword]
                break
        
        # 단어 그리기
        draw.text((current_x, y), word + " ", fill=word_color, font=font)
        
        # 다음 단어 위치 계산 (대략적)
        word_width = len(word + " ") * 20  # 폰트 크기에 따른 대략적 계산
        current_x += word_width

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/slide-info")
async def get_slide_info(file: UploadFile = File(...)):
    """PPT 파일에서 슬라이드 개수 정보를 반환합니다."""
    try:
        pptx_content = await file.read()
        prs = Presentation(io.BytesIO(pptx_content))
        
        slide_count = len(prs.slides)
        
        return {
            "slide_count": slide_count,
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting slide info: {e}")

@app.post("/api/get-slide-image")
async def get_slide_image(
    file: UploadFile = File(...), 
    slide_index: int = Form(...),
    background_color: str = Form("#ffffff"),  # 기본 흰색
    text_color: str = Form("#000000"),        # 기본 검정색
    highlight_keywords: str = Form("[]")      # 하이라이트할 키워드들 (JSON)
):
    """특정 슬라이드의 이미지를 Base64 인코딩된 문자열로 반환합니다."""
    highlight_keywords_list = json.loads(highlight_keywords)
    
    # 색상 변환
    bg_color = hex_to_rgb(background_color)
    txt_color = hex_to_rgb(text_color)
    
    try:
        pptx_content = await file.read()
        prs = Presentation(io.BytesIO(pptx_content))
        
        if not (0 <= slide_index < len(prs.slides)):
            raise HTTPException(status_code=400, detail="Invalid slide index")
            
        slide = prs.slides[slide_index]
        text_content = []
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                text_content.append(shape.text)
        
        full_text = "\n".join(text_content)
        
        img = Image.new('RGB', (1280, 720), color=bg_color)
        d = ImageDraw.Draw(img)
        
        # 한글을 지원하는 폰트들을 우선순위로 시도
        font_paths = [
            "/System/Library/Fonts/AppleSDGothicNeo.ttc",  # macOS 한글 폰트
            "/Library/Fonts/Arial Unicode MS.ttf",        # 유니코드 지원
            "/System/Library/Fonts/Helvetica.ttc",        # macOS 기본
            "/System/Library/Fonts/PingFang.ttc",         # 중국어 폰트 (한글도 지원)
            "DejaVuSans.ttf",                             # Linux 기본
            "arial.ttf",                                  # Windows 기본
        ]
        
        font = None
        for font_path in font_paths:
            try:
                font = ImageFont.truetype(font_path, 40)
                break
            except IOError:
                continue
        
        if font is None:
            font = ImageFont.load_default()

        # 텍스트 렌더링 (개선된 여러 줄 처리 + 색상 적용)
        if full_text:
            # 텍스트를 줄별로 나누어 렌더링
            lines = full_text.split('\n')
            y_position = 50
            line_height = 60
            
            for line in lines:
                if y_position < 650:  # 이미지 높이 범위 내에서만
                    # 긴 줄은 자동으로 줄바꿈
                    if len(line) > 50:  # 대략적인 글자 수 제한
                        # 줄을 여러 개로 나누기
                        words = line.split(' ')
                        current_line = ""
                        for word in words:
                            test_line = current_line + " " + word if current_line else word
                            if len(test_line) <= 50:
                                current_line = test_line
                            else:
                                if current_line:
                                    draw_text_with_highlights(d, current_line, 50, y_position, font, txt_color, highlight_keywords_list)
                                    y_position += line_height
                                current_line = word
                        if current_line and y_position < 650:
                            draw_text_with_highlights(d, current_line, 50, y_position, font, txt_color, highlight_keywords_list)
                            y_position += line_height
                    else:
                        draw_text_with_highlights(d, line, 50, y_position, font, txt_color, highlight_keywords_list)
                        y_position += line_height
        else:
            d.text((50, 50), f"Slide {slide_index + 1}", fill=txt_color, font=font)
        
        img_buffer = io.BytesIO()
        img.save(img_buffer, "PNG")
        img_buffer.seek(0)
        
        return {"image": base64.b64encode(img_buffer.getvalue()).decode('utf-8')}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing slide: {e}")

@app.post("/api/process")
async def process_ppt(
    file: UploadFile = File(...), 
    slide_indices_json: str = Form(...),
    background_color: str = Form("#ffffff"),  # 기본 흰색
    text_color: str = Form("#000000"),        # 기본 검정색
    highlight_keywords: str = Form("[]")      # 하이라이트할 키워드들 (JSON)
):
    slide_indices = json.loads(slide_indices_json)
    highlight_keywords_list = json.loads(highlight_keywords)
    
    # 색상 변환
    bg_color = hex_to_rgb(background_color)
    txt_color = hex_to_rgb(text_color)
    
    try:
        pptx_content = await file.read()
        prs = Presentation(io.BytesIO(pptx_content))
        
        # 선택된 슬라이드 인덱스를 정렬하여 순서대로 처리
        sorted_indices = sorted(slide_indices)
        
        # 현재 날짜를 MM-DD 형식으로 생성
        date_prefix = datetime.now().strftime('%m-%d')
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            output_index = 1  # 1부터 시작하는 순서 번호
            
            for slide_index in sorted_indices:
                if 0 <= slide_index < len(prs.slides):
                    slide = prs.slides[slide_index]
                    text_content = []
                    
                    # 슬라이드에서 텍스트 추출
                    for shape in slide.shapes:
                        if hasattr(shape, "text") and shape.text.strip():
                            text_content.append(shape.text.strip())
                    
                    full_text = "\n".join(text_content)
                    
                    # 이미지 생성 (1280x720 해상도) - 사용자 정의 배경색
                    img = Image.new('RGB', (1280, 720), color=bg_color)
                    d = ImageDraw.Draw(img)
                    
                    # 한글을 지원하는 폰트들을 우선순위로 시도
                    font_paths = [
                        "/System/Library/Fonts/AppleSDGothicNeo.ttc",  # macOS 한글 폰트
                        "/Library/Fonts/Arial Unicode MS.ttf",        # 유니코드 지원
                        "/System/Library/Fonts/Helvetica.ttc",        # macOS 기본
                        "/System/Library/Fonts/PingFang.ttc",         # 중국어 폰트 (한글도 지원)
                        "DejaVuSans.ttf",                             # Linux 기본
                        "arial.ttf",                                  # Windows 기본
                    ]
                    
                    font = None
                    for font_path in font_paths:
                        try:
                            font = ImageFont.truetype(font_path, 40)
                            break
                        except IOError:
                            continue
                    
                    if font is None:
                        font = ImageFont.load_default()

                    # 텍스트 렌더링 (개선된 여러 줄 처리 + 색상 적용)
                    if full_text:
                        # 텍스트를 줄별로 나누어 렌더링
                        lines = full_text.split('\n')
                        y_position = 50
                        line_height = 60
                        max_width = 1180  # 이미지 너비에서 여백 제외
                        
                        for line in lines:
                            if y_position < 650:  # 이미지 높이 범위 내에서만
                                # 긴 줄은 자동으로 줄바꿈
                                if len(line) > 50:  # 대략적인 글자 수 제한
                                    # 줄을 여러 개로 나누기
                                    words = line.split(' ')
                                    current_line = ""
                                    for word in words:
                                        test_line = current_line + " " + word if current_line else word
                                        if len(test_line) <= 50:
                                            current_line = test_line
                                        else:
                                            if current_line:
                                                draw_text_with_highlights(d, current_line, 50, y_position, font, txt_color, highlight_keywords_list)
                                                y_position += line_height
                                            current_line = word
                                    if current_line and y_position < 650:
                                        draw_text_with_highlights(d, current_line, 50, y_position, font, txt_color, highlight_keywords_list)
                                        y_position += line_height
                                else:
                                    draw_text_with_highlights(d, line, 50, y_position, font, txt_color, highlight_keywords_list)
                                    y_position += line_height
                    else:
                        # 텍스트가 없는 경우 슬라이드 번호 표시
                        d.text((50, 50), f"Slide {slide_index + 1}", fill=txt_color, font=font)
                    
                    # PNG 이미지로 저장
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, "PNG", quality=95)
                    img_buffer.seek(0)
                    
                    # 파일명: MM-DD-순서번호.png (예: 12-25-1.png, 12-25-2.png)
                    filename = f"{date_prefix}-{output_index}.png"
                    zip_file.writestr(filename, img_buffer.getvalue())
                    output_index += 1

        zip_buffer.seek(0)
        
        # ZIP 파일명에 날짜와 슬라이드 개수 포함 (한글 제거)
        zip_filename = f"slides_{date_prefix}_{len(sorted_indices)}slides.zip"
        
        return Response(
            content=zip_buffer.getvalue(), 
            media_type="application/zip", 
            headers={
                "Content-Disposition": f"attachment; filename=\"{zip_filename}\"",
                "Content-Type": "application/zip"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing slides: {e}")