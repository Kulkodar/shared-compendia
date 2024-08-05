interface AmbientSoundData {
	_id: string;
	x: number;
	y: number;
	radius: number;
	path: string;
	repeat: boolean;
	volume: number;
	walls: boolean;
	easing: boolean;
	hidden: boolean;
	darkness: {
		min: number;
		max: number;
	};
	effects: {
		base: object;
		muffled: object;
	};
	flags: object;
}

export { type AmbientSoundData };
