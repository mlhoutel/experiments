import { Vec2, Rect2, SwapDelete, Quadtree2 } from '$utils/math.js';

class Body {
	constructor(pos, vel, mass) {
		this.pos = pos;
		this.vel = vel;
		this.mass = mass;
	}

	step() {
		this.pos.plus(this.vel);
	}
}

class System {
	constructor() {
		this.bodies = [];
		this.min_dist = 10000;
		this.gravity_constant = 6.7 * 10e-1; // 6.7 * 10e-11
		this.light_speed = 2.998 * 10e8; // 2,998 * 10e+8
		this.number_iterations = 1;
		this.bounds = new Rect2(new Vec2(-10000, -10000), new Vec2(10000, 10000));
		this.quad = new Quadtree2(this.bounds, 10);
	}

	step() {
		for (let k = 0; k < this.number_iterations; ++k) {
			// Update positions
			for (let i = 0; i < this.bodies.length; ++i) {
				this.bodies[i].step();
			}

			this.cluster_gravity();
		}
	}

	cluster_gravity() {
		// Compute quadtree:
		this.quad = new Quadtree2(this.bounds, 1, 10);
		for (let i = 0; i < this.bodies.length; ++i) {
			this.quad.insert(this.bodies[i].pos, this.bodies[i].mass);
		}

		// Reduce mass clusters
		const compute_mass = (quad) => {
			if (!quad.childs?.length) {
				quad.mass = quad.values.reduce((acc, [pos, mass]) => acc + mass, 0);
				quad.centroid = quad.values.reduce(
					(acc, [pos, mass]) => acc.plus(pos.clone().times(mass / quad.mass)),
					new Vec2(0, 0)
				);
			} else {
				for (const child of quad.childs) {
					compute_mass(child);
				}

				quad.mass = quad.childs.reduce((acc, child) => acc + child.mass, 0);
				quad.centroid = quad.childs.reduce(
					(acc, child) => acc.plus(child.centroid.clone().times(child.mass / quad.mass)),
					new Vec2(0, 0)
				);
			}
		};

		compute_mass(this.quad);

		const compute_clusters = (position, quad, clusters = []) => {
			if (!quad.childs?.length) {
				clusters.push(...quad.values.map(([pos, mass]) => ({ pos, mass })));
			} else {
				const inside = quad.quadrant(position);
				const others = [0, 1, 2, 3].filter((v) => v != inside);

				clusters.push(
					...others.map((i) => ({ pos: quad.childs[i].centroid, mass: quad.childs[i].mass }))
				);

				compute_clusters(quad, quad.childs[inside], clusters);
			}

			return clusters;
		};

		for (let i = 0; i < this.bodies.length; ++i) {
			const clusters = compute_clusters(this.bodies[i].pos, this.quad);
			const cluster_mass = clusters.reduce((acc, val) => acc + val.mass, 0);
			const cluster_pos = clusters.reduce(
				(acc, val) => acc.plus(val.pos.times(val.mass / cluster_mass)),
				new Vec2(0, 0)
			);

			const force = this.gravity(
				this.bodies[i],
				new Body(cluster_pos, new Vec2(0, 0), cluster_mass)
			);

			this.bodies[i].vel.plus(force.times(cluster_mass));
		}
	}

	bruteforce_gravity() {
		for (let i = 0; i < this.bodies.length - 1; ++i) {
			for (let j = i + 1; j < this.bodies.length; ++j) {
				const force = this.gravity(this.bodies[i], this.bodies[j]);
				bodyA.vel.plus(force.times(bodyB.mass));
				bodyB.vel.minus(force.times(bodyA.mass));
			}
		}
	}

	gravity(bodyA, bodyB) {
		const diff = bodyB.pos.clone().minus(bodyA.pos);
		const dist_2 = diff.length_2() + this.min_dist;

		let force = this.gravity_constant / dist_2;

		if (force > this.light_speed) {
			force = this.light_speed;
		}

		return diff.clone().divide(Math.sqrt(dist_2)).times(force);
	}

	add(body) {
		this.bodies.push(body);
	}
}

export { Body, System };
