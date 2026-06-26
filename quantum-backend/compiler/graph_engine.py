# graph_engine.py
from collections import deque

def find_maximal_cliques(nodes: list, edges: list) -> list:
    """
    Finds all maximal cliques in the undirected conflict graph using the 
    Bron-Kerbosch algorithm with pivoting.
    
    Returns a list of sets, where each set represents a clique of node indices.
    """
    # 1. Build adjacency list representation of the graph
    adj = {node: set() for node in nodes}
    for u, v in edges:
        if u in adj and v in adj:
            adj[u].add(v)
            adj[v].add(u)
            
    cliques = []
    
    def bron_kerbosch(r, p, x):
        if not p and not x:
            cliques.append(r)
            return
        
        # Select pivot node with the maximum degree in P U X to minimize branching
        pivot_candidates = p | x
        if not pivot_candidates:
            return
        
        pivot = max(pivot_candidates, key=lambda node: len(adj[node]))
        
        # Branch on nodes in P that are not neighbors of the pivot
        for v in list(p - adj[pivot]):
            bron_kerbosch(r | {v}, p & adj[v], x & adj[v])
            p.remove(v)
            x.add(v)
            
    bron_kerbosch(set(), set(nodes), set())
    return cliques

def check_bipartite_matching_feasibility(n_entities: int, n_slots: int, capacity_val: int, allowed_map: dict) -> bool:
    """
    Determines if a valid matching exists between entities and slots under capacity
    and domain exclusion limits using maximum bipartite matching (Hopcroft-Karp).
    
    If the size of the maximum matching is less than the total number of entities,
    a feasible matching is impossible (violates Hall's Marriage Theorem).
    
    Arguments:
        n_entities: Total count of entities to place.
        n_slots: Total count of slots available.
        capacity_val: Maximum capacity per slot (K).
        allowed_map: Dictionary mapping entity index to a list/set of permitted slot indices.
                     e.g. {0: [0, 3], 1: [2, 3]}
    """
    # Replicate slots K times to represent capacity slots
    replicated_slots = []
    for s in range(n_slots):
        for k in range(capacity_val):
            replicated_slots.append((s, k))
            
    n_replicated_slots = len(replicated_slots)
    
    # Adjacency list from entity -> index of replicated slot
    adj = {i: [] for i in range(n_entities)}
    for entity_idx, allowed_slots in allowed_map.items():
        if entity_idx >= n_entities:
            continue
        for slot_idx in allowed_slots:
            if slot_idx >= n_slots:
                continue
            # Link entity to all replicated instances of the allowed slot
            for k in range(capacity_val):
                slot_rep_idx = slot_idx * capacity_val + k
                adj[entity_idx].append(slot_rep_idx)

    # Hopcroft-Karp algorithm variables
    pair_u = {u: None for u in range(n_entities)}          # Entity matching state
    pair_v = {v: None for v in range(n_replicated_slots)}   # Replicated slot matching state
    dist = {}

    def bfs() -> bool:
        queue = deque()
        for u in range(n_entities):
            if pair_u[u] is None:
                dist[u] = 0
                queue.append(u)
            else:
                dist[u] = float('inf')
        dist[None] = float('inf')
        
        while queue:
            u = queue.popleft()
            if dist[u] < dist[None]:
                for v in adj[u]:
                    u_next = pair_v[v]
                    if dist[u_next] == float('inf'):
                        dist[u_next] = dist[u] + 1
                        queue.append(u_next)
        return dist[None] != float('inf')

    def dfs(u) -> bool:
        for v in adj[u]:
            u_next = pair_v[v]
            if dist[u_next] == dist[u] + 1:
                if u_next is None or dfs(u_next):
                    pair_u[u] = v
                    pair_v[v] = u
                    return True
        dist[u] = float('inf')
        return False

    matching_size = 0
    while bfs():
        for u in range(n_entities):
            if pair_u[u] is None and dfs(u):
                matching_size += 1

    # Feasible matching is only possible if every entity is successfully matched to a unique capacity slot
    return matching_size == n_entities
