
layout(location = 0) in vec3 _v;
layout(location = 1) in vec3 _u;
layout(location = 2) in vec4 _c;

out vec3 uv;
out vec4 c_;

void main()
{
	const vec2 res = vec2(800, 600);

	const mat3 toNdc = mat3(2.0 / res.x, 0.0, 0.0, 0.0, -2.0 / res.y, 0.0, -1.0, 1.0, 1.0);

	gl_Position = vec4((toNdc * vec3(_v.xy, 1)).xy, 0.0, 1.0);
	gl_Position.z = -_v.z / 100.0;
	uv = _u;
	c_ = _c;
}
