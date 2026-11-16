import data from '../.generated/trips.json';
import { parseTrips } from './trips';

export const readTrips = () => parseTrips(data);
