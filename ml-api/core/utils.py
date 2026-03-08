import numpy as np

def apply_pareto_filter(candidates):
    if not candidates: return []
    pareto_set = []
    for p1 in candidates:
        is_dominated = False
        for p2 in candidates:
            if p2['dist'] < p1['dist'] and p2['price_level'] <= p1['price_level'] and p2['rating'] >= p1['rating']:
                if p1['name'] != p2['name']:
                    is_dominated = True
                    break
        if not is_dominated:
            pareto_set.append(p1)
    return pareto_set

def calculate_vfm_score(place, max_radius, price_weight=1.0):
    dist = place.get('dist', max_radius)
    decay = np.exp(-dist / max(1, max_radius * 0.5)) 
    qs = place.get('rating', 0) / 5.0
    pi = max(0.5, place.get('price_level', 2))
    score = (qs / pi) * decay * 10 * price_weight
    return score, decay