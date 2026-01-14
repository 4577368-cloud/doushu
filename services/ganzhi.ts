
import { Solar } from 'lunar-javascript';

/**
 * Calculates the Day Pillar GanZhi using the lunar-javascript library.
 * This ensures consistency with the main Bazi calculation service.
 * 
 * @param year Year
 * @param month Month (1-12)
 * @param day Day (1-31)
 * @returns GanZhi string (e.g., "癸未")
 */
export function getDayGanZhi(year: number, month: number, day: number): string {
  // Use noon to avoid boundary issues when just asking for the day
  const solar = Solar.fromYmdHms(year, month, day, 12, 0, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();
  bazi.setSect(1); // Standard Bazi (23:00 rollover)
  
  return bazi.getDayGan() + bazi.getDayZhi();
}
