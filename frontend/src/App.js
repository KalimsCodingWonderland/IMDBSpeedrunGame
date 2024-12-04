import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

// Updated MovieCardDeck Component
// In your MovieCardDeck component (inside App.js or a separate file)

function MovieCardDeck({ movies, startMovieId, endMovieId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  //const [direction, setDirection] = useState(null);
  const totalMovies = movies.length;

  const handleNext = () => {
    //setDirection('right');
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalMovies);
  };

  const handlePrev = () => {
    //setDirection('left');
    setCurrentIndex((prevIndex) => (prevIndex - 1 + totalMovies) % totalMovies);
  };

  // // Resets direction
  // useEffect(() => {
  //   if (direction) {
  //     const timer = setTimeout(() => setDirection(null), 600);
  //     return () => clearTimeout(timer);
  //   }
  // }, [direction]);

  const handleCardClick = (movieId) => {
    const tmdbUrl = `https://www.themoviedb.org/movie/${movieId}`;
    window.open(tmdbUrl, '_blank');
  };

  if (movies.length === 0) return null;

  return (
    <div className="movie-card-deck">
      <button className="nav-arrow left-arrow" onClick={handlePrev}>
        &#10094;
      </button>
      <div className="movie-card-container">
        {movies.map((movie, index) => (
          <div
            key={movie.id}
            className={`movie-card ${
              index === currentIndex ? 'active' : 'inactive'
            } ${
              movie.id === startMovieId
                ? 'start-movie'
                : movie.id === endMovieId
                ? 'end-movie'
                : ''
            }`}
            style={{
              backgroundImage: movie.poster_path
                ? `url(https://image.tmdb.org/t/p/w500${movie.poster_path})`
                : 'url(/default-poster.jpg)',
            }}
            onClick={() => handleCardClick(movie.id)}
          >
            <div className="movie-info">
              <h3>{movie.title}</h3>
              <p>{movie.year}</p>
              {movie.connection && (
                <p className="connection-info">
                  Connected via: {movie.connection.type} -{' '}
                  {movie.connection.name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="nav-arrow right-arrow" onClick={handleNext}>
        &#10095;
      </button>
    </div>
  );
}

function App() {
  const [startMovie, setStartMovie] = useState('');
  const [endMovie, setEndMovie] = useState('');
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [startMovieSuggestions, setStartMovieSuggestions] = useState([]);
  const [endMovieSuggestions, setEndMovieSuggestions] = useState([]);
  const [path, setPath] = useState(null);
  const [processedMovies, setProcessedMovies] = useState([]);
  const [topProcessedMovies, setTopProcessedMovies] = useState([]);
  const [error, setError] = useState(null);
  const [startMovieId, setStartMovieId] = useState(null);
  const [endMovieId, setEndMovieId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadedMovies, setLoadedMovies] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [totalMovies, setTotalMovies] = useState(null);
  const [lastExecutedAlgorithm, setLastExecutedAlgorithm] = useState('');

  const fetchMovieSuggestions = async (query, setSuggestions) => {
    if (query.length > 2) {
      try {
        const res = await axios.get(`/search_movie?movie_name=${encodeURIComponent(query)}`);
        setSuggestions(res.data.results || []);
      } catch (err) {
        console.error('Error fetching movie suggestions:', err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (movie, setMovie, setSuggestions, setMovieId) => {
  setMovie(movie.title);
  setMovieId(movie.id); // Set the selected movie ID
  setSuggestions([]);
};


  const searchMovies = async () => {
  if (!startMovie || !endMovie) {
    setError('Please select both start and end movies.');
    return;
  }

  if (!startMovieId || !endMovieId) {
    setError('Invalid movie selections. Please try again.');
    return;
  }

  setIsProcessing(true);
  setProcessedMovies([]);
  setLoadedMovies([]);
  setTopProcessedMovies([]);
  setPath(null);
  setError(null);

  try {
      // Step 1: Fetch the path using movie IDs
      const pathResponse = await axios.get(
        `/find_path?start_id=${startMovieId}&end_id=${endMovieId}&algorithm=${algorithm}`
      );

      console.log('API Response:', pathResponse.data); // Debugging
      const algorithmPath = pathResponse.data.path;
      const timeTaken = pathResponse.data.execution_time;
      const totalMovies = pathResponse.data.total_movies;

      if (algorithmPath) {
        setPath(algorithmPath);
        setStartMovieId(algorithmPath.movies[0].id);
        setEndMovieId(algorithmPath.movies[algorithmPath.movies.length - 1].id);

        // Step 2: Start fetching processed movies progressively
        setExecutionTime(timeTaken);
        setTotalMovies(totalMovies);
        setLastExecutedAlgorithm(algorithm);
        fetchProcessedMoviesProgressively();
      }

    } catch (err) {
      console.error('Error finding path:', err);
      setError('Unable to find a path between the selected movies.');
      setIsProcessing(false);
    }
  };

const fetchProcessedMoviesProgressively = async () => {
    try {
      let offset = 0;
      const batchSize = 250;
      const maxMovies = 500; // Set this to the maximum number of movies you want to load

      const fetchBatch = async () => {
        setIsLoadingMore(true);
        const res = await axios.get(`/get_processed_movies?offset=${offset}&limit=${batchSize}`);
        const newMovies = res.data.processed_movies;
        const totalCount = res.data.total_count; // New field from backend

        if (newMovies && newMovies.length > 0) {
          setLoadedMovies(prevMovies => [...prevMovies, ...newMovies]);
          setTopProcessedMovies(prevMovies => {
            const updatedMovies = [...prevMovies, ...newMovies];
            return updatedMovies.slice(0, 250);
          });
          offset += newMovies.length;
          setTotalMoviesCount(totalCount);

          if (offset < Math.min(totalCount, maxMovies)) {
            setTimeout(fetchBatch, 100); // Fetch next batch after a short delay
          } else {
            setIsLoadingMore(false);
            setIsProcessing(false);
          }
        } else {
          setIsLoadingMore(false);
          setIsProcessing(false);
        }
      };

      await fetchBatch();
    } catch (err) {
      console.error('Error fetching processed movies:', err);
      setIsLoadingMore(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <h1>🎬 Movie Path Finder</h1>

      {/* Start Movie Input */}
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
            {startMovieSuggestions.map((movie) => (
              <li
                key={movie.id}
                onClick={() =>
                  handleSelectSuggestion(
                    movie,
                    setStartMovie,
                    setStartMovieSuggestions,
                    setStartMovieId
                  )
                }
              >
                <strong>{movie.title}</strong> ({movie.year}) - Directed by{' '}
                {movie.director || 'N/A'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* End Movie Input */}
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
            {endMovieSuggestions.map((movie) => (
              <li
                key={movie.id}
                onClick={() =>
                  handleSelectSuggestion(
                    movie,
                    setEndMovie,
                    setEndMovieSuggestions,
                    setEndMovieId
                  )
                }
              >
                <strong>{movie.title}</strong> ({movie.year}) - Directed by{' '}
                {movie.director || 'N/A'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Algorithm Selection */}
      <div className="algorithm-selection">
        <label>Select Algorithm:</label>
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option value="dijkstra">Dijkstra's Algorithm</option>
          <option value="bfs">Bidirectional BFS</option>
        </select>
      </div>

      {/* Search Button */}
      <button onClick={searchMovies} disabled={isProcessing}>
        {isProcessing ? 'Searching...' : 'Find Path'}
      </button>

      {/* Error Message */}
      {error && <p className="error">{error}</p>}

      {/* Loading Indicator */}
      {isProcessing ? (
        <div className="loading">
          <p>Processing movies... Please wait.</p>
        </div>
      ) : (
        executionTime && (
            <div className="loading">
              <p>
                {lastExecutedAlgorithm === 'dijkstra'
                    ? "Dijkstra's Execution Time"
                    : 'Bidirectional BFS Execution Time'}
                : {executionTime.toFixed(2)} seconds
                <p>Total Unique Movies Explored: {totalMovies}</p>
              </p>
            </div>
        )
      )}

      {/* Display Path */}
      {path && (
          <div className="path-result">
          <h2>
            {lastExecutedAlgorithm === 'dijkstra'
              ? "Dijkstra's"
              : 'Bidirectional BFS'}{' '}
            Path:
          </h2>
          <ul>
            {path.movies.map((movie, index) => (
              <li key={movie.id}>
                <p>
                  <strong>{movie.title}</strong> ({movie.year})
                </p>
                {index < path.connections.length && (
                  <p>
                    Connected via: <em>{path.connections[index]}</em>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Processed Movies */}
      {loadedMovies.length > 0 && (
        <>
          <h2>Processed Movies:</h2>
          <MovieCardDeck
            movies={topProcessedMovies}
            startMovieId={startMovieId}
            endMovieId={endMovieId}
          />
          {isLoadingMore && <p className="loading-more">Loading more movies...</p>}
        </>
      )}

      {/* Similar Movies Section */}
      {path && !processedMovies.length && (
        <div className="similar-movies">
          <h2>Similar Movies You Might Like:</h2>
          <ul>
            {/* Implement similar movies logic */}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
