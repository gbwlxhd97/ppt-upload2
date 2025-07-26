import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SlideSelectorProps {
  file: File;
  slideCount: number;
}

const SlideSelector: React.FC<SlideSelectorProps> = ({ file, slideCount }) => {
  const [selectedSlides, setSelectedSlides] = useState<number[]>([]);
  const [slideImages, setSlideImages] = useState<{ [key: number]: string }>({});
  const [loadingSlides, setLoadingSlides] = useState<Set<number>>(new Set());
  const [isConverting, setIsConverting] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // 슬라이드 이미지를 로드하는 함수
  const fetchSlideImage = async (index: number) => {
    if (slideImages[index] || loadingSlides.has(index)) return;

    setLoadingSlides(prev => new Set(prev).add(index));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('slide_index', index.toString());

    try {
      const response = await axios.post('http://localhost:8000/api/get-slide-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSlideImages(prev => ({
        ...prev,
        [index]: `data:image/png;base64,${response.data.image}`
      }));
      setLoadedCount(prev => prev + 1);
    } catch (error) {
      console.error(`Error fetching slide ${index + 1}:`, error);
    } finally {
      setLoadingSlides(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // 컴포넌트 마운트 시 모든 슬라이드 이미지 로드
  useEffect(() => {
    for (let i = 0; i < slideCount; i++) {
      fetchSlideImage(i);
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

  // 선택된 슬라이드들을 이미지로 변환
  const convertSelectedSlides = async () => {
    if (selectedSlides.length === 0) {
      alert('변환할 슬라이드를 선택해주세요.');
      return;
    }

    setIsConverting(true);

    // 선택된 슬라이드들을 오름차순으로 정렬
    const sortedSlides = [...selectedSlides].sort((a, b) => a - b);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slide_indices_json', JSON.stringify(sortedSlides));

    try {
      const response = await axios.post('http://localhost:8000/api/process', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 응답 헤더에서 파일명 추출 (백엔드에서 설정한 파일명 사용)
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `slides_${new Date().toISOString().split('T')[0]}_${sortedSlides.length}slides.zip`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename=([^;]+)/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1].replace(/"/g, '');
        }
      }

      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(new Blob([response.data]));
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
              ) : slideImages[index] ? (
                <img 
                  src={slideImages[index]} 
                  alt={`Slide ${index + 1}`}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain' 
                  }}
                />
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