import React, { useRef, useEffect, useState } from 'react';

interface SlideTextBlock {
  text: string;
  font_size: number;
  bold: boolean;
  color?: string; // 개별 텍스트 블록 색상
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
  bibleVerseColor?: string; // 성경 구절 색상
  bibleVerseEnabled?: boolean; // 성경 구절 자동 감지 활성화
  textBlockColors?: Array<{ slideIndex: number; blockIndex: number; color: string }>; // 개별 텍스트 블록 색상
  width?: number;
  height?: number;
  onImageGenerated?: (dataUrl: string) => void;
  // 고해상도 이미지 생성을 위한 props 추가
  isHighRes?: boolean; // 고해상도 모드
  onHighResImageGenerated?: (blob: Blob) => void; // 고해상도 이미지 blob
}

const CanvasSlideRenderer: React.FC<CanvasSlideRendererProps> = ({
  slideData,
  backgroundColor,
  textColor,
  highlightKeywords,
  bibleVerseColor,
  bibleVerseEnabled,
  textBlockColors,
  width = 400,
  height = 300,
  onImageGenerated,
  isHighRes = false,
  onHighResImageGenerated
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  // 성경 구절 자동 감지 함수
  const detectBibleVerse = (text: string): boolean => {
    const biblePatterns = [
      /^\d+\s*[장절]\s*/, // "1장 1절", "1:1" 등
      /^[가-힣]+\s*\d+장\s*\d+절/, // "창세기 1장 1절"
      /^[가-힣]+\s*\d+:\d+/, // "창세기 1:1"
      /^[A-Za-z]+\s*\d+:\d+/, // "John 3:16"
      /^[가-힣]+\s*[가-힣]+\s*\d+장/, // "사무엘상 1장"
      /^[가-힣]+\s*\d+:\d+-\d+/, // "창세기 1:1-3"
    ];
    
    return biblePatterns.some(pattern => pattern.test(text.trim()));
  };

  // 텍스트 블록 색상 결정 함수
  const getTextBlockColor = (text: string, blockIndex: number): string => {
    // 1. 개별 텍스트 블록에 설정된 색상이 있으면 사용
    if (textBlockColors) {
      const customColor = textBlockColors.find(
        p => p.slideIndex === slideData?.slide_index && p.blockIndex === blockIndex
      );
      if (customColor) {
        return customColor.color;
      }
    }

    // 2. 성경 구절 자동 감지 및 색상 적용
    if (bibleVerseEnabled && bibleVerseColor && detectBibleVerse(text)) {
      return bibleVerseColor;
    }

    // 3. 기본 텍스트 색상 사용
    return textColor;
  };

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
      // 텍스트 블록별로 렌더링 (더 정확한 색상 적용)
      if (slideData.text_blocks && slideData.text_blocks.length > 0) {
        let currentY = y;
        
        for (let blockIndex = 0; blockIndex < slideData.text_blocks.length; blockIndex++) {
          const block = slideData.text_blocks[blockIndex];
          if (currentY > height - lineHeight) break;
          
          // 텍스트 블록 색상 결정
          const blockColor = getTextBlockColor(block.text, blockIndex);
          
          // 텍스트를 줄 단위로 분할
          const words = block.text.split(' ');
          let currentLine = '';
          let currentLineWidth = 0;
          
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            const testLine = currentLine + word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth > maxWidth && currentLine) {
              // 현재 줄 렌더링
              ctx.fillStyle = blockColor;
              ctx.font = block.bold ? `bold ${block.font_size || fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` 
                                   : `${block.font_size || fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
              ctx.fillText(currentLine, padding, currentY);
              
              currentY += lineHeight;
              if (currentY > height - lineHeight) break;
              
              currentLine = word;
              currentLineWidth = ctx.measureText(word).width;
            } else {
              currentLine = testLine;
              currentLineWidth = testWidth;
            }
          }
          
          // 마지막 줄 렌더링
          if (currentLine && currentY <= height - lineHeight) {
            ctx.fillStyle = blockColor;
            ctx.font = block.bold ? `bold ${block.font_size || fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` 
                                 : `${block.font_size || fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            ctx.fillText(currentLine, padding, currentY);
            currentY += lineHeight;
          }
          
          // 블록 간 간격 추가
          currentY += lineHeight * 0.3;
        }
      } else {
        // 기존 방식 (fallback)
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
  }, [slideData, backgroundColor, textColor, highlightKeywords, bibleVerseColor, bibleVerseEnabled, textBlockColors, width, height]);

  // 고해상도 이미지 생성 함수
  const generateHighResImage = async (): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas || !slideData) {
      throw new Error('Canvas or slide data not available');
    }

    // 고해상도 설정 (1280x720)
    const highResWidth = 1280;
    const highResHeight = 720;
    const scale = 2; // 2배 해상도로 렌더링
    
    // 임시 캔버스 생성
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('Failed to get 2D context');
    }

    tempCanvas.width = highResWidth * scale;
    tempCanvas.height = highResHeight * scale;
    tempCtx.scale(scale, scale);

    // 배경 그리기
    tempCtx.fillStyle = backgroundColor;
    tempCtx.fillRect(0, 0, highResWidth, highResHeight);

    // 텍스트 설정
    const fontSize = 48; // 고해상도용 폰트 크기
    tempCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    tempCtx.textBaseline = 'top';

    const lineHeight = fontSize * 1.4;
    const padding = 50;
    const maxWidth = highResWidth - (padding * 2);

    let y = padding;

    if (slideData.full_text && slideData.full_text.trim()) {
      // 텍스트 블록별로 렌더링 (더 정확한 색상 적용)
      if (slideData.text_blocks && slideData.text_blocks.length > 0) {
        let currentY = y;
        
        for (let blockIndex = 0; blockIndex < slideData.text_blocks.length; blockIndex++) {
          const block = slideData.text_blocks[blockIndex];
          if (currentY > highResHeight - lineHeight) break;
          
          // 텍스트 블록 색상 결정
          const blockColor = getTextBlockColor(block.text, blockIndex);
          
          // 텍스트를 줄 단위로 분할
          const words = block.text.split(' ');
          let currentLine = '';
          
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            const testLine = currentLine + word;
            const testWidth = tempCtx.measureText(testLine).width;
            
            if (testWidth > maxWidth && currentLine) {
              // 현재 줄 렌더링
              tempCtx.fillStyle = blockColor;
              tempCtx.font = block.bold ? `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` 
                                       : `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
              tempCtx.fillText(currentLine, padding, currentY);
              
              currentY += lineHeight;
              if (currentY > highResHeight - lineHeight) break;
              
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          
          // 마지막 줄 렌더링
          if (currentLine && currentY <= highResHeight - lineHeight) {
            tempCtx.fillStyle = blockColor;
            tempCtx.font = block.bold ? `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` 
                                     : `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            tempCtx.fillText(currentLine, padding, currentY);
            currentY += lineHeight;
          }
          
          // 블록 간 간격 추가
          currentY += lineHeight * 0.3;
        }
      } else {
        // 기존 방식 (fallback)
        const lines = slideData.full_text.split('\n');
        
        for (const line of lines) {
          if (y > highResHeight - lineHeight) break;

          const processedLine = processTextWithKeywords(line);

          // 줄 바꿈 처리
          let currentLineText = '';
          let currentLineSegments: Array<{ text: string; color: string; isHighlight: boolean }> = [];

          for (const segment of processedLine) {
            const words = segment.text.split(' ');
            
            for (let i = 0; i < words.length; i++) {
              const word = words[i] + (i < words.length - 1 ? ' ' : '');
              const testText = currentLineText + word;
              const testWidth = tempCtx.measureText(testText).width;

              if (testWidth > maxWidth && currentLineText) {
                // 현재 줄 렌더링
                let segmentX = padding;
                for (const seg of currentLineSegments) {
                  tempCtx.fillStyle = seg.color;
                  if (seg.isHighlight) {
                    tempCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
                  } else {
                    tempCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
                  }
                  tempCtx.fillText(seg.text, segmentX, y);
                  segmentX += tempCtx.measureText(seg.text).width;
                }

                y += lineHeight;
                if (y > highResHeight - lineHeight) break;

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
          if (currentLineSegments.length > 0 && y <= highResHeight - lineHeight) {
            let segmentX = padding;
            for (const seg of currentLineSegments) {
              tempCtx.fillStyle = seg.color;
              if (seg.isHighlight) {
                tempCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
              } else {
                tempCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
              }
              tempCtx.fillText(seg.text, segmentX, y);
              segmentX += tempCtx.measureText(seg.text).width;
            }
            y += lineHeight;
          }
        }
      }
    } else {
      // 빈 슬라이드 처리
      tempCtx.fillStyle = textColor;
      tempCtx.font = `${fontSize * 1.5}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      tempCtx.textAlign = 'center';
      tempCtx.fillText(`Slide ${slideData.slide_index + 1}`, highResWidth / 2, highResHeight / 2 - fontSize);
      tempCtx.textAlign = 'left';
    }

    // Blob으로 변환
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Failed to generate blob');
        }
      }, 'image/png', 1.0);
    });
  };

  // 고해상도 이미지 생성이 요청되면 자동으로 생성
  useEffect(() => {
    if (isHighRes && onHighResImageGenerated && slideData) {
      generateHighResImage().then(blob => {
        onHighResImageGenerated(blob);
      }).catch(error => {
        console.error('Error generating high-res image:', error);
      });
    }
  }, [isHighRes, onHighResImageGenerated, slideData, backgroundColor, textColor, highlightKeywords, bibleVerseColor, bibleVerseEnabled, textBlockColors]);

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