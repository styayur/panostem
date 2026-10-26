from manimlib import *
class ReviewedPath(VMobject):
    def __init__(self, points, color):
        super().__init__(color=color)
        self.set_points_as_corners(points)
