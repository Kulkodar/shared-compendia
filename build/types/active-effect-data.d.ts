import { EffectChangeData } from './effect-change-data';
import { EffectDurationData } from './effect-duration-data';

interface ActiveEffectData {
	_id: string;
	name: string;
	img: string;
	changes: EffectChangeData[];
	disabled: boolean;
	duration: EffectDurationData;
	description: string;
	origin: string;
	tint: string;
	transfer: boolean;
	statuses: string[];
	flags: object;
}

export { type ActiveEffectData };
