import React, { useState } from 'react';
import axios from 'axios';
import FileUploader from '../components/FileUploader';
import SlideSelector from '../components/SlideSelector';
import { Button } from '@/components/ui/button'; // shadcn/ui Button import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // shadcn/ui Card import
import { Input } from '@/components/ui/input'; // shadcn/ui Input import
import { Label } from '@/components/ui/label'; // shadcn/ui Label import

const Home: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedSlides, setSelectedSlides] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setSelectedSlides([]);
  };

  const handleSelectionChange = (newSelection: number[]) => {
    setSelectedSlides(newSelection);
  };

  const handleConvert = async () => {
    if (!file || selectedSlides.length === 0) {
      alert('파일을 선택하고 최소 1개의 슬라이드를 선택해주세요.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('slide_indices_json', JSON.stringify(selectedSlides));

    try {
      const response = await axios.post('http://localhost:8000/api/process', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `converted_images_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting slides:', error);
      alert('변환 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <div className="w-full max-w-[1280px] mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PPT 이미지 변환기
          </h1>
          <p className="text-lg text-gray-600">
            PowerPoint 슬라이드를 고품질 이미지로 변환하세요
          </p>
        </div>

        {/* Main Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <FileUploader onFileSelect={handleFileSelect} />
            
            {file && (
              <SlideSelector
                file={file}
                selectedSlides={selectedSlides}
                onSelectionChange={handleSelectionChange}
              />
            )}
          </CardContent>
        </Card>

        {/* Convert Button */}
        {file && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedSlides.length > 0 
                    ? `${selectedSlides.length}개의 슬라이드가 선택됨` 
                    : '변환할 슬라이드를 선택하세요'
                  }
                </div>
                <Button
                  onClick={handleConvert}
                  disabled={isLoading || selectedSlides.length === 0}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      변환 중...
                    </div>
                  ) : (
                    `${selectedSlides.length}개 슬라이드 변환하기`
                  )}
                </Button>
              </div>
              
              {selectedSlides.length === 0 && file && (
                <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  💡 위에서 변환하고 싶은 슬라이드를 선택하세요
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <CardContent>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <CardTitle className="font-semibold text-gray-900 mb-1">고품질 변환</CardTitle>
              <CardDescription className="text-sm text-gray-600">슬라이드를 선명한 PNG 이미지로 변환</CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-center p-6">
            <CardContent>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="font-semibold text-gray-900 mb-1">선택적 변환</CardTitle>
              <CardDescription className="text-sm text-gray-600">원하는 슬라이드만 골라서 변환</CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-center p-6">
            <CardContent>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <CardTitle className="font-semibold text-gray-900 mb-1">ZIP 다운로드</CardTitle>
              <CardDescription className="text-sm text-gray-600">모든 이미지를 ZIP으로 한번에 다운로드</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>지원 형식: PPTX • 최대 파일 크기: 10MB</p>
        </div>
      </div>
    </div>
  );
};

export default Home;