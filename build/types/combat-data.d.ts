import { CombatantData } from './combatant-data';
import { DocumentStats } from './document-stats';

interface CombatData {
	_id: string;
	scene: string;
	combatants: CombatantData[];
	active: boolean;
	round: number;
	turn: number;
	sort: number;
	flags: object;
	_stats: DocumentStats;
}

export { type CombatData };
