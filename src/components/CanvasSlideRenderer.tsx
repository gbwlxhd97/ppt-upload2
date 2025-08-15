import React, { useRef, useEffect, useState } from 'react';

interface SlideTextBlock {
  text: string;
  font_size: number;
  bold: boolean;
}

interface SlideData {
  slide_index: number;
  text_blocks: SlideTextBlock[];
  full_text: string;
}

interface CanvasSlideRendererProps {
  slideData: SlideData | null;
  backgroundColor: string;
  textColor: string;
  highlightKeywords: string[];
  width?: number;
  height?: number;
  onImageGenerated?: (dataUrl: string) => void;
}

const CanvasSlideRenderer: React.FC<CanvasSlideRendererProps> = ({
  slideData,
  backgroundColor,
  textColor,
  highlightKeywords,
  width = 400,
  height = 300,
  onImageGenerated
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  // 키워드 하이라이트 색상들
  const highlightColors = [
    '#ff0000', '#0080ff', '#ffa500', '#800080', '#008000',
    '#ff69b4', '#8b4513', '#4b0082', '#ff1493', '#00ced1'
  ];

  // 텍스트에서 키워드를 찾아서 색상 정보와 함께 반환
  const processTextWithKeywords = (text: string) => {
    if (!highlightKeywords.length) {
      return [{ text, color: textColor, isHighlight: false }];
    }

    let result = text;
    
         // 간단한 키워드 치환 방식으로 변경
     highlightKeywords.forEach((keyword, index) => {
       if (keyword.trim()) {
         // 특수 마커로 감싸기
         const marker = `##HIGHLIGHT_${index}##`;
         const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
         result = result.replace(regex, `${marker}${keyword}${marker}`);
       }
     });

    // 마커 기준으로 분할하여 배열 생성
    const segments: Array<{ text: string; color: string; isHighlight: boolean }> = [];
    const parts = result.split(/(##HIGHLIGHT_\d+##)/);
    
    let currentHighlightIndex = -1;
    for (const part of parts) {
      const highlightMatch = part.match(/##HIGHLIGHT_(\d+)##/);
      if (highlightMatch) {
        currentHighlightIndex = parseInt(highlightMatch[1]);
      } else if (part) {
        segments.push({
          text: part,
          color: currentHighlightIndex >= 0 ? highlightColors[currentHighlightIndex % highlightColors.length] : textColor,
          isHighlight: currentHighlightIndex >= 0
        });
        currentHighlightIndex = -1;
      }
    }

    return segments.length > 0 ? segments : [{ text, color: textColor, isHighlight: false }];
  };

  // Canvas에 텍스트 렌더링
  const renderToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !slideData) return;

    setIsRendering(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 고해상도 설정
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(scale, scale);

    // 배경 그리기
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 텍스트 설정
    const fontSize = Math.max(12, Math.min(width / 25, 20));
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textBaseline = 'top';

    const lineHeight = fontSize * 1.4;
    const padding = Math.max(10, width * 0.05);
    const maxWidth = width - (padding * 2);

    let y = padding;

    if (slideData.full_text && slideData.full_text.trim()) {
      const lines = slideData.full_text.split('\n');
      
      for (const line of lines) {
        if (y > height - lineHeight) break;

        const processedLine = processTextWithKeywords(line);

        // 줄 바꿈 처리
        let currentLineText = '';
        let currentLineSegments: Array<{ text: string; color: string; isHighlight: boolean }> = [];

        for (const segment of processedLine) {
          const words = segment.text.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            const testText = currentLineText + word;
            const testWidth = ctx.measureText(testText).width;

            if (testWidth > maxWidth && currentLineText) {
              // 현재 줄 렌더링
              let segmentX = padding;
              for (const seg of currentLineSegments) {
                ctx.fillStyle = seg.color;
                if (seg.isHighlight) {
                  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
                } else {
                  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
                }
                ctx.fillText(seg.text, segmentX, y);
                segmentX += ctx.measureText(seg.text).width;
              }

              y += lineHeight;
              if (y > height - lineHeight) break;

              currentLineText = word;
              currentLineSegments = [{ text: word, color: segment.color, isHighlight: segment.isHighlight }];
            } else {
              currentLineText = testText;
              if (currentLineSegments.length > 0 && 
                  currentLineSegments[currentLineSegments.length - 1].color === segment.color &&
                  currentLineSegments[currentLineSegments.length - 1].isHighlight === segment.isHighlight) {
                currentLineSegments[currentLineSegments.length - 1].text += word;
              } else {
                currentLineSegments.push({ text: word, color: segment.color, isHighlight: segment.isHighlight });
              }
            }
          }
        }

        // 마지막 줄 렌더링
        if (currentLineSegments.length > 0 && y <= height - lineHeight) {
          let segmentX = padding;
          for (const seg of currentLineSegments) {
            ctx.fillStyle = seg.color;
            if (seg.isHighlight) {
              ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            } else {
              ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            }
            ctx.fillText(seg.text, segmentX, y);
            segmentX += ctx.measureText(seg.text).width;
          }
          y += lineHeight;
        }
      }
    } else {
      // 빈 슬라이드 처리
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize * 1.5}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`Slide ${slideData.slide_index + 1}`, width / 2, height / 2 - fontSize);
      ctx.textAlign = 'left';
    }

    setIsRendering(false);

    // 이미지 데이터 URL 생성
    if (onImageGenerated) {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      onImageGenerated(dataUrl);
    }
  };

  // 의존성이 변경될 때마다 다시 렌더링
  useEffect(() => {
    renderToCanvas();
  }, [slideData, backgroundColor, textColor, highlightKeywords, width, height]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: '0.375rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          backgroundColor: backgroundColor
        }}
      />
      {isRendering && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '0.375rem'
        }}>
          <div style={{
            width: '1.5rem',
            height: '1.5rem',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}
    </div>
  );
};

export default CanvasSlideRenderer; 