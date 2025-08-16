import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  initialValue: string;
  onSave: (editedText: string) => void;
  onCancel: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onSave,
  onCancel
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Quill 에디터 설정
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  const handleSave = () => {
    onSave(value);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 에디터 */}
      <div style={{ flex: 1, minHeight: '250px' }}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={setValue}
          modules={modules}
          formats={formats}
          style={{ height: '100%' }}
        />
      </div>

      {/* 버튼들 */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        padding: '1rem 0',
        borderTop: '1px solid #e5e7eb',
        marginTop: '1rem'
      }}>
        <button
          onClick={handleCancel}
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
          ❌ 취소
        </button>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
          }}
        >
          💾 저장
        </button>
      </div>
    </div>
  );
};

export default RichTextEditor;

