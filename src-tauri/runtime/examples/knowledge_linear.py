from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text('Linear map: determinant and inverse', font_size=28).to_edge(UP)
        self.add(heading)
        axes=Axes(x_range=(-1,4,1),y_range=(-1,3,1),width=9,height=5)
        square=Polygon(*[axes.c2p(*p) for p in [(0,0),(1,0),(1,1),(0,1)]],color=BLUE,fill_opacity=.25)
        target=Polygon(*[axes.c2p(*p) for p in [(0,0),(2,0),(3,1),(1,1)]],color=YELLOW,fill_opacity=.25)
        original=square.copy()
        self.add(axes,square)
        self.add(Text("Apply A, then its inverse; area scales by determinant",font_size=18).to_edge(DOWN))
        self.play(Transform(square,target),run_time=1.3)
        self.wait(.3)
        self.play(Transform(square,original),run_time=1.3)
        self.wait(.5)
