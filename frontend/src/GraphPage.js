import React from 'react';
import GraphVisualizer from './GraphVisualizer'; // Implement this for your graph logic

function GraphPage({ navigateHome }) {
    return (
        <div>
            <h1>Interactive Movie Graph</h1>
            <button onClick={navigateHome}>Back to Movie Deck</button>
            <GraphVisualizer /> {/* Custom component to render your graph */}
        </div>
    );
}

export default GraphPage;