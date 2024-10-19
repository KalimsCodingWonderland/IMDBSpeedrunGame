import time
from collections import deque
import heapq


def bfs(graph, start_movie, end_movie):
    start_time = time.perf_counter()
    print(f"Running BFS from {start_movie} to {end_movie}")  # Debugging log

    visited = set()
    queue = deque([([start_movie], [])])

    while queue:
        path, connections = queue.popleft()
        movie = path[-1]

        print(f"Visiting movie {movie}, Current path: {path}")  # Debugging log

        if movie == end_movie:
            end_time = time.perf_counter()
            print(f"BFS completed. Time taken: {(end_time - start_time):.4f} milliseconds")
            print(f"Found path: {path}")
            return {'path': path, 'connections': connections}

        if movie not in visited:
            visited.add(movie)
            for neighbor, person in graph.get_connections(movie):
                if neighbor not in visited:
                    new_path = path + [neighbor]
                    new_connections = connections + [person]
                    print(f"Queuing neighbor movie {neighbor} via connection {person}")  # Debugging log
                    queue.append((new_path, new_connections))

    end_time = time.perf_counter()
    print(f"BFS did not find a path. Time taken: {(end_time - start_time):.4f} milliseconds")
    return None

def dijkstra(graph, start_movie, end_movie):
    start_time = time.perf_counter()
    print(f"Running Dijkstra from {start_movie} to {end_movie}")  # Debugging log

    heap = [(0, start_movie, [], [])]
    visited = set()

    while heap:
        cost, movie, path, connections = heapq.heappop(heap)

        print(f"Processing movie {movie}, Cost: {cost}, Path so far: {path}")  # Debugging log

        if movie in visited:
            print(f"Movie {movie} already visited, skipping.")  # Debugging log
            continue

        path = path + [movie]
        visited.add(movie)

        if movie == end_movie:
            end_time = time.perf_counter()
            print(f"Dijkstra completed. Time taken: {(end_time - start_time):.4f} milliseconds")
            print(f"Found path: {path}")
            return {'path': path, 'connections': connections}

        for neighbor, person in graph.get_connections(movie):
            if neighbor not in visited:
                new_connections = connections + [person]
                print(f"Adding neighbor {neighbor} to heap with cost {cost + 1} via connection {person}")  # Debugging log
                heapq.heappush(heap, (cost + 1, neighbor, path, new_connections))

    end_time = time.perf_counter()
    print(f"Dijkstra did not find a path. Time taken: {(end_time - start_time):.4f} milliseconds")
    return None
