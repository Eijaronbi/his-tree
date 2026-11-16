import sys, json, time, os
sys.path.insert(0,"/data/home/.opencode/skills/aholo-lux3d/core/runtime")
import lux3d_client as L
tid = open("/data/home/luxin/task_id.txt").read().strip()
out = "/data/home/luxin/out"
os.makedirs(out, exist_ok=True)
for attempt in range(90):
    try:
        t = L.get_task(tid, region="international")
        data = t if isinstance(t, dict) else getattr(t, "__dict__", {})
        st = data.get("status")
        print("poll", attempt, "status", st, flush=True)
        if st in (3, 4, 5, 6):
            json.dump(t, open("/data/home/luxin/task_result.json","w"), indent=1)
            if st == 3:
                outs = L.parse_task_outputs(t)
                print("outputs", outs, flush=True)
                try:
                    L.download_requested_models(outs, out, ["glb"])
                except Exception as e:
                    print("dl err", e, flush=True)
            break
    except Exception as e:
        print("poll err", e, flush=True)
    time.sleep(20)
print("done", flush=True)
