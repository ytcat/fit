"""Generate same-origin, versioned cache inputs from the shipped app shell."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
urls=['./index.html','./fight-iq-content.json']
urls+=re.findall(r'(?:src|href)=[\"\'](\./[^\"\']+)[\"\']',html)
urls+=re.findall(r"fetch\('(\./assets/models/[^']+)'",html)
urls += ['./'+str(p.relative_to(root))+'?v=79' for p in sorted((root/'assets/audio').glob('*.wav'))]
urls += ['./assets/club/lion.svg','./assets/club/rabbit.svg']
urls+=['./assets/venues/'+name+'.png' for name in ['default','neon_strip','harbor_dome']]
urls=list(dict.fromkeys(urls))
for url in urls:
    if not (root/url.split('?')[0]).is_file():
        raise SystemExit('Missing offline asset: '+url)
(root/'offline-manifest.json').write_text(json.dumps({'version':'cup-20261109a','urls':urls},indent=2)+'\n')
print(len(urls),'offline assets',sum((root/x.split('?')[0]).stat().st_size for x in urls),'bytes')
