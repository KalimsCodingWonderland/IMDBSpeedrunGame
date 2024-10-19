import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

const MovieCardDeck = ({ movies, isProcessing, onSelectMovie }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isProcessing && movies.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % movies.length);
      }, 2000); // Change card every 2 seconds
      return () => clearInterval(interval);
    }
  }, [isProcessing, movies]);

  if (movies.length === 0) return null;

  return (
    <div className="relative w-64 h-96 mx-auto mt-8">
      {movies.map((movie, index) => (
        <Card
          key={movie.id}
          className={`absolute w-full h-full transition-all duration-500 ease-in-out cursor-pointer ${
            index === currentIndex ? 'z-10 transform-none' : 'transform -translate-y-4 scale-95 opacity-0'
          }`}
          style={{
            backgroundImage: `url(https://api.themoviedb.org/3/movie/movie_id/images)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={() => onSelectMovie(movie)}
        >
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            <h3 className="text-lg font-bold">{movie.title}</h3>
            <p className="text-sm">{movie.year}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MovieCardDeck;