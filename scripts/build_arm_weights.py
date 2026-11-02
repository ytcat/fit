"""Bake topology-aware arm/trunk attachment weights for the T-pose body.

Requires NumPy and SciPy at authoring time only. The runtime interpolates these
scalar weights when refining mesh edges; it never solves a sparse system.
"""
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve


def assign_arm_weights(body):
    p = np.asarray(body['position']).reshape(-1, 3)
    triangles = np.asarray(body['index']).reshape(-1, 3)
    edges = np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]])
    edges = np.unique(np.sort(edges, axis=1), axis=0)
    weight = 1 / np.maximum(.003, np.linalg.norm(p[edges[:, 0]] - p[edges[:, 1]], axis=1))
    adjacency = coo_matrix((np.r_[weight, weight],
                           (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])),
                          shape=(len(p), len(p))).tocsr()
    laplacian = diags(np.asarray(adjacency.sum(1)).ravel()) - adjacency
    x, y = np.abs(p[:, 0]), p[:, 1]
    arm = (x > .52) & (y > 1.40) & (y < 1.80)
    trunk = (x < .22) | (y < 1.35) | (y > 1.78)
    fixed = arm | trunk
    free = ~fixed
    result = np.zeros(len(p))
    result[arm] = 1
    result[free] = spsolve(laplacian[free][:, free], -laplacian[free][:, fixed] @ result[fixed])
    if not np.isfinite(result).all():
        raise ValueError('Disconnected/unanchored body surface in arm weight solve')
    body['armBlend'] = np.round(np.clip(result, 0, 1), 6).tolist()
    return body


if __name__ == '__main__':
    path = Path(__file__).resolve().parents[1] / 'assets/models/coach-surface-v2.json'
    data = json.loads(path.read_text())
    assign_arm_weights(data['body'])
    path.write_text(json.dumps(data, separators=(',', ':')))
