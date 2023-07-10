/**
 * Generates a random number between the given minimum and maximum values.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} - The random number.
 */
function Random(min, max) {
	return Math.random() * (max - min) + min;
}

/**
 * Generates a random RGB color.
 * @returns {number[]} - An array representing the RGB color.
 */
function RandomColor() {
	return [Math.floor(Random(0, 256)), Math.floor(Random(0, 256)), Math.floor(Random(0, 256))];
}

function ColorGradient(colors, k) {
	const gradient = [colors[0]]; // Initialize gradient with the first color

	const interval = 1 / (k - 1); // Calculate the interval between each gradient color

	for (let i = 1; i < k - 1; i++) {
		const position = i * interval;

		const lowerIndex = Math.floor(position * (colors.length - 1));
		const upperIndex = Math.ceil(position * (colors.length - 1));

		const lowerColor = colors[lowerIndex];
		const upperColor = colors[upperIndex];

		const weight = position * (colors.length - 1) - lowerIndex;

		const interpolatedColor = lowerColor.map((channel, index) => {
			const delta = upperColor[index] - channel;
			return Math.round(channel + delta * weight);
		});

		gradient.push(interpolatedColor);
	}

	gradient.push(colors[colors.length - 1]); // Add the last color of the first array

	return gradient;
}

function ColorToHex([_r, _g, _b]) {
	const r = Math.round(_r).toString(16).padStart(2, '0');
	const g = Math.round(_g).toString(16).padStart(2, '0');
	const b = Math.round(_b).toString(16).padStart(2, '0');

	return `0x${r}${g}${b}`;
}

function SwapDelete(array, index) {
	array[index] = array[array.length - 1];
	array.pop();
}

/**
 * Represents a 2D Vector.
 */
class Vec2 {
	/**
	 * Creates a new 2D Vector.
	 * @param {number} x - The x-coordinate.
	 * @param {number} y - The y-coordinate.
	 */
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	clone() {
		return new Vec2(this.x, this.y);
	}

	/**
	 * Adds another Vector to this Vector.
	 * @param {Vec2} other - The Vector to add.
	 * @returns {Vec2} - The resulting Vector.
	 */
	plus(other) {
		this.x += other.x;
		this.y += other.y;
		return this;
	}

	/**
	 * Subtracts another Vector from this Vector.
	 * @param {Vec2} other - The Vector to subtract.
	 * @returns {Vec2} - The resulting Vector.
	 */
	minus(other) {
		this.x -= other.x;
		this.y -= other.y;
		return this;
	}

	/**
	 * Multiplies this Vector by a scalar value.
	 * @param {number} scalar - The scalar value.
	 * @returns {Vec2} - The resulting Vector.
	 */
	times(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	/**
	 * Divides this Vector by a scalar value.
	 * @param {number} scalar - The scalar value.
	 * @returns {Vec2} - The resulting Vector.
	 */
	divide(scalar) {
		this.x /= scalar;
		this.y /= scalar;
		return this;
	}

	/**
	 * Calculates the squared length (magnitude) of this Vector.
	 * @returns {number} - The squared length of the Vector.
	 */
	length_2() {
		return this.x * this.x + this.y * this.y;
	}

	/**
	 * Calculates the length (magnitude) of this Vector.
	 * @returns {number} - The length of the Vector.
	 */
	length() {
		return Math.sqrt(this.length_2());
	}

	/**
	 * Rotates this Vector by the given angle (in radians) around the origin.
	 * @param {number} angle - The rotation angle in radians.
	 * @returns {Vec2} - The resulting Vector after rotation.
	 */
	rotate(angle) {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const old_x = this.x;
		const old_y = this.y;
		this.x = old_x * cos - old_y * sin;
		this.y = old_x * sin + old_y * cos;
		return this;
	}

	/**
	 * Rotates this Vector by the given angle (in radians) around a specified point.
	 * @param {number} angle - The rotation angle in radians.
	 * @param {Vec2} from - The point to rotate around.
	 * @returns {Vec2} - The resulting Vector after rotation.
	 */
	rotateAround(angle, from) {
		return this.minus(from).rotate(angle).plus(from);
	}

	norm() {
		return new Vec2(-this.y, this.x);
	}
}

class Rect2 {
	constructor(a, b) {
		this.a = a;
		this.b = b;
	}
}

class Quadtree2 {
	constructor(bounds, capacity, max_depth = 5) {
		this.bounds = bounds;
		this.capacity = capacity;
		this.childs = undefined;
		this.values = [];
		this.max_depth = max_depth;
	}

	half() {
		const half_size = this.bounds.b.clone().minus(this.bounds.a).divide(2);
		return this.bounds.a.clone().plus(half_size);
	}

	divide() {
		const a = this.bounds.a;
		const b = this.bounds.b;
		const half = this.half();

		const areas = [
			new Rect2(new Vec2(a.x, a.y), new Vec2(half.x, half.y)), // NW
			new Rect2(new Vec2(half.x, a.y), new Vec2(b.x, half.y)), // NE
			new Rect2(new Vec2(half.x, half.y), new Vec2(b.x, b.y)), // SE
			new Rect2(new Vec2(a.x, half.y), new Vec2(half.x, b.y)) // SW
		];

		this.childs = areas.map((bounds) => new Quadtree2(bounds, this.capacity, this.max_depth - 1));

		this.reallocate();
	}

	reallocate() {
		if (!this.childs?.length) throw new Error('Node not divided yet');

		const values = [...this.values];
		this.values = [];

		for (const [position, value] of values) {
			this.insert(position, value);
		}
	}

	insert(position, value) {
		if (!this.childs?.length) {
			if (this.values.length < this.capacity || this.max_depth == 1) {
				this.values.push([position, value]);
			} else {
				this.divide();
			}
		} else {
			this.childs[this.quadrant(position)].insert(position, value);
		}
	}

	retrieve(position) {
		if (!this.childs?.length) {
			return this;
		} else {
			return this.childs[this.quadrant(position)].retrieve(position);
		}
	}

	quadrant(position) {
		const half = this.half();

		if (position.x < half.x) {
			return position.y < half.y ? 0 : 3;
		} else {
			return position.y < half.y ? 1 : 2;
		}
	}
	reduce(fun, acc) {
		if (!this.childs?.length) {
			for (const val of this.values) {
				acc = fun(acc, val);
			}
		} else {
			for (const child of this.childs) {
				acc = child.reduce(fun, acc);
			}
		}

		return acc;
	}
}

export { Random, RandomColor, ColorGradient, ColorToHex, SwapDelete, Vec2, Rect2, Quadtree2 };
