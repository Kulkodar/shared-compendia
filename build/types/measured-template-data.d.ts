interface MeasuredTemplateData {
	_id: string;
	user: string;
	t: string;
	x: number;
	y: number;
	distance: number;
	direction: number;
	angle: number;
	width: number;
	borderColor: string;
	fillColor: string;
	texture: string;
	hidden: boolean;
	flags: object;
}

export { type MeasuredTemplateData };
