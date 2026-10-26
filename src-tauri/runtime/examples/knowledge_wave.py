from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text('Standing wave: fixed boundaries and PDE residual', font_size=28).to_edge(UP)
        self.add(heading)
        self.add(Text("Model time: 0 to 3 s; playback: 2 s",font_size=17).to_edge(DOWN))
        axes=Axes(x_range=(0, 3.5, 1),y_range=(-1.5, 1.5, 0.5),width=9,height=5)
        self.add(axes)
        time=ValueTracker(0)
        curve=always_redraw(lambda:axes.get_graph(lambda x:math.sin(x)*math.cos(time.get_value()),x_range=(0,math.pi),color=YELLOW))
        self.add(curve)
        self.play(time.animate.set_value(3),run_time=2,rate_func=linear)
        self.wait(.5)
