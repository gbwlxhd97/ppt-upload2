import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SlideSelectorProps {
  file: File;
  selectedSlides: number[];
  onSelectionChange: (selected: number[]) => void;
}

const SlideSelector: React.FC<SlideSelectorProps> = ({ file, selectedSlides, onSelectionChange }) => {
  const [slideCount, setSlideCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (file) {
      getSlideCount();
    }
  }, [file]);

  const getSlideCount = async () => {
    setIsLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/slide-info', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSlideCount(response.data.slide_count || 0);
    } catch (error) {
      console.error('Error getting slide info:', error);
      setError('슬라이드 정보를 가져올 수 없습니다.');
      // 에러 발생 시 기본값으로 1개 슬라이드 설정
      setSlideCount(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (index: number) => {
    const newSelection = [...selectedSlides];
    if (newSelection.includes(index)) {
      const idx = newSelection.indexOf(index);
      newSelection.splice(idx, 1);
    } else {
      newSelection.push(index);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedSlides.length === slideCount) {
      onSelectionChange([]);
    } else {
      onSelectionChange(Array.from({ length: slideCount }, (_, i) => i));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <div className="text-gray-600">슬라이드 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="text-yellow-800">{error}</div>
        <div className="text-sm text-yellow-600 mt-1">
          기본값으로 1개 슬라이드가 설정되었습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          슬라이드 선택 ({slideCount}개 슬라이드)
        </h3>
        <Button
          variant="outline"
          onClick={handleSelectAll}
        >
          {selectedSlides.length === slideCount ? '전체 해제' : '전체 선택'}
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: slideCount }, (_, index) => (
          <div
            key={index}
            className={cn(
              "relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-200 p-4",
              selectedSlides.includes(index) 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            )}
            onClick={() => handleCheckboxChange(index)}
          >
            <div className="absolute top-2 right-2 z-10">
              <Checkbox
                id={`slide-${index}`}
                checked={selectedSlides.includes(index)}
                onCheckedChange={() => handleCheckboxChange(index)}
              />
            </div>
            <Label htmlFor={`slide-${index}`} className="flex flex-col items-center justify-center aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {index + 1}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  슬라이드
                </div>
              </div>
            </Label>
          </div>
        ))}
      </div>
      
      {slideCount === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">슬라이드를 찾을 수 없습니다.</div>
          <div className="text-sm text-gray-400 mt-1">
            PPT 파일이 올바른지 확인해주세요.
          </div>
        </div>
      )}
      
      {selectedSlides.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm text-blue-800">
            {selectedSlides.length}개의 슬라이드가 선택되었습니다: {' '}
            {selectedSlides.map(i => i + 1).sort((a, b) => a - b).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideSelector;