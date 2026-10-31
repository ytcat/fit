"""Build the coach's continuous implicit surfaces. Requires Python + NumPy.

No downloaded or generated third-party character assets. Coordinates are metres,
Y up, +Z forward. Marching tetrahedra joins anatomical volumes before skinning.
"""
import json
from pathlib import Path
import numpy as np

def ellipsoid(p, center, radius):
    q = (p - center) / radius
    return (np.linalg.norm(q, axis=-1) - 1) * min(radius)

def union(a, b, k=.025):
    h = np.maximum(k - np.abs(a-b), 0) / k
    return np.minimum(a, b) - h*h*k*.25

def field(p, volumes):
    d = np.full(p.shape[:-1], 100.)
    for center, radius in volumes:
        d = union(d, ellipsoid(p, center, radius))
    return d

def surface(fn, lo, hi, step):
    axes = [np.arange(a, b+step, step) for a,b in zip(lo,hi)]
    grid = np.stack(np.meshgrid(*axes, indexing='ij'), axis=-1)
    values = fn(grid)
    corners = np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],
                        [0,0,1],[1,0,1],[1,1,1],[0,1,1]])
    shape = np.array(values.shape)-1
    base = np.stack(np.meshgrid(*[np.arange(n) for n in shape],indexing='ij'),-1).reshape(-1,3)
    ids = base[:,None,:]+corners
    cv = values[tuple(ids.transpose(2,0,1))]
    active = (cv.min(1)<0)&(cv.max(1)>=0)
    ids,cv = ids[active],cv[active]
    cp = grid[tuple(ids.transpose(2,0,1))]
    vertices=[]
    for tet in [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]:
        ps,vs = cp[:,tet],cv[:,tet]
        bits = ((vs<0)*[1,2,4,8]).sum(1)
        for mask in range(1,15):
            sel=bits==mask
            if not sel.any(): continue
            pp,vv=ps[sel],vs[sel]
            inside=[i for i in range(4) if mask&(1<<i)]
            outside=[i for i in range(4) if not mask&(1<<i)]
            def edge(i,j):
                t=vv[:,i]/(vv[:,i]-vv[:,j])
                return pp[:,i]+t[:,None]*(pp[:,j]-pp[:,i])
            if len(inside)==1:
                triangles=[np.stack([edge(inside[0],j) for j in outside],1)]
            elif len(inside)==3:
                triangles=[np.stack([edge(outside[0],j) for j in inside],1)]
            else:
                a,b=inside; c,d=outside
                ac,ad,bc,bd=edge(a,c),edge(a,d),edge(b,c),edge(b,d)
                triangles=[np.stack([ac,ad,bc],1),np.stack([ad,bd,bc],1)]
            vertices.extend(triangles)
    tris=np.concatenate(vertices)
    # Correct winding from the implicit outward gradient.
    cent=tris.mean(1); eps=.0003
    grad=np.stack([(fn(cent+np.eye(3)[i]*eps)-fn(cent-np.eye(3)[i]*eps)) for i in range(3)],-1)
    wrong=(np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0])*grad).sum(1)<0
    tris[wrong]=tris[wrong][:,[0,2,1]]
    # Weld all tetrahedron edges; GPU skinning can then smooth across joints.
    verts,inv=np.unique(np.round(tris.reshape(-1,3),5),axis=0,return_inverse=True)
    print(len(verts),'vertices',len(tris),'triangles')
    norm=np.stack([fn(verts+np.eye(3)[i]*eps)-fn(verts-np.eye(3)[i]*eps) for i in range(3)],-1)
    norm/=np.maximum(np.linalg.norm(norm,axis=-1,keepdims=True),1e-9)
    return {'position':verts.flatten().tolist(),'normal':np.round(norm,5).flatten().tolist(),'index':inv.tolist()}

body=[
    ((0,1.09,0),(.235,.21,.155)), ((0,1.29,0),(.22,.24,.145)),
    ((0,1.49,-.018),(.31,.245,.19)), ((0,1.68,-.02),(.235,.12,.135)),
    ((0,1.78,-.025),(.105,.155,.10)),
    ((0,1.97,.015),(.192,.216,.18)),
    ((0,1.875,.085),(.148,.11,.15)),
    ((0,1.97,.17),(.095,.125,.12)),
]
for s in [-1,1]:
    body += [
        ((s*.144,1.535,.13),(.155,.10,.065)),
        ((s*.30,1.61,0),(.135,.145,.14)),
        ((s*.15,.91,-.01),(.145,.20,.15)),
        ((s*.165,.76,.014),(.127,.235,.125)),
        ((s*.18,.56,.015),(.09,.095,.096)),
        ((s*.185,.385,-.018),(.089,.19,.093)),
        ((s*.19,.18,0),(.061,.10,.065)),
        ((s*.075,1.895,.218),(.085,.065,.086)),
        ((s*.137,1.955,.092),(.079,.10,.10)),
        ((s*.164,2.105,-.012),(.075,.083,.045)),
    ]

def anatomy(p):
    d=field(p,body)
    for s in [-1,1]:
        for a,b,r0,r1,bulge in [((s*.30,1.62,0),(s*.54,1.36,0),.103,.061,.013),
                                 ((s*.54,1.36,0),(s*.65,1.07,0),.061,.047,.012)]:
            a,b=np.array(a),np.array(b);ab=b-a
            t=np.clip(np.sum((p-a)*ab,axis=-1)/np.dot(ab,ab),0,1)
            radius=r0+(r1-r0)*t+bulge*np.sin(np.pi*t)
            limb=np.linalg.norm(p-a-t[...,None]*ab,axis=-1)-radius
            d=union(d,limb,.03)
        # Eye sockets and the muzzle cleft are actual surface recesses.
        d=np.maximum(d,-ellipsoid(p,(s*.091,2.011,.175),(.047,.032,.041)))
    return d

def cloth(p):
    volumes=[((0,1.02,0),(.25,.18,.177))]
    for s in [-1,1]: volumes.append(((s*.15,.88,0),(.16,.23,.177)))
    d=field(p,volumes)
    # Open, tailored hems and waist, with a subtle vertical fabric fold.
    d += .002*np.cos(np.arctan2(p[...,2],p[...,0])*30)
    return np.maximum(np.maximum(d,.735-p[...,1]),p[...,1]-1.12)

def glove(p):
    return field(p,[((0,-.092,0),(.105,.135,.105)),
                    ((0,-.17,.01),(.10,.075,.095)),
                    ((-.086,-.07,.047),(.053,.084,.065)),
                    ((0,.015,0),(.068,.067,.065))])

if __name__=='__main__':
    result={
        'body':surface(anatomy,[-.76,.06,-.25],[.76,2.25,.34],.023),
        'shorts':surface(cloth,[-.34,.70,-.23],[.34,1.15,.23],.024),
        'glove':surface(glove,[-.16,-.26,-.13],[.13,.10,.14],.015),
    }
    out=Path(__file__).resolve().parents[1]/'assets/models/coach-surface.json'
    out.write_text(json.dumps(result,separators=(',',':')))
    print(out, out.stat().st_size)
