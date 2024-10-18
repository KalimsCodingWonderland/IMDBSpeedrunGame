# backend/algorithms.py
from collections import deque
import heapq
import logging

def bfs(graph, start_movie, end_movie):
    visited = set()
    queue = deque([([start_movie], [])])  # Each item is (path, connections)

    while queue:
        path, connections = queue.popleft()
        movie = path[-1]

        if movie == end_movie:
            return {'path': path, 'connections': connections}

        if movie not in visited:
            visited.add(movie)
            for neighbor, person in graph.get_connections(movie):
                if neighbor not in visited:
                    new_path = path + [neighbor]
                    new_connections = connections + [person]
                    queue.append((new_path, new_connections))
    return None

def dijkstra(graph, start_movie, end_movie):
    heap = [(0, start_movie, [], [])]  # Each item is (cost, movie, path, connections)
    visited = set()

    while heap:
        cost, movie, path, connections = heapq.heappop(heap)

        if movie in visited:
            continue

        path = path + [movie]
        visited.add(movie)

        if movie == end_movie:
            return {'path': path, 'connections': connections}

        for neighbor, person in graph.get_connections(movie):
            if neighbor not in visited:
                new_connections = connections + [person]
                heapq.heappush(heap, (cost + 1, neighbor, path, new_connections))
    return None
