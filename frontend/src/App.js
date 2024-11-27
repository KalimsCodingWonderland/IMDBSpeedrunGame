import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';
import MovieCardDeck from './MovieCardDeck';
import GraphPage from './GraphPage'; // New component for the graph page

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // State for navigation
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
    setMovieId(movie.id);
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
      const pathResponse = await axios.get(
        `/find_path?start_id=${startMovieId}&end_id=${endMovieId}&algorithm=${algorithm}`
      );
      const algorithmPath = pathResponse.data.path;

      if (algorithmPath) {
        setPath(algorithmPath);
        setStartMovieId(algorithmPath.movies[0].id);
        setEndMovieId(algorithmPath.movies[algorithmPath.movies.length - 1].id);
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
      const maxMovies = 500;

      const fetchBatch = async () => {
        setIsLoadingMore(true);
        const res = await axios.get(`/get_processed_movies?offset=${offset}&limit=${batchSize}`);
        const newMovies = res.data.processed_movies;
        const totalCount = res.data.total_count;

        if (newMovies && newMovies.length > 0) {
          setLoadedMovies((prevMovies) => [...prevMovies, ...newMovies]);
          setTopProcessedMovies((prevMovies) => {
            const updatedMovies = [...prevMovies, ...newMovies];
            return updatedMovies.slice(0, 250);
          });
          offset += newMovies.length;

          if (offset < Math.min(totalCount, maxMovies)) {
            setTimeout(fetchBatch, 100);
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

  const renderHomePage = () => (
    <div>
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
                  handleSelectSuggestion(movie, setStartMovie, setStartMovieSuggestions, setStartMovieId)
                }
              >
                <strong>{movie.title}</strong> ({movie.year})
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
                  handleSelectSuggestion(movie, setEndMovie, setEndMovieSuggestions, setEndMovieId)
                }
              >
                <strong>{movie.title}</strong> ({movie.year})
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

      <button onClick={searchMovies} disabled={isProcessing}>
        {isProcessing ? 'Searching...' : 'Find Path'}
      </button>

      {error && <p className="error">{error}</p>}

      {isProcessing && <p>Processing movies... Please wait.</p>}

      {path && (
        <div>
          <h2>{algorithm === 'dijkstra' ? "Dijkstra's" : 'Bidirectional BFS'} Path:</h2>
          <ul>
            {path.movies.map((movie, index) => (
              <li key={movie.id}>
                <p>
                  {movie.title} ({movie.year})
                  {index < path.connections.length && (
                    <span> Connected via: {path.connections[index]}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Only show after movie deck is loaded */}
      {loadedMovies.length > 0 && !isLoadingMore && (
        <>
          <h2>Processed Movies:</h2>
          <MovieCardDeck movies={topProcessedMovies} startMovieId={startMovieId} endMovieId={endMovieId} />
          <button onClick={() => setCurrentPage('graph')}>View Interactive Graph</button>
        </>
      )}
    </div>
  );

  return (
    <div className="container">
      {currentPage === 'home' ? renderHomePage() : <GraphPage navigateHome={() => setCurrentPage('home')} />}
    </div>
  );
}

export default App;