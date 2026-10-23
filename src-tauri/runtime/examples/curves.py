from manimlib import *


class CurveScene(Scene):
    def construct(self):
        axes = Axes(x_range=(-4, 4), y_range=(-2, 2))
        sine = axes.get_graph(lambda x: np.sin(x), color=TEAL)
        cosine = axes.get_graph(lambda x: np.cos(x), color=YELLOW)
        self.add(axes)
        self.play(ShowCreation(sine), run_time=1)
        self.play(Transform(sine, cosine), run_time=1)
        self.wait(0.5)
