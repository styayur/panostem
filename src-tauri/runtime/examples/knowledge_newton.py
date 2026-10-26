from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text('Newton iteration: x squared minus four', font_size=28).to_edge(UP)
        self.add(heading)
        axes=Axes(x_range=(0, 4, 1),y_range=(-5, 6, 2),width=9,height=5)
        self.add(axes)
        curve=axes.get_graph(lambda x:x*x-4,color=BLUE)
        self.add(curve)
        self.play(FadeIn(Dot(axes.c2p(3.0,5.0),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.166666666667,0.694444444444),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.00641025641,0.025682117028),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.000010240026,4.096021e-05),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.000000000026,1.05e-10),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.0,0.0),color=YELLOW)),run_time=.25)
        self.wait(.5)
