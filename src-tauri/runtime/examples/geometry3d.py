from manimlib import *


class WaveSurface(Surface):
    def uv_func(self, u, v):
        return (u, v, 0.5 * np.sin(u) * np.cos(v))


class GeometryScene(Scene):
    def construct(self):
        surface = WaveSurface(
            u_range=(-3, 3), v_range=(-3, 3), resolution=(21, 21), color=TEAL,
        )
        self.camera.frame.reorient(35, 60)
        self.add(ThreeDAxes(), surface)
        self.play(self.camera.frame.animate.increment_theta(0.6), run_time=2)
        self.wait(0.5)
