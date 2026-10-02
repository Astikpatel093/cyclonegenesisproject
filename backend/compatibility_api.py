"""Adapters for the preserved frontend. No synthetic forecasts or impacts."""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import research_api as research

app=FastAPI(title='Cyclone AI · preserved frontend integration')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://cyclone-ai-53253190.base44.app', *[origin.strip() for origin in os.getenv(
        'CYCLONE_ALLOWED_ORIGINS',
        'http://127.0.0.1:3002,http://localhost:3002'
    ).split(',') if origin.strip()]],
    allow_methods=['GET','POST','DELETE','OPTIONS'],
    allow_headers=['Content-Type','X-Operator-Key','X-Subscription-Token'],
)

@app.get('/api/basin/risk')
def basin():
    result=research.formation()['data']
    return {'data':{'generatedAt':result['issuedAt'],'source':result['source'],'status':'LATEST_AVAILABLE',
      'summary':result['description']+' Bands describe scores only, not hazard severity.',
      'zones':[{'id':c['id'],'name':f"ERA5 cell {c['id']}",'basin':'North Indian Ocean','lat':c['lat'],'lon':c['lon'],
        'sst':c['sst'],'shear':None,'humidity':None,'probability':round(c['score']*100,2),
        'riskLevel':'HIGH' if c['score']>=.5 else 'MODERATE' if c['score']>=.1 else 'LOW'} for c in result['cells']]}}

@app.get('/api/historical/catalog')
def catalog():
    result=research.catalog()
    result['storms']=[{**s,'peakIMDGrade':research.grade(s['maxWind']),'landfallLocation':'Not assessed','landfallDate':'',
        'summary':'NOAA IBTrACS historical observations; IMD wind and pressure.'} for s in result['storms']]
    return result

@app.get('/api/historical/{storm_id}/replay')
def replay(storm_id:str,step:int=0):
    storm=research.historical_storm(storm_id)
    points=[{**point,'step':i} for i,point in enumerate(storm['track'])]
    index=max(0,min(step,len(points)-1))
    return {'status':200,'data':{'storm':{**storm,'landfallLocation':'Not assessed','summary':'Recorded historical track; not a current forecast.'},
      'replayState':{'currentStep':index,'totalSteps':len(points),'currentObservation':points[index],
       'observedTrackSoFar':points[:index+1],'actualFutureTrack':points[index+1:]}}}

@app.get('/api/sql/records')
def records(limit:int=10):
    rows=research.archive.sort_values('ISO_TIME',ascending=False).head(max(1,min(limit,100)))
    return {'records':[{'storm_id':r['SID'],'name':r['NAME'],'timestamp':research.iso(r['ISO_TIME']),
      'lat':float(r['LAT']),'lon':float(r['LON']),'wind_speed':research.finite(r['NEWDELHI_WIND']),
      'pressure':research.finite(r['NEWDELHI_PRES']),'source':'IBTrACS archive'} for r in rows.to_dict('records')]}

@app.get('/api/sources/status')
def sources():
    return {'sources':[{'source':s['name'],'purpose':s['description'],'role':s['status'],
       'status':'AVAILABLE' if s['status']=='Integrated' else 'UNAVAILABLE','checkedAt':research.now()} for s in research.provenance()['sources']]}

@app.get('/api/cyclone/{storm_id}/{feature}')
def optional_feature(storm_id:str,feature:str):
    if feature=='predictions':return research.predictions(storm_id)
    if feature=='risk':return research.risk(storm_id)
    raise HTTPException(409,'No validated '+feature+' output is available. Follow official IMD and local authority guidance.')

from fastapi.staticfiles import StaticFiles
from nio import normalized_storm, sub_region
from imd_satellite import fetch_imd_satellite, DIRECTORY

@app.get('/api/nio/storms')
def nio_storms():
    result=research.live_observations()
    if result.get('unavailable'):
        raise HTTPException(503, result.get('message','Observation feed unavailable'))
    output=[]
    for storm in result['data']:
        p=storm['currentPosition']; region=sub_region(p['lat'],p['lon'])
        if region is None: continue
        satellite=fetch_imd_satellite(region)
        output.append(normalized_storm(storm,satellite['satellite_img_url']))
    return output

@app.get('/api/nio/satellite')
def nio_satellite(region: str):
    if region not in ['Bay of Bengal','Arabian Sea']:
        raise HTTPException(422,'Choose Bay of Bengal or Arabian Sea')
    return fetch_imd_satellite(region)

DIRECTORY.mkdir(parents=True,exist_ok=True)
app.mount('/static/images',StaticFiles(directory=str(DIRECTORY)),name='nio-images')
app.mount('/',research.app)
