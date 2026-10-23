from manimlib import *


class OrbitingDot(Dot):
    def __init__(self, **kwargs):
        super().__init__(color=YELLOW, **kwargs)
        self.elapsed = 0
        self.add_updater(self.advance)

    def advance(self, dot, dt):
        self.elapsed += dt
        dot.move_to([2 * np.cos(self.elapsed), 2 * np.sin(self.elapsed), 0])


class UpdaterScene(Scene):
    def construct(self):
        dot = OrbitingDot()
        connector = always_redraw(lambda: Line(ORIGIN, dot.get_center(), color=TEAL))
        self.add(Circle(radius=2), connector, dot)
        self.wait(2)
