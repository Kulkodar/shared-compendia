import { ActiveEffectData } from './active-effect-data';
import { DocumentStats } from './document-stats';
import { ItemData } from './item-data';

interface ActorData {
	_id: string;
	name: string;
	type: string;
	img: string;
	system: object;
	prototypeToken: PrototypeToken;
	items: ItemData[];
	effects: ActiveEffectData[];
	folder: string;
	sort: number;
	ownership: object;
	flags: object;
	_stats: DocumentStats;
}

export { type ActorData };
