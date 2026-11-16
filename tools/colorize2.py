import json, os, sys, time, importlib.util
S="/data/home/.opencode/skills/aholo-lux3d/core/runtime"
os.environ["LUX3D_GLOBAL_API_KEY"]=open("/data/home/.config/lux3d/api_key").read().strip()
sys.path.insert(0,S)
import lux3d_client as L
d="/data/home/luxin/q3"
items=json.load(open(d+"/items.json"))["1"]["parameters"]["body"]
qid=json.load(open(d+"/quote.json"))["quote"]["quote"]["quoteId"]
res=L.create_multimodal_to_image_task(img=items["img"], prompt=items["prompt"], region="international", content_id=qid)
print(json.dumps(res)[:400])
tid=res.get("id") or res.get("taskId") or (res.get("task") or {}).get("id")
json.dump({"taskId":tid,"quoteId":qid,"resp":res},open(d+"/task.json","w"))
for i in range(60):
    time.sleep(8)
    t=L.get_task(tid, region="international")
    st=t.get("status")
    print(i, st, flush=True)
    json.dump(t,open(d+"/poll.json","w"))
    if st in (3,4,5,6) or str(st) in ("3","4","5","6"):
        print(json.dumps(t)[-1200:]); break
