interface TableResultData {
	_id: string;
	type: string;
	text: string;
	img: string;
	documentCollection: string;
	documentId: string;
	weight: number;
	range: number[];
	drawn: boolean;
	flags: object;
}

export { type TableResultData };
