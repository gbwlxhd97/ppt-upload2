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

app = FastAPI()

origins = [
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
async def get_slide_image(file: UploadFile = File(...), slide_index: int = Form(...)):
    """특정 슬라이드의 이미지를 Base64 인코딩된 문자열로 반환합니다."""
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
        
        img = Image.new('RGB', (1280, 720), color = 'white')
        d = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 40)
        except IOError:
            font = ImageFont.load_default()

        d.text((50,50), full_text, fill=(0,0,0), font=font)
        
        img_buffer = io.BytesIO()
        img.save(img_buffer, "PNG")
        img_buffer.seek(0)
        
        return {"image": base64.b64encode(img_buffer.getvalue()).decode('utf-8')}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing slide: {e}")

@app.post("/api/process")
async def process_ppt(file: UploadFile = File(...), slide_indices_json: str = Form(...)):
    slide_indices = json.loads(slide_indices_json)
    
    try:
        pptx_content = await file.read()
        prs = Presentation(io.BytesIO(pptx_content))
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            output_index = 1
            for i in slide_indices:
                if 0 <= i < len(prs.slides):
                    slide = prs.slides[i]
                    text_content = []
                    for shape in slide.shapes:
                        if hasattr(shape, "text"):
                            text_content.append(shape.text)
                    
                    full_text = "\n".join(text_content)
                    
                    img = Image.new('RGB', (1280, 720), color = 'white')
                    d = ImageDraw.Draw(img)
                    
                    try:
                        font = ImageFont.truetype("DejaVuSans.ttf", 40)
                    except IOError:
                        font = ImageFont.load_default()

                    d.text((50,50), full_text, fill=(0,0,0), font=font)
                    
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, "PNG")
                    img_buffer.seek(0)
                    
                    filename = f"{datetime.now().strftime('%m-%d')}-{output_index}.png"
                    zip_file.writestr(filename, img_buffer.getvalue())
                    output_index += 1

        zip_buffer.seek(0)
        return Response(content=zip_buffer.getvalue(), media_type="application/zip", headers={"Content-Disposition": "attachment;filename=converted_images.zip"})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing slides: {e}")