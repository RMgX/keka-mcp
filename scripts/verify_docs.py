"""Download public Keka operation schemas; never contacts tenant APIs."""
import concurrent.futures, hashlib, json, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://developers.keka.com/'
def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=45).read().decode()
def extract(url):
    html = fetch(url)
    blobs = re.findall(r'<script[^>]*>(.*?)</script>', html, re.S)
    page = json.loads(max((b for b in blobs if b.startswith('{')), key=len))
    api = page.get('document', {}).get('api', {})
    if not api.get('schema'): raise ValueError('No embedded operation schema')
    return {'source': url, 'verifiedAt': '2026-11-10', 'sha256': hashlib.sha256(html.encode()).hexdigest(), 'api': api}
def main():
    index = fetch(BASE+'llms.txt')
    (ROOT/'specs/index.txt').write_text(index, encoding='utf-8')
    urls = list(dict.fromkeys(u.removesuffix('.md') for u in re.findall(r'https://developers.keka.com/reference/[^)\s]+',index) if re.search(r'/reference/(get_|post_|put_|delete_|patch_)',u)))
    results, failures = [], []
    def run(url):
        try: return extract(url), None
        except Exception as e: return None, {'source':url,'error':str(e)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result, error in pool.map(run,urls):
            if result: results.append(result)
            else: failures.append(error)
    (ROOT/'specs/operations.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    (ROOT/'specs/unavailable.json').write_text(json.dumps(failures,indent=2),encoding='utf-8')
    for slug in ['authentication','pagination','rate-limit','scope','token-1']:
        try: (ROOT/f'specs/{slug}.html').write_text(fetch(BASE+'reference/'+slug),encoding='utf-8')
        except Exception as e: print(slug,str(e))
    print(json.dumps({'verified':len(results),'unavailable':len(failures)}))
if __name__ == '__main__': main()
