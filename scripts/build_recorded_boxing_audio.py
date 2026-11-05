"""CC0 impact/bell recordings and a room mix of recorded handclaps.
Requires FFmpeg and NumPy. No runtime service; legacy files remain unchanged.
Usage: python scripts/build_recorded_boxing_audio.py SOURCE_DIRECTORY
Sources/immutable revisions and hashes are written to the output manifest.
"""
import json,sys,subprocess,wave,hashlib
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/audio';SRC=Path(sys.argv[1]);RATE=48000;rows=[]
def read(path,channels=1):
 raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(path),'-f','f32le','-ac',str(channels),'-ar',str(RATE),'-']);return np.frombuffer(raw,dtype='<f4').reshape(-1,channels).astype(float)
def write(name,a,source):
 if a.ndim==1:a=a[:,None]
 a=np.nan_to_num(a);a-=a.mean(axis=0);a*=.82/max(1e-9,np.abs(a).max());fade=min(600,len(a)//4);a[:fade]*=np.linspace(0,1,fade)[:,None];a[-fade:]*=np.linspace(1,0,fade)[:,None]
 path=OUT/(name+'.wav')
 with wave.open(str(path),'wb') as f:f.setnchannels(a.shape[1]);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(np.round(np.clip(a,-1,1)*32767).astype('<i2').tobytes())
 rows.append({'file':path.name,'source':source,'license':'CC0-1.0','sampleRate':RATE,'channels':a.shape[1],'duration':len(a)/RATE,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'peak':float(np.abs(a).max())})
kenney=SRC/'kenney/addons/kenney impact sounds'
for name,original in [('punch-head-v3','impact_punch_medium_000.ogg'),('punch-body-1-v3','impact_punch_heavy_000.ogg'),('punch-body-2-v3','impact_punch_heavy_002.ogg')]:
 path=kenney/original;a=read(path);active=np.flatnonzero(np.abs(a[:,0])>np.abs(a).max()*.015);start=max(0,int(active[0])-240);a=a[start:min(len(a),start+int(RATE*.34))]
 write(name,a,{'creator':'Kenney','repository':'https://github.com/Boyquotes/kenney-impact-sounds-for-godot','revision':'999dd1684873f8b020a3aa5b26e713da21688924','path':'addons/kenney impact sounds/'+original,'originalSHA256':hashlib.sha256(path.read_bytes()).hexdigest()})
bell=SRC/'vcsl/HB_1.wav';a=read(bell);active=np.flatnonzero(np.abs(a[:,0])>np.abs(a).max()*.008);start=max(0,int(active[0])-240);a=a[start:]
write('ring-bell-v3',a,{'creator':'Versilian Studios / Sam Gossner','repository':'https://github.com/sgossner/VCSL','revision':'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e','path':'Idiophones/Struck Idiophones/Hand Bells, Nepalese/HB_1.wav','originalSHA256':hashlib.sha256(bell.read_bytes()).hexdigest()})
# Irregular human timing; no pitch shifting or oscillator-generated claps.
rng=np.random.default_rng(7903);duration=4.6;crowd=np.zeros((int(RATE*duration),2));claps=[read(OUT/('clap-'+str(i)+'.wav'))[:,0] for i in [1,2,3]]
for person in range(12):
 pan=rng.uniform(-.9,.9);gains=np.sqrt(np.array([(1-pan)/2,(1+pan)/2]));period=rng.uniform(.34,.54);at=rng.uniform(.02,.65)
 while at<duration-.45:
  sample=claps[int(rng.integers(3))];start=int(at*RATE);length=min(len(sample),len(crowd)-start);crowd[start:start+length]+=sample[:length,None]*gains[None,:]*rng.uniform(.10,.20)
  at+=period*rng.uniform(.85,1.15)+(rng.uniform(.15,.4) if rng.random()<.055 else 0)
room=crowd.copy()
for delay,gain in [(.027,.10),(.053,.065),(.087,.04),(.131,.02)]:
 n=int(delay*RATE);room[n:]+=crowd[:-n,::-1]*gain
room*=np.minimum(1,np.arange(len(room))/(RATE*.12))[:,None]*np.minimum(1,np.arange(len(room))[::-1]/(RATE*.7))[:,None]
write('applause-room-v3',room,{'creator':'VCSL recorded handclaps; original deterministic room arrangement','recordings':['clap-1.wav','clap-2.wav','clap-3.wav'],'recordingNotices':'ATTRIBUTION.md','note':'Assembled from recorded handclaps, not a recording of a boxing crowd.'})
(OUT/'recorded-v3-manifest.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows,indent=2))
