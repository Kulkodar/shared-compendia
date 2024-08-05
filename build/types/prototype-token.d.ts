interface PrototypeToken {
	_id: string;
	name: string;
	displayName: number;
	actorId: ForeignDocumentField;
	actorLink: BooleanField;
	delta: ActorDeltaField;
	appendNumber: BooleanField;
	prependAdjective: BooleanField;
	width: number;
	height: number;
	texture: TextureData;
	hexagonalShape: number;
	x: number;
	y: number;
	elevation: number;
	sort: number;
	locked: BooleanField;
	lockRotation: BooleanField;
	rotation: AngleField;
	alpha: AlphaField;
	hidden: BooleanField;
	disposition: number;
	displayBars: number;
	bar1: SchemaField;
	bar2: SchemaField;
	light: EmbeddedDataField;
	sight: SchemaField;
	detectionModes: ArrayField;
	occludable: SchemaField;
	ring: SchemaField;
	_regions: ArrayField;
	flags: ObjectField;
}

export { type PrototypeToken };
