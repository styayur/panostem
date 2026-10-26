from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text('Inclusion-exclusion for overlapping events', font_size=28).to_edge(UP)
        self.add(heading)
        left=Circle(radius=1.5,color=BLUE,fill_opacity=.2).shift(LEFT*.7)
        right=Circle(radius=1.5,color=YELLOW,fill_opacity=.2).shift(RIGHT*.7)
        note=Text("P(A union B) = P(A) + P(B) - P(A intersection B)",font_size=20).to_edge(DOWN)
        self.play(ShowCreation(left),ShowCreation(right),run_time=1)
        self.add(note)
        self.add(Text("Schematic regions; area does not encode probability",font_size=14).next_to(note,UP,buff=.15))
        self.play(left.animate.set_fill(opacity=.4),right.animate.set_fill(opacity=.4),run_time=1)
        self.wait(.5)
