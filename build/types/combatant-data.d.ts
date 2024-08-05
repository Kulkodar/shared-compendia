interface CombatantData {
	_id: string;
	actorId: string;
	tokenId: string;
	name: string;
	img: string;
	initiative: number;
	hidden: boolean;
	defeated: boolean;
	flags: object;
}

export { type CombatantData };
