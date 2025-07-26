import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SlideViewer from '@/components/SlideViewer'; // New SlideViewer component

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
        const response = await axios.post('http://localhost:8000/api/slide-info', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSlideCount(response.data.slide_count || 0);
      } catch (error) {
        console.error('Error getting slide info:', error);
        alert('슬라이드 정보를 가져오는 데 실패했습니다. 올바른 PPTX 파일인지 확인해주세요.');
        setFile(null); // Reset file if error occurs
        setSlideCount(0);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <div className="w-full max-w-[1280px] mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PPT 슬라이드 뷰어
          </h1>
          <p className="text-lg text-gray-600">
            PowerPoint 파일을 업로드하여 슬라이드를 미리보세요
          </p>
        </div>

        {!file ? (
          <Card className="mb-6 p-6 text-center">
            <Label htmlFor="file-upload" className="sr-only">Choose file</Label>
            <Input 
              id="file-upload" 
              type="file" 
              accept=".pptx" 
              onChange={handleFileChange} 
              className="hidden"
              ref={fileInputRef}
            />
            <Button onClick={handleUploadButtonClick} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  파일 분석 중...
                </div>
              ) : (
                'PPTX 파일 업로드'
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-2">PPTX 파일만 지원합니다.</p>
          </Card>
        ) : (
          <SlideViewer file={file} slideCount={slideCount} />
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>지원 형식: PPTX</p>
        </div>
      </div>
    </div>
  );
};

export default App;
