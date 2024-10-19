from flask import Flask, request, jsonify
import requests
import heapq
import logging
import time

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = '9f981a4c4394f62d994979dbb6ee0230'
BASE_URL = 'https://api.themoviedb.org/3/'

# Existing API functions remain the same
def get_movie_credits(movie_id):
    url = f"{BASE_URL}movie/{movie_id}/credits"
    response = requests.get(url, params={'api_key': API_KEY})
    return response.json() if response.status_code == 200 else None

def get_person_movies(person_id):
    url = f"{BASE_URL}person/{person_id}/movie_credits"
    response = requests.get(url, params={'api_key': API_KEY})
    return response.json() if response.status_code == 200 else None

def get_movie_details(movie_id):
    url = f"{BASE_URL}movie/{movie_id}"
    response = requests.get(url, params={'api_key': API_KEY})
    return response.json() if response.status_code == 200 else None

def search_movie_list(title, limit=10):
    url = f"{BASE_URL}search/movie"
    response = requests.get(url, params={'api_key': API_KEY, 'query': title})
    results = response.json().get('results', [])
    movies = []
    for movie in results[:limit]:
        credits = get_movie_credits(movie['id'])
        if credits:
            director = next((crew['name'] for crew in credits.get('crew', []) if crew['job'] == 'Director'), 'N/A')
        else:
            director = 'N/A'
        movies.append({
            'id': movie['id'],
            'title': movie['title'],
            'year': movie['release_date'][:4] if movie.get('release_date') else 'N/A',
            'poster_path': movie.get('poster_path'),
            'director': director
        })
    return movies

def get_commonalities(current_movie_id, goal_movie_id):
    movie1 = get_movie_details(current_movie_id)
    movie2 = get_movie_details(goal_movie_id)

    credits1 = get_movie_credits(current_movie_id)
    credits2 = get_movie_credits(goal_movie_id)
    cast1 = set(person['id'] for person in credits1.get('cast', []))
    cast2 = set(person['id'] for person in credits2.get('cast', []))
    common_cast = len(cast1.intersection(cast2))

    crew1 = set(person['id'] for person in credits1.get('crew', []))
    crew2 = set(person['id'] for person in credits2.get('crew', []))
    common_crew = len(crew1.intersection(crew2))

    genres1 = set(genre['id'] for genre in movie1.get('genres', []))
    genres2 = set(genre['id'] for genre in movie2.get('genres', []))
    common_genres = len(genres1.intersection(genres2))

    return 3 * common_cast + 2 * common_crew + common_genres


from functools import lru_cache

# Caching API calls to improve performance
@lru_cache(maxsize=10000)
def get_movie_details_cached(movie_id):
    return get_movie_details(movie_id)

@lru_cache(maxsize=10000)
def get_movie_credits_cached(movie_id):
    return get_movie_credits(movie_id)

@lru_cache(maxsize=10000)
def get_person_movies_cached(person_id):
    return get_person_movies(person_id)


def heuristic(current_movie_id, goal_movie_id):
    credits_current = get_movie_credits_cached(current_movie_id)
    credits_goal = get_movie_credits_cached(goal_movie_id)

    if not credits_current or not credits_goal:
        return 10  # Arbitrary high value if credits are missing

    cast_current = set(person['id'] for person in credits_current.get('cast', []))
    cast_goal = set(person['id'] for person in credits_goal.get('cast', []))

    if cast_current.intersection(cast_goal):
        return 0  # Direct connection

    return 1  # Minimal heuristic value


def dijkstra_tmdb(start_movie_title, end_movie_title):
    start_time = time.perf_counter()

    # Search for start and end movies
    start_movie_list = search_movie_list(start_movie_title, limit=1)
    end_movie_list = search_movie_list(end_movie_title, limit=1)

    start_movie = start_movie_list[0] if start_movie_list else None
    end_movie = end_movie_list[0] if end_movie_list else None

    if not start_movie or not end_movie:
        logger.error("Start or end movie not found.")
        return None, None

    start_id = int(start_movie['id'])
    end_id = int(end_movie['id'])

    logger.info(f"Starting Bidirectional Dijkstra's algorithm from '{start_movie['title']}' (ID: {start_id}) to '{end_movie['title']}' (ID: {end_id})")

    # Initialize forward search structures
    forward_heap = [(0, start_id)]
    forward_visited = {start_id: 0}
    forward_predecessors = {}

    # Initialize backward search structures
    backward_heap = [(0, end_id)]
    backward_visited = {end_id: 0}
    backward_predecessors = {}

    # To keep track of all processed movies
    processed_movies = set([start_id, end_id])

    # Variable to store the meeting point
    meeting_movie = None
    minimal_total_cost = float('inf')

    while forward_heap and backward_heap:
        # Expand forward search
        if forward_heap:
            forward_cost, forward_current = heapq.heappop(forward_heap)
            logger.info(f"Forward Exploring movie: '{get_movie_details_cached(forward_current)['title']}' (ID: {forward_current}) with cost {forward_cost}")

            credits = get_movie_credits_cached(forward_current)
            if credits:
                all_people = credits.get('cast', []) + credits.get('crew', [])
                sorted_people = sorted(all_people, key=lambda x: x.get('popularity', 0), reverse=True)[:50]

                for person in sorted_people:
                    person_id = int(person['id'])
                    person_name = person['name']
                    logger.info(f"Forward Exploring connections through: {person_name} (ID: {person_id})")

                    person_movies = get_person_movies_cached(person_id)
                    if not person_movies:
                        continue

                    all_movies = person_movies.get('cast', []) + person_movies.get('crew', [])
                    sorted_movies = sorted(all_movies, key=lambda x: (x.get('release_date', ''), x.get('popularity', 0)), reverse=True)[:50]

                    for movie in sorted_movies:
                        next_movie_id = int(movie['id'])
                        processed_movies.add(next_movie_id)  # Add to processed_movies set

                        if next_movie_id in forward_visited:
                            continue

                        tentative_forward_cost = forward_cost + 1
                        if next_movie_id not in forward_visited or tentative_forward_cost < forward_visited[next_movie_id]:
                            forward_visited[next_movie_id] = tentative_forward_cost
                            forward_predecessors[next_movie_id] = forward_current
                            logger.info(f"Forward Adding movie to heap: '{movie['title']}' (ID: {next_movie_id}) with cost {tentative_forward_cost}")
                            heapq.heappush(forward_heap, (tentative_forward_cost, next_movie_id))

                            # Check if this node has been visited by backward search
                            if next_movie_id in backward_visited:
                                total_cost = tentative_forward_cost + backward_visited[next_movie_id]
                                if total_cost < minimal_total_cost:
                                    minimal_total_cost = total_cost
                                    meeting_movie = next_movie_id

        # Expand backward search
        if backward_heap:
            backward_cost, backward_current = heapq.heappop(backward_heap)
            logger.info(f"Backward Exploring movie: '{get_movie_details_cached(backward_current)['title']}' (ID: {backward_current}) with cost {backward_cost}")

            credits = get_movie_credits_cached(backward_current)
            if credits:
                all_people = credits.get('cast', []) + credits.get('crew', [])
                sorted_people = sorted(all_people, key=lambda x: x.get('popularity', 0), reverse=True)[:50]

                for person in sorted_people:
                    person_id = int(person['id'])
                    person_name = person['name']
                    logger.info(f"Backward Exploring connections through: {person_name} (ID: {person_id})")

                    person_movies = get_person_movies_cached(person_id)
                    if not person_movies:
                        continue

                    all_movies = person_movies.get('cast', []) + person_movies.get('crew', [])
                    sorted_movies = sorted(all_movies, key=lambda x: (x.get('release_date', ''), x.get('popularity', 0)), reverse=True)[:50]

                    for movie in sorted_movies:
                        next_movie_id = int(movie['id'])
                        processed_movies.add(next_movie_id)  # Add to processed_movies set

                        if next_movie_id in backward_visited:
                            continue

                        tentative_backward_cost = backward_cost + 1
                        if next_movie_id not in backward_visited or tentative_backward_cost < backward_visited[next_movie_id]:
                            backward_visited[next_movie_id] = tentative_backward_cost
                            backward_predecessors[next_movie_id] = backward_current
                            logger.info(f"Backward Adding movie to heap: '{movie['title']}' (ID: {next_movie_id}) with cost {tentative_backward_cost}")
                            heapq.heappush(backward_heap, (tentative_backward_cost, next_movie_id))

                            # Check if this node has been visited by forward search
                            if next_movie_id in forward_visited:
                                total_cost = tentative_backward_cost + forward_visited[next_movie_id]
                                if total_cost < minimal_total_cost:
                                    minimal_total_cost = total_cost
                                    meeting_movie = next_movie_id

        # Termination condition
        if meeting_movie is not None:
            # Reconstruct the path
            path_forward = []
            current = meeting_movie
            while current != start_id:
                path_forward.append(current)
                current = forward_predecessors.get(current)
                if current is None:
                    break
            path_forward.append(start_id)
            path_forward.reverse()

            path_backward = []
            current = meeting_movie
            while current != end_id:
                current = backward_predecessors.get(current)
                if current is None:
                    break
                path_backward.append(current)

            full_path = path_forward + path_backward

            end_time = time.perf_counter()
            logger.info(f"Bidirectional Dijkstra's execution time: {end_time - start_time:.2f} seconds")
            logger.info(f"Bidirectional Dijkstra's Path found! Total movies in path: {len(full_path)}")
            logger.info(f"Total unique movies explored: {len(processed_movies)}")
            return full_path, list(processed_movies)

    logger.info("No path found")
    logger.info(f"Total unique movies explored: {len(processed_movies)}")
    return None, list(processed_movies)

def a_star_tmdb(start_movie_title, end_movie_title):
    start_time = time.perf_counter()

    # Search for start and end movies
    start_movie_list = search_movie_list(start_movie_title, limit=1)
    end_movie_list = search_movie_list(end_movie_title, limit=1)

    start_movie = start_movie_list[0] if start_movie_list else None
    end_movie = end_movie_list[0] if end_movie_list else None

    if not start_movie or not end_movie:
        logger.error("Start or end movie not found.")
        return None, None

    start_id = int(start_movie['id'])
    end_id = int(end_movie['id'])

    logger.info(
        f"Starting Bidirectional A* algorithm from '{start_movie['title']}' (ID: {start_id}) to '{end_movie['title']}' (ID: {end_id})")

    # Initialize forward search structures
    forward_heap = [(heuristic(start_id, end_id), 0, start_id)]
    forward_visited = {start_id: 0}
    forward_predecessors = {}

    # Initialize backward search structures
    backward_heap = [(heuristic(end_id, start_id), 0, end_id)]
    backward_visited = {end_id: 0}
    backward_predecessors = {}

    # To keep track of processed nodes
    meeting_movie = None
    minimal_total_cost = float('inf')

    while forward_heap and backward_heap:
        # Expand forward search
        if forward_heap:
            f_score_forward, g_score_forward, current_forward = heapq.heappop(forward_heap)
            current_forward_movie = get_movie_details_cached(current_forward)

            if current_forward in forward_predecessors:
                # Already processed
                pass
            else:
                if not current_forward_movie:
                    continue
                logger.info(
                    f"Forward Exploring movie: '{current_forward_movie['title']}' (ID: {current_forward}) with f_score {f_score_forward}")
                forward_predecessors[current_forward] = None  # Mark as visited

                credits = get_movie_credits_cached(current_forward)
                if credits:
                    all_people = credits.get('cast', []) + credits.get('crew', [])
                    sorted_people = sorted(all_people, key=lambda x: x.get('popularity', 0), reverse=True)[:50]

                    for person in sorted_people:
                        person_id = int(person['id'])
                        person_name = person['name']
                        logger.info(f"Forward Exploring connections through: {person_name} (ID: {person_id})")

                        person_movies = get_person_movies_cached(person_id)
                        if not person_movies:
                            continue

                        all_movies = person_movies.get('cast', []) + person_movies.get('crew', [])
                        sorted_movies = sorted(all_movies, key=lambda x: (x.get('release_date', ''), x.get('popularity', 0)),
                                              reverse=True)[:50]

                        for movie in sorted_movies:
                            next_movie_id = int(movie['id'])
                            if next_movie_id in forward_visited:
                                continue

                            tentative_g_score = g_score_forward + 1
                            h_score = heuristic(next_movie_id, end_id)
                            f_score_new = tentative_g_score + h_score

                            if next_movie_id not in forward_visited or tentative_g_score < forward_visited[next_movie_id]:
                                forward_visited[next_movie_id] = tentative_g_score
                                forward_predecessors[next_movie_id] = current_forward
                                logger.info(
                                    f"Forward Adding movie to heap: '{movie['title']}' (ID: {next_movie_id}) with f_score {f_score_new}")
                                heapq.heappush(forward_heap, (f_score_new, tentative_g_score, next_movie_id))

                                # Check if this node has been visited by backward search
                                if next_movie_id in backward_visited:
                                    total_cost = tentative_g_score + backward_visited[next_movie_id]
                                    if total_cost < minimal_total_cost:
                                        minimal_total_cost = total_cost
                                        meeting_movie = next_movie_id

        # Expand backward search
        if backward_heap:
            f_score_backward, g_score_backward, current_backward = heapq.heappop(backward_heap)
            current_backward_movie = get_movie_details_cached(current_backward)

            if current_backward in backward_predecessors:
                # Already processed
                pass
            else:
                if not current_backward_movie:
                    continue
                logger.info(
                    f"Backward Exploring movie: '{current_backward_movie['title']}' (ID: {current_backward}) with f_score {f_score_backward}")
                backward_predecessors[current_backward] = None  # Mark as visited

                credits = get_movie_credits_cached(current_backward)
                if credits:
                    all_people = credits.get('cast', []) + credits.get('crew', [])
                    sorted_people = sorted(all_people, key=lambda x: x.get('popularity', 0), reverse=True)[:50]

                    for person in sorted_people:
                        person_id = int(person['id'])
                        person_name = person['name']
                        logger.info(f"Backward Exploring connections through: {person_name} (ID: {person_id})")

                        person_movies = get_person_movies_cached(person_id)
                        if not person_movies:
                            continue

                        all_movies = person_movies.get('cast', []) + person_movies.get('crew', [])
                        sorted_movies = sorted(all_movies, key=lambda x: (x.get('release_date', ''), x.get('popularity', 0)),
                                              reverse=True)[:50]

                        for movie in sorted_movies:
                            next_movie_id = int(movie['id'])
                            if next_movie_id in backward_visited:
                                continue

                            tentative_backward_cost = g_score_backward + 1
                            h_score = heuristic(next_movie_id, start_id)
                            f_score_new = tentative_backward_cost + h_score

                            if next_movie_id not in backward_visited or tentative_backward_cost < backward_visited[next_movie_id]:
                                backward_visited[next_movie_id] = tentative_backward_cost
                                backward_predecessors[next_movie_id] = current_backward
                                logger.info(
                                    f"Backward Adding movie to heap: '{movie['title']}' (ID: {next_movie_id}) with f_score {f_score_new}")
                                heapq.heappush(backward_heap, (f_score_new, tentative_backward_cost, next_movie_id))

                                # Check if this node has been visited by forward search
                                if next_movie_id in forward_visited:
                                    total_cost = tentative_backward_cost + forward_visited[next_movie_id]
                                    if total_cost < minimal_total_cost:
                                        minimal_total_cost = total_cost
                                        meeting_movie = next_movie_id

        # Check for meeting point
        if meeting_movie is not None:
            # Reconstruct path from start to meeting_movie
            path_forward = []
            current = meeting_movie
            while current != start_id:
                path_forward.append(current)
                current = forward_predecessors.get(current)
                if current is None:
                    break
            path_forward.append(start_id)
            path_forward.reverse()

            # Reconstruct path from meeting_movie to end
            path_backward = []
            current = meeting_movie
            while current != end_id:
                current = backward_predecessors.get(current)
                if current is None:
                    break
                path_backward.append(current)

            # Combine both paths
            full_path = path_forward + path_backward

            end_time = time.perf_counter()
            logger.info(f"Bidirectional A* execution time: {end_time - start_time:.2f} seconds")
            logger.info(f"Bidirectional A* Path found! Total movies in path: {len(full_path)}")
            return full_path, list(set(forward_visited.keys()).union(set(backward_visited.keys())))

    logger.info("No path found")
    return None, list(set(forward_visited.keys()).union(set(backward_visited.keys())))

def format_path(path):
    formatted_path = {
        'movies': [],
        'connections': []
    }
    for i, movie_id in enumerate(path):
        movie_details = get_movie_details(movie_id)
        if movie_details:
            formatted_path['movies'].append({
                'id': movie_id,
                'title': movie_details.get('title'),
                'year': movie_details.get('release_date', '')[:4],
                'poster_path': movie_details.get('poster_path')
            })
        if i < len(path) - 1:
            movie1_credits = get_movie_credits(path[i])
            movie2_credits = get_movie_credits(path[i + 1])
            common_people = set(p['id'] for p in movie1_credits.get('cast', []) + movie1_credits.get('crew', [])) & \
                            set(p['id'] for p in movie2_credits.get('cast', []) + movie2_credits.get('crew', []))
            if common_people:
                person_id = list(common_people)[0]
                person_details = next((p for p in movie1_credits.get('cast', []) + movie1_credits.get('crew', []) if
                                       p['id'] == person_id), None)
                if person_details:
                    formatted_path['connections'].append(person_details.get('name'))
                else:
                    formatted_path['connections'].append('Unknown')
            else:
                formatted_path['connections'].append('Unknown')
    return formatted_path

@app.route('/search_path', methods=['GET'])
def search_path():
    start_movie_title = request.args.get('start')
    end_movie_title = request.args.get('end')
    algorithm = request.args.get('algorithm', 'dijkstra')

    print(f"Received request to find path from '{start_movie_title}' to '{end_movie_title}' using {algorithm}")

    if algorithm == 'dijkstra':
        path, processed_movies = dijkstra_tmdb(start_movie_title, end_movie_title)
    elif algorithm == 'a_star':
        path, processed_movies = a_star_tmdb(start_movie_title, end_movie_title)
    else:
        return jsonify({'error': 'Invalid algorithm specified'}), 400

    if path is None:
        print("No path found between the movies")
        return jsonify({'error': 'No path found between the movies'}), 404

    formatted_path = format_path(path)
    print(f"Path found and formatted. Number of steps: {len(formatted_path['movies']) + len(formatted_path['connections'])}")

    # Format processed movies
    formatted_processed = []
    for movie_id in processed_movies:
        details = get_movie_details(movie_id)
        if details:
            formatted_processed.append({
                'id': movie_id,
                'title': details.get('title'),
                'year': details.get('release_date', '')[:4],
                'poster_path': details.get('poster_path')
            })

    # Ensure the goal movie is last in the processed_movies list
    if path:
        goal_movie_id = path[-1]
        # Find the goal movie object
        goal_movie = next((movie for movie in formatted_processed if movie['id'] == goal_movie_id), None)
        if goal_movie:
            # Remove the goal movie from its current position
            formatted_processed = [movie for movie in formatted_processed if movie['id'] != goal_movie_id]
            # Insert it at the beginning
            formatted_processed.insert(0, goal_movie)

    return jsonify({
        f'{algorithm}_path': formatted_path,
        'processed_movies': formatted_processed
    })

@app.route('/search_movie', methods=['GET'])
def search_movie_route():
    movie_name = request.args.get('movie_name')
    print(f"Searching for movie: '{movie_name}'")
    movies = search_movie_list(movie_name)
    if movies:
        print(f"Found {len(movies)} movies matching '{movie_name}'")
        return jsonify({
            'results': movies
        })
    else:
        print(f"Movie not found: '{movie_name}'")
        return jsonify({'error': 'Movie not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
