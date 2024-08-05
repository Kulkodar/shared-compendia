interface AmbientLightData {
	_id: string;
	x: number;
	y: number;
	rotation: number;
	walls: boolean;
	vision: boolean;
	config: LightData;
	hidden: boolean;
	flags: object;
}

export { type AmbientLightData };
