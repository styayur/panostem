from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text('Bisection: bracket and error bound', font_size=28).to_edge(UP)
        self.add(heading)
        axes=Axes(x_range=(0, 5, 1),y_range=(-5, 22, 5),width=9,height=5)
        self.add(axes)
        curve=axes.get_graph(lambda x:x*x-4,color=BLUE)
        self.add(curve)
        self.play(FadeIn(Dot(axes.c2p(2.5,2.25),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(1.25,-2.4375),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(1.875,-0.484375),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.1875,0.78515625),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(2.03125,0.1259765625),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(1.953125,-0.185302734375),color=YELLOW)),run_time=.25)
        self.play(FadeIn(Dot(axes.c2p(1.9921875,-0.031188964844),color=YELLOW)),run_time=.25)
        self.wait(.5)
