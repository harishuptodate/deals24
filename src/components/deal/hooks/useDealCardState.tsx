
import { useState } from 'react';

export const useDealCardState = (title: string) => {
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState('');
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [localCategory, setLocalCategory] = useState('');

  return {
    localTitle,
    setLocalTitle,
    localDescription,
    setLocalDescription,
    localImageUrl,
    setLocalImageUrl,
    localCategory,
    setLocalCategory,
  };
};
