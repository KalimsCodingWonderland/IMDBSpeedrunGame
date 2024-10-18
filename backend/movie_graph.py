# backend/movie_graph.py
import heapq
from collections import defaultdict, deque
import requests
import logging

API_KEY = '9f981a4c4394f62d994979dbb6ee0230'
BASE_URL = 'https://api.themoviedb.org/3/'

class MovieGraph:
    def __init__(self):
        self.graph = defaultdict(list)
        self.movies = {}
        self.people = defaultdict(set)
        self.start_movie_id = None
        self.end_movie_id = None


    def add_movie(self, movie_id, movie_data):
        self.movies[movie_id] = movie_data
        # Index people to movies
        for person in movie_data.get('cast', []):
            self.people[person['name']].add(movie_id)
        for person in movie_data.get('crew', []):
            self.people[person['name']].add(movie_id)
        print(f"Added movie: {movie_data['title']} with connections: {len(self.people)} people.")

    def build_connections(self):
        # For each person, connect the movies they have in common
        for person, movies in self.people.items():
            movies = list(movies)
            for i in range(len(movies)):
                for j in range(i + 1, len(movies)):
                    movie1 = movies[i]
                    movie2 = movies[j]
                    # Add edge between movie1 and movie2
                    self.graph[movie1].append((movie2, person))
                    self.graph[movie2].append((movie1, person))

    def get_connections(self, movie):
        return self.graph[movie]

    def get_movie_by_title(self, title):
        response = requests.get(
            f"{BASE_URL}search/movie",
            params={'api_key': API_KEY, 'query': title}
        )
        movies = response.json().get('results', [])
        if movies:
            return movies[0]  # Return the first match
        return None

    def get_movie_data(self, movie_id):
        logging.debug(f"Fetching data for movie ID: {movie_id}")
        details_response = requests.get(
            f"{BASE_URL}movie/{movie_id}",
            params={'api_key': API_KEY}
        )
        credits_response = requests.get(
            f"{BASE_URL}movie/{movie_id}/credits",
            params={'api_key': API_KEY}
        )
        if details_response.status_code == 200 and credits_response.status_code == 200:
            details = details_response.json()
            credits = credits_response.json()
            movie_data = {
                'id': movie_id,
                'title': details.get('title'),
                'year': details.get('release_date')[:4] if details.get('release_date') else 'N/A',
                'cast': credits.get('cast', []),
                'crew': credits.get('crew', [])
            }
            logging.debug(f"Fetched data for movie: {movie_data['title']} ({movie_id})")
            return movie_data
        logging.warning(f"Failed to fetch data for movie ID: {movie_id}")
        return None

    def get_movies_by_person(self, person_id):

        response = requests.get(
            f"{BASE_URL}person/{person_id}/movie_credits",
            params={'api_key': API_KEY}
        )
        if response.status_code == 200:
            credits = response.json()
            movies = credits.get('cast', []) + credits.get('crew', [])
            # Sort movies by popularity and limit to top 5
            movies = sorted(movies, key=lambda x: x.get('popularity', 0), reverse=True)
            for movie in movies:
                print (movie.get('title'))
                logging.debug(f"  - {movie.get('title', 'Unknown Title')} (ID: {movie.get('id', 'Unknown ID')})")
            return movies[:5]
        return []

    def get_common_people_count(self, movie1_id, movie2_id):
        # Ensure we have data for both movies
        if movie1_id not in self.movies:
            self.movies[movie1_id] = self.get_movie_data(movie1_id)
        if movie2_id not in self.movies:
            self.movies[movie2_id] = self.get_movie_data(movie2_id)

        movie1_people = set(
            p['id'] for p in self.movies[movie1_id].get('cast', []) + self.movies[movie1_id].get('crew', []))
        movie2_people = set(
            p['id'] for p in self.movies[movie2_id].get('cast', []) + self.movies[movie2_id].get('crew', []))
        return len(movie1_people.intersection(movie2_people))

    def build_movie_graph(self, start_movie_title, end_movie_title, max_depth=5):
        start_movie = self.get_movie_by_title(start_movie_title)
        end_movie = self.get_movie_by_title(end_movie_title)

        if not start_movie or not end_movie:
            return False

        self.start_movie_id = start_movie['id']
        self.end_movie_id = end_movie['id']

        # Fetch end movie data
        self.movies[self.end_movie_id] = self.get_movie_data(self.end_movie_id)

        pq = [(0, self.start_movie_id, 0)]  # (priority, movie_id, depth)
        visited_movies = set()

        while pq:
            _, movie_id, depth = heapq.heappop(pq)

            if movie_id in visited_movies or depth > max_depth:
                continue
            visited_movies.add(movie_id)

            movie_data = self.get_movie_data(movie_id)
            if not movie_data:
                continue

            self.add_movie(movie_id, movie_data)

            if movie_id == self.end_movie_id:
                self.build_connections()
                return True

            for person in movie_data.get('cast', []) + movie_data.get('crew', []):
                person_id = person['id']
                person_name = person['name']
                person_movies = self.get_movies_by_person(person_id)
                print(f"Exploring movies of {person_name}")
                for person_movie in person_movies[:5]:
                    person_movie_id = person_movie['id']
                    if person_movie_id not in visited_movies:
                        # Calculate priority based on common people with end movie
                        priority = -self.get_common_people_count(person_movie_id, self.end_movie_id)
                        heapq.heappush(pq, (priority, person_movie_id, depth + 1))

        self.build_connections()
        return False
