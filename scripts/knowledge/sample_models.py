"""Independently authored models. No source code snippets are executed.

Each recipe requires an explicit formula in a reviewed source unit. Specialized
examples are labelled derived; they do not assert that the source used our numbers.
"""
import math
import numpy as np
import sympy as sp

MODEL_CONCEPTS = {
    'newton':['derivative','iteration'], 'bisection':['iteration'],
    'oscillator':['harmonic-oscillator','simple-harmonic-motion'], 'gradient':['gradient','optimization'],
    'square':['complex-number','complex-plane'], 'polar':['complex-number','complex-plane','euler-s-formula'],
    'linear':['determinant','linear-transformation','matrix-inverse'], 'union':['probability'],
    'means':[], 'wave':['wave-equation'], 'heat':['heat-equation'],
    'beam':['differential-equation','linear-system'],'electric':['electric-field','electric-potential'],
    'control':['system-of-differential-equations','linear-system'],
}

MODEL_SPECS = {
    'newton': {'equations': ['f(x)=x^2-4', "f'(x)=2x", "x[n+1]=x[n]-f(x[n])/f'(x[n])"], 'initialConditions': ['x[0]=3'], 'assumptions': ['Real differentiable function; derivative nonzero at each iterate; positive root branch'], 'solver': 'Newton iteration, full floating precision'},
    'bisection': {'equations': ['f(x)=x^2-4', 'c[n]=(a[n]+b[n])/2'], 'initialConditions': ['[a[0],b[0]]=[0,5]'], 'assumptions': ['Continuous function and sign-changing initial bracket'], 'solver': 'Bisection with independent analytic root and interval-width bound'},
    'oscillator': {'equations': ["x''(t)+4*x(t)=0", 'x(t)=cos(2*t)', "E=(x')^2/2+2*x^2"], 'initialConditions': ['x(0)=1 m', "x'(0)=0 m/s"], 'assumptions': ['Ideal linear oscillator; mass 1 kg; no damping or forcing'], 'solver': 'Analytic solution; symbolic ODE and energy residuals'},
    'gradient': {'equations': ['f(x,y)=(x^2+y^2)/2', 'grad f=(x,y)', 'p[n+1]=p[n]-0.25*grad f(p[n])'], 'initialConditions': ['p[0]=(2,1)'], 'assumptions': ['Euclidean metric; differentiable convex quadratic; L=1'], 'solver': 'Analytic gradient and fixed-step descent'},
    'square': {'equations': ['w=z^2', "dw/dz=2*z"], 'initialConditions': [], 'assumptions': ['Complex plane; conformality claimed only where z is nonzero'], 'solver': 'Analytic complex multiplication and radius invariant'},
    'polar': {'equations': ['z=cos(theta)+i*sin(theta)=exp(i*theta)'], 'initialConditions': ['radius=1'], 'assumptions': ['Real angle in radians'], 'solver': 'Independent real trigonometric and complex exponential evaluations'},
    'linear': {'equations': ['A=[[2,1],[0,1]]', 'det(A)=2', 'inverse(A)*A=I'], 'initialConditions': ['Unit square vertices (0,0),(1,0),(1,1),(0,1)'], 'assumptions': ['Real 2D nonsingular linear map; columns are transformed basis vectors'], 'solver': 'Independent cross-product area and NumPy determinant/inverse'},
    'union': {'equations': ['P(A union B)=P(A)+P(B)-P(A intersection B)'], 'initialConditions': [], 'assumptions': ['Finite probability space; overlap allowed; no independence assumed'], 'solver': 'Exhaustive 256 pairs of subsets of a four-element uniform space'},
    'means': {'equations': ['H=2/(1/a+1/b)', 'G=sqrt(a*b)', 'A=(a+b)/2', 'Q=sqrt((a^2+b^2)/2)', 'H<=G<=A<=Q'], 'initialConditions': ['b=2'], 'assumptions': ['a,b strictly positive'], 'solver': 'Positive-domain numerical invariant and analytic equality case'},
    'wave': {'equations': ['u_tt=u_xx', 'u(x,t)=sin(x)*cos(t)'], 'initialConditions': ['u(x,0)=sin(x) m', 'u_t(x,0)=0 m/s'], 'boundaryConditions': ['u(0,t)=u(pi,t)=0'], 'assumptions': ['Linear homogeneous wave equation; c=1 m/s; x in [0,pi] m'], 'solver': 'Analytic standing mode with independent symbolic PDE residual'},
    'heat': {'equations': ['u_t=u_xx', 'u(x,t)=sin(x)*exp(-t)'], 'initialConditions': ['u(x,0)=sin(x) K (temperature difference)'], 'boundaryConditions': ['u(0,t)=u(pi,t)=0 K difference'], 'assumptions': ['Linear homogeneous diffusion; diffusivity 1 m^2/s; temperature differences rather than absolute temperatures'], 'solver': 'Analytic eigenmode with independent symbolic PDE residual and decaying L2 norm'},
    'beam':{'equations':["E*I*w''''=q",'w(x)=q*x^2*(6*L^2-4*L*x+x^2)/(24*E*I)','K*d=f'], 'initialConditions':[], 'boundaryConditions':["w(0)=w\'(0)=0","w\'\'(L)=w\'\'\'(L)=0"], 'assumptions':['Constant E and I, linear elastic Euler-Bernoulli beam, small deflection, uniform transverse load','PDF page 1 row 3 was visually reviewed; textbook/body/media rights are not cleared','Rendered deformation is amplified by 2000; numerical displacements remain in metres'], 'solver':'Cubic Hermite beam finite elements; consistent stiffness/load derived independently; h-refinement against exact quartic'},
    'electric':{'equations':['V=k*Q/r','E=-grad(V)=k*Q*r_vector/r^3','|E|=k*abs(Q)/r^2'], 'initialConditions':[], 'boundaryConditions':['V tends to zero at infinity','Exclude r<0.4 m; point-charge singularity is not rendered'], 'assumptions':['Static point charge in vacuum; Q=1 nC; k=8.99e9 N*m^2/C^2 is the cited rounded value','Arrows show direction only, not a magnitude scale','Independent model: source equation and direction were read; original simulator scripts were not run or copied'], 'solver':'Analytic gradient and inverse-square scaling; direction sampled independently on a 2D slice'},
    'control':{'equations':["y\'=(-y+u)/T_p","z\'=e=1-y","q_f\'=(e-q_f)/tau","u=K_p*e+K_i*z+K_d*q_f\'"], 'initialConditions':['y(0)=z(0)=q_f(0)=0; unit reference step at t=0'], 'boundaryConditions':[], 'assumptions':['Application-authored hypothetical plant and filtered PID law; these equations are assumptions, not claims extracted from the cited ODE note','Cited source supplies only first-order state-system formulation; unavailable control repositories are not substituted','Unity negative feedback; no actuator saturation; derivative filter tau=0.1 s','Numerical state coordinates are (y,z/(1 s),q_f); time is measured in seconds'], 'solver':'RK4 with step halving versus independent SciPy matrix exponential; exact characteristic polynomial and Hurwitz test'},
}


def model_definition(kind, concept_ids, evidence, data, result_hash):
    spec=MODEL_SPECS[kind]
    definitions={
        'newton':[('x','positive real iterate','1'),('n','nonnegative integer','1')],
        'bisection':[('a,b,c','real bracket and midpoint in [0,5]','1'),('n','nonnegative integer','1')],
        'gradient':[('x,y','R^2','1'),('f','nonnegative real objective','1'),('n','nonnegative integer','1')],
        'oscillator':[('t','t>=0','s'),('x','real displacement','m'),('v','real velocity','m/s'),('E','nonnegative energy','J')],
        'square':[('z,w','complex plane','1')], 'polar':[('theta','real angle','rad'),('z','unit complex circle','1')],
        'linear':[('p','R^2 input vector','1'),('A*p','R^2 output vector','1')],
        'union':[('A,B','subsets of finite sample space','1'),('P','probability measure with values in [0,1]','1')],
        'means':[('a,b','strictly positive real inputs','1'),('H,G,A,Q','strictly positive means','1')],
        'wave':[('x','[0,pi]','m'),('t','t>=0','s'),('u','real transverse displacement','m')],
        'heat':[('x','[0,pi]','m'),('t','t>=0','s'),('u','temperature difference relative to fixed boundary reference','K')],
        'beam':[('x','[0,L]','m'),('w','small downward deflection','m'),('theta','beam slope','rad')],
        'electric':[('x,y','r>=0.4 m in a 2D slice','m'),('E','electric field','N/C'),('V','potential relative to infinity','V')],
        'control':[('t','[0,12]','s'),('y,u,e,q_f','normalized scalar signals','1'),('z','integrated error','s')],
    }
    variables=[{'name':n,'domain':d,'unit':u} for n,d,u in definitions[kind]]
    fixed={'oscillator':{'amplitude':(1,'m'),'omega':(2,'rad/s'),'mass':(1,'kg')},'gradient':{'step':(.25,'1')},
           'wave':{'amplitude':(1,'m'),'waveNumber':(1,'rad/m'),'speed':(1,'m/s')},
           'heat':{'temperatureAmplitude':(1,'K'),'waveNumber':(1,'rad/m'),'diffusivity':(1,'m^2/s')},'means':{'b':(2,'1')},
           'beam':{'E':(200e9,'Pa'),'I':(8e-6,'m^4'),'L':(2,'m'),'q':(100,'N/m')},
           'electric':{'k':(8.99e9,'N*m^2/C^2'),'Q':(1e-9,'C')},
           'control':{'K_p':(2,'1'),'K_i':(1,'1/s'),'K_d':(.2,'s'),'tau':(.1,'s'),'T_p':(1,'s')}}
    parameters={n:{'value':v,'min':v,'max':v,'unit':u} for n,(v,u) in fixed.get(kind,{}).items()}
    equations=spec['equations']
    if kind=='oscillator':equations=["x''+omega^2*x=0",'x(t)=amplitude*cos(omega*t)',"E=mass*v^2/2+mass*omega^2*x^2/2"]
    if kind=='wave':equations=['u_tt=speed^2*u_xx','u=amplitude*sin(waveNumber*x)*cos(speed*waveNumber*t)']
    if kind=='heat':equations=['u_t=diffusivity*u_xx','u=temperatureAmplitude*sin(waveNumber*x)*exp(-diffusivity*waveNumber^2*t)']
    return {'schemaVersion':1,'id':kind,'version':1,'conceptIds':concept_ids,'variables':variables,'parameters':parameters,
            'equations':equations,'initialConditions':spec['initialConditions'],'boundaryConditions':spec.get('boundaryConditions',[]),
            'assumptions':spec['assumptions'],'invariants':data['checks'],'solver':spec['solver'],
            'evidence':[{'unitId':u['id'],'contentHash':u['contentHash'],'formula':u['_reviewedFormula'],'kind':'derived'} for u in evidence],
            'visualizationData':{'points':data['points'],'note':'Data computed before rendering; source program is independently checked against this recipe'},
            'verification':{'status':'passed','method':'Independent symbolic/analytic/numerical checks recorded in invariants','tolerance':data.get('tolerance',1e-12),'resultHash':result_hash}}


def verify(kind):
    x, t, c = sp.symbols('x t c', real=True)
    checks = []
    if kind == 'newton':
        a = 3.0
        points = []
        for _ in range(6):
            points.append([a, a*a-4]); a -= (a*a-4)/(2*a)
        assert abs(a-2) < 1e-12
        assert sp.diff(x*x-4, x) == 2*x
        checks = ['Symbolic derivative 2x', 'Positive initial guess 3 converges to root 2; residual < 1e-12']
        return {'points': points, 'checks': checks}
    if kind == 'bisection':
        a, b = 0., 5.; points = []
        for i in range(30):
            midpoint = (a+b)/2
            assert a <= 2 <= b and abs(midpoint-2) <= (b-a)/2 + 1e-14
            points.append([midpoint, midpoint*midpoint-4])
            if (a*a-4)*(midpoint*midpoint-4) <= 0: b = midpoint
            else: a = midpoint
        assert b-a <= 5/2**30 + 1e-14
        return {'points': points[:8], 'checks': ['Bracket contains analytical root at every step', 'Interval width = 5/2^30 within floating tolerance']}
    if kind == 'oscillator':
        u = sp.cos(2*t)
        assert sp.simplify(sp.diff(u,t,2)+4*u) == 0
        energy = sp.diff(u,t)**2/2+2*u**2
        assert sp.simplify(energy-2) == 0
        return {'points': [[float(v), float(math.cos(2*v))] for v in np.linspace(0, 2*math.pi, 120)], 'checks': ['ODE residual is identically zero', 'Initial displacement 1, velocity 0', 'Mass=1 kg, angular frequency=2 rad/s, energy=2 J']}
    if kind == 'gradient':
        y=sp.Symbol('y', real=True); f=(x*x+y*y)/2
        assert [sp.diff(f,v) for v in [x,y]] == [x,y]
        points=[]; a,b=2.,1.
        for _ in range(12):
            before=(a*a+b*b)/2;points.append([a,b,before]);a*=.75;b*=.75
            assert (a*a+b*b)/2 < before
        return {'points':points, 'checks':['Independent symbolic gradient (x,y)', 'Chosen step 1/4 with L=1; strict objective descent except at origin']}
    if kind == 'square':
        z=sp.Symbol('z'); assert sp.diff(z*z,z)==2*z
        points=[]
        for theta in np.linspace(0, math.pi, 100):
            z=complex(math.cos(theta), math.sin(theta)); w=z*z
            assert abs(abs(w)-1)<1e-12
            points.append([w.real,w.imag])
        return {'points':points,'checks':['Complex derivative is 2z', 'Unit semicircle maps to full unit circle', 'At z=0 derivative vanishes; conformality is not claimed there']}
    if kind == 'polar':
        points=[]
        for theta in np.linspace(0, 2*math.pi,100):
            z=np.exp(1j*theta)
            assert abs(z-(math.cos(theta)+1j*math.sin(theta)))<1e-12
            points.append([float(z.real),float(z.imag)])
        return {'points':points,'checks':['Euler identity checked independently by complex exponential and real trig', 'Radius fixed to 1; angle in radians']}
    if kind == 'linear':
        matrix=np.array([[2.,1.],[0.,1.]])
        area=abs(np.cross(matrix[:,0],matrix[:,1]))
        assert abs(area-np.linalg.det(matrix))<1e-12
        inverse=np.linalg.inv(matrix)
        assert np.max(abs(inverse@matrix-np.eye(2)))<1e-12
        return {'points':[[0,0],[2,0],[3,1],[1,1],[0,0]],'checks':['Shoelace/cross-product area equals determinant 2', 'Inverse times matrix equals identity <1e-12', 'The concrete nonsingular matrix is an independently selected example']}
    if kind == 'union':
        points=[]
        for a in (0,1):
            for b in (0,1):assert int(bool(a or b))==a+b-a*b
        for a in range(16):
            for b in range(16):
                aa={i for i in range(4) if a>>i&1};bb={i for i in range(4) if b>>i&1}
                assert len(aa|bb)==len(aa)+len(bb)-len(aa&bb)
        return {'points':[[i%4,i//4] for i in range(16)],'checks':['Pointwise indicator identity checked for all memberships; linearity gives inclusion-exclusion for arbitrary probability weights','All 256 pairs of events on a uniform four-element sample space satisfy inclusion-exclusion', 'Non-independent overlapping events included']}
    if kind == 'means':
        a,b=sp.symbols('a b', positive=True)
        h=2*a*b/(a+b);g2=a*b;m=(a+b)/2;q2=(a*a+b*b)/2
        assert sp.factor(g2-h*h)==a*b*(a-b)**2/(a+b)**2
        assert sp.factor(m*m-g2)==(a-b)**2/4
        assert sp.factor(q2-m*m)==(a-b)**2/4
        points=[]
        for a in np.linspace(.1,4,100):
            b=2.;h=2/(1/a+1/b);g=math.sqrt(a*b);m=(a+b)/2;q=math.sqrt((a*a+b*b)/2)
            assert h<=g+1e-12 and g<=m+1e-12 and m<=q+1e-12
            points.append([float(a),float(h),float(g),float(m),float(q)])
        return {'points':points,'checks':['Symbolic squared adjacent differences factor as nonnegative multiples of (a-b)^2 on the positive domain', 'Positive-domain H<=G<=A<=Q checked for 100 samples', 'Equality at a=b=2 verified analytically']}
    if kind == 'wave':
        u=sp.sin(x)*sp.cos(c*t)
        assert sp.simplify(sp.diff(u,t,2)-c*c*sp.diff(u,x,2))==0
        assert u.subs(x,0)==0 and sp.simplify(u.subs(x,sp.pi))==0
        return {'points':[[float(v),float(math.sin(v))] for v in np.linspace(0,math.pi,120)],'checks':['Wave PDE residual zero symbolically', 'Fixed boundaries x=0 and pi; c=1 m/s; initial velocity zero']}
    if kind == 'heat':
        u=sp.sin(x)*sp.exp(-c*t)
        assert sp.simplify(sp.diff(u,t)-c*sp.diff(u,x,2))==0
        assert sp.simplify(sp.diff(sp.integrate(u*u,(x,0,sp.pi)),t)).subs(c,1) < 0
        return {'points':[[float(v),float(math.sin(v))] for v in np.linspace(0,math.pi,120)],'checks':['Heat PDE residual zero symbolically', 'Fixed zero-temperature boundaries; thermal diffusivity positive', 'Squared L2 norm decreases with time']}
    if kind=='electric':
        y,k,Q=sp.symbols('y k Q',real=True);r=sp.sqrt(x*x+y*y);V=k*Q/r
        assert sp.simplify(-sp.diff(V,x)-k*Q*x/r**3)==0
        assert sp.simplify(-sp.diff(V,y)-k*Q*y/r**3)==0
        points=[]
        for a in np.linspace(-2,2,9):
            for b in np.linspace(-2,2,9):
                radius=math.hypot(a,b)
                if radius<.4:continue
                assert abs(math.hypot(a/radius,b/radius)-1)<1e-12
                points.append([float(a),float(b),float(a/radius),float(b/radius)])
        assert abs((8.99e9*1e-9/2**2)/(8.99e9*1e-9)-.25)<1e-12
        return {'points':points,'checks':['Both components equal the negative symbolic gradient of potential','Doubling radius reduces field magnitude by four','Dimensions: k*Q/r^2 gives N/C; arrows normalized explicitly; singular origin excluded']}
    if kind=='beam':
        E,I,L,q=sp.symbols('E I L q',positive=True);w=q*x*x*(6*L*L-4*L*x+x*x)/(24*E*I)
        assert sp.simplify(E*I*sp.diff(w,x,4)-q)==0
        assert w.subs(x,0)==0 and sp.diff(w,x).subs(x,0)==0
        assert sp.simplify(sp.diff(w,x,2).subs(x,L))==0 and sp.simplify(sp.diff(w,x,3).subs(x,L))==0
        assert sp.simplify(w.subs(x,L)-q*L**4/(8*E*I))==0
        h,s=sp.symbols('h s',positive=True)
        N=sp.Matrix([1-3*s*s+2*s**3,h*(s-2*s*s+s**3),3*s*s-2*s**3,h*(-s*s+s**3)])
        B=N.diff(s,2)/h**2;K=sp.integrate(B*B.T*h,(s,0,1))
        assert K[0,0]==12/h**3 and K[1,1]==4/h
        load=sp.integrate(N*h,(s,0,1));assert load==sp.Matrix([h/2,h*h/12,h/2,-h*h/12])
        EE,II,LL,qq=200e9,8e-6,2.,100.
        def solve(n):
            hh=LL/n;stiff=np.array(K.subs(h,hh),dtype=float)*EE*II;force=np.array(load.subs(h,hh),dtype=float).reshape(4)*qq
            matrix=np.zeros((2*n+2,2*n+2));rhs=np.zeros(2*n+2)
            for j in range(n):
                ids=[2*j,2*j+1,2*j+2,2*j+3];matrix[np.ix_(ids,ids)]+=stiff;rhs[ids]+=force
            d=np.zeros(2*n+2);d[2:]=np.linalg.solve(matrix[2:,2:],rhs[2:]);points=[];error=0
            for xx in np.linspace(0,LL,129):
                j=min(int(xx/hh),n-1);ss=(xx-j*hh)/hh;nn=np.array(N.subs({h:hh,s:ss}),dtype=float).reshape(4)
                displacement=float(nn@d[2*j:2*j+4]);exact=qq*xx*xx*(6*LL*LL-4*LL*xx+xx*xx)/(24*EE*II)
                error=max(error,abs(displacement-exact));points.append([float(xx),displacement])
            assert abs(d[-2]-qq*LL**4/(8*EE*II))<1e-12
            return points,error
        errors=[solve(n)[1] for n in (1,2,4,8)]
        assert all(12<errors[j]/errors[j+1]<20 for j in range(3))
        points,error=solve(8)
        return {'points':points,'tolerance':1e-8,'checks':['Exact fourth-order beam equation and all clamp/free-end conditions checked symbolically','Hermite stiffness and consistent load derived by independent symbolic integration','1,2,4,8 element fields converge approximately by factor 16; tip matches exact q*L^4/(8*E*I)','Units give metres; true tip displacement is 0.125 mm; visual amplification is explicitly 2000']}
    if kind=='control':
        from scipy.linalg import expm
        A=np.array([[-5.,1.,-2.],[-1.,0.,0.],[-10.,0.,-10.]])
        B=np.array([4.,1.,10.]);equilibrium=-np.linalg.solve(A,B)
        assert np.max(abs(equilibrium-np.array([1.,1.,0.])))<1e-12
        char=sp.Matrix(A.astype(int)).charpoly().all_coeffs();assert char==[1,15,31,10]
        assert 15*31>10 and np.max(np.real(np.linalg.eigvals(A)))<0
        def solve(dt):
            state=np.zeros(3);error=0;points=[]
            for j in range(round(12/dt)+1):
                tt=j*dt;reference=equilibrium-expm(A*tt)@equilibrium
                error=max(error,float(np.max(abs(state-reference))));points.append([tt,float(state[0])])
                f=lambda a:A@a+B
                k1=f(state);k2=f(state+dt*k1/2);k3=f(state+dt*k2/2);k4=f(state+dt*k3)
                state+=dt*(k1+2*k2+2*k3+k4)/6
            return points,error
        _,coarse=solve(.02);points,fine=solve(.01)
        assert fine<1e-5 and 12<coarse/fine<20
        return {'points':points,'tolerance':1e-5,'checks':['Characteristic polynomial s^3+15s^2+31s+10 passes exact Hurwitz conditions','Closed-loop equilibrium has y=1 and zero steady error','RK4 refinement checked against independent matrix exponential; error below 1e-5','Plant/controller are declared authored assumptions; original ODE source does not claim this PID law']}
    raise ValueError(f'No independent verifier for {kind}')


def scene_code(kind, title, data):
    """Data and equations come only from fixed reviewed recipes, never document code."""
    # Avoid platform libm differences in generated source; <5e-13 rounding error
    # stays below the independent 1e-12 example tolerance.
    data={**data,'points':[[round(float(v),12) for v in point] for point in data['points']]}
    common='''from manimlib import *
from helpers import ReviewedPath
import math
class ModelScene(Scene):
    def construct(self):
        heading=Text(TITLE, font_size=28).to_edge(UP)
        self.add(heading)
'''.replace('TITLE',repr(title))
    if kind in ('wave','heat'):
        common+='        self.add(Text("Model time: 0 to 3 s; playback: 2 s",font_size=17).to_edge(DOWN))\n'
    elif kind in ('oscillator','control'):
        common+='        self.add(Text("Horizontal axis: model time (s); graph reveal is not real time",font_size=16).to_edge(DOWN))\n'
    if kind=='gradient':
        return common+'''        heading.fix_in_frame()
        axes=ThreeDAxes(x_range=(-2,2,1),y_range=(-2,2,1),z_range=(0,4,1))
        self.frame.reorient(25,60)
        grid=VGroup(*[ParametricCurve(lambda t,a=a: axes.c2p(t,a,(t*t+a*a)/2),t_range=(-1.6,1.6,.05),color=BLUE) for a in [-1.5,-1,-.5,0,.5,1,1.5]])
        curve=ReviewedPath([axes.c2p(*p) for p in POINTS],YELLOW)
        self.add(axes,grid)
        self.play(ShowCreation(curve),run_time=2)
        self.wait(.5)
'''.replace('POINTS',repr(data['points']))
    if kind=='linear':
        return common+'''        axes=Axes(x_range=(-1,4,1),y_range=(-1,3,1),width=9,height=5)
        square=Polygon(*[axes.c2p(*p) for p in [(0,0),(1,0),(1,1),(0,1)]],color=BLUE,fill_opacity=.25)
        target=Polygon(*[axes.c2p(*p) for p in [(0,0),(2,0),(3,1),(1,1)]],color=YELLOW,fill_opacity=.25)
        original=square.copy()
        self.add(axes,square)
        self.add(Text("Apply A, then its inverse; area scales by determinant",font_size=18).to_edge(DOWN))
        self.play(Transform(square,target),run_time=1.3)
        self.wait(.3)
        self.play(Transform(square,original),run_time=1.3)
        self.wait(.5)
'''
    if kind=='union':
        return common+'''        left=Circle(radius=1.5,color=BLUE,fill_opacity=.2).shift(LEFT*.7)
        right=Circle(radius=1.5,color=YELLOW,fill_opacity=.2).shift(RIGHT*.7)
        note=Text("P(A union B) = P(A) + P(B) - P(A intersection B)",font_size=20).to_edge(DOWN)
        self.play(ShowCreation(left),ShowCreation(right),run_time=1)
        self.add(note)
        self.add(Text("Schematic regions; area does not encode probability",font_size=14).next_to(note,UP,buff=.15))
        self.play(left.animate.set_fill(opacity=.4),right.animate.set_fill(opacity=.4),run_time=1)
        self.wait(.5)
'''
    if kind=='electric':
        return common+'''        axes=Axes(x_range=(-2.5,2.5,1),y_range=(-2.5,2.5,1),width=7,height=5)
        arrows=VGroup(*[Arrow(axes.c2p(p[0],p[1]),axes.c2p(p[0]+.3*p[2],p[1]+.3*p[3]),buff=0,color=YELLOW) for p in POINTS])
        self.add(axes,Dot(axes.c2p(0,0),color=RED))
        self.add(Text("Direction only; |E| = k Q / r^2",font_size=18).to_edge(DOWN))
        self.play(ShowCreation(arrows),run_time=2)
        self.wait(.5)
'''.replace('POINTS',repr(data['points']))
    if kind=='beam':
        return common+'''        axes=Axes(x_range=(0,2.2,.5),y_range=(-.35,.1,.1),width=9,height=4)
        curve=ReviewedPath([axes.c2p(p[0],-2000*p[1]) for p in POINTS],YELLOW)
        self.add(axes,Text("Deflection x2000; actual tip = 0.125 mm",font_size=18).to_edge(DOWN))
        self.play(ShowCreation(curve),run_time=2)
        self.wait(.5)
'''.replace('POINTS',repr(data['points']))
    ranges={'newton':((0,4,1),(-5,6,2)),'bisection':((0,5,1),(-5,22,5)), 'oscillator':((0,7,1),(-1.5,1.5,.5)),
            'square':((-1.5,1.5,.5),(-1.5,1.5,.5)),'polar':((-1.5,1.5,.5),(-1.5,1.5,.5)),
            'means':((0,4.5,1),(0,4.5,1)),'wave':((0,3.5,1),(-1.5,1.5,.5)),'heat':((0,3.5,1),(-.2,1.2,.5)), 'control':((0,12,2),(0,1.2,.2))}
    xr,yr=ranges[kind]
    body=f'        axes=Axes(x_range={xr!r},y_range={yr!r},width=9,height=5)\n        self.add(axes)\n'
    if kind in ('newton','bisection'):
        body+='        curve=axes.get_graph(lambda x:x*x-4,color=BLUE)\n        self.add(curve)\n'
        for a,b in data['points'][:7]: body+=f'        self.play(FadeIn(Dot(axes.c2p({a!r},{b!r}),color=YELLOW)),run_time=.25)\n'
    elif kind in ('wave','heat'):
        fun='math.sin(x)*math.cos(time.get_value())' if kind=='wave' else 'math.sin(x)*math.exp(-time.get_value())'
        body+=f'''        time=ValueTracker(0)
        curve=always_redraw(lambda:axes.get_graph(lambda x:{fun},x_range=(0,math.pi),color=YELLOW))
        self.add(curve)
        self.play(time.animate.set_value(3),run_time=2,rate_func=linear)
'''
    elif kind=='means':
        for column,color in [(1,'BLUE'),(2,'GREEN'),(3,'YELLOW'),(4,'RED')]: body+=f'        self.play(ShowCreation(ReviewedPath([axes.c2p(p[0],p[{column}]) for p in {data["points"]!r}],{color})),run_time=.5)\n'
    else: body+=f'        self.play(ShowCreation(ReviewedPath([axes.c2p(*p) for p in {data["points"]!r}],YELLOW)),run_time=2)\n'
    return common+body+'        self.wait(.5)\n'


HELPER = '''from manimlib import *
class ReviewedPath(VMobject):
    def __init__(self, points, color):
        super().__init__(color=color)
        self.set_points_as_corners(points)
'''
