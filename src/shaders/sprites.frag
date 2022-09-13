
// precision highp float;

in vec3 uv;
in vec4 c_;

#define outFragment _f

out vec4 outFragment; // Fragment Color

uniform highp sampler2DArray tex;

void main()
{
	vec4 col = texture(tex, uv);
	if (uv.z == 0.0) {
		float a = 1.0 - min(1.0, 2.0*length(uv.xy-0.5));
		col = vec4(a);
	}

	outFragment = col * c_;
}
