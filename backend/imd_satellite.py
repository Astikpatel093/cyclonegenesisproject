"""Discover verified regional IR1 JPEGs from IMD; never guess filenames."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlencode
from urllib.request import Request, urlopen
from threading import Lock
from datetime import datetime, timezone
import os, re, time, logging

PORTAL='https://mausam.imd.gov.in/responsive/satellite_rapidscan.php'
DIRECTORY=Path(os.getenv('CYCLONE_SATELLITE_DIR',str(Path(__file__).parent/'static'/'images')))
REGIONS={'Bay of Bengal':('Bay_of_Bengal',r'(?:bay[_ -]*of[_ -]*bengal|\bbob\b)'),
         'Arabian Sea':('Arabian_Sea',r'(?:arabian[_ -]*sea|\bas\b)')}
cache={}
lock=Lock()

class Images(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]
    def handle_starttag(self,tag,attrs):
        if tag=='img':
            attrs=dict(attrs)
            if attrs.get('src'): self.images.append(attrs)

def trusted(url):
    u=urlsplit(url)
    return u.scheme=='https' and u.hostname in {'mausam.imd.gov.in','satellite.imd.gov.in'} and not u.username and u.port in (None,443)

def read_url(url,maximum):
    if not trusted(url): raise ValueError('Untrusted IMD image URL')
    with urlopen(Request(url,headers={'User-Agent':'CycloneAI/1.0 (educational satellite viewer)'}),timeout=10) as response:
        if not trusted(response.geturl()): raise ValueError('Unexpected redirect')
        payload=response.read(maximum+1)
        if len(payload)>maximum: raise ValueError('Response too large')
        return payload,response.headers.get_content_type()

def fetch_imd_satellite(region):
    if region not in REGIONS: raise ValueError('Unsupported region')
    with lock:
        existing=cache.get(region)
        if existing and time.monotonic()-existing[0]<600: return existing[1]
        sector,pattern=REGIONS[region]
        result={'region':region,'status':'unavailable','satellite_img_url':None,'source_page':PORTAL}
        try:
            page=PORTAL+'?'+urlencode({'sector':sector,'band':'IR1'})
            raw,kind=read_url(page,2_000_000)
            if kind not in ('text/html','application/xhtml+xml'): raise ValueError('Unexpected portal content')
            parser=Images();parser.feed(raw.decode('utf-8',errors='replace'))
            candidates=[]
            for item in parser.images:
                description=' '.join([item['src'],item.get('alt',''),item.get('title','')]).replace('_',' ')
                if re.search(pattern,description,re.I) and re.search(r'\bir[ -]?1\b',description,re.I):
                    candidate=urljoin(page,item['src'])
                    if trusted(candidate): candidates.append(candidate)
            if not candidates:
                result['message']='IMD page has no verifiable region-specific IR1 image. Shared-sector imagery is not relabeled as regional.'
            else:
                payload,kind=read_url(candidates[0],10_000_000)
                if kind!='image/jpeg' or not payload.startswith(b'\xff\xd8\xff') or not payload.endswith(b'\xff\xd9'):
                    raise ValueError('Response is not a complete JPEG')
                DIRECTORY.mkdir(parents=True,exist_ok=True)
                filename=f'NIO_{sector}_latest.jpg'
                target=DIRECTORY/filename
                temporary=target.with_suffix('.tmp');temporary.write_bytes(payload);temporary.replace(target)
                result.update(status='available',satellite_img_url='/static/images/'+filename,source_url=candidates[0],
                              fetched_at_utc=datetime.now(timezone.utc).isoformat(),
                              observation_time_utc=None,message='Acquisition time is not verified; fetch time is not satellite observation time.')
        except Exception as exc:
            logging.getLogger(__name__).warning('IMD image unavailable: %s',type(exc).__name__)
            result['message']='IMD regional imagery could not be verified.'
        cache[region]=(time.monotonic(),result)
        return result
