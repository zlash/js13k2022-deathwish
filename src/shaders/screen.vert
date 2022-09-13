
layout(location = 0) in vec2 _v;
out vec2 uv;

void main()
{
	uv = vec2(_v.x, -_v.y);
	gl_Position = vec4(_v, 0.0, 1.0);
}
