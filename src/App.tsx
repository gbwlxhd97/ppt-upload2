import React, { useState, useRef } from 'react';
import axios from 'axios';
import SlideSelector from '@/components/SlideSelector';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [slideCount, setSlideCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsLoading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await axios.post('/api/slide-info', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSlideCount(response.data.slide_count || 0);
      } catch (error) {
        console.error('Error getting slide info:', error);
        alert('슬라이드 정보를 가져오는 데 실패했습니다. 올바른 PPTX 파일인지 확인해주세요.');
        setFile(null);
        setSlideCount(0);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setFile(null);
    setSlideCount(0);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '0.5rem' 
          }}>
            PPT 이미지 변환기
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            PowerPoint 파일을 업로드하여 원하는 슬라이드를 이미지로 변환하세요
          </p>
        </div>

        {!file ? (
          /* 파일 업로드 영역 */
          <div style={{ 
            backgroundColor: 'white', 
            padding: '3rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pptx" 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
            />
            
            <div style={{ marginBottom: '1.5rem' }}>
              <svg 
                style={{ 
                  width: '4rem', 
                  height: '4rem', 
                  margin: '0 auto 1rem auto', 
                  color: '#9ca3af',
                  display: 'block'
                }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                PPTX 파일 업로드
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                PowerPoint 파일(.pptx)을 선택해주세요
              </p>
            </div>
            
            <button
              onClick={handleUploadButtonClick}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? '#d1d5db' : '#3b82f6',
                color: 'white',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  파일 분석 중...
                </>
              ) : (
                '📁 파일 선택하기'
              )}
            </button>
            
            <p style={{ 
              marginTop: '1rem', 
              fontSize: '0.875rem', 
              color: '#6b7280' 
            }}>
              지원 형식: .pptx 파일만 가능
            </p>
          </div>
        ) : (
          /* 슬라이드 선택 영역 */
          <div>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                  📄 {file.name}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  총 {slideCount}개의 슬라이드
                </p>
              </div>
              <button
                onClick={handleReset}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                다른 파일 선택
              </button>
            </div>
            
            <SlideSelector file={file} slideCount={slideCount} />
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
    </div>
  );
};

export default App;
