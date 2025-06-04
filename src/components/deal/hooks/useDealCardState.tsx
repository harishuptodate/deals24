
import { useState, useEffect } from 'react';

interface FavoriteItem {
  title: string;
  description: string;
  link: string;
  id?: string;
  timestamp: string;
}

export const useDealCardState = (title: string) => {
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.some((fav: FavoriteItem) => fav.title === title);
  });

  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState('');
  const [localCategory, setLocalCategory] = useState('');

  return {
    isFavorite,
    setIsFavorite,
    localTitle,
    setLocalTitle,
    localDescription,
    setLocalDescription,
    localCategory,
    setLocalCategory,
  };
};
