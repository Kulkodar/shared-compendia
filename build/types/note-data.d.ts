interface NoteData {
	_id: string;
	entryId: string;
	pageId: string;
	x: number;
	y: number;
	texture: TextureData;
	iconSize: number;
	text: string;
	fontFamily: string;
	fontSize: number;
	textAnchor: number;
	textColor: string;
	global: boolean;
	flags: object;
}

export { type NoteData };
