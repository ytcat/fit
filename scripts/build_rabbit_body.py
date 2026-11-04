"""Build the rabbit's continuous boxing surface without the lion's ear volumes.
The long rabbit ears are separately articulated by the runtime. Removing those
volumes at mesh construction avoids folding a cat ear into the rabbit forehead.
"""
import json
from pathlib import Path
import build_coach as source
from build_arm_weights import assign_arm_weights
source.body = [(c, r) for c, r in source.body if not (c[1] > 2.07 and abs(c[0]) > .12)]
body = source.surface(source.anatomy, [-1.05,.06,-.25], [1.05,2.25,.34], .023)
assign_arm_weights(body)
path = Path(__file__).resolve().parents[1] / 'assets/models/rabbit-surface-r78.json'
path.write_text(json.dumps({'rigVersion': 2, 'body': body}, separators=(',', ':')))
print(path, path.stat().st_size)
