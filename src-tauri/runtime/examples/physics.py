import json
import os
from manimlib import *


class OscillatorScene(Scene):
    def construct(self):
        # Optional Panostem contract. Still works in ordinary manimgl.
        values = json.loads(os.environ.get("PANOSTEM_PARAMETERS", "{}"))
        omega = float(values.get("omega", 2))
        t = ValueTracker(0)
        mass = Dot(color=TEAL, radius=0.15)
        mass.add_updater(lambda m: m.move_to([2 * np.cos(omega * t.get_value()), 0, 0]))
        self.add(NumberLine(x_range=(-3, 3)), mass)
        self.play(t.animate.set_value(4), rate_func=linear, run_time=4)
