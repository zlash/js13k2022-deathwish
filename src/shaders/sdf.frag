
// precision highp float;

#define outFragment _f

out vec4 outFragment; // Fragment Color

#define worldProjectionMatrix _wm
uniform mat4 worldProjectionMatrix;

#define MAX_STEPS 500
#define MAX_DIST  15.0
#define SURF_DIST .00001

#include "sdfConstants.sh"

in vec2 uv;

mat2 invRotation(float a)
{
	float s = sin(a), c = cos(a);
	return mat2(c, -s, s, c);
}

/*
float sd2dTrapezoid( in vec2 p, in float r1, float r2, float he )
{
	vec2 k1 = vec2(r2,he);
	vec2 k2 = vec2(r2-r1,2.0*he);

	p.x = abs(p.x);
	vec2 ca = vec2(max(0.0,p.x-((p.y<0.0)?r1:r2)), abs(p.y)-he);
	vec2 cb = p - k1 + k2*clamp( dot(k1-p,k2)/dot2(k2), 0.0, 1.0 );

	float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;

	return s*sqrt( min(dot2(ca),dot2(cb)) );
}
*/

float sdBox(vec3 p, vec3 s)
{
	p = abs(p) - s;
	return length(max(p, 0.)) + min(max(p.x, max(p.y, p.z)), 0.);
}

float sdCone(vec3 p, float angle, float h)
{
	vec2 q = h * vec2(angle, -1.0);
	vec2 w = vec2(length(p.xz), p.y);

	vec2 a = w - q * clamp(dot(w, q) / dot(q, q), 0.0, 1.0);
	vec2 b = w - q * vec2(clamp(w.x / q.x, 0.0, 1.0), 1.0);
	float k = sign(q.y);
	float d = min(dot(a, a), dot(b, b));
	float s = max(k * (w.x * q.y - w.y * q.x), k * (w.y - q.y));
	return sqrt(d) * sign(s);
}

float sdCylinder(vec3 p, float h, float r)
{
	vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(h, r);
	return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdTorus(vec3 p, vec2 t)
{
	vec2 q = vec2(length(p.xz) - t.x, p.y);
	return length(q) - t.y;
}

layout(std140) uniform Bytecode
{
	vec4 bytecode[512];
};

float paramStack[32];
int paramStackPos;

void pushFloat(float v)
{
	paramStack[paramStackPos++] = v;
}

float popFloat()
{
	return paramStack[--paramStackPos];
}

void pushVec3(vec3 v)
{
	pushFloat(v.z);
	pushFloat(v.y);
	pushFloat(v.x);
}

vec3 popVec3()
{
	vec3 v;
	v.x = popFloat();
	v.y = popFloat();
	v.z = popFloat();
	return v;
}

vec3 posStack[64];
int posStackPos;

void pushPos(vec3 pos)
{
	posStack[posStackPos++] = pos;
}

vec3 popPos()
{
	return posStack[--posStackPos];
}

vec3 getPos()
{
	return posStack[posStackPos - 1];
}

vec3 materialStack[8];
int posMaterialStack;

void pushMaterial(vec3 materialEntry)
{
	materialStack[posMaterialStack++] = materialEntry;
}

vec3 popMaterial()
{
	return materialStack[--posMaterialStack];
}

vec3 getMaterial()
{
	return materialStack[posMaterialStack - 1];
}

vec4 sdfStack[32];
int sdfStackPos;

void pushSdf(float d)
{
	sdfStack[sdfStackPos++] = vec4(d, getMaterial());
}

void pushSdf(vec4 v)
{
	sdfStack[sdfStackPos++] = v;
}

vec4 popSdf()
{
	return sdfStack[--sdfStackPos];
}

vec3 opTwist(vec3 p, float k)
{
	float c = cos(k * p.y);
	float s = sin(k * p.y);
	mat2 m = mat2(c, -s, s, c);
	vec2 r = m * p.xz;
	return vec3(r.x, p.y, r.y);
}

float opSmoothUnion(float d1, float d2, float k)
{
	float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
	return mix(d2, d1, h) - k * h * (1.0 - h);
}

float opSmoothSubtraction(float d1, float d2, float k)
{
	float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
	return mix(d2, -d1, h) + k * h * (1.0 - h);
}

void doOp(float op)
{
	if (op == Box) {
		pushSdf(sdBox(getPos(), popVec3()));
	} else if (op == Sphere) {
		float rad = popFloat();
		pushSdf(length(getPos()) - rad);
	} else if (op == Cone) {
		float angle = popFloat();
		float h = popFloat();
		pushSdf(sdCone(getPos(), angle, h));
	} else if (op == Cylinder) {
		float height = popFloat();
		float radius = popFloat();
		pushSdf(sdCylinder(getPos(), height, radius));
	} else if (op == Torus) {
		float a = popFloat();
		float b = popFloat();
		pushSdf(sdTorus(getPos(), vec2(a, b)));
	} else if (op == PopPosition) {
		popPos();
	} else if (op == Translate) {
		pushPos(getPos() - popVec3());
	} else if (op == Scale) {
		pushPos(getPos() / popFloat());
	} else if (op == PopScale) {
		vec4 a = popSdf();
		a.x *= popFloat();
		pushSdf(a);
	} else if (op == RotationXZ) {
		vec3 p = getPos();
		float a = popFloat();
		p.xz *= invRotation(a);
		pushPos(p);
	} else if (op == RotationYZ) {
		vec3 p = getPos();
		float a = popFloat();
		p.yz *= invRotation(a);
		pushPos(p);
	} else if (op == RotationXY) {
		vec3 p = getPos();
		float a = popFloat();
		p.xy *= invRotation(a);
		pushPos(p);
	} else if (op == SymX) {
		vec3 p = getPos();
		p.x = abs(p.x);
		pushPos(p);
	} else if (op == SymY) {
		vec3 p = getPos();
		p.y = abs(p.y);
		pushPos(p);
	} else if (op == SymZ) {
		vec3 p = getPos();
		p.z = abs(p.z);
		pushPos(p);
	} else if (op == TwistY) {
		vec3 p = getPos();
		float k = popFloat();
		pushPos(opTwist(p, k));
	} else if (op == Round) {
		vec4 a = popSdf();
		float k = popFloat();
		a.x -= k;
		pushSdf(a);
	} else if (op == Displace) {
		vec4 a = popSdf();
		float type = popFloat();
		float k = popFloat();
		vec3 p = getPos();
		float modA = 2.0 * 2.0 * 3.1415;
		float phase = k;
		a.x += cos(modA * p.x + k) * cos(modA * p.z + k) * 0.03 + type;
		// a.x += cos(k) * cos(k) * 0.03;
		pushSdf(a);
	} else if (op == Union) {
		vec4 a = popSdf();
		vec4 b = popSdf();
		pushSdf(a.x < b.x ? a : b);
	} else if (op == Subtraction) {
		vec4 a = popSdf();
		a.x = -a.x;
		vec4 b = popSdf();
		pushSdf(a.x > b.x ? a : b);
	} else if (op == SmoothUnion) {
		vec4 a = popSdf();
		vec4 b = popSdf();
		float k = popFloat();
		float u = opSmoothUnion(a.x, b.x, k);
		// Lets inherit a's material for now
		pushSdf(vec4(u, a.yzw));
	} else if (op == SmoothSubtract) {
		vec4 a = popSdf();
		vec4 b = popSdf();
		float k = popFloat();
		float u = opSmoothSubtraction(a.x, b.x, k);
		// Lets inherit a's material for now
		pushSdf(vec4(u, a.yzw));
	} else if (op == PushMaterial) {
		vec3 mat;
		mat.x = popFloat();
		if (mat.x == MaterialAlbedo) {
			mat.y = popFloat();
		} else if (mat.x == MaterialTexture) {
			mat.y = popFloat();
			mat.z = popFloat();
		}
		pushMaterial(mat);
	} else if (op == PopMaterial) {
		popMaterial();
	}
}

vec4 getDistanceFromBytecode(vec3 p)
{
	int finished = 0;
	int bytecodePos = 0;

	paramStackPos = 0;
	posStackPos = 0;
	posMaterialStack = 0;
	sdfStackPos = 0;

	pushPos(p);
	pushMaterial(vec3(0.0));

	while (finished != 1) {
		vec4 cell = bytecode[bytecodePos++];
		if (cell.x == VmVec) {
			pushVec3(cell.yzw);
		} else if (cell.x == VmFloat) {
			pushFloat(cell.y);
		} else if (cell.x == VmOp) {
			if (cell.y == End)
				finished = 1;
			else
				doOp(cell.y);
		}
	}

	return popSdf();
}

float softShadow(in vec3 ro, in vec3 rd, float mint, float maxt, float k)
{
	float res = 1.0;
	float ph = 1e20;
	for (float t = mint; t < maxt;) {
		float h = getDistanceFromBytecode(ro + rd * t).x;
		if (h < 0.001)
			return 0.0;
		float y = h * h / (2.0 * ph);
		float d = sqrt(h * h - y * y);
		res = min(res, k * d / max(0.0, t - y));
		ph = h;
		t += h;
	}
	return res;
}

float rayMarch(vec3 ro, vec3 rd, out vec3 mat)
{
	float dO = 0.0;
	mat = vec3(-1.0);

	for (int i = 0; i < MAX_STEPS; i++) {
		vec3 p = ro + rd * dO;
		vec4 dMat = getDistanceFromBytecode(p);
		dO += dMat.x;
		if (dO > MAX_DIST || abs(dMat.x) < SURF_DIST) {
			mat = dMat.yzw;
			break;
		}
	}

	return dO;
}

vec3 calcNormal(vec3 p) // for function f(p)
{
	const float h = SURF_DIST * 10.0; // replace by an appropriate value
	const vec2 k = vec2(1, -1);
	return normalize(
	  k.xyy * getDistanceFromBytecode(p + k.xyy * h).x + k.yyx * getDistanceFromBytecode(p + k.yyx * h).x +
	  k.yxy * getDistanceFromBytecode(p + k.yxy * h).x + k.xxx * getDistanceFromBytecode(p + k.xxx * h).x);
}

#include "palette.sh"

vec3 stone(vec2 uv)
{
	return palette[PaletteLightGrey];
}

#define AA 1

void main()
{
	mat4 invWorldProj = inverse(worldProjectionMatrix);

	vec3 ro = vec3(invWorldProj * vec4(uv * SdfOrthoViewScale, 0, 1));
	vec3 rd = vec3(invWorldProj * vec4(uv * SdfOrthoViewScale, -1, 1)) - ro;

	vec4 finalCol = vec4(0);

	for (int m = 0; m < AA; m++) {
		for (int n = 0; n < AA; n++) {
			vec3 mat;
			float d = rayMarch(ro, rd, mat);
			vec4 outCol = vec4(0);
			if (d < MAX_DIST) {
				vec3 p = ro + rd * d;
				vec3 n = calcNormal(p);
				vec3 r = reflect(rd, n);

				vec3 lightPos = normalize(vec3(1, 1.5, 0.5));

				float dir = dot(n, lightPos);
				// float dif = abs(dot(n, normalize(vec3(1, 1.5, 1))));

				float dif = dir * softShadow(p, lightPos, 0.01, 10.0, 10.0);

				// attenuation
				dif = 0.4 + 0.6 * dif;

				vec3 albedo = vec3(-1, 0, 1);
				if (mat.x == MaterialAlbedo) {
					albedo = palette[int(mat.y)];

					// Specular hilite xD

				} else if (mat.x == MaterialTexture) {
					albedo = vec3(0);
					//					albedo += abs(n.x) * stone(p.zy);
					albedo += /*abs(n.y) * */ stone(p.xz);
					//					albedo += abs(n.z) * stone(p.xy);
				}

				/*if (mat.x == MaterialShadow) {
					float gray = min(0.4 + dif, 1.0);
					outCol = mix(vec4(0, 0, 0, 1), vec4(0, 0, 0, 0), gray);
				} else {*/

				vec3 col = vec3(dif) * albedo;
				outCol = albedo.r >= 0.0 ? vec4(col, 1.0) : vec4(0);
				/*
									outCol.xyz *= max(0.0,n.y);

									float spec = dot(n, normalize(vec3(0, 0, -1) + lightPos));
									spec = pow(clamp(spec, 0.0, 1.0), 10.0);

									outCol.xyz = clamp(outCol.xyz + vec3(spec), 0.0, 1.0);*/
				//}
			}
			finalCol += outCol;
		}
	}
	finalCol /= float(AA * AA);

	outFragment = finalCol;
}