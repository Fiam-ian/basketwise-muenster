"""Capture bounded guest pickup search screens from an already selected REWE market."""
import argparse
from pathlib import Path
import subprocess,xml.etree.ElementTree as E,json,hashlib,datetime,re
root=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir',type=Path,required=True)
parser.add_argument('--branch-display',required=True)
parser.add_argument('--query',action='append',required=True)
parser.add_argument('--screens',type=int,default=2,choices=range(1,7))
args=parser.parse_args()
base=args.output_dir.absolute()
private=root/'prototype/local-data'
if not base.parent.resolve().is_relative_to(private.resolve()):parser.error('Output must stay under local-data')
if len(args.query)>10 or any(not re.fullmatch(r'[A-Za-z0-9 ]{1,60}',q) for q in args.query) or len(set(args.query))!=len(args.query):parser.error('Use up to ten distinct simple search terms')
if not args.branch_display.startswith('Abholen | '):parser.error('Explicit pickup branch required')
base.mkdir(mode=0o700)
cmd=[str(root/'prototype/scripts/android-sandbox.sh'),'adb','-s','emulator-5554']
def adb(*a):return subprocess.run(cmd+list(a),capture_output=True,check=True,timeout=60).stdout
def capture():
 adb('shell','rm','-f','/data/local/tmp/basketwise-catalogue.xml')
 adb('shell','uiautomator','dump','/data/local/tmp/basketwise-catalogue.xml')
 raw=adb('exec-out','cat','/data/local/tmp/basketwise-catalogue.xml')
 return raw,E.fromstring(raw)
def tap_label(tree,label):
 for n in tree.iter('node'):
  if n.get('package')=='de.rewe.app.mobile' and n.get('text')==label:
   a=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
   if len(a)==4 and a[3]>a[1]:adb('shell','input','tap',str((a[0]+a[2])//2),str((a[1]+a[3])//2));return
 raise ValueError('Expected control missing: '+label)
adb('shell','am','start','-n','de.rewe.app.mobile/de.rewe.app.app.view.MainActivity')
raw,tree=capture()
tap_label(tree,'Bestellen')
raw,tree=capture()
branch=args.branch_display
if not any(n.get('text')==branch for n in tree.iter('node')):raise ValueError('Branch context missing')
for query in args.query:
 out=base/query.lower().replace(' ','-');out.mkdir(mode=0o700)
 (out/'branch.xml').write_bytes(raw)
 tap_label(tree,'Produkt suchen')
 adb('shell','input','text',query);adb('shell','input','keyevent','66')
 sources=[]
 for i in range(args.screens):
  data,screen=capture()
  if not any(n.get('text')==query for n in screen.iter('node')):raise ValueError('Wrong query surface')
  name=f'screen-{i+1}.xml';(out/name).write_bytes(data)
  sources.append({'file':name,'sha256':hashlib.sha256(data).hexdigest(),'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
  if i<args.screens-1:adb('shell','input','swipe','360','1020','360','425','450')
 (out/'manifest.json').write_text(json.dumps({'branchContextSha256':hashlib.sha256(raw).hexdigest(),'query':query,'sources':sources},indent=2)+'\n')
 print('Captured',query,flush=True)
 adb('shell','input','keyevent','4')
 raw,tree=capture()
 if not any(n.get('text')==branch for n in tree.iter('node')):raise ValueError('Lost branch context')
