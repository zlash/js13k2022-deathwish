
export const screenVert = `#version 300 es
precision highp float;
#define f_ float
#define _2 vec2
#define _3 vec3
#define _4 else if
layout(location=0)in _2 _v;out _2 uv;void main(){uv=_2(_v.x,-_v.y);gl_Position=vec4(_v,0.,1.);}`;
export const spritesVert = `#version 300 es
precision highp float;
#define f_ float
#define _2 vec2
#define _3 vec3
#define _4 else if
layout(location=0)in _3 _v;layout(location=1)in _3 _u;layout(location=2)in vec4 _c;out _3 uv;out vec4 c_;void main(){const _2 v=_2(800,600);const mat3 n=mat3(2./v.x,0.,0.,0.,-2./v.y,0.,-1.,1.,1.);gl_Position=vec4((n*_3(_v.xy,1)).xy,0.,1.);gl_Position.z=-_v.z/100.;uv=_u;c_=_c;}`;
export const sdfFrag = `#version 300 es
precision highp float;
#define f_ float
#define _2 vec2
#define _3 vec3
#define _4 else if
out vec4 _f;uniform mat4 _wm;in _2 uv;mat2 f(f_ i){f_ v=sin(i),x=cos(i);return mat2(x,-v,v,x);}f_ f(_3 v,_3 i){v=abs(v)-i;return length(max(v,0.))+min(max(v.x,max(v.y,v.z)),0.);}f_ f(_3 v,f_ i,f_ y){_2 x=y*_2(i,-1.),f=_2(length(v.xz),v.y),z=f-x*clamp(dot(f,x)/dot(x,x),0.,1.),m=f-x*_2(clamp(f.x/x.x,0.,1.),1.);f_ l=sign(x.y),d=min(dot(z,z),dot(m,m)),w=max(l*(f.x*x.y-f.y*x.x),l*(f.y-x.y));return sqrt(d)*sign(w);}f_ i(_3 v,f_ i,f_ y){_2 x=abs(_2(length(v.xz),v.y))-_2(i,y);return min(max(x.x,x.y),0.)+length(max(x,0.));}f_ i(_3 v,_2 i){_2 x=_2(length(v.xz)-i.x,v.y);return length(x)-i.y;}layout(std140) uniform Bytecode{vec4 bytecode[512];};f_ v[32];int x;void i(f_ i){v[x++]=i;}f_ f(){return v[--x];}void s(_3 v){i(v.z);i(v.y);i(v.x);}_3 i(){_3 i;i.x=f();i.y=f();i.z=f();return i;}_3 r[64];int e;void t(_3 i){r[e++]=i;}_3 s(){return r[--e];}_3 t(){return r[e-1];}_3 m[8];int y;void n(_3 i){m[y++]=i;}_3 n(){return m[--y];}_3 h(){return m[y-1];}vec4 l[32];int z;void h(f_ i){l[z++]=vec4(i,h());}void h(vec4 i){l[z++]=i;}vec4 c(){return l[--z];}_3 c(_3 v,f_ i){f_ x=cos(i*v.y),f=sin(i*v.y);mat2 c=mat2(x,-f,f,x);_2 m=c*v.xz;return _3(m.x,v.y,m.y);}f_ c(f_ i,f_ v,f_ x){f_ y=clamp(.5+.5*(v-i)/x,0.,1.);return mix(v,i,y)-x*y*(1.-y);}f_ h(f_ i,f_ v,f_ x){f_ y=clamp(.5-.5*(v+i)/x,0.,1.);return mix(v,-i,y)+x*y*(1.-y);}void c(f_ v){if(v==0.)h(f(t(),i()));_4(v==1.){f_ x=f();h(length(t())-x);}_4(v==2.){f_ x=f(),y=f();h(f(t(),x,y));}_4(v==3.){f_ x=f(),y=f();h(i(t(),x,y));}_4(v==4.){f_ x=f(),y=f();h(i(t(),_2(x,y)));}_4(v==20.)s();_4(v==21.)t(t()-i());_4(v==25.)t(t()/f());_4(v==26.){vec4 x=c();x.x*=f();h(x);}_4(v==22.){_3 x=t();f_ y=f();x.xz*=f(y);t(x);}_4(v==23.){_3 x=t();f_ y=f();x.yz*=f(y);t(x);}_4(v==24.){_3 x=t();f_ y=f();x.xy*=f(y);t(x);}_4(v==30.){_3 x=t();x.x=abs(x.x);t(x);}_4(v==31.){_3 x=t();x.y=abs(x.y);t(x);}_4(v==32.){_3 x=t();x.z=abs(x.z);t(x);}_4(v==41.){_3 x=t();f_ y=f();t(c(x,y));}_4(v==44.){vec4 x=c();f_ y=f();x.x-=y;h(x);}_4(v==45.){vec4 x=c();f_ y=f(),z=f();_3 m=t();f_ l=12.566;x.x+=cos(l*m.x+z)*cos(l*m.z+z)*.03+y;h(x);}_4(v==10.){vec4 x=c(),y=c();h(x.x<y.x?x:y);}_4(v==11.){vec4 x=c();x.x=-x.x;vec4 y=c();h(x.x>y.x?x:y);}_4(v==12.){vec4 x=c(),y=c();f_ m=f(),z=c(x.x,y.x,m);h(vec4(z,x.yzw));}_4(v==13.){vec4 x=c(),y=c();f_ m=f(),z=h(x.x,y.x,m);h(vec4(z,x.yzw));}_4(v==50.){_3 x;x.x=f();if(x.x==60.)x.y=f();_4(x.x==61.){x.y=f();x.z=f();}n(x);}_4(v==51.)n();}vec4 a(_3 v){int m=0,f=0;x=0;e=0;y=0;z=0;t(v);n(_3(0.));while(m!=1){vec4 l=bytecode[f++];if(l.x==1.)s(l.yzw);_4(l.x==2.)i(l.y);_4(l.x==0.)if(l.y==999.)m=1;else c(l.y);}return c();}f_ a(in _3 v,in _3 x,f_ i,f_ y,f_ m){f_ f=1.,z=1e20;for(f_ e=i;e<y;){f_ l=a(v+x*e).x;if(l<.001)return 0.;f_ c=l*l/(2.*z),d=sqrt(l*l-c*c);f=min(f,m*d/max(0.,e-c));z=l;e+=l;}return f;}f_ a(_3 i,_3 x,out _3 v){f_ y=0.;v=_3(-1.);for(int f=0;f<500;f++){_3 m=i+x*y;vec4 l=a(m);y+=l.x;if(y>15.||abs(l.x)<1e-5){v=l.yzw;break;}}return y;}_3 p(_3 v){const f_ x=1e-4;const _2 i=_2(1,-1);return normalize(i.xyy*a(v+i.xyy*x).x+i.yyx*a(v+i.yyx*x).x+i.yxy*a(v+i.yxy*x).x+i.xxx*a(v+i.xxx*x).x);}const _3 u[16]=_3[](_3(25,25,25)/255.,_3(29,43,83)/255.,_3(126,37,83)/255.,_3(0,135,81)/255.,_3(171,82,54)/255.,_3(95,87,79)/255.,_3(194,195,199)/255.,_3(255,241,232)/255.,_3(204,55,45)/255.,_3(255,163,0)/255.,_3(255,236,39)/255.,_3(0,228,54)/255.,_3(41,173,255)/255.,_3(131,118,156)/255.,_3(255,119,168)/255.,_3(255,204,170)/255.);_3 b(_2 i){return u[6];}void main(){mat4 v=inverse(_wm);_3 x=_3(v*vec4(uv*2.,0,1)),y=_3(v*vec4(uv*2.,-1,1))-x;vec4 i=vec4(0);for(int f=0;f<1;f++)for(int m=0;m<1;m++){_3 l;f_ z=a(x,y,l);vec4 c=vec4(0);if(z<15.){_3 d=x+y*z,e=p(d),w=normalize(_3(1,1.5,.5));f_ s=dot(e,w),r=s*a(d,w,.01,10.,10.);r=.4+.6*r;_3 t=_3(-1,0,1);if(l.x==60.)t=u[int(l.y)];_4(l.x==61.){t=_3(0);t+=b(d.xz);}_3 n=_3(r)*t;c=t.x>=0.?vec4(n,1.):vec4(0);}i+=c;}i/=f_(1);_f=i;}`;
export const spritesFrag = `#version 300 es
precision highp float;
#define f_ float
#define _2 vec2
#define _3 vec3
#define _4 else if
in _3 uv;in vec4 c_;out vec4 _f;uniform highp sampler2DArray tex;void main(){vec4 v=texture(tex,uv);if(uv.z==0.){f_ u=1.-min(1.,2.*length(uv.xy-.5));v=vec4(u);}_f=v*c_;}`;
