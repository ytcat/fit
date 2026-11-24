import sys,glob
from PIL import Image, ImageDraw
d,start,n,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
fps=float(sys.argv[5]) if len(sys.argv)>5 else 4
fs=sorted(glob.glob(d+'/f*.png'))[start:start+n]
ims=[Image.open(f) for f in fs]
w,h=ims[0].size;cols=4;rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims):
  s.paste(im,((i%cols)*w,(i//cols)*h));dr=ImageDraw.Draw(s);x,y=(i%cols)*w+5,(i//cols)*h+5;dr.rectangle([x,y,x+60,y+16],fill=(0,0,0));dr.text((x+3,y+2),'%.2fs'%((start+i)/fps),fill=(255,255,0))
s.thumbnail((2000,2000));s.save(out)
