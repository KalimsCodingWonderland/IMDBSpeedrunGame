//frontend/src/App.js

import React, { useState } from 'react';
import axios from 'axios';
import './styles.css';

function App() {
  const [startMovie, setStartMovie] = useState('');
  const [endMovie, setEndMovie] = useState('');
  const [algorithm, setAlgorithm] = useState('bfs'); // New state for algorithm selection
  const [startMovieSuggestions, setStartMovieSuggestions] = useState([]);
  const [endMovieSuggestions, setEndMovieSuggestions] = useState([]);
  const [bfsPath, setBfsPath] = useState(null);
  const [dijkstraPath, setDijkstraPath] = useState(null);
  const [error, setError] = useState(null);

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
    try {
      const res = await axios.get(
        `/search_path?start=${encodeURIComponent(startMovie)}&end=${encodeURIComponent(endMovie)}&algorithm=${algorithm}`
      );
      setBfsPath(res.data.bfs_path);
      setDijkstraPath(res.data.dijkstra_path);
      setError(null);
    } catch (err) {
      setError('Unable to find a path between the selected movies.');
      setBfsPath(null);
      setDijkstraPath(null);
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

      {/* New dropdown for selecting algorithm */}
      <div className="algorithm-selection">
        <label>Select Algorithm: </label>
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option value="bfs">BFS (Breadth-First Search)</option>
          <option value="dijkstra">Dijkstra's Algorithm</option>
        </select>
      </div>

      <button onClick={searchMovies}>Find Path</button>

      {error && <p className="error">{error}</p>}

      {bfsPath && (
        <div>
          <h2>BFS Path:</h2>
          {bfsPath.path.map((movie, index) => (
            <div key={index}>
              <p>{movie}</p>
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
              <p>{movie}</p>
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