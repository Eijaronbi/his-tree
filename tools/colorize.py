import json, subprocess, sys, time, os
S="/data/home/.opencode/skills/aholo-lux3d"
PY_="/data/home/.cache/aholo-lux3d-common/environments"
import glob
cands=glob.glob(PY_+"/*/bin/python")
pyexe=None
for c in cands:
    try:
        subprocess.run([c,"-c","import requests"],check=True,capture_output=True); pyexe=c; break
    except Exception: pass
assert pyexe, cands
print("PYEXE",pyexe)
os.environ["LUX3D_GLOBAL_API_KEY"]=open("/data/home/.config/lux3d/api_key").read().strip()
IMG="https://holo-cos.aholo3d.cn/resource/platform/temp/2026/11/12/NL25LKAKQRHTGAABAAAAACI8.jpg"
PROMPT=("Photorealistic museum-quality colorization of this 1863 Abraham Lincoln plate. "
 "Natural warm skin tones, faint ruddiness on cheekbones, dark chestnut-brown hair and beard with subtle grey strands, "
 "amber-brown eyes, black wool coat, white shirt, black bow tie. Keep the exact facial geometry, pose and framing of the reference. "
 "Soft daylight studio light, sharp period-photograph detail, no painting artifacts, no text, no border.")
d="/data/home/luxin/q3"; os.makedirs(d,exist_ok=True)
items={"1":{"endpoint":{"method":"POST","path":"/lux3d/v1/generate/multimodal-to-image/task/create"},"parameters":{"body":{"img":IMG,"prompt":PROMPT}}}}
json.dump(items,open(d+"/items.json","w"))
review={"pluginTaskId":"plugin_9040000b9e414302b88fb0fb436cdc29","planVersion":2,
 "plan":"Colorize the public-domain 1863 Gardner Lincoln photograph with Lux3D multimodal-to-image, preserving geometry so the colorized plate can be converted to a colour 3D bust for the HIS-TREE 1865 chapter.",
 "userInputs":["Lincoln must be in colour, not black and white.","Use Lux3D for realistic assets."],
 "attachments":[{"name":"Abraham_Lincoln_O-77_matte_collodion_print.jpg","kind":"image","publicUrl":IMG}]}
json.dump(review,open(d+"/review.json","w"))
out=subprocess.run([pyexe,S+"/scripts/commerce.py","quote","--host-name","opencode","--region","international",
  "--journal","/data/home/luxin/logs/collection.sqlite","--items",d+"/items.json","--review",d+"/review.json"],
  capture_output=True,text=True)
print(out.stdout[-800:]); print(out.stderr[-800:])
data=json.loads(out.stdout[out.stdout.find("{"):])
qid=data["quote"]["quoteId"]; print("QUOTE",qid,data["quote"]["estimatedCreditsTotal"])
json.dump({"quote":data},open(d+"/quote.json","w"))
