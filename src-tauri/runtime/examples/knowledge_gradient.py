from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text('Gradient descent on a derived quadratic surface', font_size=28).to_edge(UP)
        self.add(heading)
        heading.fix_in_frame()
        axes=ThreeDAxes(x_range=(-2,2,1),y_range=(-2,2,1),z_range=(0,4,1))
        self.frame.reorient(25,60)
        grid=VGroup(*[ParametricCurve(lambda t,a=a: axes.c2p(t,a,(t*t+a*a)/2),t_range=(-1.6,1.6,.05),color=BLUE) for a in [-1.5,-1,-.5,0,.5,1,1.5]])
        curve=ReviewedPath([axes.c2p(*p) for p in [[2.0, 1.0, 2.5], [1.5, 0.75, 1.40625], [1.125, 0.5625, 0.791015625], [0.84375, 0.421875, 0.444946289062], [0.6328125, 0.31640625, 0.250282287598], [0.474609375, 0.2373046875, 0.140783786774], [0.35595703125, 0.177978515625, 0.07919088006], [0.266967773438, 0.133483886719, 0.044544870034], [0.200225830078, 0.100112915039, 0.025056489394], [0.150169372559, 0.075084686279, 0.014094275284], [0.112627029419, 0.056313514709, 0.007928029847], [0.084470272064, 0.042235136032, 0.004459516789]]],YELLOW)
        self.add(axes,grid)
        self.play(ShowCreation(curve),run_time=2)
        self.wait(.5)
