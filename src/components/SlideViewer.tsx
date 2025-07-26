import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SlideViewerProps {
  file: File;
  slideCount: number;
}

const SlideViewer: React.FC<SlideViewerProps> = ({ file, slideCount }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideImage, setSlideImage] = useState<string | null>(null);
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlideImage = useCallback(async (index: number) => {
    setIsLoadingSlide(true);
    setError(null);
    setSlideImage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('slide_index', index.toString());

    try {
      const response = await axios.post('http://localhost:8000/api/get-slide-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSlideImage(`data:image/png;base64,${response.data.image}`);
    } catch (err) {
      console.error('Error fetching slide image:', err);
      setError('슬라이드 이미지를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoadingSlide(false);
    }
  }, [file]);

  useEffect(() => {
    if (file && slideCount > 0) {
      fetchSlideImage(currentSlideIndex);
    }
  }, [file, slideCount, currentSlideIndex, fetchSlideImage]);

  const handlePrev = () => {
    setCurrentSlideIndex((prevIndex) => Math.max(0, prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentSlideIndex((prevIndex) => Math.min(slideCount - 1, prevIndex + 1));
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[400px]">
        {isLoadingSlide ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Progress value={(currentSlideIndex / slideCount) * 100} className="w-[60%] mb-4" />
            <p className="text-gray-500">슬라이드 {currentSlideIndex + 1} 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : slideImage ? (
          <img src={slideImage} alt={`Slide ${currentSlideIndex + 1}`} className="max-w-full h-auto object-contain" />
        ) : (
          <div className="text-gray-500">슬라이드를 불러올 수 없습니다.</div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4 border-t">
        <Button onClick={handlePrev} disabled={currentSlideIndex === 0 || isLoadingSlide}>
          이전
        </Button>
        <span className="text-lg font-semibold">
          {currentSlideIndex + 1} / {slideCount}
        </span>
        <Button onClick={handleNext} disabled={currentSlideIndex === slideCount - 1 || isLoadingSlide}>
          다음
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SlideViewer;
