import json,os,sys,time
sys.path.insert(0,"/data/home/.opencode/skills/aholo-lux3d/core/runtime")
os.environ["LUX3D_GLOBAL_API_KEY"]=open("/data/home/.config/lux3d/api_key").read().strip()
import lux3d_client as L
tid=os.environ.get("TID","6899096")
for i in range(40):
    t=L.get_task(tid, region="international")
    print(i, t.get("status"), t.get("progress"), flush=True)
    json.dump(t,open("/data/home/luxin/q3/poll.json","w"),indent=1)
    if str(t.get("status"))=="3": print(json.dumps(t)[-900:]); break
    if str(t.get("status")) in ("4","5","6"): print(json.dumps(t)[-900:]); break
    time.sleep(10)
