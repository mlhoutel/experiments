import { Vec2, Rect2, SwapDelete, Quadtree2 } from '$utils/math.js';

class Body {
	constructor(pos, vel, mass) {
		this.pos = pos;
		this.vel = vel;
		this.mass = mass;
	}
}

class System {
	constructor() {
		this.bodies = [];
		this.min_dist = 3 * 100 ** 2;
		this.g_constant = 6.7 * 10; // 6.7 * 10e-11
		this.light_speed = 3 * 10e-3; // 2,998 * 10e+8
		this.iterations = 5;
		this.bounds = new Rect2(new Vec2(-10000, -10000), new Vec2(10000, 10000));
		this.quad = new Quadtree2();
		this.quad_capacity = 20;
		this.quad_maxdepth = 10;
		this.quad_theta = 1;
		this.dt = 0.1;
		this.method = 'bruteforce';
	}

	step() {
		for (let k = 0; k < this.iterations; ++k) {
			// Update positions
			for (let i = 0; i < this.bodies.length; ++i) {
				const length_2 = this.bodies[i].vel.length_2() * this.dt;
				if (length_2 > this.light_speed) {
					this.bodies[i].vel.times(this.light_speed / length_2);
				}

				const vel = this.bodies[i].vel.clone().times(this.dt);
				this.bodies[i].pos.plus(vel);
			}

			// Apply gravity
			this.quad = new Quadtree2(this.bounds, this.quad_capacity, this.quad_maxdepth);

			if (this.method == 'aggregate') {
				this.aggregate_gravity();
			} else if (this.method == 'bruteforce') {
				this.bruteforce_gravity();
			} else {
				this.cluster_gravity();
			}
		}
	}

	cluster_gravity() {
		// Compute quadtree:
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
				for (let i = 0; i < quad.values.length; ++i) {
					clusters.push({ pos: quad.values[i][0], mass: quad.values[i][1] });
				}
			} else {
				for (let i = 0; i < 4; ++i) {
					const quad_width = quad.childs[i].bounds.b.x - quad.childs[i].bounds.a.x;
					const quad_dist = position.clone().minus(quad.childs[i].centroid).length();
					// console.log({ position, child: quad.childs[i].centroid });

					if (quad_width / quad_dist < this.quad_theta) {
						clusters.push({ pos: quad.childs[i].centroid, mass: quad.childs[i].mass }); // long range
					} else {
						compute_clusters(position, quad.childs[i], clusters); // short range
					}
				}
			}

			return clusters;
		};

		for (let i = 0; i < this.bodies.length; ++i) {
			const clusters = compute_clusters(this.bodies[i].pos, this.quad);
			const cluster_mass = clusters.reduce((acc, val) => acc + val.mass, 0);
			const cluster_pos = clusters.reduce(
				(acc, val) => acc.plus(val.pos.clone().times(val.mass / cluster_mass)),
				new Vec2(0, 0)
			);
			const force = this.gravity(
				this.bodies[i],
				new Body(cluster_pos, new Vec2(0, 0), cluster_mass)
			);

			this.bodies[i].vel.plus(force.times(cluster_mass).times(this.dt * this.dt));
		}
	}

	bruteforce_gravity() {
		for (let i = 0; i < this.bodies.length - 1; ++i) {
			for (let j = i + 1; j < this.bodies.length; ++j) {
				const force = this.gravity(this.bodies[i], this.bodies[j]).times(this.dt * this.dt);
				this.bodies[i].vel.plus(force.clone().times(this.bodies[j].mass));
				this.bodies[j].vel.minus(force.times(this.bodies[i].mass));
			}
		}
	}

	aggregate_gravity() {
		const aggregate_mass = this.bodies.reduce((acc, cur) => acc + cur.mass, 0);
		const aggregate_pos = this.bodies.reduce(
			(acc, cur) => acc.plus(cur.pos.clone().times(cur.mass / aggregate_mass)),
			new Vec2(0, 0)
		);

		for (let i = 0; i < this.bodies.length; ++i) {
			const force = this.gravity(
				this.bodies[i],
				new Body(aggregate_pos, new Vec2(0, 0), aggregate_mass)
			);

			this.bodies[i].vel.plus(force.times(aggregate_mass).times(this.dt * this.dt));
		}
	}

	gravity(bodyA, bodyB) {
		const diff = bodyB.pos.clone().minus(bodyA.pos);
		const dist_2 = diff.length_2() + this.min_dist;

		let force = this.g_constant / dist_2;

		return diff.clone().divide(Math.sqrt(dist_2)).times(force);
	}

	add(body) {
		this.bodies.push(body);
	}
}

export { Body, System };
