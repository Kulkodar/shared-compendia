interface DrawingData {
	_id: string;
	author: string;
	shape: ShapeData;
	x: number;
	y: number;
	elevation: number;
	sort: number;
	rotation: number;
	bezierFactor: number;
	fillType: number;
	fillColor: string;
	fillAlpha: number;
	strokeWidth: number;
	strokeColor: number;
	strokeAlpha: number;
	texture: string;
	text: string;
	fontFamily: string;
	fontSize: number;
	textColor: string;
	textAlpha: number;
	hidden: boolean;
	locked: boolean;
	flags: object;
}

export { type DrawingData };
