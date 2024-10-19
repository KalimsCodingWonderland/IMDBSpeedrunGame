#backend/app.py

from flask import Flask, request, jsonify
import requests
from algorithms import bfs, dijkstra
from movie_graph import *

app = Flask(__name__)
API_KEY = '9f981a4c4394f62d994979dbb6ee0230'
BASE_URL = 'https://api.themoviedb.org/3/'

@app.route('/search_movie', methods=['GET'])
def search_movie():
    movie_name = request.args.get('movie_name')
    response = requests.get(
        f"{BASE_URL}search/movie",
        params={'api_key': API_KEY, 'query': movie_name}
    )
    movies = response.json().get('results', [])

    movie_details = []
    for movie in movies:
        movie_id = movie['id']
        details_response = requests.get(
            f"{BASE_URL}movie/{movie_id}/credits",
            params={'api_key': API_KEY}
        )
        credits = details_response.json()

        # Get director from the crew
        director = None
        for crew_member in credits.get('crew', []):
            if crew_member.get('job') == 'Director':
                director = crew_member['name']
                break

        movie_details.append({
            'title': movie['title'],
            'year': movie.get('release_date', '')[:4] if movie.get('release_date') else 'N/A',
            'director': director,
            'poster_path': movie.get('poster_path')
        })

    return jsonify(movie_details)

# backend/app.py

@app.route('/search_path', methods=['GET'])
def search_path():
    start_movie_title = request.args.get('start')
    end_movie_title = request.args.get('end')
    algorithm = request.args.get('algorithm', 'bfs')

    logging.debug(f"Searching path from '{start_movie_title}' to '{end_movie_title}' using {algorithm}")

    graph = MovieGraph()
    try:
        path_found = graph.build_movie_graph(start_movie_title, end_movie_title)
    except Exception as e:
        logging.error(f"Error building movie graph: {str(e)}")
        return jsonify({'error': f'Error building movie graph: {str(e)}'}), 500

    if not path_found:
        return jsonify({'error': 'Could not find a path between the movies. Try increasing max_depth.'}), 404

    start_movie_id = graph.start_movie_id
    end_movie_id = graph.end_movie_id

    try:
        if algorithm == 'bfs':
            result = bfs(graph, start_movie_id, end_movie_id)
        else:
            result = dijkstra(graph, start_movie_id, end_movie_id)
    except Exception as e:
        logging.error(f"Error in pathfinding algorithm: {str(e)}")
        return jsonify({'error': f'Error in pathfinding algorithm: {str(e)}'}), 500

    def convert_path(result):
        if result is None:
            return None
        path = []
        for movie_id in result['path']:
            movie_data = graph.movies[movie_id]
            path.append({
                'id': movie_id,
                'title': movie_data['title'],
                'year': movie_data['year'],
                'poster_path': movie_data.get('poster_path')
            })
        connections = result['connections']
        return {'path': path, 'connections': connections}

    path_result = convert_path(result)

    logging.debug(f"Path found: {path_result}")

    return jsonify({
        f'{algorithm}_path': path_result
    })

if __name__ == '__main__':
    app.run(debug=True)