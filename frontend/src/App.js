//app.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

function MovieCardDeck({ movies, isProcessing }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [moviePosters, setMoviePosters] = useState({});

  // Function to fetch movie posters from TMDB
  const fetchMoviePoster = async (movieId) => {
    const options = {
      method: 'GET',
      headers: { accept: 'application/json' },
    };

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=9f981a4c4394f62d994979dbb6ee0230`,
        options
      );
      const data = await response.json();
      if (data.posters && data.posters.length > 0) {
        // Use the first backdrop in the list (file_path) to form the image URL
        return `https://image.tmdb.org/t/p/original${data.posters[2].file_path}`;
      }
      return null; // If no backdrop found
    } catch (err) {
      console.error(`Error fetching poster for movie ID: ${movieId}`, err);
      return null;
    }
  };

  // Fetch posters for all movies
  useEffect(() => {
    if (movies.length > 0) {
      const fetchAllPosters = async () => {
        const posters = {};
        for (const movie of movies) {
          const posterUrl = await fetchMoviePoster(movie.id);
          posters[movie.id] = posterUrl;
        }
        setMoviePosters(posters);
      };
      fetchAllPosters();
    }
  }, [movies]);

  // Set interval to rotate cards
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
    <div className="movie-card-deck">
      {movies.map((movie, index) => (
        <div
          key={movie.id}
          className={`movie-card ${index === currentIndex ? 'active' : ''}`}
          style={{
            backgroundImage: moviePosters[movie.id]
              ? `url(${moviePosters[movie.id]})`
              : 'url(/default-poster.jpg)', // Default image if no poster
          }}
        >
          <div className="movie-info">
            <h3>{movie.title}</h3>
            <p>{movie.year}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [startMovie, setStartMovie] = useState('');
  const [endMovie, setEndMovie] = useState('');
  const [algorithm, setAlgorithm] = useState('bfs');
  const [startMovieSuggestions, setStartMovieSuggestions] = useState([]);
  const [endMovieSuggestions, setEndMovieSuggestions] = useState([]);
  const [bfsPath, setBfsPath] = useState(null);
  const [dijkstraPath, setDijkstraPath] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedMovies, setProcessedMovies] = useState([]);

  const fetchMovieSuggestions = async (query, setSuggestions) => {
    if (query.length > 2) {
      const res = await axios.get(`/search_movie?movie_name=${query}`);
      setSuggestions(res.data);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (movie, setMovie, setSuggestions) => {
    setMovie(movie.title);
    setSuggestions([]);
  };

  const searchMovies = async () => {
    setIsProcessing(true);
    setProcessedMovies([]);
    setBfsPath(null);
    setDijkstraPath(null);
    setError(null);

    try {
      const res = await axios.get(
        `/search_path?start=${encodeURIComponent(startMovie)}&end=${encodeURIComponent(endMovie)}&algorithm=${algorithm}`
      );
      const result = res.data[`${algorithm}_path`];
      if (algorithm === 'bfs') {
        setBfsPath(result);
      } else {
        setDijkstraPath(result);
      }
      setProcessedMovies(result.path);
    } catch (err) {
      setError('Unable to find a path between the selected movies.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <h1>Movie Path Finder</h1>

      <div className="autocomplete">
        <input
          type="text"
          value={startMovie}
          onChange={(e) => {
            setStartMovie(e.target.value);
            fetchMovieSuggestions(e.target.value, setStartMovieSuggestions);
          }}
          placeholder="Start Movie"
        />
        {startMovieSuggestions.length > 0 && (
          <ul className="suggestions">
            {startMovieSuggestions.map((movie, index) => (
              <li
                key={index}
                onClick={() =>
                  handleSelectSuggestion(movie, setStartMovie, setStartMovieSuggestions)
                }
              >
                <strong>{movie.title}</strong> ({movie.year}) - Directed by {movie.director}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="autocomplete">
        <input
          type="text"
          value={endMovie}
          onChange={(e) => {
            setEndMovie(e.target.value);
            fetchMovieSuggestions(e.target.value, setEndMovieSuggestions);
          }}
          placeholder="End Movie"
        />
        {endMovieSuggestions.length > 0 && (
          <ul className="suggestions">
            {endMovieSuggestions.map((movie, index) => (
              <li
                key={index}
                onClick={() => handleSelectSuggestion(movie, setEndMovie, setEndMovieSuggestions)}
              >
                <strong>{movie.title}</strong> ({movie.year}) - Directed by {movie.director}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="algorithm-selection">
        <label>Select Algorithm: </label>
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option value="bfs">BFS (Breadth-First Search)</option>
          <option value="dijkstra">Dijkstra's Algorithm</option>
        </select>
      </div>

      <button onClick={searchMovies}>Find Path</button>

      {error && <p className="error">{error}</p>}

      <MovieCardDeck movies={processedMovies} isProcessing={isProcessing} />

      {bfsPath && (
        <div>
          <h2>BFS Path:</h2>
          {bfsPath.path.map((movie, index) => (
            <div key={index}>
              <p>{movie.title}</p>
              {index < bfsPath.connections.length && (
                <p>Connected via: {bfsPath.connections[index]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {dijkstraPath && (
        <div>
          <h2>Dijkstra Path:</h2>
          {dijkstraPath.path.map((movie, index) => (
            <div key={index}>
              <p>{movie.title}</p>
              {index < dijkstraPath.connections.length && (
                <p>Connected via: {dijkstraPath.connections[index]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;