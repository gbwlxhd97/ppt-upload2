import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import CanvasSlideRenderer from './CanvasSlideRenderer';
import RichTextEditor from './RichTextEditor';

interface SlideSelectorProps {
  file: File;
  slideCount: number;
}

interface SlideTextData {
  slide_index: number;
  text_blocks: Array<{
    text: string;
    font_size: number;
    bold: boolean;
    color?: string; // 개별 텍스트 블록 색상
  }>;
  full_text: string;
}

interface TextBlockColor {
  slideIndex: number;
  blockIndex: number;
  color: string;
}

const SlideSelector: React.FC<SlideSelectorProps> = ({ file, slideCount }) => {
  const [selectedSlides, setSelectedSlides] = useState<number[]>([]);
  const [slideTextData, setSlideTextData] = useState<{ [key: number]: SlideTextData }>({});
  const [, setSlideImages] = useState<{ [key: number]: string }>({});
  const [loadingSlides, setLoadingSlides] = useState<Set<number>>(new Set());
  const [isConverting, setIsConverting] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  
  // 색상 설정 상태
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightKeywords, setHighlightKeywords] = useState<string>('');
  
  // 성경 구절 색상 설정 상태
  const [bibleVerseColor, setBibleVerseColor] = useState('#8B0000'); // 진한 빨간색
  const [bibleVerseEnabled, setBibleVerseEnabled] = useState(true);
  const [textBlockColors, setTextBlockColors] = useState<TextBlockColor[]>([]);

  // Rich Text Editor 상태
  const [editedSlideData, setEditedSlideData] = useState<{ [key: number]: SlideTextData }>({});
  const [editModal, setEditModal] = useState<{ slideIndex: number; isOpen: boolean } | null>(null);

  // 모달 상태
  const [fullscreenSlide, setFullscreenSlide] = useState<number | null>(null);
  const [colorPickerModal, setColorPickerModal] = useState<{ slideIndex: number; blockIndex: number } | null>(null);

  // 성경 구절 자동 감지 함수
  const detectBibleVerse = (text: string): boolean => {
    // 성경 구절 패턴들
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

  // 텍스트 블록 색상 설정 함수
  const setTextBlockColor = (slideIndex: number, blockIndex: number, color: string) => {
    setTextBlockColors(prev => {
      const existing = prev.find(p => p.slideIndex === slideIndex && p.blockIndex === blockIndex);
      if (existing) {
        return prev.map(p => 
          p.slideIndex === slideIndex && p.blockIndex === blockIndex 
            ? { ...p, color } 
            : p
        );
      } else {
        return [...prev, { slideIndex, blockIndex, color }];
      }
    });
  };

  // 텍스트 블록 색상 가져오기 함수
  const getTextBlockColor = (text: string, blockIndex: number): string => {
    const slideIndex = colorPickerModal?.slideIndex;
    if (slideIndex === undefined) return textColor;
    
    const customColor = textBlockColors.find(
      p => p.slideIndex === slideIndex && p.blockIndex === blockIndex
    );
    
    if (customColor) {
      return customColor.color;
    }
    
    // 성경 구절 자동 감지 및 색상 적용
    if (bibleVerseEnabled && detectBibleVerse(text)) {
      return bibleVerseColor;
    }
    
    return textColor;
  };

  // 텍스트 편집 함수들
  const openEditModal = (slideIndex: number) => {
    setEditModal({ slideIndex, isOpen: true });
  };

  const closeEditModal = () => {
    setEditModal(null);
  };

  const saveEditedText = (slideIndex: number, editedText: string) => {
    const originalData = slideTextData[slideIndex];
    if (!originalData) return;

    // 편집된 텍스트를 HTML에서 텍스트로 변환하고 저장
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editedText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    const updatedData: SlideTextData = {
      ...originalData,
      full_text: plainText,
      text_blocks: [{
        text: plainText,
        font_size: 16,
        bold: false
      }]
    };

    setEditedSlideData(prev => ({
      ...prev,
      [slideIndex]: updatedData
    }));

    closeEditModal();
  };

  // 편집된 데이터 또는 원본 데이터 가져오기
  const getSlideDataForRendering = (slideIndex: number): SlideTextData | null => {
    return editedSlideData[slideIndex] || slideTextData[slideIndex] || null;
  };

  // 슬라이드 텍스트 데이터를 로드하는 함수
  const fetchSlideText = async (index: number) => {
    if (slideTextData[index] || loadingSlides.has(index)) return;

    setLoadingSlides(prev => new Set(prev).add(index));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('slide_index', index.toString());

    try {
      const response = await axios.post('/api/get-slide-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSlideTextData(prev => ({
        ...prev,
        [index]: response.data
      }));
      setLoadedCount(prev => prev + 1);
    } catch (error) {
      console.error(`Error fetching slide text ${index + 1}:`, error);
    } finally {
      setLoadingSlides(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // 컴포넌트 마운트 시 모든 슬라이드 텍스트 데이터 로드
  useEffect(() => {
    for (let i = 0; i < slideCount; i++) {
      fetchSlideText(i);
    }
  }, [file, slideCount]);

  // 슬라이드 선택/해제
  const toggleSlideSelection = (index: number) => {
    setSelectedSlides(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedSlides.length === slideCount) {
      setSelectedSlides([]);
    } else {
      setSelectedSlides(Array.from({ length: slideCount }, (_, i) => i));
    }
  };

  // 선택된 슬라이드들을 이미지로 변환 (프론트엔드에서 처리)
  const convertSelectedSlides = async () => {
    if (selectedSlides.length === 0) {
      alert('변환할 슬라이드를 선택해주세요.');
      return;
    }

    setIsConverting(true);

    // 선택된 슬라이드들을 오름차순으로 정렬
    const sortedSlides = [...selectedSlides].sort((a, b) => a - b);
    
    try {
      // 각 슬라이드를 고해상도 이미지로 변환
      const imageBlobs: Blob[] = [];
      
      for (const slideIndex of sortedSlides) {
        // 고해상도 이미지 생성을 위한 임시 캔버스 생성
        const slideData = getSlideDataForRendering(slideIndex);
        if (!slideData) continue;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) continue;

        // 고해상도 설정 (1280x720)
        const highResWidth = 1280;
        const highResHeight = 720;
        const scale = 2; // 2배 해상도로 렌더링
        
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
          // 텍스트 블록별로 렌더링
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

              // 키워드 하이라이트 처리
              if (highlightKeywords.length > 0) {
                let currentX = padding;
                const words = line.split(' ');
                
                for (const word of words) {
                  let wordColor = textColor;
                  
                  // 키워드 매칭 확인
                  for (const keyword of highlightKeywords) {
                    if (keyword.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(keyword.toLowerCase())) {
                      wordColor = '#ff0000'; // 하이라이트 색상
                      break;
                    }
                  }
                  
                  tempCtx.fillStyle = wordColor;
                  tempCtx.fillText(word + ' ', currentX, y);
                  currentX += tempCtx.measureText(word + ' ').width;
                }
              } else {
                tempCtx.fillStyle = textColor;
                tempCtx.fillText(line, padding, y);
              }
              
              y += lineHeight;
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
        const blob = await new Promise<Blob>((resolve) => {
          tempCanvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              throw new Error('Failed to generate blob');
            }
          }, 'image/png', 1.0);
        });
        
        imageBlobs.push(blob);
      }

      // ZIP 파일 생성
      const zip = new JSZip();
      
      // 각 이미지를 ZIP에 추가
      sortedSlides.forEach((slideIndex, i) => {
        const slideNumber = slideIndex + 1;
        zip.file(`slide_${slideNumber}.png`, imageBlobs[i]);
      });
      
      // ZIP 파일 생성 및 다운로드
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileName = `slides_${new Date().toISOString().split('T')[0]}_${sortedSlides.length}slides.zip`;
      
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 성공 메시지에 정렬된 슬라이드 번호들 표시
      const slideNumbers = sortedSlides.map(i => i + 1).join(', ');
      alert(`🎉 ${sortedSlides.length}개의 슬라이드가 성공적으로 변환되었습니다!\n\n📋 변환된 슬라이드: ${slideNumbers}\n📁 파일명: ${fileName}`);
    } catch (error) {
      console.error('Error converting slides:', error);
      alert('❌ 변환 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsConverting(false);
    }
  };

  const progressPercentage = (loadedCount / slideCount) * 100;
  
  // 현재 날짜를 MM-DD 형식으로 생성
  const getDatePrefix = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  };

  // 모달 관련 함수들
  const openFullscreen = (slideIndex: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 슬라이드 선택 이벤트 방지
    setFullscreenSlide(slideIndex);
  };

  const closeFullscreen = () => {
    setFullscreenSlide(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeFullscreen();
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (fullscreenSlide !== null) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [fullscreenSlide]);

  // 사전 정의된 색상 테마
  const colorThemes = [
    { name: '🤍 클래식', bg: '#ffffff', text: '#000000', keywords: '' },
    { name: '🌙 다크모드', bg: '#1f2937', text: '#ffffff', keywords: '' },
    { name: '💙 파스텔 블루', bg: '#dbeafe', text: '#1e40af', keywords: '사랑,교회' },
    { name: '💚 자연', bg: '#dcfce7', text: '#166534', keywords: '생명,평화' },
    { name: '💜 로얄', bg: '#ede9fe', text: '#6b21a8', keywords: '영광,찬양' },
    { name: '🧡 따뜻함', bg: '#fed7aa', text: '#c2410c', keywords: '은혜,축복' },
    { name: '❤️ 정열', bg: '#fecaca', text: '#dc2626', keywords: '사랑,헌신' },
    { name: '⚫ 모노크롬', bg: '#f3f4f6', text: '#374151', keywords: '' },
  ];

  const applyTheme = (theme: typeof colorThemes[0]) => {
    setBackgroundColor(theme.bg);
    setTextColor(theme.text);
    setHighlightKeywords(theme.keywords);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* 진행률 및 선택 정보 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
        marginBottom: '1.5rem' 
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              margin: 0,
              color: '#111827'
            }}>
              🔄 슬라이드 로딩 진행률
            </h3>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              fontWeight: '500'
            }}>
              {loadedCount} / {slideCount}
            </span>
          </div>
          
          {/* 커스텀 진행률 바 - 파란색 */}
          <div style={{
            width: '100%',
            height: '0.75rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.375rem',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: '#3b82f6', // 파란색
              borderRadius: '0.375rem',
              transition: 'width 0.3s ease',
              background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)' // 그라데이션 효과
            }} />
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '1rem'
          }}>
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280' 
            }}>
              선택된 슬라이드: <strong style={{ color: '#059669' }}>{selectedSlides.length}개</strong>
            </div>
            <button
              onClick={toggleSelectAll}
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              {selectedSlides.length === slideCount ? '🔄 전체 해제' : '✅ 전체 선택'}
            </button>
          </div>
        </div>
             </div>

      {/* 색상 설정 카드 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
        marginBottom: '1.5rem' 
      }}>
                 <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          margin: '0 0 1rem 0',
          color: '#111827'
        }}>
          🎨 색상 및 스타일 설정
        </h3>

        {/* 성경 구절 색상 설정 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            ✝️ 성경 구절 색상 설정
          </label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={bibleVerseEnabled}
                onChange={(e) => setBibleVerseEnabled(e.target.checked)}
                style={{ width: '1rem', height: '1rem' }}
              />
              성경 구절 자동 감지 및 색상 적용
            </label>
            {bibleVerseEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>색상:</span>
                <input
                  type="color"
                  value={bibleVerseColor}
                  onChange={(e) => setBibleVerseColor(e.target.value)}
                  style={{ 
                    width: '2rem', 
                    height: '2rem', 
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                  {bibleVerseColor}
                </span>
              </div>
            )}
          </div>
          {bibleVerseEnabled && (
            <div style={{ 
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              💡 <strong>자동 감지되는 성경 구절 패턴:</strong><br/>
              • "1장 1절", "창세기 1:1", "John 3:16" 등<br/>
              • 감지된 구절은 자동으로 설정된 색상으로 표시됩니다
            </div>
          )}
        </div>

        {/* 색상 테마 선택 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            🎯 빠른 테마 선택
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '0.5rem' 
          }}>
            {colorThemes.map((theme, index) => (
              <button
                key={index}
                onClick={() => applyTheme(theme)}
                style={{
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  backgroundColor: theme.bg,
                  color: theme.text,
                  transition: 'transform 0.1s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem' 
        }}>
          {/* 배경색 설정 */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              🖼️ 배경색
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#ffffff"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* 텍스트색 설정 */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              ✏️ 텍스트색
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#000000"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* 하이라이트 키워드 설정 */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              🌟 하이라이트 키워드 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={highlightKeywords}
              onChange={(e) => setHighlightKeywords(e.target.value)}
              placeholder="예: 사랑, 교회, 예배, 하나님"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginTop: '0.25rem' 
            }}>
              💡 입력한 키워드들이 포함된 텍스트는 다양한 색상으로 강조됩니다
            </div>
          </div>
        </div>

        {/* 미리보기 */}
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          borderRadius: '0.375rem', 
          border: '1px solid #e5e7eb',
          backgroundColor: backgroundColor
        }}>
          <div style={{ 
            fontSize: '0.875rem', 
            color: textColor,
            fontWeight: '500'
          }}>
            📋 미리보기: 이 색상으로 이미지가 생성됩니다
          </div>
          {highlightKeywords && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              <span style={{ color: textColor }}>하이라이트 키워드: </span>
              {highlightKeywords.split(',').map((keyword, i) => {
                const colors = ['#ff0000', '#0080ff', '#ffa500', '#800080', '#008000'];
                return (
                  <span 
                    key={i}
                    style={{ 
                      color: colors[i % colors.length], 
                      fontWeight: 'bold',
                      marginRight: '0.5rem'
                    }}
                  >
                    {keyword.trim()}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 슬라이드 그리드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {Array.from({ length: slideCount }, (_, index) => (
          <div 
            key={index} 
            style={{
              backgroundColor: selectedSlides.includes(index) ? '#eff6ff' : 'white',
              border: selectedSlides.includes(index) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedSlides.includes(index) ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onClick={() => toggleSlideSelection(index)}
            onMouseOver={(e) => {
              if (!selectedSlides.includes(index)) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseOut={(e) => {
              if (!selectedSlides.includes(index)) {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            <div style={{ 
              position: 'relative', 
              aspectRatio: '4/3', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '0.375rem', 
              overflow: 'hidden' 
            }}>
              {loadingSlides.has(index) ? (
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : slideTextData[index] ? (
                <>
                  <CanvasSlideRenderer
                    slideData={getSlideDataForRendering(index)}
                    backgroundColor={backgroundColor}
                    textColor={textColor}
                    highlightKeywords={highlightKeywords.split(',').map(k => k.trim()).filter(k => k)}
                    bibleVerseColor={bibleVerseColor}
                    bibleVerseEnabled={bibleVerseEnabled}
                    textBlockColors={textBlockColors}
                    width={200}
                    height={150}
                    onImageGenerated={(dataUrl) => {
                      setSlideImages(prev => ({
                        ...prev,
                        [index]: dataUrl
                      }));
                    }}
                  />
                  {/* 확대 아이콘 */}
                  <button
                    onClick={(e) => openFullscreen(index, e)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      left: '0.5rem',
                      width: '2rem',
                      height: '2rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s ease',
                      zIndex: 10
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="전체화면으로 보기"
                  >
                    ⛶
                  </button>
                </>
              ) : (
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#9ca3af' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{index + 1}</div>
                    <div style={{ fontSize: '0.75rem' }}>❌ 로딩 실패</div>
                  </div>
                </div>
              )}
              
              {/* 선택 체크박스 */}
              <div style={{ 
                position: 'absolute', 
                top: '0.5rem', 
                right: '0.5rem', 
                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                borderRadius: '0.25rem', 
                padding: '0.25rem' 
              }}>
                <input
                  type="checkbox"
                  checked={selectedSlides.includes(index)}
                  onChange={() => toggleSlideSelection(index)}
                  style={{ 
                    width: '1.25rem', 
                    height: '1.25rem',
                    accentColor: '#3b82f6'
                  }}
                />
              </div>
            </div>
            
            <div style={{ 
              marginTop: '0.5rem', 
              textAlign: 'center' 
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: selectedSlides.includes(index) ? '#1d4ed8' : '#374151'
              }}>
                📄 슬라이드 {index + 1}
              </span>
              
              {/* 편집 및 색상 설정 버튼들 */}
              <div style={{ 
                marginTop: '0.5rem', 
                display: 'flex', 
                gap: '0.5rem', 
                justifyContent: 'center' 
              }}>
                {/* 텍스트 편집 버튼 */}
                <button
                  onClick={() => openEditModal(index)}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                  title="텍스트 편집"
                >
                  ✏️ 편집
                </button>

                {/* 개별 텍스트 블록 색상 설정 버튼 */}
                {slideTextData[index] && slideTextData[index].text_blocks && slideTextData[index].text_blocks.length > 0 && (
                  <button
                    onClick={() => setColorPickerModal({ slideIndex: index, blockIndex: -1 })}
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    title="텍스트 블록별 색상 설정"
                  >
                    🎨 색상 설정
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 변환 버튼 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
                     <div style={{ 
             fontSize: '0.875rem', 
             color: '#6b7280',
             flex: 1
           }}>
             {selectedSlides.length > 0 && (
               <div>
                 <div style={{ marginBottom: '0.25rem' }}>
                   <span style={{ color: '#059669', fontWeight: '600' }}>
                     🎯 선택된 슬라이드: {selectedSlides.length}개
                   </span>
                 </div>
                 <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                   📋 순서: {[...selectedSlides].sort((a, b) => a - b).map(i => i + 1).join(' → ')}
                 </div>
                 <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '0.25rem' }}>
                   📁 파일명: {getDatePrefix()}-1.png, {getDatePrefix()}-2.png, {getDatePrefix()}-3.png...
                 </div>
               </div>
             )}
           </div>
          <button
            onClick={convertSelectedSlides}
            disabled={selectedSlides.length === 0 || isConverting}
            style={{
              backgroundColor: selectedSlides.length === 0 || isConverting ? '#d1d5db' : '#10b981',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: selectedSlides.length === 0 || isConverting ? 'not-allowed' : 'pointer',
              minWidth: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              if (selectedSlides.length > 0 && !isConverting) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseOut={(e) => {
              if (selectedSlides.length > 0 && !isConverting) {
                e.currentTarget.style.backgroundColor = '#10b981';
              }
            }}
          >
            {isConverting ? (
              <>
                <div style={{
                  width: '1rem',
                  height: '1rem',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                변환 중...
              </>
            ) : (
              <>
                🚀 {selectedSlides.length}개 슬라이드 변환하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* 전체화면 모달 */}
      {fullscreenSlide !== null && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={closeFullscreen}
        >
          {/* 모달 내용 */}
          <div 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                📄 슬라이드 {fullscreenSlide + 1}
              </h3>
              <button
                onClick={closeFullscreen}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="닫기 (ESC)"
              >
                ✕
              </button>
            </div>

            {/* 이미지 */}
            <div style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white'
            }}>
              {slideTextData[fullscreenSlide] ? (
                <CanvasSlideRenderer
                  slideData={getSlideDataForRendering(fullscreenSlide)}
                  backgroundColor={backgroundColor}
                  textColor={textColor}
                  highlightKeywords={highlightKeywords.split(',').map(k => k.trim()).filter(k => k)}
                  bibleVerseColor={bibleVerseColor}
                  bibleVerseEnabled={bibleVerseEnabled}
                  textBlockColors={textBlockColors}
                  width={800}
                  height={600}
                />
              ) : (
                <div style={{
                  padding: '4rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '500' }}>
                    슬라이드 {fullscreenSlide + 1}
                  </div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    이미지를 불러오는 중...
                  </div>
                </div>
              )}
            </div>

            {/* 하단 정보 */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <div>
                💡 <strong>팁:</strong> ESC 키를 눌러 닫을 수 있습니다
              </div>
              <div>
                {selectedSlides.includes(fullscreenSlide) ? (
                  <span style={{ color: '#10b981', fontWeight: '600' }}>
                    ✅ 선택됨
                  </span>
                ) : (
                  <span style={{ color: '#6b7280' }}>
                    ⭕ 선택되지 않음
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 색상 선택 모달 */}
      {colorPickerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                margin: 0,
                color: '#111827'
              }}>
                🎨 텍스트 블록 색상 설정
              </h3>
              <button
                onClick={() => setColorPickerModal(null)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '2rem',
                  height: '2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}
                title="닫기"
              >
                ✕
              </button>
            </div>

            {colorPickerModal.slideIndex >= 0 && slideTextData[colorPickerModal.slideIndex] && (
              <div>
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  📄 <strong>슬라이드 {colorPickerModal.slideIndex + 1}</strong>의 텍스트 블록들
                </div>

                {slideTextData[colorPickerModal.slideIndex].text_blocks.map((block, blockIndex) => (
                  <div key={blockIndex} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                    marginBottom: '0.5rem',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        블록 {blockIndex + 1}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontStyle: 'italic',
                        wordBreak: 'break-word'
                      }}>
                        "{block.text.length > 50 ? block.text.substring(0, 50) + '...' : block.text}"
                      </div>
                      {detectBibleVerse(block.text) && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#059669',
                          fontWeight: '500',
                          marginTop: '0.25rem'
                        }}>
                          ✝️ 성경 구절로 감지됨
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={getTextBlockColor(block.text, blockIndex)}
                        onChange={(e) => setTextBlockColor(colorPickerModal.slideIndex, blockIndex, e.target.value)}
                        style={{
                          width: '2rem',
                          height: '2rem',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      />
                      <button
                        onClick={() => setTextBlockColor(colorPickerModal.slideIndex, blockIndex, textColor)}
                        style={{
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                        title="기본 색상으로 복원"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              marginTop: '1.5rem',
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              💡 <strong>설명:</strong><br/>
              • 각 텍스트 블록의 색상을 개별적으로 설정할 수 있습니다<br/>
              • 성경 구절로 감지된 텍스트는 자동으로 강조 표시됩니다<br/>
              • 🔄 버튼을 클릭하면 기본 색상으로 복원됩니다
            </div>
          </div>
        </div>
      )}

      {/* Rich Text Editor 모달 */}
      {editModal && editModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                margin: 0,
                color: '#111827'
              }}>
                ✏️ 텍스트 편집 - 슬라이드 {editModal.slideIndex + 1}
              </h3>
              <button
                onClick={closeEditModal}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '2rem',
                  height: '2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                💡 <strong>편집 팁:</strong><br/>
                • 텍스트를 선택하고 색상, 굵기, 기울임 등을 변경할 수 있습니다<br/>
                • 줄바꿈을 추가하거나 제거할 수 있습니다<br/>
                • 편집된 내용은 실시간으로 미리보기에 반영됩니다
              </div>
            </div>

            {/* Rich Text Editor */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                📝 텍스트 편집
              </label>
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                minHeight: '300px'
              }}>
                <RichTextEditor
                  initialValue={slideTextData[editModal.slideIndex]?.full_text || ''}
                  onSave={(editedText) => saveEditedText(editModal.slideIndex, editedText)}
                  onCancel={closeEditModal}
                />
              </div>
            </div>

            {/* 실시간 미리보기 */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                👀 실시간 미리보기
              </label>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                padding: '1rem',
                backgroundColor: backgroundColor,
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {getSlideDataForRendering(editModal.slideIndex) ? (
                  <CanvasSlideRenderer
                    slideData={getSlideDataForRendering(editModal.slideIndex)}
                    backgroundColor={backgroundColor}
                    textColor={textColor}
                    highlightKeywords={highlightKeywords.split(',').map(k => k.trim()).filter(k => k)}
                    bibleVerseColor={bibleVerseColor}
                    bibleVerseEnabled={bibleVerseEnabled}
                    textBlockColors={textBlockColors}
                    width={400}
                    height={200}
                  />
                ) : (
                  <div style={{ color: textColor, textAlign: 'center' }}>
                    편집된 내용이 여기에 표시됩니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SlideSelector; 